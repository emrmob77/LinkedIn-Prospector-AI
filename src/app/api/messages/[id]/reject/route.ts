import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { mapMessage } from '@/lib/mappers';

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

    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from('messages')
      .update({
        status: 'rejected',
        updated_at: now,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error('Message reject error:', updateError);
      return NextResponse.json(
        { error: 'Mesaj reddedilemedi' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: mapMessage(updated) });
  } catch (error) {
    console.error('Message reject error:', error);
    const message = error instanceof Error ? error.message : 'Beklenmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
