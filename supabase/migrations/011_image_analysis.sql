-- 011: Image Analysis columns for AI vision feature
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_analysis JSONB;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_analyzed_at TIMESTAMPTZ;

COMMENT ON COLUMN posts.image_analysis IS 'AI görsel analiz sonuçları (ürünler, markalar, etkinlik türü, uygunluk skoru vb.)';
COMMENT ON COLUMN posts.image_analyzed_at IS 'Görsel analizinin yapıldığı tarih/saat';
