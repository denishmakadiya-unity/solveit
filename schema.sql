-- SolveIt D1 schema. Apply with:
--   npx wrangler d1 execute solveit --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,          -- epoch milliseconds
  day TEXT NOT NULL,            -- YYYY-MM-DD (UTC)
  e TEXT NOT NULL,              -- event name
  t TEXT,                       -- tool id
  w TEXT,                       -- workflow slug
  q TEXT,                       -- search query (lowercased, max 120 chars)
  v INTEGER,                    -- numeric value (duration, count)
  m TEXT,                       -- short meta (error message, intent id)
  p TEXT,                       -- page path
  s TEXT                        -- random per-visit session id (not linked to a person)
);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events (ts);
CREATE INDEX IF NOT EXISTS idx_events_e_ts ON events (e, ts);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  name TEXT,
  email TEXT NOT NULL,
  topic TEXT,
  message TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
  k TEXT PRIMARY KEY,
  n INTEGER NOT NULL,
  exp INTEGER NOT NULL
);
