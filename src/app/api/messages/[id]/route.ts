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
    deliveryStatus: row.delivery_status || 'pending',
    deliveryError: row.delivery_error || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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

    const { subject, body } = await request.json() as {
      subject?: string;
      body?: string;
    };

    if (!subject && !body) {
      return NextResponse.json(
        { error: 'En az bir alan (subject veya body) gerekli' },
        { status: 400 }
      );
    }

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

    // Guncelleme objesi olustur
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
      edit_count: (existing.edit_count || 0) + 1,
    };

    if (subject !== undefined) {
      updateData.subject = subject;
    }

    if (body !== undefined) {
      updateData.body = body;

      // Ilk duzenleme: original_body'yi kaydet (sadece null ise)
      if (existing.original_body === null) {
        updateData.original_body = existing.body;
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('messages')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error('Message update error:', updateError);
      return NextResponse.json(
        { error: 'Mesaj guncellenemedi' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: mapMessage(updated) });
  } catch (error) {
    console.error('Message PATCH error:', error);
    const message = error instanceof Error ? error.message : 'Beklenmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
