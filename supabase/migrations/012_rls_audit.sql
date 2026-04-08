-- Migration: 012_rls_audit
-- RLS Audit: Eksik policy'leri ekle, guvenlik aciklari kapat
-- Tarih: 2026-04-08

-- ============================================
-- 1. user_settings: DELETE policy eksik
-- Hesap silme isleminde kullanici kendi ayarlarini silebilmeli
-- ============================================
CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 2. activity_logs: DELETE policy eksik
-- Hesap silme isleminde kullanici kendi log'larini silebilmeli
-- ============================================
CREATE POLICY "Users can delete own activity_logs"
  ON activity_logs FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. posts: UPDATE policy WITH CHECK eksik
-- Mevcut UPDATE policy sadece USING var, WITH CHECK yok.
-- Bu, kullanicinin baska bir search_run'a post tasiyabilecegi anlamina gelir.
-- WITH CHECK ile yeni degerin de kullaniciya ait oldugunu dogrula.
-- ============================================
-- Not: Mevcut policy 002'de olusturuldu ve sadece USING var.
-- PostgreSQL'de FOR UPDATE icin WITH CHECK yoksa USING otomatik kullanilir,
-- bu yeterli koruma saglar. Ek policy eklemeye gerek yok.

-- ============================================
-- 4. activity_logs: UPDATE policy eksik
-- Kullanicilar kendi activity_logs'larini guncelleyememeli (immutable log)
-- Mevcut politikalar: SELECT, INSERT, DELETE (yeni eklendi)
-- UPDATE policy kasitli olarak EKLENMEDI — loglar degistirilemez olmali
-- ============================================
