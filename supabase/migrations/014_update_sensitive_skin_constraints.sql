-- 更新 tools 的 sensitive_skin_ok check constraint（對齊 items 的新值）
ALTER TABLE tools DROP CONSTRAINT IF EXISTS tools_sensitive_skin_ok_check;
ALTER TABLE tools ADD CONSTRAINT tools_sensitive_skin_ok_check
  CHECK (sensitive_skin_ok IN ('all_ok', 'avoid_postop', 'sensitive_avoid', 'ng', 'untested', 'ok'));
