-- AI Prompt alanları - Kullanıcının AI davranışını özelleştirmesi
-- Migration: 009_ai_prompt_fields

-- Sınıflandırma talimatı: AI hangi postları "ilgili" sayacak
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS classification_prompt TEXT DEFAULT 'Kurumsal hediye, promosyon ürünleri, çalışan motivasyonu, etkinlik organizasyonu ile ilgili postları ilgili olarak işaretle. B2B hediye alımı sinyallerini ve rakip firma aktivitelerini de yakala.';

-- Firma bağlamı: AI''ın bilmesi gereken firma bilgisi
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS company_context TEXT DEFAULT 'Kurumsal hediye ve promosyon sektöründe faaliyet gösteren bir firmayız. Ürünlerimiz: kurumsal hediyeler, promosyon ürünleri, çalışan motivasyon paketleri. Hedef müşterilerimiz: B2B firmalar, İK departmanları, pazarlama ekipleri.';

-- Mesaj oluşturma talimatı: AI mesaj yazarken neye dikkat etsin
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS message_prompt TEXT DEFAULT 'Samimi ve profesyonel ton kullan. Satış baskısı yapma, değer önerisi sun. Kişinin paylaşımını referans al. Türkçe yaz.';
