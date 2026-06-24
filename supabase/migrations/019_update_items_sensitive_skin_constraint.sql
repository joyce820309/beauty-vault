-- items.sensitive_skin_ok 的 check constraint 只有舊值 ('ok','ng','untested')
-- 需要對齊 ItemFormPage 使用的新值
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_sensitive_skin_ok_check;
ALTER TABLE items ADD CONSTRAINT items_sensitive_skin_ok_check
  CHECK (sensitive_skin_ok IN ('all_ok', 'avoid_postop', 'sensitive_avoid', 'ng', 'untested', 'ok'));
