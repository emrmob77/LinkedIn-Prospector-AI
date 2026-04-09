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

    // Tum kontrolleri paralel calistir
    const [
      nullFirstPostResult,
      allLeadsResult,
      allLeadPostsResult,
      allPostIdsResult,
    ] = await Promise.all([
      // 1. first_post_id NULL olan lead sayisi
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('first_post_id', null),

      // 2. Kullanicinin tum aktif lead id'leri
      supabase
        .from('leads')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true),

      // 3. Kullanicinin lead_posts kayitlari (RLS lead uzerinden kontrol eder)
      supabase
        .from('lead_posts')
        .select('lead_id, post_id'),

      // 4. Kullanicinin erisebilecegi post id'leri
      supabase
        .from('posts')
        .select('id'),
    ]);

    const leadsWithNullFirstPost = nullFirstPostResult.count ?? 0;

    // Lead id set'leri
    const activeLeadIds = new Set(
      (allLeadsResult.data || []).map((l: { id: string }) => l.id)
    );

    // Post id set'i
    const validPostIds = new Set(
      (allPostIdsResult.data || []).map((p: { id: string }) => p.id)
    );

    // lead_posts analizi
    const leadPostsData = allLeadPostsResult.data || [];
    const leadsInLeadPosts = new Set<string>();
    let orphanLeadPostsMissingLead = 0;
    let orphanLeadPostsMissingPost = 0;

    for (const lp of leadPostsData) {
      const typedLp = lp as { lead_id: string; post_id: string };
      leadsInLeadPosts.add(typedLp.lead_id);

      // lead_id'si leads tablosunda olmayan kayitlar
      // Not: RLS zaten filtreler ama silinmis lead'ler icin kontrol
      if (!activeLeadIds.has(typedLp.lead_id)) {
        // Lead silinmis veya deaktif olabilir - detayli kontrol
        orphanLeadPostsMissingLead++;
      }

      // post_id'si posts tablosunda olmayan kayitlar
      if (!validPostIds.has(typedLp.post_id)) {
        orphanLeadPostsMissingPost++;
      }
    }

    // Hic post iliskisi olmayan aktif lead'ler
    let leadsWithZeroPosts = 0;
    Array.from(activeLeadIds).forEach((leadId) => {
      if (!leadsInLeadPosts.has(leadId)) {
        leadsWithZeroPosts++;
      }
    });

    const orphanStats = {
      leadsWithNullFirstPost,
      orphanLeadPostsMissingLead,
      orphanLeadPostsMissingPost,
      leadsWithZeroPosts,
    };

    const healthy =
      leadsWithNullFirstPost === 0 &&
      orphanLeadPostsMissingLead === 0 &&
      orphanLeadPostsMissingPost === 0 &&
      leadsWithZeroPosts === 0;

    return NextResponse.json({
      orphanStats,
      healthy,
      checkedAt: new Date().toISOString(),
      userId: user.id,
    });
  } catch (error) {
    console.error('Orphan check hatasi:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Orphan kontrolu sirasinda bir hata olustu.',
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        },
      },
      { status: 500 }
    );
  }
}
