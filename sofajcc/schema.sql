-- SoFa Good Deeds Chain — D1 schema
CREATE TABLE IF NOT EXISTS good_deeds (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  deed       TEXT NOT NULL,
  location   TEXT,
  status     TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip_hash    TEXT
);

CREATE INDEX IF NOT EXISTS idx_deeds_status_created
  ON good_deeds (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deeds_iphash_created
  ON good_deeds (ip_hash, created_at DESC);
