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

## Kalan İyileştirmeler (MVP Sonrası / Faz 2)

- [ ] Performans optimizasyonu (Redis cache, sorgu optimizasyonu)
- [ ] Lead-post referans bütünlüğü kontrolleri
- [ ] RLS policy audit (veri sahipliği doğrulama)
- [ ] API hız sınırlama (rate limiting)
- [ ] Birim testler ve property testler
- [ ] Kaydedilmiş arama (DB bazlı, şu an localStorage favoriler var)
- [ ] Extension parser iyileştirmesi (LinkedIn SDUI değişikliklerine adaptasyon)
- [ ] Mesaj gönderim entegrasyonu (LinkedIn API / email API)
- [ ] CRM entegrasyonu (Faz 3)

## API Endpoint'leri (19 aktif)

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
