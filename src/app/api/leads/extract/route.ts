import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { extractLeadsBatch } from '@/services/leadExtractionService';
import type { Post } from '@/types/models';

/**
 * POST /api/leads/extract — Sınıflandırılmış ama lead'e dönüşmemiş postlardan lead çıkar
 */
export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }

    // İlgili ama henüz lead'e dönüşmemiş postları bul
    // (lead_posts tablosunda kaydı olmayan relevant postlar)
    const { data: rows, error } = await supabase
      .from('posts')
      .select('*, search_runs!inner(user_id)')
      .eq('is_relevant', true)
      .eq('search_runs.user_id', user.id)
      .not('author_linkedin_url', 'is', null);

    if (error || !rows || rows.length === 0) {
      return NextResponse.json({ created: 0, updated: 0, message: 'Lead çıkarılacak post bulunamadı' });
    }

    const posts: Post[] = rows.map((row) => ({
      id: row.id,
      searchRunId: row.search_run_id,
      content: row.content,
      authorName: row.author_name,
      authorTitle: row.author_title,
      authorCompany: row.author_company,
      authorLinkedinUrl: row.author_linkedin_url,
      linkedinPostUrl: row.linkedin_post_url,
      engagementLikes: row.engagement_likes ?? 0,
      engagementComments: row.engagement_comments ?? 0,
      engagementShares: row.engagement_shares ?? 0,
      publishedAt: new Date(row.published_at),
      scrapedAt: new Date(row.scraped_at || row.created_at),
      rawHtml: row.raw_html,
      authorProfilePicture: row.author_profile_picture,
      authorFollowersCount: row.author_followers_count,
      authorType: row.author_type || 'Person',
      images: row.images || [],
      linkedinUrn: row.linkedin_urn,
      rawJson: row.raw_json,
      isRelevant: row.is_relevant,
      relevanceConfidence: row.relevance_confidence,
      theme: row.theme,
      giftType: row.gift_type,
      competitor: row.competitor,
      classificationReasoning: row.classification_reasoning,
      classifiedAt: row.classified_at ? new Date(row.classified_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    const result = await extractLeadsBatch(posts, supabase, user.id);

    return NextResponse.json({
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      totalRelevant: posts.length,
    });
  } catch (error) {
    console.error('Lead extract error:', error);
    return NextResponse.json({ error: 'Beklenmeyen hata' }, { status: 500 });
  }
}
