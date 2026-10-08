# 妝容主題詳情頁 className 對照表

對應檔案：[`src/pages/looks/LookDetailPage.tsx`](../src/pages/looks/LookDetailPage.tsx)

命名採 BEM 風格（`區塊__元素--修飾`），可直接在瀏覽器 DevTools 搜尋這些 class name 快速定位對應的 JSX 區塊。

## 整頁

| className | 說明 |
|---|---|
| `look-detail-page` | 整頁最外層容器 |
| `look-detail-page--loading` | 載入中狀態（Skeleton） |
| `look-detail-page--not-found` | 找不到主題時的提示文字 |

## 頂部操作列

| className | 說明 |
|---|---|
| `look-detail-page__toolbar` | 頂部操作列容器（返回 + 編輯/刪除） |
| `look-detail-page__back-btn` | 返回按鈕 |
| `look-detail-page__toolbar-actions` | 編輯/刪除按鈕群組容器 |
| `look-detail-page__edit-btn` | 編輯按鈕（霧藍灰） |
| `look-detail-page__delete-btn` | 刪除按鈕（玫瑰色） |

## Hero 大圖

| className | 說明 |
|---|---|
| `look-hero` | Hero 主照片容器（可點擊開啟 Lightbox） |
| `look-hero__gradient` | 底部漸層遮罩，讓標題文字可讀 |
| `look-hero__badge` | 左上角「妝容主題」標籤 |
| `look-hero__title` | 主題名稱標題 |
| `look-hero__stack` | 右下角堆疊縮圖容器（多張照片時） |
| `look-hero__stack-thumb` | 堆疊縮圖單張 |
| `look-hero__stack-more` | 堆疊縮圖「+N」提示 |

## 完成照拼貼條

| className | 說明 |
|---|---|
| `photo-strip` | 完成照橫向拼貼條容器 |
| `photo-strip__item` | 單張照片（含微旋轉效果） |
| `photo-strip__item-view` | 照片點擊區（開啟 Lightbox） |
| `photo-strip__item-remove` | 照片刪除按鈕（✕） |
| `photo-strip__add` | 新增照片的 label 包裹 |
| `photo-strip__add-tile` | 新增照片虛線框 UI |

## 眼妝 / 頰妝 / 唇妝 分區卡片

| className | 說明 |
|---|---|
| `eye-cheek-grid` | 眼妝＋頰妝並排容器（980px 以下單欄堆疊，980px 以上並排） |
| `section-card` | 分區卡片共用基礎 class |
| `section-card--eyes` | 眼妝卡片 |
| `section-card--cheek` | 頰妝卡片 |
| `section-card--lips` | 唇妝卡片（較大、內容較多） |
| `section-card__title` | 卡片標題（如「EYES・眼妝」） |
| `section-card__rows` | 卡片內槽位列表容器 |

## 單一槽位列（上眼影、打底、唇線筆等）

| className | 說明 |
|---|---|
| `slot-row` | 單一槽位列容器（縮圖 + 文字） |
| `slot-row__text` | 文字區塊容器（往右多留一點空間 `pl-0.5`，與縮圖對齊好看） |
| `slot-row__label` | 槽位標籤（如「上眼影」） |
| `slot-row__name` | 品項名稱／色號文字 |

## 圓形縮圖（SlotSwatch，四種狀態；預設 48px）

色號統一**疊加在縮圖右下角**（有照片時）；此樣式全站共用，眼妝、頰妝、唇彩都是同一套邏輯。

| className | 說明 |
|---|---|
| `slot-swatch` | 縮圖共用基礎 class |
| `slot-swatch--photo` | 有商品照片時 |
| `slot-swatch--palette` | 無照片、多色調色盤樣式（如眼影盤），些微重疊排列 |
| `slot-swatch--single-color` | 無照片、單一色票 |
| `slot-swatch--placeholder` | 無照片無色票，顯示預設圖示 |
| `slot-swatch__photo-frame` | 照片圓框容器 |
| `slot-swatch__photo-img` | 照片 `<img>` |
| `slot-swatch__color-dots` | 照片右下角色點疊加容器（有照片且有色號時） |
| `slot-swatch__color-dot` | 單一疊加色點（多色時小幅堆疊） |
| `slot-swatch__palette-dot` | 調色盤樣式單一色點（無照片時） |

## 唇彩疊擦區

| className | 說明 |
|---|---|
| `lip-colors` | 唇彩區塊容器 |
| `lip-colors__title` | 「唇彩」標題文字 |
| `lip-colors__layer-count` | 「（疊擦 N 層）」文字 |
| `lip-colors__list` | 疊擦清單容器 |
| `lip-colors__item` | 單層唇彩列（直接使用 `SlotSwatch`，色號疊加邏輯同上） |
| `lip-colors__item-index` | 疊擦層數編號圓點（1、2…） |
| `lip-colors__item-name` | 該層品項名稱／色號 |

## 連接虛線（THEN ↓）

| className | 說明 |
|---|---|
| `flow-divider` | 眼頰妝 → 唇妝之間的連接虛線容器 |
| `flow-divider__line--left` | 左側虛線 |
| `flow-divider__label` | 「THEN ↓」文字 |
| `flow-divider__line--right` | 右側虛線 |

## 俏皮小訣竅便利貼（TipNote）

| className | 說明 |
|---|---|
| `tip-note` | 便利貼容器（虛線框 + 微旋轉） |
| `tip-note__icon` | 燈泡圖示 |
| `tip-note__text` | 訣竅文字 |

## 色票圖例說明

| className | 說明 |
|---|---|
| `swatch-legend` | 圖例說明容器（頁面底部） |
| `swatch-legend__item--photo` | 「商品照片」圖例項 |
| `swatch-legend__item--photo-dot` | 「商品照片＋設定色號」圖例項 |
| `swatch-legend__item--color-only` | 「手動設定色票」圖例項 |
| `swatch-legend__dot` | 單色圖例圓點 |
| `swatch-legend__dot--photo` | 純照片圖例圓點 |
| `swatch-legend__dot--color-only` | 純色票圖例圓點 |
| `swatch-legend__dot-combo` | 照片＋色點組合圖例容器 |
| `swatch-legend__dot-combo-base` | 組合圖例底圖 |
| `swatch-legend__dot-combo-badge` | 組合圖例右下角色點 |

## 備註

| className | 說明 |
|---|---|
| `look-note` | 備註區塊容器 |
| `look-note__label` | 「備註」標籤文字 |
| `look-note__text` | 備註內容文字 |
