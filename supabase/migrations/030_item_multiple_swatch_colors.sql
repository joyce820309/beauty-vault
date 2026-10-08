-- 色票支援多個（例如眼影盤多色），改為陣列欄位
ALTER TABLE items ADD COLUMN IF NOT EXISTS swatch_colors TEXT[] NOT NULL DEFAULT '{}';

UPDATE items
SET swatch_colors = ARRAY[swatch_color]
WHERE swatch_color IS NOT NULL
  AND COALESCE(array_length(swatch_colors, 1), 0) = 0;
