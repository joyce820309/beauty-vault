ALTER TABLE wishlist ADD COLUMN IF NOT EXISTS shade_zh TEXT;
ALTER TABLE wishlist ADD COLUMN IF NOT EXISTS shade_en TEXT;

UPDATE wishlist
SET shade_en = shade
WHERE shade_en IS NULL AND shade IS NOT NULL;