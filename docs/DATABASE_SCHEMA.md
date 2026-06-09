# BeautyVault 資料結構 (Database Schema)

> **⚠️ 注意：每次修改資料庫結構（新增 migration）時，請同步更新此文件。**

---

## items — 品項

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | SERIAL PK | 自增主鍵 |
| seq_no | INTEGER UNIQUE | 流水號 |
| item_type | TEXT | `makeup` / `skincare` |
| brand_en | TEXT | 品牌（原文） |
| brand_zh | TEXT | 品牌（中文） |
| name_en | TEXT | 品名（原文） |
| name_zh | TEXT | 品名（中文） |
| shade_en | TEXT | 色號（原文），化妝品專屬 |
| shade_zh | TEXT | 色號（中文），化妝品專屬 |
| category | TEXT | 分類 |
| subcategory | TEXT | 子分類 |
| mfg_date | DATE | 製造日期 |
| exp_date | DATE | 有效期限 |
| price | INTEGER | 購入金額（NTD） |
| price_type | TEXT | `normal` / `split` / `gift` / `present` |
| original_price | INTEGER | 組合總價（組合價時使用） |
| currency | TEXT | 外幣幣別 |
| purchase_date | DATE | 購入日期 |
| channel | TEXT | 購買通路 |
| image_url | TEXT | 產品圖片 URL |
| rating | INTEGER (1–5) | 評分，保養品專屬 |
| review | TEXT | 試用心得，保養品專屬 |
| sensitive_skin_ok | TEXT | 敏感肌適用：`ok` / `ng` / `untested` 等 |
| fragrance | TEXT | 香味：`strong` / `mild` / `none` |
| volume_ml | NUMERIC | 容量（ml），保養品專屬 |
| disposal_status | TEXT | 處置狀態：`kept` / `disposed` / `watching` |
| disposal_reason | TEXT | 處置原因：`finished` / `discarded` |
| is_dud | BOOLEAN | 是否為雷品 |
| is_sample | BOOLEAN | 是否為小樣 |
| is_favorite | BOOLEAN | 是否收藏 |
| ignore_health | BOOLEAN | 是否排除健康度計算 |
| note | TEXT | 備註 |
| created_at | TIMESTAMPTZ | 建立時間 |
| updated_at | TIMESTAMPTZ | 更新時間（自動觸發） |

---

## skin_records — 膚況紀錄

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | SERIAL PK | 自增主鍵 |
| recorded_at | DATE | 量測日期 |
| moisture | INTEGER (0–100) | 水份 |
| sebum | INTEGER (0–100) | 油脂 |
| keratin | INTEGER (0–100) | 角質 |
| resilience | INTEGER (0–100) | 彈性 |
| accumulation | INTEGER (0–100) | 堆積 |
| skin_engy | INTEGER (0–100) | 膚能量 |
| note | TEXT | 備註 |
| created_at | TIMESTAMPTZ | 建立時間 |

---

## profile — 個人檔案

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | SERIAL PK | 自增主鍵 |
| seasonal_color | TEXT | 個人色彩：`spring` / `summer` / `autumn` / `winter` |
| face_shape | TEXT | 臉型 |
| skin_type | TEXT | 膚質 |
| note | TEXT | 備註 |
| updated_at | TIMESTAMPTZ | 更新時間 |

---

## treatments — 醫美療程項目

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | SERIAL PK | 自增主鍵 |
| name | TEXT | 療程名稱（如「皮秒雷射」） |
| note | TEXT | 備註 |
| created_at | TIMESTAMPTZ | 建立時間 |
| updated_at | TIMESTAMPTZ | 更新時間 |

## treatment_purchases — 醫美購入紀錄

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | SERIAL PK | 自增主鍵 |
| treatment_id | INTEGER FK → treatments | 關聯療程 |
| purchase_type | TEXT | `trial` / `single` / `package` |
| paid_sessions | INTEGER | 購買堂數 |
| bonus_sessions | INTEGER | 贈送堂數 |
| total_price | INTEGER | 總金額 |
| purchase_date | DATE | 購入日期 |
| note | TEXT | 備註 |
| created_at | TIMESTAMPTZ | 建立時間 |

## treatment_sessions — 醫美施作紀錄

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | SERIAL PK | 自增主鍵 |
| treatment_id | INTEGER FK → treatments | 關聯療程 |
| session_date | DATE | 施作日期 |
| note | TEXT | 備註 |
| created_at | TIMESTAMPTZ | 建立時間 |

---

## wishlist_items — 願望清單

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | SERIAL PK | 自增主鍵 |
| item_type | TEXT | `makeup` / `skincare` |
| brand | TEXT | 品牌 |
| name_zh | TEXT | 品名（中文） |
| name_en | TEXT | 品名（原文） |
| shade | TEXT | 色號 |
| price_type | TEXT | `normal` / `split` / `gift` |
| price | INTEGER | 預估金額 |
| url | TEXT | 商品連結 |
| image_url | TEXT | 圖片 URL |
| note | TEXT | 備註 |
| is_purchased | BOOLEAN | 是否已購入 |
| created_at | TIMESTAMPTZ | 建立時間 |

---

## medication_records — 用藥紀錄

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | SERIAL PK | 自增主鍵 |
| pickup_date | DATE | 拿藥日期 |
| reason | TEXT | 原因（症狀/就診科別） |
| note | TEXT | 備註 |
| created_at | TIMESTAMPTZ | 建立時間 |
| updated_at | TIMESTAMPTZ | 更新時間 |

## medication_items — 藥品明細

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | SERIAL PK | 自增主鍵 |
| medication_record_id | INTEGER FK → medication_records | 關聯用藥紀錄 |
| name | TEXT | 藥品名稱 |
| ingredients | TEXT | 成分 |
| mfg_date | DATE | 製造日期 |
| exp_date | DATE | 有效期限 |
| image_front_url | TEXT | 正面照片 |
| image_back_url | TEXT | 背面照片 |
| image_urls | TEXT[] | 其他照片 |
| note | TEXT | 備註 |
| created_at | TIMESTAMPTZ | 建立時間 |

---

## tools — 美容工具

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | SERIAL PK | 自增主鍵 |
| brand_en | TEXT | 品牌（原文） |
| brand_zh | TEXT | 品牌（中文） |
| name_en | TEXT | 名稱（原文） |
| name_zh | TEXT | 名稱（中文） |
| category | TEXT | 分類 |
| price | INTEGER | 購入金額 |
| price_type | TEXT | 價格類型 |
| currency | TEXT | 幣別 |
| purchase_date | DATE | 購入日期 |
| mfg_date | DATE | 製造日期 |
| exp_date | DATE | 有效期限 |
| image_url | TEXT | 圖片 URL |
| status | TEXT | `active` / `stored` / `retired` |
| clean_cycle_days | INTEGER | 清潔週期（天） |
| last_cleaned_at | DATE | 最後清潔日期 |
| rating | INTEGER (1–5) | 評分 |
| sensitive_skin_ok | TEXT | 敏感肌適用 |
| is_favorite | BOOLEAN | 是否收藏 |
| note | TEXT | 備註 |
| created_at | TIMESTAMPTZ | 建立時間 |
| updated_at | TIMESTAMPTZ | 更新時間 |

---

## channels — 購買通路

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | SERIAL PK | 自增主鍵 |
| label | TEXT UNIQUE | 通路名稱 |
| sort_order | INTEGER | 排序 |
| created_at | TIMESTAMPTZ | 建立時間 |

---

## 關聯關係

```
treatments       1 ── N  treatment_purchases
treatments       1 ── N  treatment_sessions
medication_records 1 ── N  medication_items
items            N ── 1  channels（via channel 欄位）
```
