-- Migration: 003_fix_rls_and_unique_constraints
-- Fixes from code review:
-- 1. activity_logs SELECT RLS: system actions with NULL user_id invisible
-- 2. activity_logs INSERT RLS: users can forge system actions
-- 3. leads.linkedin_url UNIQUE: breaks multi-tenancy

-- ============================================
-- Fix 1: activity_logs SELECT policy
-- System actions (user_id=NULL) were invisible after 002 fix.
-- Allow users to see their own logs + system actions tied to their entities.
-- ============================================
DROP POLICY IF EXISTS "Users can view own activity_logs" ON activity_logs;
CREATE POLICY "Users can view own activity_logs"
  ON activity_logs FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      is_system_action = TRUE
      AND (
        -- System actions on user's own entities
        (entity_type = 'search_run' AND entity_id IN (SELECT id FROM search_runs WHERE user_id = auth.uid()))
        OR (entity_type = 'lead' AND entity_id IN (SELECT id FROM leads WHERE user_id = auth.uid()))
        OR (entity_type = 'message' AND entity_id IN (SELECT id FROM messages WHERE user_id = auth.uid()))
        OR (entity_type = 'post' AND entity_id IN (
          SELECT p.id FROM posts p
          JOIN search_runs sr ON sr.id = p.search_run_id
          WHERE sr.user_id = auth.uid()
        ))
      )
    )
  );

-- ============================================
-- Fix 2: activity_logs INSERT policy
-- Remove is_system_action bypass - system actions should only be
-- inserted server-side via service role key (bypasses RLS).
-- ============================================
DROP POLICY IF EXISTS "Users can insert activity_logs" ON activity_logs;
CREATE POLICY "Users can insert own activity_logs"
  ON activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system_action = FALSE);

-- ============================================
-- Fix 3: leads.linkedin_url global UNIQUE breaks multi-tenancy
-- Two different users should be able to track the same LinkedIn person.
-- Change from global UNIQUE to per-user UNIQUE.
-- ============================================
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_linkedin_url_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_user_linkedin_url ON leads(user_id, linkedin_url);
