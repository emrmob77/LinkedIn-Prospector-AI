-- 013: Görsel analiz modeli seçimi
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS vision_model VARCHAR(255);
