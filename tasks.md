# LinkedIn Prospector AI — Gorev Takibi

Son guncelleme: 2026-04-09

## Durum Ozeti

| Kategori | Sayi |
|----------|------|
| Tamamlanan gorevler | 52 |
| Devam eden gorevler | 2 |
| Planlanmis gorevler | 30 |
| API endpoint sayisi | 35 |
| Migration sayisi | 17 |
| Sayfa sayisi | 11 |
| Servis sayisi | 6 |
| Bilesen sayisi | 35 |

---

## Faz 1: MVP (Tamamlandi)

- [x] 1. Proje yapisi ve cekirdek altyapi (Next.js 14, TypeScript, Tailwind, shadcn/ui)
- [x] 2. Veritabani semasi ve migration'lar (001-009)
- [x] 3. TypeScript tip tanimlari (`src/types/models.ts`)
- [x] 4. Supabase Auth (login, signup, middleware, extension token bridge)
- [x] 5. Chrome Extension (SDUI + legacy DOM parser, popup, service-worker, token-bridge)
- [x] 6. Extension Import API (`POST /api/extension/import` — auto-classify + lead extraction)
- [x] 7. Extension + Import entegrasyon testi
- [x] 9. AI Classification Service (classifyPost, scoreLead, generateMessage — 4 provider destegi)
- [x] 10. Lead cikarma ve deduplication (extractLeadsBatch, duplicate kontrol, sanitize)
- [x] 12. Activity Log servisi (logActivity fire-and-forget, tum route'lara entegre)
- [x] 14. Lead yonetim API'leri (GET/PATCH/POST — leads, stage, stats, archived, score)
- [x] 15. AI mesaj olusturma (`POST /api/leads/:id/generate-message`, `GET /:id/messages`)
- [x] 16. Mesaj onay workflow (`PATCH /api/messages/:id`, `POST /approve`, `POST /reject`)
- [x] 18. Dashboard stats + activity log API (`GET /api/dashboard/stats`, `GET /api/activity-log`)
- [x] 19. Disa aktarma (`POST /api/export` — CSV/JSON, UTF-8 BOM, Turkce basliklar)
- [x] 20. Dashboard sayfasi (gercek API verileriyle, metrik kartlari, grafikler, funnel)
- [x] 21. LinkedIn Arama sayfasi (import history, AI siniflandir butonu, post grid/list, filtre)
- [x] 22. Iletisim Hatti sayfasi (6 asamali pipeline, lead detay panel, mesaj olustur/onayla/reddet)
- [x] 24. Raporlama sayfasi (activity log tablosu, filtreler, sayfalama, CSV export butonu)
- [x] 25. Import favorileri (yildiz ile localStorage'da favori kaydetme)
- [x] 26. Yapilandirma sayfasi (4 AI provider key, model dropdown, prompt'lar, firma bilgileri)
- [x] 27. Guvenlik — hesap silme (`DELETE /api/account`, cascade delete)
- [x] 28. Hata yonetimi standardizasyonu (`apiError`/`handleApiError` utility)
- [x] 31. Arsiv API (`GET /api/leads/archived`)
- [x] 33. Ilgisiz post filtreleme toggle (search results'ta)
- [x] 40. Import sonrasi otomatik AI siniflandirma + lead cikarma + scoring

### MVP'den Cikarilan Gorevler
- ~~8. BullMQ is kuyrugu~~ — Gereksiz karmasiklik, senkron calisma yeterli
- ~~13. Arama API endpoint'leri~~ — Apify kaldirildi, Chrome Extension birincil kaynak

---

## Faz 2: Pipeline Gelistirme (Tamamlandi)

- [x] 42. Bug Fix: Sirket Adi Bos Geliyor
  - [x] 42.1 `sanitizeField()` duzeltmesi — "sirketi" suffix strip
- [x] 43. Pipeline Kategorilendirme (Proje Amaci)
  - [x] 43.1 DB migration (010): leads'e `project_type`, `is_competitor`; user_settings'e `excluded_brands`
  - [x] 43.2 Tip guncellemeleri (Lead, UserSettings, UserSettingsPublic)
  - [x] 43.3 Lead extraction'da project_type turetme
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
  - [x] 46.1 Rakip toggle API endpoint (`PATCH /api/leads/:id/competitor`)
  - [x] 46.2 Lead detay panelinde rakip toggle butonu
  - [x] 46.3 Pipeline'da "Rakipler" filtresi / ayri gorunum
- [x] 47. Kanban Board gorunumu (drag & drop ile asama degistirme)
- [x] 48. Lead Cikar butonu (pipeline sayfasi, `POST /api/leads/extract`)

---

## Faz 2: AI & Gorsel Analiz (Tamamlandi)

- [x] 41. AI Gorsel Analiz
  - [x] 41.1 DB migration (011): `posts` tablosuna `image_analysis` JSONB ve `image_analyzed_at`
  - [x] 41.2 AIClient'a `chatWithVision` metodu (4 provider: Anthropic, OpenAI, Gemini, OpenRouter)
  - [x] 41.3 Image analysis servisi (`src/services/imageAnalysisService.ts`)
  - [x] 41.4 API endpoint: `POST /api/posts/:id/analyze-image`
  - [x] 41.5 Post card UI: "AI Analiz" butonu + sonuc paneli
- [x] 49. Vision model secimi ayarlarda (`013_vision_model` migration)
- [x] 50. chatWithVision duzeltmesi — kullanicinin text model'i yerine vision model kullanma
- [x] 51. Gemini model guncelleme (mevcut modeller) + batch delay artirma
- [x] 52. Classification polling duzeltmesi + deprecated Gemini model fix
- [x] 53. Canli siniflandirma ilerlemesi (background classify + progress bar)
- [x] 54. Free tier algilama duzeltmesi (`is_free_tier` flag + `usage_daily`)
- [x] 55. OpenRouter kullanim limiti gostergesi ve classify debugging
- [x] 56. AI kullanim badge kaldirma (yaniltici bilgi)
- [x] 57. Sonsuz re-render dongusu duzeltmesi (AI usage badge)
- [x] 58. Deprecated free model yerine 3 calisan OpenRouter free model

---

## Faz 2: Altyapi Iyilestirmeleri (Tamamlandi)

- [x] 59. Cache katmani (`src/lib/cache.ts` — in-memory TTL cache)
- [x] 60. Rate limiting (`src/lib/rate-limiter.ts`, `src/lib/with-rate-limit.ts`)
- [x] 61. RLS policy audit (migration 012)
- [x] 62. Kayitli aramalar — DB bazli (`saved-searches` API + UI)
  - [x] 62.1 `GET/POST /api/saved-searches`
  - [x] 62.2 `DELETE /api/saved-searches/:id`
  - [x] 62.3 Kaydet butonu her zaman gorunur (disable state ile)
- [x] 63. Extension parser iyilestirmesi (SDUI hardening)
- [x] 64. Brand filtreleme kodu merkezi fonksiyona cikarildi (`src/lib/brand-filter.ts` — DRY refactor)
- [x] 65. Competitor toggle icin activity log kaydi (migration 014)
- [x] 66. Backfill endpoint'leri
  - [x] 66.1 `POST /api/leads/backfill-company` — Sirket adi backfill
  - [x] 66.2 `POST /api/leads/backfill-project-type` — Proje tipi backfill

---

## Faz 3: Urun Analizi & Bildirimler (Tamamlandi)

- [x] 67. Urun Analizi sayfasi (`/products`)
  - [x] 67.1 `GET /api/products/stats` — Gorsel analizden urun/marka/etkinlik istatistikleri
  - [x] 67.2 Urun analizi sayfasi UI (brand/author filtreleme)
- [x] 68. Bildirim sistemi
  - [x] 68.1 `GET /api/notifications` — Bildirim listesi
  - [x] 68.2 `GET /api/notifications/count` — Okunmamis bildirim sayisi
  - [x] 68.3 `POST /api/notifications/read` — Bildirimleri okundu isaretle
  - [x] 68.4 Migration (015): `notification_read` tablosu
  - [x] 68.5 Notification dropdown bilesenei (header'da)
- [x] 69. Orphan veri temizligi
  - [x] 69.1 `GET /api/admin/orphan-check` — Sahipsiz veri kontrolu
  - [x] 69.2 Migration (016): Orphan cleanup

---

## Faz 3: Email & Mesaj Gonderim (Devam Ediyor)

- [x] 70. Email servisi (`src/services/emailService.ts`)
  - [x] 70.1 Multi-provider destek (Resend, Gmail SMTP, genel SMTP)
  - [x] 70.2 Resend API entegrasyonu
  - [x] 70.3 Gmail App Password (nodemailer) entegrasyonu
  - [x] 70.4 Genel SMTP entegrasyonu
- [x] 71. Email gonderim API (`POST /api/messages/:id/send`)
  - [x] 71.1 Onaylanmis mesaj kontrolu
  - [x] 71.2 Kullanici email ayarlarini cekme + decryption
  - [x] 71.3 Email gonderim + status guncelleme
- [x] 72. Email provider ayarlari UI (Resend/Gmail/SMTP tab'lari)
  - [x] 72.1 Ayarlar sayfasinda email provider secimi
  - [x] 72.2 Provider'a gore form alanlari
  - [x] 72.3 Migration (017): email_support tablosu
- [x] 73. Email gonderim UI tamamlama
  - [x] 73.1 Lead detay paneline email input alani (lead'e email adresi ekleme)
  - [x] 73.2 Onaylanmis mesajlarda "Gonder" butonu
  - [x] 73.3 Gonderim durumu badge'leri (gonderildi / basarisiz / beklemede)
  - [x] 73.4 DM mesajlari icin "Gonderildi Isaretle" endpoint + UI
  - _Sorumluluk: Frontend + Backend_
  - _Bagimlilık: 70, 71, 72 (tamamlandi)_

---

## Faz 4: Planlanmis Gorevler

### P1 - Lead Email & Gonderim UI
- [x] 74. Lead'e email adresi ekleme
  - [x] 74.1 Lead detay paneline email input alani (Backend: leads PATCH endpoint mevcut)
  - [x] 74.2 Email alani UI (Frontend: lead-detail-panel.tsx — inline edit)
- [x] 75. Email gonder butonu (onaylanmis mesajlar)
  - [x] 75.1 Mesaj kartina "Email Gonder" butonu
  - [x] 75.2 Gonderim sonrasi status guncelleme
- [x] 76. DM mesajlari icin "Gonderildi Isaretle"
  - [x] 76.1 `PATCH /api/messages/:id/mark-sent` endpoint
  - [x] 76.2 Mesaj kartina "Gonderildi Isaretle" butonu
- [x] 77. Gonderim durumu badge'leri
  - [x] 77.1 Mesaj kartlarinda durum badge'leri (gonderildi / basarisiz / beklemede)

### P2 - Toplu Email Import (CSV)
- [x] 78. CSV parse utility
  - [ ] 78.1 CSV parser fonksiyonu (`src/lib/csv-parser.ts`)
  - [ ] 78.2 Kolon eslestirme (LinkedIn URL / isim+sirket / email)
  - [ ] 78.3 Validasyon (email format, URL format, bos satir kontrolu)
  - _Sorumluluk: Backend_
  - _Bagimlilık: Yok_
- [x] 79. Import API endpoint
  - [ ] 79.1 `POST /api/leads/import-csv` endpoint
  - [ ] 79.2 Mevcut lead eslestirme (LinkedIn URL veya isim+sirket ile)
  - [ ] 79.3 Yeni lead olusturma (eslesme yoksa)
  - [ ] 79.4 Import sonuc raporu donme (eklenen / eslesen / hata)
  - _Sorumluluk: Backend_
  - _Bagimlilık: 78_
- [x] 80. Import modal UI
  - [ ] 80.1 Dosya yukleme alani (drag & drop)
  - [ ] 80.2 Kolon eslestirme onizleme tablosu
  - [ ] 80.3 Import sonuc raporu dialog'u
  - [ ] 80.4 Pipeline sayfasina "CSV Import" butonu
  - _Sorumluluk: Frontend_
  - _Bagimlilık: 79_

### P2 - Ayarlar Sayfasi Email Test
- [ ] 81. Email provider test akisi
  - [ ] 81.1 "Test Email Gonder" butonu (ayarlar sayfasi)
  - [ ] 81.2 `POST /api/settings/test-email` endpoint
  - [ ] 81.3 Gmail App Password akisi dokumantasyonu
  - _Sorumluluk: Backend + Frontend + QA_
  - _Bagimlilık: 72_

### P3 - Lead Enrichment
- [ ] 82. Sirket bilgisi zenginlestirme
  - [ ] 82.1 Proxycurl entegrasyonu veya LinkedIn company page parse
  - [ ] 82.2 Sirket konum, calisan sayisi, sektor bilgisi cekme
  - [ ] 82.3 Lead detay panelinde zenginlestirilmis bilgi gosterimi
  - [ ] 82.4 Toplu enrichment endpoint'i
  - _Sorumluluk: Backend + Frontend_
  - _Bagimlilık: Yok_

### P3 - CRM Entegrasyonu
- [ ] 83. HubSpot export
  - [ ] 83.1 HubSpot API entegrasyonu (contacts + deals)
  - [ ] 83.2 Field mapping (lead alanlari <-> HubSpot properties)
  - [ ] 83.3 Export butonu + ayarlar sayfasinda API key
  - _Sorumluluk: Backend + Frontend_
  - _Bagimlilık: Yok_
- [ ] 84. Salesforce export
  - [ ] 84.1 Salesforce API entegrasyonu
  - [ ] 84.2 Field mapping
  - [ ] 84.3 Export butonu
  - _Sorumluluk: Backend + Frontend_
  - _Bagimlilık: Yok_
- [ ] 85. Webhook destegi
  - [ ] 85.1 Webhook URL tanimlama (ayarlar sayfasi)
  - [ ] 85.2 Olay bazli webhook tetikleme (yeni lead, asama degisimi, mesaj onay)
  - [ ] 85.3 Webhook log / retry mekanizmasi
  - _Sorumluluk: Backend + Frontend_
  - _Bagimlilık: Yok_

### P3 - Birim Testler
- [ ] 86. Jest test altyapisi
  - [ ] 86.1 Jest config duzenleme (mevcut config var, test dosyasi yok)
  - [ ] 86.2 Test utility'leri (mock Supabase client, mock AI client)
  - _Sorumluluk: QA_
  - _Bagimlilık: Yok_
- [ ] 87. Servis katmani testleri
  - [ ] 87.1 `aiClassificationService` testleri
  - [ ] 87.2 `leadExtractionService` testleri
  - [ ] 87.3 `emailService` testleri
  - [ ] 87.4 `imageAnalysisService` testleri
  - [ ] 87.5 `activityLogService` testleri
  - _Sorumluluk: QA_
  - _Bagimlilık: 86_
- [ ] 88. API endpoint testleri
  - [ ] 88.1 Auth middleware testleri
  - [ ] 88.2 Leads CRUD testleri
  - [ ] 88.3 Messages workflow testleri
  - [ ] 88.4 Export testleri
  - [ ] 88.5 Settings testleri
  - _Sorumluluk: QA_
  - _Bagimlilık: 86_

### P2 - Backend Eksiklikleri (Agent Analizi)
- [x] 92. Leads API'de email alani eksik
  - [ ] 92.1 `mapLeadToResponse()` fonksiyonuna `email` alani ekle (`src/app/api/leads/route.ts:119-142`)
  - [ ] 92.2 `LeadData` interface'ine `email: string | null` ekle (`pipeline-table.tsx:65-89`)
  - [ ] 92.3 Pipeline tablosunda email kolonu goster
  - _Sorumluluk: Backend + Frontend_
- [x] 93. Messages API'de deliveryStatus eksik
  - [ ] 93.1 `GET /api/leads/:id/messages` response'una `deliveryStatus` ve `deliveryError` ekle
  - _Sorumluluk: Backend_
- [x] 94. Export'ta email alani eksik
  - [ ] 94.1 Export sorgusuna `email` alani ekle (`src/app/api/export/route.ts:123-126`)
  - [ ] 94.2 CSV/JSON ciktisina email kolonu dahil et
  - _Sorumluluk: Backend_
- [x] 95. DRY refactor: mapLeadToResponse ve mapMessage tekrari
  - [ ] 95.1 `mapLeadToResponse` fonksiyonunu `src/lib/mappers.ts`'e tasi (5 dosyada tekrar ediyor)
  - [ ] 95.2 `mapMessage` fonksiyonunu `src/lib/mappers.ts`'e tasi (3 dosyada tekrar ediyor)
  - _Sorumluluk: Backend_
- [x] 96. Rate limiter yayginlastirma
  - [ ] 96.1 `withRateLimit` wrapper'i AI endpoint'lerine ekle (classify, generate-message, analyze-image)
  - [ ] 96.2 Yazma endpoint'lerine ekle (export, extension/import)
  - _Sorumluluk: Backend_
- [x] 97. Dead code temizligi
  - [ ] 97.1 `src/lib/queue.ts` (BullMQ kuyrugu) — tanimli ama hic kullanilmiyor, kaldir
  - [ ] 97.2 `src/lib/redis.ts` — Redis baglantisi tanimli ama aktif degil, kaldir veya Upstash'e gecir
  - _Sorumluluk: Backend_

### P2 - Extension Eksiklikleri (Agent Analizi)
- [x] 98. Popup'ta parse metrikleri gosterimi
  - [ ] 98.1 content.js'den gelen `meta` objesini popup'ta goster (basarili/basarisiz/confidence)
  - [ ] 98.2 Tarama sonrasi ozet: "15 post bulundu, 12 basariyla ayristirild, 3 hatali"
  - _Sorumluluk: Extension Developer_
- [x] 99. Extension ikonu eksik
  - [ ] 99.1 manifest.json'a `default_icon` ekle (16x16, 32x32, 48x48, 128x128)
  - _Sorumluluk: Extension Developer_
- [x] 100. Service worker'da islenmemis mesajlar
  - [ ] 100.1 `NEW_POSTS_DETECTED` ve `PAGE_CHANGED` icin handler ekle veya kaldir
  - _Sorumluluk: Extension Developer_
- [ ] 101. LinkedIn profil sayfasindan email yakalama
  - [ ] 101.1 "Contact Info" bolumunden email cikarma (acik profiller icin)
  - [ ] 101.2 Yakalanan email'i lead'e otomatik eslestirme
  - _Sorumluluk: Extension Developer_
  - _Not: LinkedIn TOS uyumlulugu degerlendirilmeli_

### P2 - Frontend Eksiklikleri (Agent Analizi)
- [x] 102. Mesajlar sayfasi (`/messages`)
  - [ ] 102.1 Tum mesajlari listeleyen ayri sayfa olustur
  - [ ] 102.2 Filtreler: durum (pending/approved/sent), tip (dm/email), lead
  - [ ] 102.3 Sidebar'a "Mesajlar" menu ogesi ekle
  - _Sorumluluk: Frontend_

### P3 - Performans & Olceklenebilirlik (Tamamlandi)
- [x] 89. Cache yayginlastirma (leads list, products stats, activity log)
  - [ ] 89.1 Redis baglanti (`src/lib/redis.ts` mevcut ama kullanilmiyor)
  - [ ] 89.2 In-memory cache'i Redis ile degistirme
  - [ ] 89.3 Cache invalidation stratejisi
  - _Sorumluluk: Backend_
  - _Bagimlilık: Yok_
- [x] 90. Sorgu optimizasyonu (migration 018: 6 performans index'i)
  - [ ] 90.1 Yavas sorgu tespiti (EXPLAIN ANALYZE)
  - [ ] 90.2 Index onerisi ve eklenmesi
  - [ ] 90.3 N+1 sorgu tespiti ve duzeltmesi
  - _Sorumluluk: Backend_
  - _Bagimlilık: Yok_
- [x] 91. Admin cleanup endpoint (POST /api/admin/cleanup — eski loglar, orphan, cache)
  - [ ] 91.1 Orphan lead tespiti ve temizligi (kismen mevcut: orphan-check)
  - [ ] 91.2 Periyodik temizlik mekanizmasi
  - _Sorumluluk: Backend_
  - _Bagimlilık: 69_

---

## API Endpoint Envanteri (35 aktif)

| Endpoint | Metod | Dosya | Aciklama |
|----------|-------|-------|----------|
| `/api/health` | GET | `src/app/api/health/route.ts` | Sistem saglik kontrolu |
| `/api/extension/import` | POST | `src/app/api/extension/import/route.ts` | Post import (auto-classify + lead extraction) |
| `/api/extension/me` | GET | `src/app/api/extension/me/route.ts` | Extension baglanti durumu kontrolu |
| `/api/posts/classify` | POST | `src/app/api/posts/classify/route.ts` | AI siniflandirma + lead extraction + scoring |
| `/api/posts/:id/analyze-image` | POST | `src/app/api/posts/[id]/analyze-image/route.ts` | AI gorsel analiz |
| `/api/leads` | GET | `src/app/api/leads/route.ts` | Lead listesi (filtre, sayfalama, siralama) |
| `/api/leads/:id` | GET | `src/app/api/leads/[id]/route.ts` | Lead detayi + iliskili postlar |
| `/api/leads/:id/stage` | PATCH | `src/app/api/leads/[id]/stage/route.ts` | Pipeline asamasi guncelleme |
| `/api/leads/:id/competitor` | PATCH | `src/app/api/leads/[id]/competitor/route.ts` | Rakip toggle |
| `/api/leads/:id/generate-message` | POST | `src/app/api/leads/[id]/generate-message/route.ts` | AI mesaj olusturma (DM + email) |
| `/api/leads/:id/messages` | GET | `src/app/api/leads/[id]/messages/route.ts` | Lead'in mesajlari |
| `/api/leads/stats` | GET | `src/app/api/leads/stats/route.ts` | Pipeline istatistikleri |
| `/api/leads/archived` | GET | `src/app/api/leads/archived/route.ts` | Arsivlenmis lead'ler |
| `/api/leads/score` | POST | `src/app/api/leads/score/route.ts` | Manuel lead puanlama |
| `/api/leads/extract` | POST | `src/app/api/leads/extract/route.ts` | Manuel lead cikarma |
| `/api/leads/backfill-company` | POST | `src/app/api/leads/backfill-company/route.ts` | Sirket adi backfill |
| `/api/leads/backfill-project-type` | POST | `src/app/api/leads/backfill-project-type/route.ts` | Proje tipi backfill |
| `/api/messages/:id` | PATCH | `src/app/api/messages/[id]/route.ts` | Mesaj duzenleme |
| `/api/messages/:id/approve` | POST | `src/app/api/messages/[id]/approve/route.ts` | Mesaj onaylama |
| `/api/messages/:id/reject` | POST | `src/app/api/messages/[id]/reject/route.ts` | Mesaj reddetme |
| `/api/messages/:id/send` | POST | `src/app/api/messages/[id]/send/route.ts` | Email gonderim |
| `/api/search/history` | GET | `src/app/api/search/history/route.ts` | Import gecmisi |
| `/api/search/:runId/posts` | GET | `src/app/api/search/[runId]/posts/route.ts` | Import'un postlari |
| `/api/saved-searches` | GET, POST | `src/app/api/saved-searches/route.ts` | Kayitli aramalar CRUD |
| `/api/saved-searches/:id` | DELETE | `src/app/api/saved-searches/[id]/route.ts` | Kayitli arama silme |
| `/api/dashboard/stats` | GET | `src/app/api/dashboard/stats/route.ts` | Dashboard metrikleri |
| `/api/activity-log` | GET | `src/app/api/activity-log/route.ts` | Aktivite kayitlari |
| `/api/products/stats` | GET | `src/app/api/products/stats/route.ts` | Urun/marka/etkinlik istatistikleri |
| `/api/notifications` | GET | `src/app/api/notifications/route.ts` | Bildirim listesi |
| `/api/notifications/count` | GET | `src/app/api/notifications/count/route.ts` | Okunmamis bildirim sayisi |
| `/api/notifications/read` | POST | `src/app/api/notifications/read/route.ts` | Bildirimleri okundu isaretle |
| `/api/admin/orphan-check` | GET | `src/app/api/admin/orphan-check/route.ts` | Sahipsiz veri kontrolu |
| `/api/settings` | GET, PUT | `src/app/api/settings/route.ts` | Kullanici ayarlari |
| `/api/export` | POST | `src/app/api/export/route.ts` | Lead disa aktarma (CSV/JSON) |
| `/api/account` | DELETE | `src/app/api/account/route.ts` | Hesap silme (cascade) |

---

## Migration Envanteri (17 dosya)

| # | Dosya | Aciklama |
|---|-------|----------|
| 001 | `001_initial_schema.sql` | Temel tablolar: users, posts, leads, messages, search_runs |
| 002 | `002_add_missing_rls_policies.sql` | Eksik RLS politikalari |
| 003 | `003_fix_rls_and_unique_constraints.sql` | RLS ve unique constraint duzeltmeleri |
| 004 | `004_apify_integration.sql` | Apify entegrasyonu (sonradan kaldirildi) |
| 005 | `005_fix_not_null_constraints.sql` | NOT NULL constraint duzeltmeleri |
| 006 | `006_extension_import.sql` | Extension import destegi |
| 007 | `007_user_settings.sql` | Kullanici ayarlari tablosu |
| 008 | `008_extended_user_settings.sql` | Genisletilmis kullanici ayarlari |
| 009 | `009_ai_prompt_fields.sql` | AI prompt alanlari |
| 010 | `010_pipeline_enhancements.sql` | Pipeline: project_type, is_competitor, excluded_brands |
| 011 | `011_image_analysis.sql` | Post gorsel analiz alanlari (image_analysis JSONB) |
| 012 | `012_rls_audit.sql` | RLS politika denetimi ve iyilestirme |
| 013 | `013_vision_model.sql` | Vision model secimi alani |
| 014 | `014_competitor_action_type.sql` | Competitor toggle activity log tipi |
| 015 | `015_notification_read.sql` | Bildirim okundu tablosu |
| 016 | `016_orphan_cleanup.sql` | Sahipsiz veri temizligi |
| 017 | `017_email_support.sql` | Email provider ayarlari |

---

## Sayfa Envanteri (11 sayfa)

| Sayfa | Dosya | Aciklama |
|-------|-------|----------|
| `/` | `src/app/page.tsx` | Landing / yonlendirme |
| `/login` | `src/app/login/page.tsx` | Giris sayfasi |
| `/signup` | `src/app/signup/page.tsx` | Kayit sayfasi |
| `/dashboard` | `src/app/dashboard/page.tsx` | Dashboard (metrikler, grafikler, funnel) |
| `/search` | `src/app/search/page.tsx` | LinkedIn arama + import gecmisi |
| `/pipeline` | `src/app/pipeline/page.tsx` | Iletisim hatti (tablo + Kanban) |
| `/products` | `src/app/products/page.tsx` | Urun analizi (marka/yazar filtreleme) |
| `/reports` | `src/app/reports/page.tsx` | Raporlama (aktivite log) |
| `/settings` | `src/app/settings/page.tsx` | Yapilandirma (AI, email, firma) |
| `/profile` | `src/app/profile/page.tsx` | Profil + hesap silme |
| `/auth/extension-token` | `src/app/auth/extension-token/page.tsx` | Extension token bridge |

---

## Servis Envanteri (6 servis)

| Servis | Dosya | Aciklama |
|--------|-------|----------|
| AI Classification | `src/services/aiClassificationService.ts` | Post siniflandirma, lead puanlama, mesaj olusturma |
| Lead Extraction | `src/services/leadExtractionService.ts` | Lead cikarma, deduplication, sanitize |
| Image Analysis | `src/services/imageAnalysisService.ts` | Gorsel analiz (urun/marka tespiti) |
| Email | `src/services/emailService.ts` | Email gonderim (Resend, Gmail, SMTP) |
| Activity Log | `src/services/activityLogService.ts` | Aktivite kaydi (fire-and-forget) |
| Extension Import | `src/services/extensionImportService.ts` | Extension'dan post import isleme |

---

## Mimari Notlar

### Cache Katmani
- `src/lib/cache.ts` — In-memory TTL cache (Map tabanli)
- Varsayilan TTL: endpoint'e gore degisir
- Production'da Redis'e gecis planlaniyor (`src/lib/redis.ts` mevcut ama aktif degil)
- Cache invalidation: yazma islemlerinde ilgili cache key'leri temizlenir

### Email Provider Mimarisi
- `src/services/emailService.ts` — 3 provider destegi (Resend, Gmail SMTP, genel SMTP)
- Provider secimi kullanici ayarlarindan gelir (`user_settings.email_provider`)
- API key'ler sifrelenerek saklanir (`src/lib/crypto.ts`)
- `POST /api/messages/:id/send` — Onaylanmis mesaji email olarak gonderir
- Ayarlar sayfasinda tab bazli UI (Resend / Gmail / SMTP)

### Extension Parser Stratejisi
- Birincil: LinkedIn SDUI parser (React component tree'den veri cekme)
- Fallback: Legacy DOM parser (klasik HTML parsing)
- 5 sayfa tipi destegi: feed, profile, company, search, hashtag
- Hardening: LinkedIn SDUI degisikliklerine karsi dayaniklilik iyilestirmeleri yapildi
- Token bridge: Extension ile web app arasinda auth paylasimi

### Rate Limiting
- `src/lib/rate-limiter.ts` — Token bucket algoritmasi
- `src/lib/with-rate-limit.ts` — Route handler wrapper
- IP bazli + kullanici bazli limit destegi

### AI Provider Mimarisi
- 4 provider: Anthropic Claude, OpenAI GPT, Google Gemini, OpenRouter
- `src/lib/ai-client.ts` — Unified AI client (chat + vision)
- `src/lib/ai-models.ts` — Provider bazli model listeleri
- Kullanici bazli API key depolama (sifrelenmis)
- Vision model ayri secilebilir (text model'den bagimsiz)
