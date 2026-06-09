-- ── 1. 新建三張表 ────────────────────────────────────────────────

-- 療程項目（去重，例如「皮秒雷射」只有一筆）
CREATE TABLE IF NOT EXISTS treatments (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 購入紀錄（每次加購一筆）
CREATE TABLE IF NOT EXISTS treatment_purchases (
  id              SERIAL PRIMARY KEY,
  treatment_id    INTEGER NOT NULL REFERENCES treatments(id) ON DELETE CASCADE,
  purchase_type   TEXT NOT NULL DEFAULT 'package'
                  CHECK(purchase_type IN ('trial', 'single', 'package')),
  paid_sessions   INTEGER NOT NULL DEFAULT 1,
  bonus_sessions  INTEGER NOT NULL DEFAULT 0,
  total_price     INTEGER,
  purchase_date   DATE NOT NULL,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 施作紀錄（直接掛 treatment，不綁 purchase）
CREATE TABLE IF NOT EXISTS treatment_sessions (
  id              SERIAL PRIMARY KEY,
  treatment_id    INTEGER NOT NULL REFERENCES treatments(id) ON DELETE CASCADE,
  session_date    DATE NOT NULL,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE treatments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_sessions  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all" ON treatments          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON treatment_purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON treatment_sessions  FOR ALL USING (true) WITH CHECK (true);

-- ── 2. 舊資料搬移 ────────────────────────────────────────────────

-- 將每筆 aesthetic_records 建立對應的 treatment + purchase
INSERT INTO treatments (name, note, created_at)
SELECT DISTINCT ON (treatment_name)
  treatment_name,
  note,
  MIN(created_at)
FROM aesthetic_records
GROUP BY treatment_name, note;

-- 為每筆舊紀錄建立 purchase（全部 migrate 成 package）
INSERT INTO treatment_purchases
  (treatment_id, purchase_type, paid_sessions, bonus_sessions, total_price, purchase_date, note)
SELECT
  t.id,
  'package',
  ar.total_sessions,
  0,
  ar.total_price,
  ar.treatment_date,
  ar.description
FROM aesthetic_records ar
JOIN treatments t ON t.name = ar.treatment_name;

-- 將舊施作紀錄搬到 treatment_sessions（透過 purchase 找 treatment_id）
INSERT INTO treatment_sessions (treatment_id, session_date, note, created_at)
SELECT
  tp.treatment_id,
  sl.session_date,
  sl.note,
  sl.created_at
FROM aesthetic_session_logs sl
JOIN treatment_purchases tp
  ON tp.purchase_date = (
    SELECT treatment_date FROM aesthetic_records WHERE id = sl.aesthetic_record_id
  )
  AND tp.treatment_id = (
    SELECT t.id FROM treatments t
    JOIN aesthetic_records ar ON ar.treatment_name = t.name
    WHERE ar.id = sl.aesthetic_record_id
    LIMIT 1
  );
