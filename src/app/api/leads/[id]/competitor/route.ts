import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { logActivity } from '@/services/activityLogService';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Kimlik dogrulama gerekli' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { isCompetitor } = body as { isCompetitor: boolean };

    if (typeof isCompetitor !== 'boolean') {
      return NextResponse.json(
        { error: 'isCompetitor boolean olmali' },
        { status: 400 }
      );
    }

    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update({
        is_competitor: isCompetitor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, is_competitor')
      .single();

    if (updateError || !updatedLead) {
      return NextResponse.json(
        { error: 'Lead bulunamadi veya guncellenemedi' },
        { status: 404 }
      );
    }

    // Activity log kaydet (fire-and-forget)
    logActivity({
      supabase,
      actionType: 'competitor_toggled',
      userId: user.id,
      entityType: 'lead',
      entityId: updatedLead.id,
      details: {
        field: 'is_competitor',
        oldValue: !isCompetitor,
        newValue: isCompetitor,
      },
    });

    return NextResponse.json({
      id: updatedLead.id,
      isCompetitor: updatedLead.is_competitor,
    });
  } catch (error) {
    console.error('Competitor toggle error:', error);
    const message = error instanceof Error ? error.message : 'Beklenmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
