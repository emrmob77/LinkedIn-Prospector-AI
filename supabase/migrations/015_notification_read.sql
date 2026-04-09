-- activity_logs tablosuna bildirim okuma durumu kolonu ekle
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Okunmamis bildirimleri hizli sorgulamak icin partial index
CREATE INDEX IF NOT EXISTS idx_activity_logs_unread
  ON activity_logs(user_id, is_read) WHERE is_read = FALSE;
