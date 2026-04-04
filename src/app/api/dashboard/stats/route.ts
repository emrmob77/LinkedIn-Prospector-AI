import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Oturum bulunamadi. Lutfen giris yapin.',
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 401 }
      );
    }

    // 1. Adim: Kullanicinin search_run id'lerini al (post filtreleme icin gerekli)
    // + diger bagimsiz sorgulari paralel calistir
    const [
      searchRunIdsResult,
      leadsResult,
      leadsThisWeekResult,
      avgScoreResult,
      messagesResult,
      approvedMessagesResult,
      pipelineResult,
      recentSearchRunsResult,
    ] = await Promise.all([
      // Kullanicinin search_run id'leri
      supabase
        .from('search_runs')
        .select('id')
        .eq('user_id', user.id),

      // totalLeads: aktif lead sayisi
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true),

      // leadsThisWeek: bu hafta olusturulan lead sayisi
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', getStartOfWeek().toISOString()),

      // avgLeadScore: tum aktif lead skorlari
      supabase
        .from('leads')
        .select('score')
        .eq('user_id', user.id)
        .eq('is_active', true),

      // toplam mesaj sayisi
      supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),

      // onaylanan mesaj sayisi
      supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'approved'),

      // pipelineBreakdown: her stage'deki lead sayisi
      supabase
        .from('leads')
        .select('stage')
        .eq('user_id', user.id)
        .eq('is_active', true),

      // recentSearchRuns: son 5
      supabase
        .from('search_runs')
        .select('id, source, posts_found, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    // 2. Adim: Post sayimlarini search_run id'lerine gore sorgula
    const searchRunIds = (searchRunIdsResult.data || []).map((sr) => sr.id);

    let totalPosts = 0;
    let postsClassified = 0;
    let postsRelevant = 0;

    if (searchRunIds.length > 0) {
      const [totalPostsRes, classifiedRes, relevantRes] = await Promise.all([
        supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .in('search_run_id', searchRunIds),
        supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .in('search_run_id', searchRunIds)
          .not('classified_at', 'is', null),
        supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .in('search_run_id', searchRunIds)
          .eq('is_relevant', true),
      ]);

      totalPosts = totalPostsRes.count ?? 0;
      postsClassified = classifiedRes.count ?? 0;
      postsRelevant = relevantRes.count ?? 0;
    }

    // Ortalama lead skoru hesapla
    const scores = (avgScoreResult.data || [])
      .map((l) => l.score)
      .filter((s): s is number => s != null);
    const avgLeadScore =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : 0;

    // Mesaj onay orani (yuzde)
    const totalMessages = messagesResult.count ?? 0;
    const approvedMessages = approvedMessagesResult.count ?? 0;
    const messageApprovalRate =
      totalMessages > 0
        ? Math.round((approvedMessages / totalMessages) * 100 * 10) / 10
        : 0;

    // Pipeline breakdown: { stage: count }
    const pipelineBreakdown: Record<string, number> = {};
    for (const lead of pipelineResult.data || []) {
      const stage = lead.stage as string;
      pipelineBreakdown[stage] = (pipelineBreakdown[stage] || 0) + 1;
    }

    // Recent search runs: snake_case -> camelCase
    const recentSearchRuns = (recentSearchRunsResult.data || []).map((sr) => ({
      id: sr.id,
      source: sr.source,
      postsFound: sr.posts_found,
      createdAt: sr.created_at,
    }));

    return NextResponse.json({
      totalLeads: leadsResult.count ?? 0,
      leadsThisWeek: leadsThisWeekResult.count ?? 0,
      totalPosts,
      postsClassified,
      postsRelevant,
      avgLeadScore,
      messageApprovalRate,
      pipelineBreakdown,
      recentSearchRuns,
    });
  } catch (error) {
    console.error('Dashboard stats hatasi:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Dashboard istatistikleri yuklenirken bir hata olustu.',
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        },
      },
      { status: 500 }
    );
  }
}

/** Haftanin baslangicini dondurur (Pazartesi 00:00:00 UTC) */
function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Pazar, 1=Pazartesi, ...
  const diff = day === 0 ? 6 : day - 1; // Pazartesi'ye gore fark
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}
