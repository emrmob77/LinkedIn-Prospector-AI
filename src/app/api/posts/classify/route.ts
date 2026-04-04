import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { classifyPostsBatch } from '@/services/aiClassificationService';
import type { BusinessContext } from '@/services/aiClassificationService';
import { getUserAIClient } from '@/lib/ai-client';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Post } from '@/types/models';

export async function POST(request: NextRequest) {
  try {
    // Auth kontrolu
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
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Kimlik dogrulama gerekli' },
        { status: 401 }
      );
    }

    // Request body
    const body = await request.json();
    const { searchRunId, postIds } = body as {
      searchRunId?: string;
      postIds?: string[];
    };

    if (!searchRunId && (!postIds || postIds.length === 0)) {
      return NextResponse.json(
        { error: 'searchRunId veya postIds parametresi gerekli' },
        { status: 400 }
      );
    }

    // Postlari cek
    let query = supabase
      .from('posts')
      .select('*');

    if (searchRunId) {
      // searchRunId ile filtreleme — henuz siniflandirilmamis postlari al
      query = query
        .eq('search_run_id', searchRunId)
        .is('classified_at', null);
    } else if (postIds) {
      query = query.in('id', postIds);
    }

    const { data: posts, error: fetchError } = await query;

    if (fetchError) {
      console.error('Postlari cekme hatasi:', fetchError);
      return NextResponse.json(
        { error: 'Postlar veritabanindan cekilemedi' },
        { status: 500 }
      );
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        classified: 0,
        relevant: 0,
        irrelevant: 0,
        message: 'Siniflandirilacak post bulunamadi',
      });
    }

    // DB satirlarini Post tipine donustur
    const typedPosts: Post[] = posts.map((row) => ({
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

    // Kullanıcının AI client ve firma bağlamını al
    const aiClient = await getUserAIClient(user.id);

    let businessCtx: BusinessContext | undefined;
    try {
      const { data: settings } = await supabaseAdmin
        .from('user_settings')
        .select('company_name, company_sector, product_description, target_customer, company_website, ai_temperature')
        .eq('user_id', user.id)
        .single();

      if (settings?.company_sector) {
        businessCtx = {
          companyName: settings.company_name || 'Kurumsal Hediye Firmasi',
          companySector: settings.company_sector,
          productDescription: settings.product_description || '',
          targetCustomer: settings.target_customer || '',
          companyWebsite: settings.company_website || undefined,
          aiTemperature: settings.ai_temperature != null ? Number(settings.ai_temperature) : undefined,
        };
      }
    } catch { /* varsayılan context kullanılır */ }

    // Siniflandirma islemini baslat
    const result = await classifyPostsBatch(typedPosts, supabase, aiClient, businessCtx);

    // searchRunId varsa search_run tablosundaki posts_relevant alanini guncelle
    if (searchRunId) {
      await supabase
        .from('search_runs')
        .update({ posts_relevant: result.relevant })
        .eq('id', searchRunId);
    }

    return NextResponse.json({
      classified: result.classified,
      relevant: result.relevant,
      irrelevant: result.irrelevant,
    });
  } catch (error) {
    console.error('Siniflandirma API hatasi:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Beklenmeyen hata' },
      { status: 500 }
    );
  }
}
