-- Email gonderim destegi icin migration
-- Migration: 017_email_support

-- Lead'e email alani ekle
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Message'a delivery tracking alanlari ekle
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'pending'
  CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'bounced', 'failed'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivery_error TEXT;

-- User settings'e email konfigurasyonu ekle
-- email_provider: hangi servisle gonderilecek (resend, gmail, smtp)
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS email_provider VARCHAR(20) DEFAULT 'resend'
  CHECK (email_provider IN ('resend', 'gmail', 'smtp'));
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS resend_api_key_encrypted TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS sender_email VARCHAR(255);
-- Gmail ve genel SMTP icin
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255);
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS smtp_user VARCHAR(255);
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS smtp_password_encrypted TEXT;
