import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { processExtensionImport } from '@/services/extensionImportService';
import { classifyPostsBatch } from '@/services/aiClassificationService';
import type { BusinessContext } from '@/services/aiClassificationService';
import { extractLeadsBatch } from '@/services/leadExtractionService';
import { getUserAIClient } from '@/lib/ai-client';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Post } from '@/types/models';
import type { ExtensionImportRequest, ExtensionPostData } from '@/types/extension';

// CORS headers for Chrome Extension requests
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    // Check for Bearer token from extension first, then fall back to cookies
    const authHeader = request.headers.get('Authorization');
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
        ...(bearerToken
          ? {
              global: {
                headers: { Authorization: `Bearer ${bearerToken}` },
              },
            }
          : {}),
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // Parse and validate request body
    const body: ExtensionImportRequest = await request.json();
    const { posts, source, pageUrl } = body;

    // Validate required fields
    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json(
        { error: 'posts array is required and must not be empty' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!pageUrl || typeof pageUrl !== 'string' || pageUrl.trim().length === 0) {
      return NextResponse.json(
        { error: 'pageUrl is required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Limit batch size to prevent abuse
    if (posts.length > 200) {
      return NextResponse.json(
        { error: 'Maximum 200 posts per import request' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Validate each post has minimum required fields
    const validationErrors = validatePosts(posts);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid post data', details: validationErrors },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Process the import
    const result = await processExtensionImport(
      {
        supabase,
        userId: user.id,
        source: source || 'chrome_extension',
        pageUrl: pageUrl.trim(),
      },
      posts
    );

    // Map result fields to match what the extension expects
    const response: Record<string, unknown> = {
      ...result,
      importedCount: result.postsImported,
      duplicateCount: result.postsDuplicate,
      leadCount: result.leadCandidatesCount,
      message: `${result.postsImported} post basariyla aktarildi.`,
    };

    // --- Auto-classification: import sonrasi otomatik siniflandirma ---
    if (result.postsImported > 0) {
      try {
        const autoClassifyResult = await runAutoClassification(
          supabase,
          user.id,
          result.searchRunId
        );

        if (autoClassifyResult) {
          response.autoClassified = true;
          response.classified = autoClassifyResult.classified;
          response.relevant = autoClassifyResult.relevant;
          response.leadsCreated = autoClassifyResult.leadsCreated;
          response.message = `${result.postsImported} post aktarildi, ${autoClassifyResult.classified} siniflandirildi, ${autoClassifyResult.relevant} ilgili bulundu.`;
        }
      } catch (classifyError) {
        // Siniflandirma hatasi import basarisini etkilememeli
        console.error('Auto-classification error (import still successful):', classifyError);
        response.autoClassified = false;
        response.autoClassifyError = classifyError instanceof Error
          ? classifyError.message
          : 'Otomatik siniflandirma sirasinda hata olustu';
      }
    }

    return NextResponse.json(response, { status: 200, headers: CORS_HEADERS });
  } catch (error) {
    console.error('Extension import error:', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';

    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ============================================
// Validation helpers
// ============================================

/**
 * Kullanici ayarlarinda auto_classify aktifse, import edilen postlari
 * otomatik siniflandirir ve ilgili olanlardan lead cikarir.
 */
async function runAutoClassification(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  searchRunId: string
): Promise<{
  classified: number;
  relevant: number;
  leadsCreated: number;
} | null> {
  // 1. Kullanici ayarlarindan auto_classify kontrolu
  const { data: settings } = await supabaseAdmin
    .from('user_settings')
    .select('auto_classify, classification_prompt, company_context, message_prompt, ai_temperature')
    .eq('user_id', userId)
    .single();

  // auto_classify false ise veya ayar yoksa atla
  if (!settings || settings.auto_classify === false) {
    return null;
  }

  // 2. Import edilen henuz siniflandirilmamis postlari cek
  const { data: postRows, error: fetchError } = await supabase
    .from('posts')
    .select('*')
    .eq('search_run_id', searchRunId)
    .is('classified_at', null);

  if (fetchError || !postRows || postRows.length === 0) {
    return null;
  }

  // 3. DB satirlarini Post tipine donustur (classify route pattern'i)
  const typedPosts: Post[] = postRows.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    searchRunId: row.search_run_id as string,
    content: row.content as string,
    authorName: row.author_name as string,
    authorTitle: row.author_title as string | null,
    authorCompany: row.author_company as string | null,
    authorLinkedinUrl: row.author_linkedin_url as string,
    linkedinPostUrl: row.linkedin_post_url as string,
    engagementLikes: (row.engagement_likes as number) ?? 0,
    engagementComments: (row.engagement_comments as number) ?? 0,
    engagementShares: (row.engagement_shares as number) ?? 0,
    publishedAt: new Date(row.published_at as string),
    scrapedAt: new Date((row.scraped_at || row.created_at) as string),
    rawHtml: row.raw_html as string | null,
    authorProfilePicture: row.author_profile_picture as string | null,
    authorFollowersCount: row.author_followers_count as number | null,
    authorType: (row.author_type as string) || 'Person',
    images: (row.images as string[]) || [],
    linkedinUrn: row.linkedin_urn as string | null,
    rawJson: row.raw_json as Record<string, unknown> | null,
    isRelevant: row.is_relevant as boolean | null,
    relevanceConfidence: row.relevance_confidence as number | null,
    theme: row.theme as string | null,
    giftType: row.gift_type as string | null,
    competitor: row.competitor as string | null,
    classificationReasoning: row.classification_reasoning as string | null,
    classifiedAt: row.classified_at ? new Date(row.classified_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }));

  // 4. AI client al
  const aiClient = await getUserAIClient(userId);

  // 5. BusinessContext olustur
  let businessCtx: BusinessContext | undefined;
  if (settings) {
    businessCtx = {
      classificationPrompt: settings.classification_prompt || '',
      companyContext: settings.company_context || '',
      messagePrompt: settings.message_prompt || '',
      aiTemperature: settings.ai_temperature != null ? Number(settings.ai_temperature) : undefined,
    };
  }

  // 6. Siniflandirma
  const classifyResult = await classifyPostsBatch(typedPosts, supabase, aiClient, businessCtx);

  // 7. search_run tablosunu guncelle
  await supabase
    .from('search_runs')
    .update({ posts_relevant: classifyResult.relevant })
    .eq('id', searchRunId);

  // 8. Lead extraction — ilgili postlardan lead cikar
  let leadsCreated = 0;

  if (classifyResult.relevant > 0) {
    const postIdsToCheck = typedPosts.map((p) => p.id);
    const { data: classifiedRows } = await supabase
      .from('posts')
      .select('*')
      .in('id', postIdsToCheck)
      .eq('is_relevant', true);

    if (classifiedRows && classifiedRows.length > 0) {
      const relevantPosts: Post[] = classifiedRows.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        searchRunId: row.search_run_id as string,
        content: row.content as string,
        authorName: row.author_name as string,
        authorTitle: row.author_title as string | null,
        authorCompany: row.author_company as string | null,
        authorLinkedinUrl: row.author_linkedin_url as string,
        linkedinPostUrl: row.linkedin_post_url as string,
        engagementLikes: (row.engagement_likes as number) ?? 0,
        engagementComments: (row.engagement_comments as number) ?? 0,
        engagementShares: (row.engagement_shares as number) ?? 0,
        publishedAt: new Date(row.published_at as string),
        scrapedAt: new Date((row.scraped_at || row.created_at) as string),
        rawHtml: row.raw_html as string | null,
        authorProfilePicture: row.author_profile_picture as string | null,
        authorFollowersCount: row.author_followers_count as number | null,
        authorType: (row.author_type as string) || 'Person',
        images: (row.images as string[]) || [],
        linkedinUrn: row.linkedin_urn as string | null,
        rawJson: row.raw_json as Record<string, unknown> | null,
        isRelevant: row.is_relevant as boolean | null,
        relevanceConfidence: row.relevance_confidence as number | null,
        theme: row.theme as string | null,
        giftType: row.gift_type as string | null,
        competitor: row.competitor as string | null,
        classificationReasoning: row.classification_reasoning as string | null,
        classifiedAt: row.classified_at ? new Date(row.classified_at as string) : null,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
      }));

      const leadResult = await extractLeadsBatch(relevantPosts, supabase, userId);
      leadsCreated = leadResult.created;

      // search_run leads_extracted guncelle
      await supabase
        .from('search_runs')
        .update({ leads_extracted: leadResult.created + leadResult.updated })
        .eq('id', searchRunId);
    }
  }

  return {
    classified: classifyResult.classified,
    relevant: classifyResult.relevant,
    leadsCreated,
  };
}

function validatePosts(posts: ExtensionPostData[]): string[] {
  const errors: string[] = [];

  posts.forEach((post, index) => {
    if (!post.authorName) {
      errors.push(`posts[${index}]: authorName is required`);
    }
    if (!post.content && !post.authorName) {
      errors.push(`posts[${index}]: content or authorName is required`);
    }
  });

  return errors;
}
