CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  item_type   TEXT NOT NULL CHECK(item_type IN ('makeup', 'skincare')),
  value       TEXT NOT NULL,
  label       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_type, value)
);

-- 化妝品類別（含妝前乳）
INSERT INTO categories (item_type, value, label, sort_order) VALUES
  ('makeup', 'primer',       '妝前乳',      0),
  ('makeup', 'foundation',   '粉底',        1),
  ('makeup', 'concealer',    '遮瑕',        2),
  ('makeup', 'blush',        '腮紅',        3),
  ('makeup', 'highlighter',  '打亮 / 修容', 4),
  ('makeup', 'eyeshadow',    '眼影',        5),
  ('makeup', 'eyeliner',     '眼線',        6),
  ('makeup', 'brow',         '眉毛',        7),
  ('makeup', 'mascara',      '睫毛膏',      8),
  ('makeup', 'lip',          '唇彩',        9),
  ('makeup', 'setting',      '定妝',        10),
  ('makeup', 'brush_tool',   '工具',        11),
  ('makeup', 'other_makeup', '其他彩妝',    12);

-- 保養品類別
INSERT INTO categories (item_type, value, label, sort_order) VALUES
  ('skincare', 'toner',         '化妝水',      0),
  ('skincare', 'serum',         '精華液',      1),
  ('skincare', 'lotion',        '乳液',        2),
  ('skincare', 'cream',         '乳霜',        3),
  ('skincare', 'eye_care',      '眼部保養',    4),
  ('skincare', 'face_oil',      '美容油',      5),
  ('skincare', 'sunscreen',     '防曬',        6),
  ('skincare', 'mask',          '面膜',        7),
  ('skincare', 'cleanser',      '卸妝 / 洗臉', 8),
  ('skincare', 'other_skincare','其他保養',    9);
