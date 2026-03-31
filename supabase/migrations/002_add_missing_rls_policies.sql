-- Migration: 002_add_missing_rls_policies
-- Fix: Add missing DELETE policies and improve activity_logs RLS

-- search_runs DELETE policy
CREATE POLICY "Users can delete own search_runs"
  ON search_runs FOR DELETE
  USING (auth.uid() = user_id);

-- leads DELETE policy
CREATE POLICY "Users can delete own leads"
  ON leads FOR DELETE
  USING (auth.uid() = user_id);

-- messages DELETE policy
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (auth.uid() = user_id);

-- posts UPDATE policy
CREATE POLICY "Users can update posts from own search_runs"
  ON posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM search_runs
      WHERE search_runs.id = posts.search_run_id
      AND search_runs.user_id = auth.uid()
    )
  );

-- posts DELETE policy
CREATE POLICY "Users can delete posts from own search_runs"
  ON posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM search_runs
      WHERE search_runs.id = posts.search_run_id
      AND search_runs.user_id = auth.uid()
    )
  );

-- lead_posts UPDATE policy
CREATE POLICY "Users can update own lead_posts"
  ON lead_posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_posts.lead_id
      AND leads.user_id = auth.uid()
    )
  );

-- lead_posts DELETE policy
CREATE POLICY "Users can delete own lead_posts"
  ON lead_posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_posts.lead_id
      AND leads.user_id = auth.uid()
    )
  );

-- Fix activity_logs: restrict system actions to user's own entities
DROP POLICY IF EXISTS "Users can view own activity_logs" ON activity_logs;
CREATE POLICY "Users can view own activity_logs"
  ON activity_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Add missing indexes on lead_posts
CREATE INDEX IF NOT EXISTS idx_lead_posts_post ON lead_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_lead_posts_lead ON lead_posts(lead_id);
