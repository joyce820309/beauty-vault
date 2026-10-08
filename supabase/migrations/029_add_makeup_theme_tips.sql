-- 各分區化妝小訣竅（眼妝／頰妝／唇妝），顯示於妝容主題詳情頁
ALTER TABLE makeup_themes ADD COLUMN eye_tip TEXT;
ALTER TABLE makeup_themes ADD COLUMN cheek_tip TEXT;
ALTER TABLE makeup_themes ADD COLUMN lip_tip TEXT;
