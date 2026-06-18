-- Rename user-created category values to readable names
-- 蜜粉 custom_1780508218481 -> pressedPowder
-- 蜜粉餅 custom_1780508225666 -> powderFoundation
-- 散粉 custom_1780508207984 -> looseSettingPowder
-- 定妝噴霧 custom_1780508230882 -> fixingSpray
-- 眼影打底 custom_1780889429443 -> eyePrimer
-- 定妝（父類） parent_1780508188533 -> parent_setting

-- Step 1: update items.category first (before categories.value changes break FK if any)
UPDATE items SET category = 'pressedPowder'     WHERE category = 'custom_1780508218481';
UPDATE items SET category = 'powderFoundation'  WHERE category = 'custom_1780508225666';
UPDATE items SET category = 'looseSettingPowder' WHERE category = 'custom_1780508207984';
UPDATE items SET category = 'fixingSpray'       WHERE category = 'custom_1780508230882';
UPDATE items SET category = 'eyePrimer'         WHERE category = 'custom_1780889429443';
UPDATE items SET category = 'parent_setting'    WHERE category = 'parent_1780508188533';

-- Step 2: update categories.value
UPDATE categories SET value = 'pressedPowder'      WHERE value = 'custom_1780508218481';
UPDATE categories SET value = 'powderFoundation'   WHERE value = 'custom_1780508225666';
UPDATE categories SET value = 'looseSettingPowder' WHERE value = 'custom_1780508207984';
UPDATE categories SET value = 'fixingSpray'        WHERE value = 'custom_1780508230882';
UPDATE categories SET value = 'eyePrimer'          WHERE value = 'custom_1780889429443';
UPDATE categories SET value = 'parent_setting'     WHERE value = 'parent_1780508188533';
