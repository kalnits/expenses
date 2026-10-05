CREATE TABLE telegram_pending_expenses (
  id TEXT PRIMARY KEY,
  telegram_user_id TEXT NOT NULL REFERENCES telegram_users(telegram_user_id) ON DELETE CASCADE,
  draft_json TEXT NOT NULL,
  capture_method TEXT NOT NULL CHECK (capture_method IN ('text', 'voice', 'receipt')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'editing', 'confirmed')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_telegram_pending_user_status
ON telegram_pending_expenses (telegram_user_id, status, created_at);

PRAGMA optimize;
