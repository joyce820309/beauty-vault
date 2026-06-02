-- Allow the browser anon key to manage wishlist rows.
-- The app currently has no login flow, so Supabase requests run as anon.
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE wishlist TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE wishlist_id_seq TO anon, authenticated;

DROP POLICY IF EXISTS "wishlist_select_for_app" ON wishlist;
DROP POLICY IF EXISTS "wishlist_insert_for_app" ON wishlist;
DROP POLICY IF EXISTS "wishlist_update_for_app" ON wishlist;
DROP POLICY IF EXISTS "wishlist_delete_for_app" ON wishlist;

CREATE POLICY "wishlist_select_for_app"
ON wishlist
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "wishlist_insert_for_app"
ON wishlist
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "wishlist_update_for_app"
ON wishlist
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "wishlist_delete_for_app"
ON wishlist
FOR DELETE
TO anon, authenticated
USING (true);
