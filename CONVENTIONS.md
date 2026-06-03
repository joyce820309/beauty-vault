# BeautyVault UI Conventions

## 色系原則（最重要）

**永遠使用 CSS 變數，絕對不使用 Tailwind 內建色彩（red、blue、green、purple、amber 等）。**

### 可用色彩變數

| 變數 | 用途 |
|------|------|
| `--color-primary` | 主色（玫瑰粉），主要按鈕、強調文字 |
| `--color-primary-light` | 主色淡版，hover 底色、badge 背景 |
| `--color-primary-dark` | 主色深版，badge 文字 |
| `--color-accent` | 矢車菊藍，次要強調、觀察中、雷品 |
| `--color-danger` | 危險紅，過期、刪除、警示 |
| `--color-warning` | 警告橘，警告效期 |
| `--color-caution` | 注意黃，注意效期 |
| `--color-text` | 主要文字 |
| `--color-text-muted` | 次要文字、placeholder |
| `--color-bg` | 頁面底色 |
| `--color-bg-card` | 卡片底色 |
| `--color-bg-muted` | 區塊底色 |
| `--color-border` | 邊框 |
| `--color-focus-ring` | focus 光暈 |

### Badge / Chip 顏色規範

```
效期 urgent  → color-danger  + color-danger/10 背景
效期 warning → color-warning + color-warning/10 背景
效期 caution → color-caution + color-caution/10 背景
效期 notice  → color-accent  + color-accent/10 背景
效期 expired → color-text-muted + color-bg-muted 背景
觀察中       → color-accent  + color-accent/10 背景
已丟棄       → color-text-muted + color-bg-muted 背景
最愛         → color-primary-light 背景 + color-primary-dark 文字
雷品         → color-accent/10 背景 + color-accent 文字
贈品         → color-primary-light 背景 + color-primary-dark 文字
組合價       → color-accent/10 背景 + color-accent 文字
```

### 禁止使用的寫法

```
❌ bg-red-100 text-red-700
❌ bg-blue-100 text-blue-700
❌ bg-purple-100 text-purple-700
❌ bg-amber-100 text-amber-700
❌ bg-sky-100 text-sky-700
❌ text-green-500
❌ color: '#9333ea'
❌ backgroundColor: '#C53030'

✅ bg-[var(--color-danger)]/10 text-[var(--color-danger)]
✅ bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]
✅ style={{ color: 'var(--color-accent)' }}
```

### 透明度寫法

淡底色統一用 `color-mix` 或 Tailwind `/10`～`/20`：

```
bg-[var(--color-primary)]/10
color-mix(in srgb, var(--color-danger) 15%, transparent)
```

---

## 元件規範

### Toggle（開關）
- 開啟：有底色（功能對應色）
- 關閉：`--color-border` 灰色
- 圓點：`absolute left-0.5`（關）/ `left-[22px]`（開），`overflow-hidden` 防止溢出

### Badge
- 字級：`text-xs` 或 `text-[10px]`
- 圓角：`rounded-full`
- padding：`px-2 py-0.5`

### Button
- 主要：`bg-[var(--color-primary)] text-white`
- 次要：`border border-[var(--color-border)] text-[var(--color-text-muted)]`
- 危險：`border border-[var(--color-danger)] text-[var(--color-danger)]`
- 所有 button 加 `min-h-0` 防止 iOS 最小高度

### 表單並排
- 手機（< 640px）：單欄 `grid-cols-1`
- 桌機（≥ 640px）：雙欄 `sm:grid-cols-2`
- **不使用 `@media(min-height)` 判斷並排**

---

## 深色模式

- 深色模式下 `--color-text` = `#C8C4C5`（柔和灰，不刺眼）
- 所有顏色皆透過 CSS 變數自動切換，不需要額外 dark: class
