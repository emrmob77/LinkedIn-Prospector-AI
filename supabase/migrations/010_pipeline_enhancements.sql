-- Pipeline Gelistirme: Kategori, Rakip, Marka Haric Tutma
-- 2026-04-07

-- 1. Leads tablosuna proje tipi ve rakip alanlari
ALTER TABLE leads ADD COLUMN IF NOT EXISTS project_type VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_competitor BOOLEAN DEFAULT FALSE;

-- 2. User settings'e haric tutulan markalar
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS excluded_brands JSONB DEFAULT '[]'::jsonb;

-- 3. Indexler
CREATE INDEX IF NOT EXISTS idx_leads_project_type ON leads(project_type) WHERE project_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_competitor ON leads(is_competitor) WHERE is_competitor = TRUE;
