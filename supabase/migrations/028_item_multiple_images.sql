ALTER TABLE items
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

UPDATE items
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL
  AND COALESCE(array_length(image_urls, 1), 0) = 0;