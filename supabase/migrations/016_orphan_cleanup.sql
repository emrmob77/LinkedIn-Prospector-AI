-- Migration: 016_orphan_cleanup
-- Lead-Post referans butunlugu: orphan kayitlari temizle

-- 1. first_post_id NULL olan lead'leri lead_posts'tan doldur
UPDATE leads l
SET first_post_id = (
  SELECT lp.post_id FROM lead_posts lp
  WHERE lp.lead_id = l.id
  ORDER BY lp.created_at ASC
  LIMIT 1
)
WHERE l.first_post_id IS NULL
  AND EXISTS (SELECT 1 FROM lead_posts lp WHERE lp.lead_id = l.id);

-- 2. lead_posts'ta artik olmayan lead veya post referanslarini temizle
-- (CASCADE zaten yapiyor ama FK constraint olmadan eklenmis kayitlar icin guvenlik)
DELETE FROM lead_posts lp
WHERE NOT EXISTS (SELECT 1 FROM leads l WHERE l.id = lp.lead_id)
   OR NOT EXISTS (SELECT 1 FROM posts p WHERE p.id = lp.post_id);
