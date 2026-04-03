-- LinkedIn Prospector AI - Chrome Extension Import Support
-- Migration: 006_extension_import
-- Add source column to search_runs and extend activity_logs action_type

-- ============================================
-- 1. search_runs: Add source column to distinguish import origin
-- ============================================
ALTER TABLE search_runs ADD COLUMN source VARCHAR(30) NOT NULL DEFAULT 'apify'
  CHECK (source IN ('apify', 'chrome_extension'));

-- Add page_url for extension imports (the LinkedIn page URL where posts were scraped)
ALTER TABLE search_runs ADD COLUMN page_url TEXT;

-- Make keywords nullable (extension imports may not have keywords)
ALTER TABLE search_runs ALTER COLUMN keywords DROP NOT NULL;

-- ============================================
-- 2. activity_logs: Extend action_type to include extension_import
-- ============================================
ALTER TABLE activity_logs DROP CONSTRAINT activity_logs_action_type_check;

ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_action_type_check
  CHECK (action_type IN (
    'search_started', 'search_completed', 'post_classified',
    'lead_created', 'lead_stage_changed',
    'message_generated', 'message_approved', 'message_sent',
    'lead_merged', 'export_created',
    'extension_import'
  ));
