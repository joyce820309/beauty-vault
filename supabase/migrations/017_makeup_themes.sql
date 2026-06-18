-- 妝容主題表
CREATE TABLE makeup_themes (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 各槽位品項（每個主題對應多個槽位）
CREATE TABLE makeup_theme_slots (
  id              SERIAL PRIMARY KEY,
  theme_id        INTEGER NOT NULL REFERENCES makeup_themes(id) ON DELETE CASCADE,
  slot            TEXT NOT NULL,  -- eye_upper / eye_lower / cheek_expand / cheek_vibe / cheek_contour / lip_base / lip_liner / lip_color
  item_id         INTEGER REFERENCES items(id) ON DELETE SET NULL,
  custom_text     TEXT,           -- 自由輸入（不選品項時）
  shade_override  TEXT,           -- 手動覆蓋色號
  lip_base_bool   BOOLEAN,        -- 僅 lip_base slot 使用
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE makeup_themes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE makeup_theme_slots   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all" ON makeup_themes      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON makeup_theme_slots FOR ALL USING (true) WITH CHECK (true);
