CREATE TABLE IF NOT EXISTS channels (
  id         SERIAL PRIMARY KEY,
  label      TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner access" ON channels USING (true) WITH CHECK (true);

INSERT INTO channels (label, sort_order) VALUES
  ('寶雅',    0),
  ('康是美',  1),
  ('屈臣氏',  2),
  ('蝦皮',    3),
  ('momo',    4),
  ('PC home', 5),
  ('專櫃',    6),
  ('官網',    7),
  ('其他',    8)
ON CONFLICT (label) DO NOTHING;
