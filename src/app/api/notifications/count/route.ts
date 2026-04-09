import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { get, set, cacheKey } from '@/lib/cache';

const CACHE_TTL_MS = 15_000; // 15 saniye

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications/count
 * Okunmamis bildirim sayisini dondurur. Badge polling icin hafif endpoint.
 */
export async function GET() {
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

    // Cache kontrol
    const key = cacheKey(user.id, 'notifications:count');
    const cached = get<{ count: number }>(key);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': 'private, s-maxage=15, stale-while-revalidate=30' },
      });
    }

    const admin = getSupabaseAdmin();

    // Sadece okunmamis bildirim sayisi
    const { count, error } = await admin
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .or(`user_id.eq.${user.id},is_system_action.eq.true`);

    if (error) {
      console.error('Bildirim sayisi sorgu hatasi:', error);
      return NextResponse.json(
        {
          error: {
            code: 'QUERY_ERROR',
            message: 'Bildirim sayisi alinirken bir hata olustu.',
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 500 }
      );
    }

    const responseData = { count: count ?? 0 };

    // Sonucu cache'le (15sn)
    set(key, responseData, CACHE_TTL_MS);

    return NextResponse.json(responseData, {
      headers: { 'Cache-Control': 'private, s-maxage=15, stale-while-revalidate=30' },
    });
  } catch (error) {
    console.error('Bildirim sayisi hatasi:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Bildirim sayisi alinirken beklenmeyen bir hata olustu.',
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        },
      },
      { status: 500 }
    );
  }
}
