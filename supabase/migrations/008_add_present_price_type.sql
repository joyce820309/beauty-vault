-- 更新 items.price_type 的 CHECK 約束，加入 'present'（禮物）
-- 用 DO 區塊找到並刪除現有約束（不管名稱是什麼）
DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  SELECT constraint_name INTO v_constraint
  FROM information_schema.table_constraints
  WHERE table_name = 'items'
    AND constraint_type = 'CHECK'
    AND constraint_name ILIKE '%price_type%'
  LIMIT 1;

  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE items DROP CONSTRAINT ' || quote_ident(v_constraint);
  END IF;
END $$;

-- 建立新約束，包含 'present'
ALTER TABLE items
  ADD CONSTRAINT items_price_type_check
  CHECK(price_type IN ('normal', 'split', 'gift', 'present'));
