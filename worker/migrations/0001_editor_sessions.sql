CREATE TABLE editor_tokens (
  hash TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('link', 'session')),
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_by TEXT
);
CREATE INDEX editor_tokens_expiry ON editor_tokens(expires_at);
CREATE TABLE editor_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
