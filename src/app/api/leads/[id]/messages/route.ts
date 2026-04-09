import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Auth kontrolu
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Kimlik dogrulama gerekli' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Lead'in var oldugunu ve kullaniciya ait oldugunu dogrula
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead bulunamadi' },
        { status: 404 }
      );
    }

    // Mesajlari getir
    const { data: rows, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('Mesajlar sorgu hatasi:', messagesError);
      return NextResponse.json(
        { error: 'Mesajlar alinamadi' },
        { status: 500 }
      );
    }

    // camelCase mapping
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages = (rows || []).map((m: any) => ({
      id: m.id,
      leadId: m.lead_id,
      userId: m.user_id,
      messageType: m.message_type,
      subject: m.subject,
      body: m.body,
      status: m.status,
      generatedAt: m.generated_at,
      approvedAt: m.approved_at,
      approvedBy: m.approved_by,
      sentAt: m.sent_at,
      originalBody: m.original_body,
      editCount: m.edit_count,
      deliveryStatus: m.delivery_status || 'pending',
      deliveryError: m.delivery_error || null,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Mesajlar listeleme hatasi:', error);
    const message = error instanceof Error ? error.message : 'Beklenmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
