-- Migration: 014_competitor_action_type
-- Add 'competitor_toggled' to activity_logs action_type constraint

ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_action_type_check;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_action_type_check
  CHECK (action_type IN (
    'search_started', 'search_completed', 'post_classified',
    'lead_created', 'lead_stage_changed',
    'message_generated', 'message_approved', 'message_sent',
    'lead_merged', 'export_created', 'extension_import',
    'competitor_toggled'
  ));
