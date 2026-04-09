import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// ============================================
// Email Provider Tipleri
// ============================================

export type EmailProvider = 'resend' | 'gmail' | 'smtp';

interface BaseEmailParams {
  to: string;
  subject: string;
  body: string;        // HTML icerik
  from: string;        // "Firma Adi <email@domain.com>"
}

// Resend ile gonderim
interface ResendConfig {
  provider: 'resend';
  apiKey: string;
}

// Gmail SMTP ile gonderim (App Password kullanir)
interface GmailConfig {
  provider: 'gmail';
  user: string;        // Gmail adresi
  password: string;    // App Password (2FA gerekli)
}

// Genel SMTP ile gonderim
interface SmtpConfig {
  provider: 'smtp';
  host: string;
  port: number;
  user: string;
  password: string;
}

export type EmailConfig = ResendConfig | GmailConfig | SmtpConfig;

export interface SendEmailParams extends BaseEmailParams {
  config: EmailConfig;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================
// Provider implementasyonlari
// ============================================

/** Resend API ile gonderim */
async function sendViaResend(
  params: BaseEmailParams,
  config: ResendConfig
): Promise<SendEmailResult> {
  const resend = new Resend(config.apiKey);

  const { data, error } = await resend.emails.send({
    from: params.from,
    to: [params.to],
    subject: params.subject,
    html: params.body,
  });

  if (error) {
    return { success: false, error: error.message || 'Resend hatasi' };
  }

  return { success: true, messageId: data?.id || undefined };
}

/** Gmail SMTP ile gonderim (App Password gerektirir) */
async function sendViaGmail(
  params: BaseEmailParams,
  config: GmailConfig
): Promise<SendEmailResult> {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.user,
      pass: config.password,
    },
  });

  const info = await transporter.sendMail({
    from: params.from || config.user,
    to: params.to,
    subject: params.subject,
    html: params.body,
  });

  return { success: true, messageId: info.messageId };
}

/** Genel SMTP ile gonderim (Outlook, Yahoo, ozel sunucu vb.) */
async function sendViaSmtp(
  params: BaseEmailParams,
  config: SmtpConfig
): Promise<SendEmailResult> {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.password,
    },
  });

  const info = await transporter.sendMail({
    from: params.from || config.user,
    to: params.to,
    subject: params.subject,
    html: params.body,
  });

  return { success: true, messageId: info.messageId };
}

// ============================================
// Ana gonderim fonksiyonu
// ============================================

/**
 * Secilen email provider uzerinden email gonderir.
 * Resend, Gmail veya genel SMTP destekler.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, body, config } = params;

  // Temel validasyon
  if (!to || !to.includes('@')) {
    return { success: false, error: 'Gecersiz email adresi' };
  }
  if (!subject || !body) {
    return { success: false, error: 'Konu ve icerik zorunludur' };
  }

  try {
    switch (config.provider) {
      case 'resend':
        return await sendViaResend(params, config);
      case 'gmail':
        return await sendViaGmail(params, config);
      case 'smtp':
        return await sendViaSmtp(params, config);
      default:
        return { success: false, error: 'Gecersiz email provider' };
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      // Rate limit hatalari
      if (err.message.includes('rate limit') || err.message.includes('429')) {
        return { success: false, error: 'Rate limit asildi, lutfen biraz bekleyin' };
      }
      // Gmail auth hatalari
      if (err.message.includes('Invalid login') || err.message.includes('XOAUTH2')) {
        return { success: false, error: 'Email giris hatasi — Gmail icin App Password kullanin' };
      }
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Bilinmeyen email gonderim hatasi' };
  }
}
