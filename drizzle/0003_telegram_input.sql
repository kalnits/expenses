CREATE TABLE telegram_users (
  telegram_user_id TEXT PRIMARY KEY,
  person TEXT NOT NULL UNIQUE CHECK (person IN ('ilya', 'masha')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE telegram_updates (
  update_id INTEGER PRIMARY KEY,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

PRAGMA optimize;
