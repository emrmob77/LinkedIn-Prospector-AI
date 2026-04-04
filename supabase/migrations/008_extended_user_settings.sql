-- Extended User Settings - Firma bilgileri ve AI tercihleri
-- Migration: 008_extended_user_settings

-- Firma bilgileri
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS company_name VARCHAR(255) DEFAULT 'Kurumsal Hediye Firmasi';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS company_sector VARCHAR(255) DEFAULT 'Kurumsal hediye ve promosyon';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS product_description TEXT DEFAULT 'Kurumsal hediye, promosyon ürünleri, çalışan motivasyon paketleri, etkinlik organizasyonu malzemeleri';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS target_customer TEXT DEFAULT 'B2B firmalar, kurumsal etkinlik organizatörleri, İK departmanları, pazarlama ekipleri';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS company_website VARCHAR(500);

-- AI tercihleri
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_temperature DECIMAL(3,2) DEFAULT 0.3;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS auto_classify BOOLEAN DEFAULT true;
