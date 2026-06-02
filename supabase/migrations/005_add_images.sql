-- 確保 wishlist 與 medication 相關表存在（首次執行時建立，已存在則略過）
CREATE TABLE IF NOT EXISTS wishlist (
  id           SERIAL PRIMARY KEY,
  brand        TEXT,
  name_zh      TEXT,
  name_en      TEXT,
  shade        TEXT,
  price_type   TEXT CHECK(price_type IN ('normal','split','gift')),
  price        INTEGER,
  url          TEXT,
  image_url    TEXT,
  note         TEXT,
  is_purchased BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medication_records (
  id          SERIAL PRIMARY KEY,
  pickup_date DATE NOT NULL,
  reason      TEXT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medication_items (
  id                   SERIAL PRIMARY KEY,
  medication_record_id INTEGER NOT NULL REFERENCES medication_records(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  ingredients          TEXT,
  image_front_url      TEXT,
  image_back_url       TEXT,
  image_urls           TEXT[] DEFAULT '{}',
  note                 TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 表已存在時補欄位（IF NOT EXISTS 確保冪等）
ALTER TABLE wishlist ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE medication_items ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';
