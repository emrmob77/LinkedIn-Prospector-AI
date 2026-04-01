-- Migration: 005_fix_not_null_constraints
-- 004 migration'ındaki eksik NOT NULL kısıtlamalarını düzelt

-- Önce mevcut NULL değerleri default ile doldur
UPDATE posts SET author_type = 'Person' WHERE author_type IS NULL;
UPDATE posts SET images = '[]'::jsonb WHERE images IS NULL;
UPDATE leads SET source = 'post_author' WHERE source IS NULL;

-- NOT NULL kısıtlamalarını ekle
ALTER TABLE posts ALTER COLUMN author_type SET NOT NULL;
ALTER TABLE posts ALTER COLUMN images SET NOT NULL;
ALTER TABLE leads ALTER COLUMN source SET NOT NULL;
