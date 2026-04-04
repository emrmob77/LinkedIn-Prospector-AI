import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMessage(row: any) {
  return {
    id: row.id,
    leadId: row.lead_id,
    userId: row.user_id,
    messageType: row.message_type,
    subject: row.subject,
    body: row.body,
    status: row.status,
    generatedAt: row.generated_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    sentAt: row.sent_at,
    originalBody: row.original_body,
    editCount: row.edit_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function POST(
  _request: NextRequest,
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

    // Mesajin var olup olmadigini ve kullaniciya ait olup olmadigini kontrol et
    const { data: existing, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Mesaj bulunamadi' },
        { status: 404 }
      );
    }

    // Sadece pending durumundaki mesajlar onaylanabilir
    if (existing.status !== 'pending') {
      return NextResponse.json(
        { error: 'Sadece beklemede olan mesajlar onaylanabilir' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from('messages')
      .update({
        status: 'approved',
        approved_at: now,
        approved_by: user.id,
        updated_at: now,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error('Message approve error:', updateError);
      return NextResponse.json(
        { error: 'Mesaj onaylanamadi' },
        { status: 500 }
      );
    }

    // Activity log kaydet
    await supabase.from('activity_logs').insert({
      action_type: 'message_approved',
      user_id: user.id,
      is_system_action: false,
      entity_type: 'message',
      entity_id: id,
      details: {
        lead_id: updated.lead_id,
        message_type: updated.message_type,
      },
    });

    return NextResponse.json({ message: mapMessage(updated) });
  } catch (error) {
    console.error('Message approve error:', error);
    const message = error instanceof Error ? error.message : 'Beklenmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
