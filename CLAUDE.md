# LinkedIn Prospector AI

AI destekli LinkedIn lead üretim platformu.

## Tech Stack
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, Supabase (PostgreSQL + Auth + RLS)
- **AI:** Claude API (lead scoring, classification)
- **Queue:** BullMQ + Redis
- **Veri Kaynağı:** Chrome Extension (LinkedIn sayfalarından post yakalama)

## Proje Yapısı
- `src/app/` — Next.js sayfalar ve API route'lar
- `src/components/` — React bileşenleri (layout, search, pipeline, messages)
- `src/services/` — İş mantığı servisleri
- `src/types/` — TypeScript tip tanımları
- `src/lib/` — Yardımcı kütüphaneler (Supabase client, Redis, Claude)
- `extension/` — Chrome Extension (content script, popup, background)
- `supabase/migrations/` — Veritabanı migration dosyaları

## Geliştirme
```bash
npm run dev          # Next.js dev server
npm run build        # Production build
npm run lint         # ESLint
```

## Kurallar
- Her zaman Türkçe yanıt ver
- shadcn/ui bileşenlerini kullan
- API route'larda Supabase auth kontrolü zorunlu
- Commit mesajları İngilizce
