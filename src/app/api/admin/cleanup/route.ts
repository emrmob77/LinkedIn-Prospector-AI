import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { clearCacheStore } from '@/lib/cache';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/cleanup
 *
 * Periyodik temizlik endpoint'i:
 * 1. 90 gunluk eski + okunmus activity_logs'lari siler
 * 2. Orphan lead_posts kayitlarini temizler
 * 3. In-memory cache'i temizler
 */
export async function POST() {
  try {
    // Auth kontrolu
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

    // 1. 90 gunluk eski okunmus activity_logs'lari sil
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: deletedLogs, error: logsError } = await supabaseAdmin
      .from('activity_logs')
      .delete()
      .eq('user_id', user.id)
      .eq('is_read', true)
      .lt('created_at', ninetyDaysAgo.toISOString())
      .select('id');

    if (logsError) {
      console.error('Activity logs temizlik hatasi:', logsError);
      return NextResponse.json(
        {
          error: {
            code: 'CLEANUP_ERROR',
            message: 'Aktivite kayitlari temizlenirken hata olustu.',
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 500 }
      );
    }

    const deletedLogsCount = deletedLogs?.length ?? 0;

    // 2. Orphan lead_posts temizligi
    // Kullanicinin lead_id'leri uzerinden: lead veya post tablosunda karsiligi olmayan kayitlari sil
    const { data: userLeads } = await supabase
      .from('leads')
      .select('id')
      .eq('user_id', user.id);

    let cleanedOrphansCount = 0;

    if (userLeads && userLeads.length > 0) {
      const leadIds = userLeads.map((l) => l.id);

      // Batch halinde orphan kontrolu (lead_id mevcut ama post_id artik yok)
      for (const leadId of leadIds) {
        const { data: leadPostLinks } = await supabaseAdmin
          .from('lead_posts')
          .select('lead_id, post_id')
          .eq('lead_id', leadId);

        if (!leadPostLinks || leadPostLinks.length === 0) continue;

        for (const lp of leadPostLinks) {
          const { data: postExists } = await supabaseAdmin
            .from('posts')
            .select('id')
            .eq('id', lp.post_id)
            .maybeSingle();

          if (!postExists) {
            await supabaseAdmin
              .from('lead_posts')
              .delete()
              .eq('lead_id', lp.lead_id)
              .eq('post_id', lp.post_id);
            cleanedOrphansCount++;
          }
        }
      }
    }

    // 3. Cache'i tamamen temizle
    clearCacheStore();

    return NextResponse.json({
      deletedLogs: deletedLogsCount,
      cleanedOrphans: cleanedOrphansCount,
      cacheCleared: true,
    });
  } catch (error) {
    console.error('Admin cleanup hatasi:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Temizlik islemi sirasinda beklenmeyen bir hata olustu.',
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        },
      },
      { status: 500 }
    );
  }
}
