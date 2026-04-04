import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import type { ActionType, EntityType } from '@/types/enums';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const DEFAULT_PAGE = 1;

export async function GET(request: NextRequest) {
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

    // Query parametrelerini parse et
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || String(DEFAULT_PAGE), 10) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
    const actionType = searchParams.get('actionType') as ActionType | null;
    const entityType = searchParams.get('entityType') as EntityType | null;

    const offset = (page - 1) * limit;

    // Sorgu olustur
    let query = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (actionType) {
      query = query.eq('action_type', actionType);
    }

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('Activity log sorgu hatasi:', error);
      return NextResponse.json(
        {
          error: {
            code: 'QUERY_ERROR',
            message: 'Aktivite kayitlari yuklenirken bir hata olustu.',
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 500 }
      );
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    // snake_case -> camelCase mapping
    const activities = (data || []).map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      actionType: row.action_type,
      userId: row.user_id,
      isSystemAction: row.is_system_action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      details: row.details,
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      activities,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error('Activity log hatasi:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Aktivite kayitlari yuklenirken beklenmeyen bir hata olustu.',
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        },
      },
      { status: 500 }
    );
  }
}
