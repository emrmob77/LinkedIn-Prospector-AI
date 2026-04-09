-- Migration: 018_performance_indexes
-- Performans iyilestirmesi: Sik kullanilan sorgu pattern'lerine gore composite index'ler

-- Leads listesi sorgulari icin composite index (user_id + is_active filtreleme)
CREATE INDEX IF NOT EXISTS idx_leads_user_active
  ON leads(user_id, is_active) WHERE is_active = TRUE;

-- Leads email eslestirme icin (CSV import, duplicate kontrolu)
CREATE INDEX IF NOT EXISTS idx_leads_user_linkedin_url
  ON leads(user_id, linkedin_url);

-- Leads isim + sirket bazli arama icin (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_leads_user_name_company
  ON leads(user_id, lower(name), lower(company));

-- Messages listesi sorgulari icin (user_id + status filtreleme)
CREATE INDEX IF NOT EXISTS idx_messages_user_status
  ON messages(user_id, status);

-- Posts siniflandirma durumu icin (classified_at NULL olmayan kayitlar)
CREATE INDEX IF NOT EXISTS idx_posts_classified
  ON posts(search_run_id, classified_at) WHERE classified_at IS NOT NULL;

-- Bildirim sayisi icin (polling) — 015 migration'inda idx_activity_logs_unread zaten var
-- Ancak user_id bazli okunmamis bildirim sayisi icin daha spesifik bir index ekliyoruz
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON activity_logs(user_id) WHERE is_read = FALSE;
