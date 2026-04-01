import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { runSearchWithRetry, buildSearchUrl } from '@/services/apify-client';
import { mapApifyPosts, extractLeadCandidates } from '@/services/apify-mapper';
import type { ApifySearchParams } from '@/types/apify';

export async function POST(request: NextRequest) {
  let searchRunId: string | null = null;
  let supabase: ReturnType<typeof createServerClient> | null = null;

  try {
    // Auth kontrolü
    const cookieStore = cookies();
    supabase = createServerClient(
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
        { error: 'Kimlik doğrulama gerekli' },
        { status: 401 }
      );
    }

    // Request body
    const body = await request.json();
    const { keywords, maxPosts, dateFilter, geoId, urls } = body as {
      keywords: string[];
      maxPosts?: number;
      dateFilter?: 'past-24h' | 'past-week' | 'past-month';
      geoId?: string;
      urls?: string[];
    };

    // En az keyword veya URL olmalı
    const hasKeywords = keywords && keywords.length > 0;
    const hasUrls = urls && urls.length > 0;

    if (!hasKeywords && !hasUrls) {
      return NextResponse.json(
        { error: 'En az bir anahtar kelime veya LinkedIn URL gerekli' },
        { status: 400 }
      );
    }

    const searchParams: ApifySearchParams = {
      keywords: keywords || [],
      maxPosts: maxPosts ?? 50,
      dateFilter,
      geoId,
      urls,
    };

    // search_run kaydı oluştur
    const { data: searchRun, error: insertError } = await supabase
      .from('search_runs')
      .insert({
        user_id: user.id,
        keywords,
        max_posts: searchParams.maxPosts,
        status: 'processing',
        search_url: buildSearchUrl(searchParams),
        date_filter: dateFilter || null,
        geo_id: geoId || null,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !searchRun) {
      return NextResponse.json(
        { error: 'Arama kaydı oluşturulamadı' },
        { status: 500 }
      );
    }

    searchRunId = searchRun.id;

    // Apify çalıştır
    const result = await runSearchWithRetry(searchParams);

    // Sonuçları map et
    const mappedPosts = mapApifyPosts(result.posts);

    // Lead adaylarını çıkar
    const allLeadCandidates = result.posts.flatMap(extractLeadCandidates);

    // Gönderileri DB'ye kaydet
    if (mappedPosts.length > 0) {
      const postsToInsert = mappedPosts.map((post) => ({
        search_run_id: searchRun.id,
        content: post.content,
        author_name: post.authorName,
        author_title: post.authorTitle,
        author_company: post.authorCompany,
        author_linkedin_url: post.authorLinkedinUrl,
        linkedin_post_url: post.linkedinPostUrl,
        engagement_likes: post.engagementLikes,
        engagement_comments: post.engagementComments,
        engagement_shares: post.engagementShares,
        published_at: post.publishedAt.toISOString(),
        author_profile_picture: post.authorProfilePicture,
        author_followers_count: post.authorFollowersCount,
        author_type: post.authorType,
        images: post.images,
        linkedin_urn: post.linkedinUrn,
        raw_json: post.rawJson,
        is_relevant: null,
      }));

      await supabase.from('posts').upsert(postsToInsert, {
        onConflict: 'linkedin_post_url',
      });
    }

    // search_run güncelle
    await supabase
      .from('search_runs')
      .update({
        status: 'completed',
        posts_found: mappedPosts.length,
        apify_run_id: result.runId,
        apify_dataset_id: result.datasetId,
        completed_at: new Date().toISOString(),
        duration_seconds: Math.round(
          (Date.now() - new Date(searchRun.started_at).getTime()) / 1000
        ),
      })
      .eq('id', searchRun.id);

    return NextResponse.json({
      searchRunId: searchRun.id,
      postsFound: mappedPosts.length,
      leadCandidatesCount: allLeadCandidates.length,
      posts: mappedPosts,
      leadCandidates: allLeadCandidates,
    });
  } catch (error) {
    console.error('Arama hatası:', error);
    const errorMessage = error instanceof Error ? error.message : 'Beklenmeyen hata';

    // search_run oluşturulduysa status'u failed yap
    if (searchRunId && supabase) {
      await supabase
        .from('search_runs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', searchRunId);
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
