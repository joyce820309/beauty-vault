-- BeautyVault 初始 schema

-- 品項流水號 sequence
CREATE SEQUENCE items_seq_no_seq START 1;

-- 品項
CREATE TABLE items (
  id              SERIAL PRIMARY KEY,
  seq_no          INTEGER UNIQUE NOT NULL DEFAULT nextval('items_seq_no_seq'),
  brand_zh        TEXT,
  brand_en        TEXT,
  name_zh         TEXT,
  name_en         TEXT,
  shade_zh        TEXT,
  shade_en        TEXT,
  category        TEXT,
  subcategory     TEXT,
  item_type       TEXT NOT NULL CHECK(item_type IN ('makeup','skincare')),
  mfg_date        DATE,
  exp_date        DATE,
  price           INTEGER,
  purchase_date   DATE,
  image_url       TEXT,
  note            TEXT,
  -- 保養品專屬
  rating          INTEGER CHECK(rating BETWEEN 1 AND 5),
  review          TEXT,
  sensitive_skin_ok TEXT CHECK(sensitive_skin_ok IN ('ok','ng','untested')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 膚況紀錄
CREATE TABLE skin_records (
  id              SERIAL PRIMARY KEY,
  recorded_at     DATE NOT NULL,
  moisture        INTEGER CHECK(moisture BETWEEN 0 AND 100),
  sebum           INTEGER CHECK(sebum BETWEEN 0 AND 100),
  keratin         INTEGER CHECK(keratin BETWEEN 0 AND 100),
  resilience      INTEGER CHECK(resilience BETWEEN 0 AND 100),
  accumulation    INTEGER CHECK(accumulation BETWEEN 0 AND 100),
  skin_engy       INTEGER CHECK(skin_engy BETWEEN 0 AND 100),
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 個人檔案（單筆）
CREATE TABLE profile (
  id              SERIAL PRIMARY KEY,
  seasonal_color  TEXT CHECK(seasonal_color IN ('spring','summer','autumn','winter')),
  face_shape      TEXT,
  skin_type       TEXT,
  note            TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 醫美療程包
CREATE TABLE aesthetic_records (
  id              SERIAL PRIMARY KEY,
  treatment_date  DATE NOT NULL,
  treatment_name  TEXT NOT NULL,
  description     TEXT,
  total_price     INTEGER,
  total_sessions  INTEGER NOT NULL DEFAULT 1,
  used_sessions   INTEGER NOT NULL DEFAULT 0,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 醫美施作紀錄（子表）
CREATE TABLE aesthetic_session_logs (
  id                    SERIAL PRIMARY KEY,
  aesthetic_record_id   INTEGER NOT NULL REFERENCES aesthetic_records(id) ON DELETE CASCADE,
  session_date          DATE NOT NULL,
  note                  TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 自動更新 used_sessions 的 trigger
CREATE OR REPLACE FUNCTION sync_used_sessions()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE aesthetic_records
  SET used_sessions = (
    SELECT COUNT(*) FROM aesthetic_session_logs
    WHERE aesthetic_record_id = COALESCE(NEW.aesthetic_record_id, OLD.aesthetic_record_id)
  )
  WHERE id = COALESCE(NEW.aesthetic_record_id, OLD.aesthetic_record_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_used_sessions
AFTER INSERT OR DELETE ON aesthetic_session_logs
FOR EACH ROW EXECUTE FUNCTION sync_used_sessions();

-- 自動更新 updated_at 的 trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_items_updated_at
BEFORE UPDATE ON items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
