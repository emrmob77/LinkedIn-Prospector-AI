import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/notifications/read
 * Bildirimleri okundu olarak isaretler.
 * Body: { ids: string[] } veya { all: true }
 */
export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const { ids, all } = body as { ids?: string[]; all?: boolean };

    // Validasyon: ids veya all parametrelerinden biri olmali
    if (!all && (!ids || !Array.isArray(ids) || ids.length === 0)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Gecersiz istek. "ids" (string dizisi) veya "all: true" gondermelisiniz.',
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    let query = admin
      .from('activity_logs')
      .update({ is_read: true })
      .eq('is_read', false)
      .or(`user_id.eq.${user.id},is_system_action.eq.true`);

    // Belirli id'ler veya tumunu guncelle
    if (!all && ids) {
      query = query.in('id', ids);
    }

    const { data, error } = await query.select('id');

    if (error) {
      console.error('Bildirim guncelleme hatasi:', error);
      return NextResponse.json(
        {
          error: {
            code: 'UPDATE_ERROR',
            message: 'Bildirimler guncellenirken bir hata olustu.',
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ updated: data?.length ?? 0 });
  } catch (error) {
    console.error('Bildirim guncelleme hatasi:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Bildirimler guncellenirken beklenmeyen bir hata olustu.',
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        },
      },
      { status: 500 }
    );
  }
}
