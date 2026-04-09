import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * GET /api/notifications
 * Okunmamis bildirimleri getirir.
 */
export async function GET(request: NextRequest) {
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

    // Query parametrelerini parse et
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
    );

    const admin = getSupabaseAdmin();

    // Okunmamis bildirimleri getir (kullaniciya ait veya sistem aksiyonlari)
    const { data, error } = await admin
      .from('activity_logs')
      .select('*')
      .eq('is_read', false)
      .or(`user_id.eq.${user.id},is_system_action.eq.true`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Bildirim sorgu hatasi:', error);
      return NextResponse.json(
        {
          error: {
            code: 'QUERY_ERROR',
            message: 'Bildirimler yuklenirken bir hata olustu.',
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 500 }
      );
    }

    // Okunmamis bildirim sayisini ayri sorgula
    const { count, error: countError } = await admin
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .or(`user_id.eq.${user.id},is_system_action.eq.true`);

    if (countError) {
      console.error('Bildirim sayisi sorgu hatasi:', countError);
    }

    // snake_case -> camelCase mapping
    const notifications = (data || []).map((row) => ({
      id: row.id,
      actionType: row.action_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      details: row.details,
      timestamp: row.created_at,
      isRead: row.is_read,
    }));

    return NextResponse.json({
      notifications,
      unreadCount: count ?? 0,
    });
  } catch (error) {
    console.error('Bildirim hatasi:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Bildirimler yuklenirken beklenmeyen bir hata olustu.',
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        },
      },
      { status: 500 }
    );
  }
}
