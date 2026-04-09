import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { mapMessage } from '@/lib/mappers';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // 1. Auth kontrolu
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Kimlik dogrulama gerekli' },
        { status: 401 }
      );
    }

    const { id } = params;

    // 2. Mesaji cek — user_id eslesmeli
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

    // 3. Status kontrolu: sadece 'approved' mesajlar isaretlenebilir
    if (existing.status !== 'approved') {
      return NextResponse.json(
        { error: 'Sadece onaylanmis mesajlar gonderildi olarak isaretlenebilir' },
        { status: 400 }
      );
    }

    // 4. Lead bilgisini cek (activity log icin lead_name gerekli)
    const { data: lead } = await supabase
      .from('leads')
      .select('id, name')
      .eq('id', existing.lead_id)
      .eq('user_id', user.id)
      .single();

    const now = new Date().toISOString();

    // 5. Update: status='sent', sent_at=now(), delivery_status='sent'
    const { data: updated, error: updateError } = await supabase
      .from('messages')
      .update({
        status: 'sent',
        sent_at: now,
        delivery_status: 'sent',
        updated_at: now,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error('Message mark-sent error:', updateError);
      return NextResponse.json(
        { error: 'Mesaj gonderildi olarak isaretlenemedi' },
        { status: 500 }
      );
    }

    // 6. Activity log: 'message_sent' (details: { manual: true, lead_id, lead_name })
    await supabase.from('activity_logs').insert({
      action_type: 'message_sent',
      user_id: user.id,
      is_system_action: false,
      entity_type: 'message',
      entity_id: id,
      details: {
        manual: true,
        lead_id: existing.lead_id,
        lead_name: lead?.name || null,
      },
    });

    // 7. Response: guncelenmis mesaj
    return NextResponse.json({ message: mapMessage(updated) });
  } catch (error) {
    console.error('Message mark-sent error:', error);
    const message = error instanceof Error ? error.message : 'Beklenmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
