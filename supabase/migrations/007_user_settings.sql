-- User Settings tablosu - Kullanıcı bazlı AI API key ve tercih yönetimi
-- Migration: 007_user_settings

-- pgcrypto extension (şifreleme için)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- user_settings tablosu
-- ============================================
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- AI Provider API Keys (şifreli)
  anthropic_api_key_encrypted TEXT,
  openai_api_key_encrypted TEXT,
  google_api_key_encrypted TEXT,
  openrouter_api_key_encrypted TEXT,

  -- AI tercihleri
  ai_provider VARCHAR(20) NOT NULL DEFAULT 'anthropic'
    CHECK (ai_provider IN ('anthropic', 'openai', 'google', 'openrouter')),
  ai_model VARCHAR(100),

  -- Zaman damgaları
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_settings UNIQUE (user_id)
);

-- Index
CREATE INDEX idx_user_settings_user ON user_settings(user_id);

-- RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- updated_at trigger
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
