# BeautyVault — 美妝保養品管理系統 PRD

> **版本**：v1.0  
> **用途**：交給 Claude Code / Cowork 實作的產品需求文件  
> **語言**：繁體中文介面，程式碼以英文命名

---

## 1. 專案概述

個人化的美妝保養品管理 Web App，解決以下痛點：
- Excel 管理品項不直覺、品名輸入費時
- 不知道哪些產品快到期
- 無法快速搜尋已購品項
- 膚況資料、醫美紀錄散落各處、無法追蹤趨勢

---

## 2. 技術選型

| 層級 | 建議技術 | 說明 |
|------|----------|------|
| 前端 | React + Vite + TailwindCSS | PWA 支援，可加入手機桌面 |
| 後端 / 資料庫 | Supabase（免費方案） | PostgreSQL + Auth + Storage |
| 圖片儲存 | Supabase Storage | 免費 1GB，足夠個人使用 |
| 圖表 | Recharts | React 生態，輕量 |
| 部署 | Vercel（免費方案） | 自動 CI/CD |

**RWD 優先**：手機（375px+）與桌面（1280px+）均需良好體驗。

---

## 3. 資料結構

### 3.1 品項（items）

```sql
id           SERIAL PRIMARY KEY
seq_no       INTEGER UNIQUE NOT NULL          -- 流水號（自動產生）
brand_zh     TEXT                             -- 品牌中文
brand_en     TEXT                             -- 品牌英文
name_zh      TEXT                             -- 品名中文
name_en      TEXT                             -- 品名英文
shade_zh     TEXT                             -- 色號中文
shade_en     TEXT                             -- 色號英文
category     TEXT                             -- 類別（見 §4.1）
subcategory  TEXT                             -- 子類別
item_type    TEXT CHECK(item_type IN ('makeup','skincare'))
mfg_date     DATE                             -- 製造日期
exp_date     DATE                             -- 有效期限
price        INTEGER                          -- 購入金額（NTD）
purchase_date DATE                            -- 購入日期
image_url    TEXT                             -- Supabase Storage URL
note         TEXT                             -- 備註
-- 保養品專屬
rating       INTEGER CHECK(rating BETWEEN 1 AND 5)
review       TEXT                             -- 試用心得
sensitive_skin_ok  TEXT CHECK(sensitive_skin_ok IN ('ok','ng','untested'))
created_at   TIMESTAMPTZ DEFAULT NOW()
updated_at   TIMESTAMPTZ DEFAULT NOW()
```

### 3.2 膚況紀錄（skin_records）

```sql
id              SERIAL PRIMARY KEY
recorded_at     DATE NOT NULL
moisture        INTEGER   -- 水分保持力 0-100
sebum           INTEGER   -- 皮脂分泌力 0-100
keratin         INTEGER   -- 角質 0-100
resilience      INTEGER   -- 對外部環境抵抗力 0-100
accumulation    INTEGER   -- 累積程度 0-100
skin_engy       INTEGER   -- Skin ENGY 0-100
note            TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### 3.3 個人檔案（profile）

```sql
id              SERIAL PRIMARY KEY
seasonal_color  TEXT CHECK(seasonal_color IN ('spring','summer','autumn','winter'))
face_shape      TEXT    -- oval / round / square / heart / oblong
skin_type       TEXT    -- dry / oily / combination / sensitive / normal
note            TEXT
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

### 3.4 醫美療程包（aesthetic_records）

```sql
id              SERIAL PRIMARY KEY
treatment_date  DATE NOT NULL
treatment_name  TEXT NOT NULL         -- 施作項目（例：皮秒雷射）
description     TEXT                  -- 施作內容
total_price     INTEGER               -- 總金額
total_sessions  INTEGER DEFAULT 1     -- 購入堂數
used_sessions   INTEGER DEFAULT 0     -- 已使用堂數（衍生自 session_logs，勿直接修改）
note            TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### 3.5 醫美施作紀錄（aesthetic_session_logs）

```sql
id                    SERIAL PRIMARY KEY
aesthetic_record_id   INTEGER REFERENCES aesthetic_records(id) ON DELETE CASCADE
session_date          DATE NOT NULL        -- 施作日期
note                  TEXT                 -- 本次施作備註
created_at            TIMESTAMPTZ DEFAULT NOW()
```

> `used_sessions` 由 `aesthetic_session_logs` 的筆數自動計算（trigger 或前端 count）。

---

## 4. 品項分類系統

### 4.1 化妝品（item_type = 'makeup'）

| category | 說明 |
|----------|------|
| foundation | 粉底 |
| concealer | 遮瑕 |
| blush | 腮紅 |
| highlighter | 打亮 / 修容 |
| eyeshadow | 眼影 |
| eyeliner | 眼線 |
| mascara | 睫毛膏 |
| lip | 唇彩（唇膏 / 唇釉 / 唇線筆） |
| setting | 定妝（蜜粉 / 噴霧） |
| brush_tool | 工具（刷具 / 海綿） |
| other_makeup | 其他彩妝 |

### 4.2 保養品（item_type = 'skincare'）

| category | subcategory 範例 |
|----------|-----------------|
| toner | 化妝水、化妝水（調理型）|
| serum | 精華液（保濕型）、精華液（功能型）|
| lotion | 乳液 |
| cream | 乳霜、眼霜 |
| sunscreen | 防曬 |
| mask | 面膜（片狀）、面膜（泥狀）|
| cleanser | 卸妝、洗臉 |
| other_skincare | 其他保養 |

---

## 5. 功能模組規格

### M1｜首頁儀表板

**即期預警 Banner**

顯示規則（依到期日距今天的天數）：

| 顏色 | 等級 | 條件 |
|------|------|------|
| 🔴 紅 | 緊急 | ≤ 30 天 |
| 🟠 橘 | 警告 | 31–90 天 |
| 🟡 黃 | 注意 | 91–180 天 |
| 🟢 綠 | 正常 | > 180 天（不顯示於 banner）|

- Banner 顯示各等級品項數，可展開查看清單
- 點擊品項跳轉至該品項詳情頁
- 今日到期者額外顯示「今日到期」標籤

**膚況狀態牌**

- 顯示最新一筆膚況的 6 維雷達圖（小型）
- 顯示與上一筆的變化箭頭（↑↓）
- 點擊跳轉膚況追蹤頁

---

### M2｜品項管理

**列表頁**

- 預設顯示全部品項，按購入日期降冪
- 頂部搜尋列：模糊搜尋（品牌、品名中英文、色號）
- 篩選標籤列：化妝品 / 保養品 / 全部；按類別二次篩選
- 保養品篩選時額外顯示敏感肌標籤篩選：**敏感肌 OK / NG / 未測試**（可單選或複選）
- 每筆品項卡片顯示：品牌、品名、色號、到期狀態色點、縮圖（有的話）
- 保養品卡片額外顯示敏感肌標籤（OK / NG / 未測試）

**新增 / 編輯表單**

欄位（依順序）：

1. **品項類型**（切換：化妝品 / 保養品）
2. **類別**（依品項類型動態顯示選項）
3. **品牌**（可輸入文字的 combobox，從既有品牌模糊篩選下拉）
4. **品名**（可輸入文字的 combobox，從既有品名模糊篩選下拉，顯示「品牌 — 品名」）
5. **色號**（文字輸入，中英文皆可）
6. **製造日期**（日期選擇器，格式 YYYY-MM-DD）
7. **有效期限**（日期選擇器）
8. **購入金額**（數字，NTD）
9. **購入日期**（日期選擇器）
10. **圖片**（上傳，壓縮後存 Supabase Storage）
11. **備註**（多行文字）
12. 若保養品，額外顯示：**評分**（1–5 星）、**試用心得**、**敏感肌適用**（OK / NG / 未測試）

> **Combobox 行為**：輸入時即時過濾既有資料；若無符合結果則允許自由輸入新值；支援鍵盤操作。

**詳情頁**

- 顯示所有欄位 + 圖片
- 右上角編輯 / 刪除按鈕

---

### M3｜搜尋

- 全域搜尋列（支援手機底部 navigation bar 快捷）
- 搜尋範圍：品牌（中英）、品名（中英）、色號（中英）、備註
- 模糊比對（包含即可，不需完整字串）
- 即時顯示結果（debounce 300ms）
- 結果按相關度排序（精確比對 > 前綴比對 > 包含比對）

---

### M4｜統計圖表

**化妝品分布圓餅圖**

- 可切換：品項數 / 金額比例
- 點擊扇形區塊篩選列表

**保養品分布圓餅圖**

- 同上邏輯

**消費趨勢折線圖**

- X 軸：月份（預設近 12 個月）
- Y 軸：購入金額（NTD）
- 可疊加：分類線（化妝品 vs 保養品）或品牌線
- 可切換時間區間：3 個月 / 6 個月 / 1 年 / 全部

**統計總覽卡片**

- 總品項數、總花費、今年花費、即期品項數

---

### M5｜膚況追蹤

**個人檔案（固定資訊）**

- 四季色（春 / 夏 / 秋 / 冬）
- 臉型（橢圓 / 圓 / 方 / 心形 / 長形）
- 膚質類型

**膚況紀錄**

- 新增紀錄：選擇日期 + 6 個滑桿（0–100）+ 備註
- 6 個指標：水分保持力、皮脂分泌力、角質、對外部環境抵抗力、累積程度、Skin ENGY
- 歷史列表：依日期降冪，顯示各指標數值
- 雷達圖：顯示最新一筆（首頁也引用）
- 折線圖：選擇單一指標，顯示歷史趨勢

---

### M6｜醫美紀錄

**列表頁**

- 按日期降冪顯示
- 每筆顯示：日期、施作項目、已用堂數 / 總堂數（進度條）、金額

**新增 / 編輯表單**

欄位：
1. **施作項目**（文字，例：皮秒雷射 / 音波拉皮）
2. **施作內容**（多行文字）
3. **總金額**（NTD）
4. **購入堂數**（預設 1）
5. **備註**

**衍生欄位（自動計算，顯示用）**

- 單堂費用 = 總金額 ÷ 購入堂數
- 已使用堂數 = `aesthetic_session_logs` 筆數
- 剩餘堂數 = 購入堂數 − 已使用堂數
- 剩餘金額 = 剩餘堂數 × 單堂費用

**施作紀錄（使用紀錄子列表）**

- 療程詳情頁下方顯示歷次施作紀錄列表，依日期降冪
- 每筆顯示：施作日期、本次備註
- 「新增施作」按鈕：選日期 + 填備註，送出後自動更新已使用堂數
- 刪除施作紀錄同步更新計數

---

## 6. 導覽結構（手機版）

底部導覽列 5 個 tab：

```
🏠 首頁  |  📦 品項  |  🔍 搜尋  |  📊 統計  |  👤 我的
```

「我的」頁包含：膚況追蹤、個人檔案、醫美紀錄、設定

桌面版改為左側 sidebar。

---

## 7. UI / UX 規範

- **色系**：乾淨白底，主色調米白 + 淡粉，強調色用深玫瑰色（#C9566A）
- **字體**：系統字（-apple-system / Noto Sans TC）
- **即期警示色**：紅 `#E53E3E`、橘 `#DD6B20`、黃 `#D69E2E`
- **手機最小點擊區域**：44px
- **表單驗證**：即時顯示錯誤，非送出後才提示
- **Loading 狀態**：骨架屏（Skeleton），不用全頁 spinner
- **空狀態**：每個列表有空狀態插圖 + 引導操作文字

---

## 8. 開發優先順序

| 階段 | 功能 | 說明 |
|------|------|------|
| Phase 1 | M2 品項管理 + M1 即期 Banner | 核心資料錄入，立即解決痛點 |
| Phase 2 | M3 搜尋 + M4 統計圖表 | 讓資料有價值 |
| Phase 3 | M5 膚況追蹤 + M6 醫美紀錄 | 進階個人化功能 |
| Phase 4 | 圖片上傳、PWA 設定 | 加分功能 |

---

## 9. 給 Claude Code 的開發指示

1. 先建立 Supabase 專案，執行 §3 的建表 SQL
2. 從 Phase 1 開始，完成一個 phase 再進下一個
3. 每個頁面都要有 RWD（mobile-first）
4. Combobox 元件可使用 `cmdk` 或 `downshift` 套件
5. 圖表使用 `recharts`
6. 表單驗證使用 `react-hook-form` + `zod`
7. 日期處理使用 `date-fns`（輕量，不用 moment）
8. 所有 API call 統一放 `src/lib/supabase/` 目錄
9. 型別定義統一放 `src/types/`，從資料庫 schema 自動產生（`supabase gen types typescript`）

---

*最後更新：2026-06-01*
