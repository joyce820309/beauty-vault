-- 支援同一槽位（如唇彩疊擦）多筆排序
ALTER TABLE makeup_theme_slots ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
