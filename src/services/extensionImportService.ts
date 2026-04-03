import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExtensionPostData, ImportResult } from '@/types/extension';

// ============================================
// Extension Import Service
// Handles importing posts from Chrome Extension
// ============================================

interface ImportContext {
  supabase: SupabaseClient;
  userId: string;
  source: string;
  pageUrl: string;
}

/**
 * Process a batch of posts from the Chrome Extension.
 * Creates a search_run, upserts posts, and logs the activity.
 */
export async function processExtensionImport(
  ctx: ImportContext,
  posts: ExtensionPostData[]
): Promise<ImportResult> {
  const { supabase, userId, source, pageUrl } = ctx;

  // 1. Create a search_run record for this import
  const searchRun = await createSearchRun(supabase, userId, source, pageUrl, posts.length);

  // 2. Upsert posts and track duplicates
  const { imported, duplicates } = await upsertPosts(supabase, searchRun.id, posts);

  // 3. Update search_run with final counts
  await finalizeSearchRun(supabase, searchRun.id, imported);

  // 4. Log the import activity
  await logImportActivity(supabase, userId, searchRun.id, imported, duplicates);

  return {
    searchRunId: searchRun.id,
    postsImported: imported,
    postsDuplicate: duplicates,
    leadCandidatesCount: 0, // Lead extraction happens in a separate step
  };
}

// ============================================
// Internal helpers
// ============================================

async function createSearchRun(
  supabase: SupabaseClient,
  userId: string,
  source: string,
  pageUrl: string,
  totalPosts: number
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('search_runs')
    .insert({
      user_id: userId,
      keywords: null,
      max_posts: totalPosts,
      status: 'processing',
      source: source || 'chrome_extension',
      page_url: pageUrl,
      search_url: pageUrl,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create search_run: ${error?.message}`);
  }

  return data;
}

async function upsertPosts(
  supabase: SupabaseClient,
  searchRunId: string,
  posts: ExtensionPostData[]
): Promise<{ imported: number; duplicates: number }> {
  let imported = 0;
  let duplicates = 0;

  // Unique post URL'leri topla (profil/sirket linkleri duplicate kontrolu icin guvenilmez)
  const isRealPostUrl = (url: string) =>
    url && (url.includes('/feed/update/') || url.includes('/pulse/') || url.includes('urn:li:'));

  const realPostUrls = posts
    .map((p) => p.linkedinPostUrl)
    .filter((url) => isRealPostUrl(url));

  // Mevcut post URL'lerini kontrol et
  let existingUrlSet = new Set<string>();
  if (realPostUrls.length > 0) {
    const { data: existingPosts } = await supabase
      .from('posts')
      .select('linkedin_post_url')
      .in('linkedin_post_url', realPostUrls);

    existingUrlSet = new Set(
      (existingPosts || []).map((p: { linkedin_post_url: string }) => p.linkedin_post_url)
    );
  }

  // Icerik bazli duplicate kontrolu (ayni yazar + ayni icerik baslangici)
  const contentKeys = posts
    .filter((p) => p.content && p.authorName)
    .map((p) => p.authorName + '::' + p.content.substring(0, 100));

  let existingContentSet = new Set<string>();
  if (contentKeys.length > 0) {
    const authorNames = Array.from(new Set(posts.map((p) => p.authorName).filter(Boolean)));
    const { data: existingByAuthor } = await supabase
      .from('posts')
      .select('author_name, content')
      .in('author_name', authorNames);

    if (existingByAuthor) {
      existingContentSet = new Set(
        existingByAuthor.map((p: { author_name: string; content: string }) =>
          p.author_name + '::' + (p.content || '').substring(0, 100)
        )
      );
    }
  }

  // Yeni ve duplicate postlari ayir
  const newPosts: ExtensionPostData[] = [];
  for (const post of posts) {
    // URL bazli duplicate kontrolu (sadece gercek post URL'leri icin)
    if (isRealPostUrl(post.linkedinPostUrl) && existingUrlSet.has(post.linkedinPostUrl)) {
      duplicates++;
      continue;
    }
    // Icerik bazli duplicate kontrolu
    const contentKey = post.authorName + '::' + (post.content || '').substring(0, 100);
    if (post.content && post.authorName && existingContentSet.has(contentKey)) {
      duplicates++;
      continue;
    }
    newPosts.push(post);
  }

  // Batch insert new posts
  if (newPosts.length > 0) {
    const postsToInsert = newPosts.map((post) => mapExtensionPostToRow(searchRunId, post));

    const { error } = await supabase.from('posts').insert(postsToInsert);

    if (error) {
      // If batch insert fails, try one by one to maximize imports
      for (const post of newPosts) {
        const row = mapExtensionPostToRow(searchRunId, post);
        const { error: singleError } = await supabase.from('posts').insert(row);

        if (singleError) {
          // Likely a duplicate that appeared between our check and insert
          duplicates++;
        } else {
          imported++;
        }
      }
    } else {
      imported = newPosts.length;
    }
  }

  return { imported, duplicates };
}

function mapExtensionPostToRow(searchRunId: string, post: ExtensionPostData) {
  // linkedin_post_url has a UNIQUE constraint in the DB.
  // If the URL is empty/blank, generate a unique placeholder to avoid constraint violations.
  let postUrl = (post.linkedinPostUrl || '').trim();
  if (!postUrl) {
    postUrl = `ext-import://${searchRunId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  return {
    search_run_id: searchRunId,
    content: post.content || '',
    author_name: post.authorName || '',
    author_title: post.authorTitle || null,
    author_company: post.authorCompany || null,
    author_linkedin_url: post.authorLinkedinUrl || '',
    linkedin_post_url: postUrl,
    engagement_likes: post.engagementLikes ?? 0,
    engagement_comments: post.engagementComments ?? 0,
    engagement_shares: post.engagementShares ?? 0,
    published_at: (post.publishedAt && post.publishedAt.trim()) ? post.publishedAt.trim() : new Date().toISOString(),
    author_profile_picture: post.authorProfilePicture || null,
    author_type: post.authorType || 'Person',
    images: post.images || [],
    linkedin_urn: null,
    raw_json: null,
    is_relevant: null,
  };
}

async function finalizeSearchRun(
  supabase: SupabaseClient,
  searchRunId: string,
  postsImported: number
): Promise<void> {
  const { error } = await supabase
    .from('search_runs')
    .update({
      status: 'completed',
      posts_found: postsImported,
      completed_at: new Date().toISOString(),
    })
    .eq('id', searchRunId);

  if (error) {
    console.error('Failed to finalize search_run:', error.message);
  }
}

async function logImportActivity(
  supabase: SupabaseClient,
  userId: string,
  searchRunId: string,
  imported: number,
  duplicates: number
): Promise<void> {
  const { error } = await supabase.from('activity_logs').insert({
    action_type: 'extension_import',
    user_id: userId,
    is_system_action: false,
    entity_type: 'search_run',
    entity_id: searchRunId,
    details: {
      source: 'chrome_extension',
      posts_imported: imported,
      posts_duplicate: duplicates,
    },
  });

  if (error) {
    console.error('Failed to log import activity:', error.message);
  }
}
