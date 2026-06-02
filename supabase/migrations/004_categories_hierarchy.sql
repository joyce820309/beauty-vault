-- Step 1: 加 parent_id 欄位
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;

-- Step 2: 插入化妝品大類
INSERT INTO categories (item_type, value, label, sort_order) VALUES
  ('makeup', 'parent_base',     '底妝',     0),
  ('makeup', 'parent_eyes',     '眼妝',     1),
  ('makeup', 'parent_lips',     '唇妝',     2),
  ('makeup', 'parent_cheeks',   '頰妝',     3),
  ('makeup', 'parent_tools',    '工具',     4),
  ('makeup', 'parent_other_mk', '其他彩妝', 5)
ON CONFLICT (item_type, value) DO NOTHING;

-- Step 3: 插入保養品大類
INSERT INTO categories (item_type, value, label, sort_order) VALUES
  ('skincare', 'parent_cleanse',   '清潔',     0),
  ('skincare', 'parent_basic',     '基礎保養', 1),
  ('skincare', 'parent_treatment', '特效保養', 2),
  ('skincare', 'parent_other_sk',  '其他保養', 3)
ON CONFLICT (item_type, value) DO NOTHING;

-- Step 4: 設定化妝品子類的 parent_id
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE value = 'parent_base'     AND item_type = 'makeup'   LIMIT 1)
  WHERE item_type = 'makeup'   AND value IN ('primer', 'foundation', 'concealer', 'setting') AND parent_id IS NULL;

UPDATE categories SET parent_id = (SELECT id FROM categories WHERE value = 'parent_eyes'     AND item_type = 'makeup'   LIMIT 1)
  WHERE item_type = 'makeup'   AND value IN ('eyeshadow', 'eyeliner', 'brow', 'mascara')     AND parent_id IS NULL;

UPDATE categories SET parent_id = (SELECT id FROM categories WHERE value = 'parent_lips'     AND item_type = 'makeup'   LIMIT 1)
  WHERE item_type = 'makeup'   AND value IN ('lip')                                           AND parent_id IS NULL;

UPDATE categories SET parent_id = (SELECT id FROM categories WHERE value = 'parent_cheeks'   AND item_type = 'makeup'   LIMIT 1)
  WHERE item_type = 'makeup'   AND value IN ('blush', 'highlighter')                         AND parent_id IS NULL;

UPDATE categories SET parent_id = (SELECT id FROM categories WHERE value = 'parent_tools'    AND item_type = 'makeup'   LIMIT 1)
  WHERE item_type = 'makeup'   AND value IN ('brush_tool')                                   AND parent_id IS NULL;

UPDATE categories SET parent_id = (SELECT id FROM categories WHERE value = 'parent_other_mk' AND item_type = 'makeup'   LIMIT 1)
  WHERE item_type = 'makeup'   AND value IN ('other_makeup')                                 AND parent_id IS NULL;

-- Step 5: 設定保養品子類的 parent_id
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE value = 'parent_cleanse'   AND item_type = 'skincare' LIMIT 1)
  WHERE item_type = 'skincare' AND value IN ('cleanser')                                      AND parent_id IS NULL;

UPDATE categories SET parent_id = (SELECT id FROM categories WHERE value = 'parent_basic'     AND item_type = 'skincare' LIMIT 1)
  WHERE item_type = 'skincare' AND value IN ('toner', 'serum', 'lotion', 'cream')            AND parent_id IS NULL;

UPDATE categories SET parent_id = (SELECT id FROM categories WHERE value = 'parent_treatment' AND item_type = 'skincare' LIMIT 1)
  WHERE item_type = 'skincare' AND value IN ('eye_care', 'face_oil', 'sunscreen', 'mask')    AND parent_id IS NULL;

UPDATE categories SET parent_id = (SELECT id FROM categories WHERE value = 'parent_other_sk'  AND item_type = 'skincare' LIMIT 1)
  WHERE item_type = 'skincare' AND value IN ('other_skincare')                               AND parent_id IS NULL;
