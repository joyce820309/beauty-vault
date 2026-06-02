ALTER TABLE wishlist ADD COLUMN IF NOT EXISTS item_type TEXT CHECK(item_type IN ('makeup','skincare')) DEFAULT 'makeup';
