-- LinkedIn Prospector AI - Initial Database Schema
-- Migration: 001_initial_schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. search_runs tablosu
-- ============================================
CREATE TABLE search_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Arama parametreleri
  keywords TEXT[] NOT NULL,
  max_posts INTEGER DEFAULT 100,

  -- Yürütme durumu
  status VARCHAR(20) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),

  -- Sonuçlar
  posts_found INTEGER DEFAULT 0,
  posts_relevant INTEGER DEFAULT 0,
  leads_extracted INTEGER DEFAULT 0,

  -- Zamanlama
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Hata yönetimi
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_search_runs_user ON search_runs(user_id);
CREATE INDEX idx_search_runs_status ON search_runs(status);
CREATE INDEX idx_search_runs_created ON search_runs(created_at DESC);

-- ============================================
-- 2. posts tablosu
-- ============================================
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_run_id UUID NOT NULL REFERENCES search_runs(id) ON DELETE CASCADE,

  -- Gönderi içeriği
  content TEXT NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  author_title VARCHAR(255),
  author_company VARCHAR(255),
  author_linkedin_url VARCHAR(500) NOT NULL,
  linkedin_post_url VARCHAR(500) NOT NULL UNIQUE,

  -- Etkileşim metrikleri
  engagement_likes INTEGER DEFAULT 0,
  engagement_comments INTEGER DEFAULT 0,
  engagement_shares INTEGER DEFAULT 0,

  -- Zaman bilgileri
  published_at TIMESTAMPTZ NOT NULL,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ham veri
  raw_html TEXT,

  -- AI Sınıflandırma alanları
  is_relevant BOOLEAN,
  relevance_confidence DECIMAL(5,2),
  theme VARCHAR(255),
  gift_type VARCHAR(255),
  competitor VARCHAR(255),
  classification_reasoning TEXT,
  classified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_search_run ON posts(search_run_id);
CREATE INDEX idx_posts_relevance ON posts(is_relevant, relevance_confidence);
CREATE INDEX idx_posts_author_url ON posts(author_linkedin_url);
CREATE INDEX idx_posts_created ON posts(created_at DESC);

-- ============================================
-- 3. leads tablosu
-- ============================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Kişi bilgileri
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  company VARCHAR(255),
  linkedin_url VARCHAR(500) NOT NULL UNIQUE,

  -- Pipeline yönetimi
  stage VARCHAR(50) NOT NULL DEFAULT 'İletişim Kurulacak'
    CHECK (stage IN ('İletişim Kurulacak', 'İletişim Kuruldu', 'Cevap Alındı', 'Görüşme', 'Teklif', 'Arşiv')),

  -- AI Puanlama
  score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  score_breakdown JSONB,

  -- Lead bağlamı
  pain_points TEXT[],
  key_interests TEXT[],

  -- Metadata
  first_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  post_count INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_leads_user ON leads(user_id);
CREATE INDEX idx_leads_stage ON leads(stage) WHERE is_active = TRUE;
CREATE INDEX idx_leads_score ON leads(score DESC);
CREATE INDEX idx_leads_linkedin_url ON leads(linkedin_url);
CREATE INDEX idx_leads_created ON leads(created_at DESC);

-- ============================================
-- 4. lead_posts bağlantı tablosu (çoktan-çoğa)
-- ============================================
CREATE TABLE lead_posts (
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (lead_id, post_id)
);

-- ============================================
-- 5. messages tablosu
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Mesaj içeriği
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('dm', 'email')),
  subject VARCHAR(500),
  body TEXT NOT NULL,

  -- Onay iş akışı
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'sent')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  sent_at TIMESTAMPTZ,

  -- Düzenleme geçmişi
  original_body TEXT,
  edit_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_lead ON messages(lead_id);
CREATE INDEX idx_messages_user ON messages(user_id);
CREATE INDEX idx_messages_status ON messages(status);

-- ============================================
-- 6. activity_logs tablosu
-- ============================================
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Eylem detayları
  action_type VARCHAR(50) NOT NULL
    CHECK (action_type IN (
      'search_started', 'search_completed', 'post_classified',
      'lead_created', 'lead_stage_changed',
      'message_generated', 'message_approved', 'message_sent',
      'lead_merged', 'export_created'
    )),

  -- Aktör
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_system_action BOOLEAN DEFAULT FALSE,

  -- Etkilenen varlıklar
  entity_type VARCHAR(50),
  entity_id UUID,

  -- Ek bağlam
  details JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action_type);

-- ============================================
-- 7. saved_searches tablosu
-- ============================================
CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  keywords TEXT[] NOT NULL,
  max_posts INTEGER DEFAULT 100,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);

-- ============================================
-- 8. updated_at trigger fonksiyonu
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at trigger'larını tüm ilgili tablolara ekle
CREATE TRIGGER update_search_runs_updated_at
  BEFORE UPDATE ON search_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. Row Level Security (RLS)
-- ============================================

-- search_runs için RLS
ALTER TABLE search_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search_runs"
  ON search_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search_runs"
  ON search_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own search_runs"
  ON search_runs FOR UPDATE
  USING (auth.uid() = user_id);

-- leads için RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own leads"
  ON leads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leads"
  ON leads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads"
  ON leads FOR UPDATE
  USING (auth.uid() = user_id);

-- messages için RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = user_id);

-- activity_logs için RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity_logs"
  ON activity_logs FOR SELECT
  USING (auth.uid() = user_id OR is_system_action = TRUE);

CREATE POLICY "Users can insert activity_logs"
  ON activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id OR is_system_action = TRUE);

-- saved_searches için RLS
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved_searches"
  ON saved_searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved_searches"
  ON saved_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved_searches"
  ON saved_searches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved_searches"
  ON saved_searches FOR DELETE
  USING (auth.uid() = user_id);

-- posts için RLS (search_run üzerinden kullanıcı kontrolü)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view posts from own search_runs"
  ON posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM search_runs
      WHERE search_runs.id = posts.search_run_id
      AND search_runs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert posts to own search_runs"
  ON posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM search_runs
      WHERE search_runs.id = posts.search_run_id
      AND search_runs.user_id = auth.uid()
    )
  );

-- lead_posts için RLS
ALTER TABLE lead_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lead_posts"
  ON lead_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_posts.lead_id
      AND leads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own lead_posts"
  ON lead_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_posts.lead_id
      AND leads.user_id = auth.uid()
    )
  );
