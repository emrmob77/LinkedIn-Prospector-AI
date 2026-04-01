-- LinkedIn Prospector AI - Apify Integration Schema Update
-- Migration: 004_apify_integration
-- Apify supreme_coder/linkedin-post çıktısına göre posts tablosunu güncelle

-- ============================================
-- 1. posts tablosuna yeni alanlar ekle
-- ============================================

-- Yazar ek bilgileri
ALTER TABLE posts ADD COLUMN author_profile_picture VARCHAR(1000);
ALTER TABLE posts ADD COLUMN author_followers_count VARCHAR(50);
ALTER TABLE posts ADD COLUMN author_type VARCHAR(20) DEFAULT 'Person'
  CHECK (author_type IN ('Person', 'Company'));

-- Gönderi görselleri (URL dizisi olarak)
ALTER TABLE posts ADD COLUMN images JSONB DEFAULT '[]'::jsonb;

-- LinkedIn benzersiz gönderi ID'si (deduplicate için)
ALTER TABLE posts ADD COLUMN linkedin_urn VARCHAR(255);

-- Apify ham JSON çıktısı (debug ve gelecekte yeni alan çıkarma için)
ALTER TABLE posts ADD COLUMN raw_json JSONB;

-- ============================================
-- 2. raw_html → raw_json geçişi
-- ============================================
-- raw_html kolonunu koruyoruz (geriye uyumluluk), artık kullanılmayacak
-- Yeni veriler raw_json'a yazılacak

-- ============================================
-- 3. Yeni indeksler
-- ============================================

-- linkedin_urn ile hızlı deduplicate kontrolü
CREATE UNIQUE INDEX idx_posts_linkedin_urn ON posts(linkedin_urn) WHERE linkedin_urn IS NOT NULL;

-- Yazar tipine göre filtreleme
CREATE INDEX idx_posts_author_type ON posts(author_type);

-- ============================================
-- 4. search_runs tablosuna Apify alanları ekle
-- ============================================

-- Apify Actor çalıştırma bilgileri
ALTER TABLE search_runs ADD COLUMN apify_run_id VARCHAR(255);
ALTER TABLE search_runs ADD COLUMN apify_dataset_id VARCHAR(255);
ALTER TABLE search_runs ADD COLUMN search_url TEXT;

-- Arama filtreleri
ALTER TABLE search_runs ADD COLUMN date_filter VARCHAR(20)
  CHECK (date_filter IS NULL OR date_filter IN ('past-24h', 'past-week', 'past-month'));
ALTER TABLE search_runs ADD COLUMN geo_id VARCHAR(50);

-- ============================================
-- 5. leads tablosuna ek alanlar ekle
-- ============================================

-- Lead kaynağı (gönderi yazarı mı, yorumcu mu, beğenen mi)
ALTER TABLE leads ADD COLUMN source VARCHAR(20) DEFAULT 'post_author'
  CHECK (source IN ('post_author', 'commenter', 'reactor'));

-- Profil resmi
ALTER TABLE leads ADD COLUMN profile_picture VARCHAR(1000);
