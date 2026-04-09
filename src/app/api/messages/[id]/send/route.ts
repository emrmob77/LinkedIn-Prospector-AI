import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { decryptApiKey } from '@/lib/crypto';
import { sendEmail } from '@/services/emailService';
import type { EmailConfig } from '@/services/emailService';

export async function POST(
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

    // 2. Mesaji cek, status = 'approved' olmali
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (msgError || !message) {
      return NextResponse.json(
        { error: 'Mesaj bulunamadi' },
        { status: 404 }
      );
    }

    if (message.status !== 'approved') {
      return NextResponse.json(
        { error: 'Sadece onaylanmis mesajlar gonderilebilir' },
        { status: 400 }
      );
    }

    // 3. Lead'i cek, email alani dolu olmali
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, name, email')
      .eq('id', message.lead_id)
      .eq('user_id', user.id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead bulunamadi' },
        { status: 404 }
      );
    }

    if (!lead.email) {
      return NextResponse.json(
        { error: "Lead'e once email ekleyin" },
        { status: 400 }
      );
    }

    // 4. User settings'ten email konfigurasyonunu cek
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('user_settings')
      .select('email_provider, resend_api_key_encrypted, sender_email, smtp_host, smtp_port, smtp_user, smtp_password_encrypted')
      .eq('user_id', user.id)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: "Yapilandirma'dan email ayarlarini girin" },
        { status: 400 }
      );
    }

    const emailProvider = (settings.email_provider as string) || 'resend';

    // 5. Provider'a gore config olustur
    let emailConfig: EmailConfig;

    switch (emailProvider) {
      case 'gmail': {
        if (!settings.smtp_user || !settings.smtp_password_encrypted) {
          return NextResponse.json(
            { error: "Yapilandirma'dan Gmail adresi ve App Password girin" },
            { status: 400 }
          );
        }
        let password: string;
        try { password = decryptApiKey(settings.smtp_password_encrypted); }
        catch { return NextResponse.json({ error: 'Gmail sifresi cozulemedi' }, { status: 400 }); }

        emailConfig = {
          provider: 'gmail',
          user: settings.smtp_user,
          password,
        };
        break;
      }

      case 'smtp': {
        if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_password_encrypted) {
          return NextResponse.json(
            { error: "Yapilandirma'dan SMTP ayarlarini girin (host, kullanici, sifre)" },
            { status: 400 }
          );
        }
        let password: string;
        try { password = decryptApiKey(settings.smtp_password_encrypted); }
        catch { return NextResponse.json({ error: 'SMTP sifresi cozulemedi' }, { status: 400 }); }

        emailConfig = {
          provider: 'smtp',
          host: settings.smtp_host,
          port: settings.smtp_port || 587,
          user: settings.smtp_user,
          password,
        };
        break;
      }

      case 'resend':
      default: {
        if (!settings.resend_api_key_encrypted) {
          return NextResponse.json(
            { error: "Yapilandirma'dan Resend API key girin" },
            { status: 400 }
          );
        }
        let apiKey: string;
        try { apiKey = decryptApiKey(settings.resend_api_key_encrypted); }
        catch { return NextResponse.json({ error: 'Resend API key cozulemedi' }, { status: 400 }); }

        emailConfig = {
          provider: 'resend',
          apiKey,
        };
        break;
      }
    }

    // Gonderici email: settings'ten veya Gmail kullanicisi
    const senderEmail = settings.sender_email
      || (emailProvider === 'gmail' ? settings.smtp_user : null);

    if (!senderEmail) {
      return NextResponse.json(
        { error: "Yapilandirma'dan gonderici email adresini girin" },
        { status: 400 }
      );
    }

    // 6. Email gonder
    const result = await sendEmail({
      config: emailConfig,
      from: senderEmail,
      to: lead.email,
      subject: message.subject || `Merhaba ${lead.name}`,
      body: message.body,
    });

    const now = new Date().toISOString();

    if (!result.success) {
      // Gonderim hatasi kaydet
      await supabase
        .from('messages')
        .update({
          delivery_status: 'failed',
          delivery_error: result.error || 'Bilinmeyen hata',
          updated_at: now,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      return NextResponse.json(
        { error: result.error || 'Email gonderilemedi' },
        { status: 500 }
      );
    }

    // 7. Basarili: message guncelle
    const { data: updated, error: updateError } = await supabase
      .from('messages')
      .update({
        status: 'sent',
        sent_at: now,
        delivery_status: 'sent',
        delivery_error: null,
        updated_at: now,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Message update error after send:', updateError);
    }

    // 8. Activity log kaydet
    await supabase.from('activity_logs').insert({
      action_type: 'message_sent',
      user_id: user.id,
      is_system_action: false,
      entity_type: 'message',
      entity_id: id,
      details: {
        lead_id: message.lead_id,
        lead_name: lead.name,
        message_type: message.message_type,
        email_provider: emailProvider,
        external_message_id: result.messageId,
      },
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      provider: emailProvider,
      message: updated ? {
        id: updated.id,
        status: updated.status,
        sentAt: updated.sent_at,
        deliveryStatus: updated.delivery_status,
      } : null,
    });
  } catch (error) {
    console.error('Message send error:', error);
    const msg = error instanceof Error ? error.message : 'Beklenmeyen hata';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
