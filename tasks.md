# Uygulama Planı: LinkedIn Prospector AI

## Genel Bakış

LinkedIn Prospector AI — Chrome Extension ile LinkedIn'den post yakalayan, AI ile sınıflandıran, lead çıkaran ve kişiselleştirilmiş mesaj oluşturan SaaS platformu.

## Tech Stack
- Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui
- Supabase (PostgreSQL + Auth + RLS)
- AI: 4 provider (Anthropic Claude, OpenAI, Google Gemini, OpenRouter)
- Chrome Extension (Manifest V3)
- Vercel (Production deployment)

## Tamamlanan Görevler

- [x] 1. Proje yapısı ve çekirdek altyapı
- [x] 2. Veritabanı şeması ve migration'lar (9 migration)
- [x] 3. TypeScript tip tanımları
- [x] 4. Supabase Auth (login, signup, middleware, extension token bridge)
- [x] 5. Chrome Extension (SDUI + legacy DOM parser, popup, service-worker, token-bridge)
- [x] 6. Extension Import API (POST /api/extension/import, duplicate kontrol, CORS)
- [x] 7. Extension + Import entegrasyon testi
- [x] 9. AI Classification Service (classifyPost, scoreLead, generateMessage — 4 provider desteği)
- [x] 10. Lead çıkarma ve deduplication (extractLeadsBatch, duplicate kontrol, sanitize)
- [x] 12. Activity Log servisi (logActivity fire-and-forget, tüm route'lara entegre)
- [x] 14. Lead yönetim API'leri (GET /api/leads, GET /:id, PATCH /:id/stage, GET /stats, GET /archived, POST /score)
- [x] 15. AI mesaj oluşturma (POST /api/leads/:id/generate-message, GET /:id/messages)
- [x] 16. Mesaj onay workflow (PATCH /api/messages/:id, POST /approve, POST /reject)
- [x] 18. Dashboard stats + activity log API (GET /api/dashboard/stats, GET /api/activity-log)
- [x] 19. Dışa aktarma (POST /api/export — CSV/JSON, UTF-8 BOM, Türkçe başlıklar)
- [x] 20. Dashboard sayfası (gerçek API verileriyle, metrik kartları, grafikler)
- [x] 21. LinkedIn Arama sayfası (import history, AI sınıflandır butonu, post grid/list, ilgili/ilgisiz filtre)
- [x] 22. İletişim Hattı sayfası (6 aşamalı pipeline, lead detay panel, mesaj oluştur/onayla/reddet)
- [x] 24. Raporlama sayfası (activity log tablosu, filtreler, sayfalama, CSV export butonu)
- [x] 25. Import favorileri (yıldız ile localStorage'da favori kaydetme)
- [x] 26. Yapılandırma sayfası (4 AI provider key, model dropdown, prompt'lar, firma bilgileri, temperature)
- [x] 27. Güvenlik — hesap silme (DELETE /api/account, cascade delete)
- [x] 28. Hata yönetimi standardizasyonu (apiError/handleApiError utility)
- [x] 31. Arşiv API (GET /api/leads/archived)
- [x] 33. İlgisiz post filtreleme toggle (search results'ta)
- [x] 40. Import sonrası otomatik AI sınıflandırma + lead çıkarma + scoring

## MVP'den Çıkarılan Görevler

- ~~8. BullMQ iş kuyruğu~~ — Gereksiz karmaşıklık, senkron çalışma yeterli
- ~~13. Arama API endpoint'leri~~ — Apify kaldırıldı, Chrome Extension birincil kaynak

## Faz 2 — Pipeline Gelistirme (Proje Amaci: Hos Geldin Hediyesi)

- [x] 42. Bug Fix: Sirket Adi Bos Geliyor
  - [x] 42.1 `sanitizeField()` duzeltmesi — "sirketi" suffix strip (null yerine)
- [x] 43. Pipeline Kategorilendirme (Proje Amaci)
  - [x] 43.1 DB migration: leads'e `project_type`, `is_competitor`; user_settings'e `excluded_brands`
  - [x] 43.2 Tip guncellemeleri (models.ts — Lead, UserSettings, UserSettingsPublic)
  - [x] 43.3 Lead extraction'da project_type turetme (post.giftType || post.theme)
  - [x] 43.4 Leads API'da projectType + isCompetitor response mapping + filtreler
  - [x] 43.5 Kanban kart + tablo'da projectType badge gosterimi
  - [x] 43.6 Pipeline sayfasinda proje tipi filtresi
- [x] 44. Lead Detay Zenginlestirme
  - [x] 44.1 Panel acildiginda iliskili post'lari cek (tema, hediye tipi, rakip, engagement)
  - [x] 44.2 Gonderiler ve Analiz bolumu (post kartlari, AI analiz aciklamasi)
- [x] 45. Marka Haric Tutma
  - [x] 45.1 Settings API'da excludedBrands field
  - [x] 45.2 Lead extraction'da excluded brands filtresi
  - [x] 45.3 Ayarlar sayfasinda "Haric Tutulan Markalar" UI (tag input)
- [x] 46. Rakip Isaretleme
  - [x] 46.1 Rakip toggle API endpoint (PATCH /api/leads/:id/competitor)
  - [x] 46.2 Lead detay panelinde rakip toggle butonu
  - [x] 46.3 Pipeline'da "Rakipler" filtresi / ayri gorunum

## Faz 2 — Diger Ozellikler

- [ ] 41. AI Görsel Analiz (Post görsellerinden ürün/marka tespiti)
  - [ ] 41.1 DB migration: `posts` tablosuna `image_analysis` JSONB ve `image_analyzed_at` kolonu
  - [ ] 41.2 AIClient'a `chatWithVision` metodu ekle (4 provider: Anthropic, OpenAI, Gemini, OpenRouter)
    - Anthropic: base64 image content block
    - OpenAI: image_url content block
    - Google: inlineData parts
    - OpenRouter: OpenAI uyumlu
  - [ ] 41.3 Image analysis servisi oluştur (`src/services/imageAnalysisService.ts`)
    - Prompt: firma bağlamına göre ürün/marka/etkinlik tespiti
    - Sonuç: `{ products, brands, eventType, qualityAssessment, relevanceScore, relevanceSummary }`
    - İlk görseli analiz et (max 3 görsel desteği)
  - [ ] 41.4 API endpoint: `POST /api/posts/:id/analyze-image`
    - LinkedIn CDN görsellerini server-side fetch → base64
    - AI vision çağrısı
    - Sonucu DB'ye kaydet (cache — 24 saat)
    - "Tekrar Analiz Et" seçeneği
  - [ ] 41.5 Post card UI: "AI Analiz" butonu + sonuç paneli
    - Paylaş ikonunun yanına ScanEye butonu (sadece görseli olan postlarda)
    - Sonuçlar: ürünler ve markalar badge olarak, etkinlik tipi, uygunluk skoru
    - Loading state, cache gösterimi
  - _Gereksinimler: Görsel içerik analizi, ürün tespiti, sektör uygunluk değerlendirmesi_

## Kalan İyileştirmeler (Faz 2+)

- [ ] Lead Enrichment: şirket konum, çalışan sayısı, sektör bilgisi (Proxycurl veya LinkedIn company page parse)
- [ ] Mevcut lead'ler için project_type backfill endpoint'i
- [ ] Brand filtreleme kodunu merkezi yardımcı fonksiyona çıkar (DRY refactor)
- [ ] Competitor toggle için activity log kaydı
- [ ] Performans optimizasyonu (Redis cache, sorgu optimizasyonu)
- [ ] Lead-post referans bütünlüğü kontrolleri
- [ ] RLS policy audit (veri sahipliği doğrulama)
- [ ] API hız sınırlama (rate limiting)
- [ ] Birim testler ve property testler
- [ ] Kaydedilmiş arama (DB bazlı, şu an localStorage favoriler var)
- [ ] Extension parser iyileştirmesi (LinkedIn SDUI değişikliklerine adaptasyon)
- [ ] Mesaj gönderim entegrasyonu (LinkedIn API / email API)
- [ ] CRM entegrasyonu (Faz 3)

## API Endpoint'leri (21 aktif)

### Extension
- `POST /api/extension/import` — Post import (auto-classify + lead extraction)
- `GET /api/extension/me` — Bağlantı durumu kontrolü

### Posts
- `POST /api/posts/classify` — AI sınıflandırma + lead extraction + scoring

### Leads
- `GET /api/leads` — Lead listesi (filtre, sayfalama, sıralama)
- `GET /api/leads/:id` — Lead detayı + ilişkili postlar
- `PATCH /api/leads/:id/stage` — Pipeline aşaması güncelleme
- `POST /api/leads/:id/generate-message` — AI mesaj oluşturma (DM + email)
- `GET /api/leads/:id/messages` — Lead'in mesajları
- `GET /api/leads/stats` — Pipeline istatistikleri
- `GET /api/leads/archived` — Arşivlenmiş lead'ler
- `POST /api/leads/score` — Manuel lead puanlama
- `PATCH /api/leads/:id/competitor` — Rakip toggle
- `POST /api/leads/backfill-company` — Şirket adı backfill

### Messages
- `PATCH /api/messages/:id` — Mesaj düzenleme
- `POST /api/messages/:id/approve` — Mesaj onaylama
- `POST /api/messages/:id/reject` — Mesaj reddetme

### Search
- `GET /api/search/history` — Import geçmişi
- `GET /api/search/:runId/posts` — Import'un postları

### Dashboard & Reports
- `GET /api/dashboard/stats` — Dashboard metrikleri
- `GET /api/activity-log` — Aktivite kayıtları

### Settings & Account
- `GET/PUT /api/settings` — Kullanıcı ayarları
- `POST /api/export` — Lead dışa aktarma (CSV/JSON)
- `DELETE /api/account` — Hesap silme
