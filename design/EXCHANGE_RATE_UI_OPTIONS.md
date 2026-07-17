# Exchange Rate UI Options (from ui-ux-pro-max)

## 1) 設計查詢命令證據

Design-system command:

```powershell
py -3 ui-ux-pro-max-skill/src/ui-ux-pro-max/scripts/search.py "BeautyVault purchase detail page exchange rate viewer for overseas shopping, TWD to USD EUR JPY KRW, mobile-first" --design-system --persist -p "BeautyVault" --page "item-detail-exchange-rate" --format markdown
```

Additional multi-option commands:

```powershell
py -3 ui-ux-pro-max-skill/src/ui-ux-pro-max/scripts/search.py "mobile finance helper panel in detail page, quick compare currency conversion" --domain style -n 5
py -3 ui-ux-pro-max-skill/src/ui-ux-pro-max/scripts/search.py "beauty ecommerce trustworthy pastel compact cards" --domain color -n 5
py -3 ui-ux-pro-max-skill/src/ui-ux-pro-max/scripts/search.py "luxury beauty bilingual app readability" --domain typography -n 5
```

Saved evidence files:
- design/design-system-output.md
- design/style-output-utf8.txt
- design/color-output-utf8.txt
- design/typography-output-utf8.txt
- design-system/beautyvault/MASTER.md
- design-system/beautyvault/pages/item-detail-exchange-rate.md

## 2) 輸出摘要

Design-system summary:
- Pattern: Video-First Hero (此結果偏 landing page，不直接套用到 detail micro feature)
- Style: Exaggerated Minimalism
- Typography: Rubik + Nunito Sans

Domain search summary used for this feature:
- Style candidates: Conversion-Optimized, Enterprise SaaS (Mobile), Social Proof-Focused
- Color candidate: Beauty/Spa/Wellness Service (soft pink luxury)
- Typography candidate: Classic Elegant (Playfair Display + Inter), Luxury Serif, Korean Modern

## 3) 針對本功能的 UI 方案（多種對應方式）

### Option A: Inline Expand (最低摩擦)
- 位置: Detail 頁金額右側按鈕「查看今日匯率」
- 互動: 點擊後在金額欄下方展開
- 優點: 不跳層、不干擾主流程、閱讀連續
- 建議情境: 使用者只想快速看 3-4 種幣別

### Option B: Bottom Sheet (行動優先)
- 位置: 同按鈕入口
- 互動: 從底部彈出，顯示完整匯率資訊與資料來源
- 優點: 手機可讀性高，容納更多欄位（更新時間/快取狀態/免責）
- 建議情境: 海外現場需要短時間做比較

### Option C: Popover Quick Compare (桌面效率)
- 位置: 金額旁 icon/button
- 互動: 小浮層顯示重點幣值，不離開頁面
- 優點: 視覺輕量，適合桌面或平板
- 建議情境: 頻繁查多筆 item 時，節奏快

## 4) 狀態規格（模擬器已涵蓋）

- No Amount: 無金額時按鈕不可用
- Idle: 尚未查詢
- Loading: 正在抓取今日匯率
- Success: 顯示 TWD 與多幣別換算
- Error: API 失敗提示
- Cached: 顯示上次快取與時間戳

## 5) 建議 MVP 決策（供你拍板）

1. 預設 Option A（Inline Expand）
2. 幣別先固定 4 種: USD / EUR / JPY / KRW
3. 精度: JPY 0 位，其餘 2 位
4. 無金額時: 顯示 disabled 按鈕並附提示
5. 顯示免責: 僅供參考，實際以刷卡/店家匯率為準
