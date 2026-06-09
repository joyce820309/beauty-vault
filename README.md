# BeautyVault

個人美妝保養品管理 PWA，追蹤品項庫存、膚況紀錄、醫美療程、用藥管理與消費統計。

## 技術棧

| 項目 | 版本 / 工具 |
|------|-------------|
| 框架 | React 18 + TypeScript |
| 建構工具 | Vite（含 PWA 支援 via `vite-plugin-pwa`） |
| 路由 | react-router-dom v6 |
| 樣式 | Tailwind CSS 3 + CSS Variables（支援 light / dark theme） |
| 後端 / 資料庫 | Supabase（PostgreSQL + Storage + RLS） |
| 表單 | react-hook-form + zod（搭配 `@hookform/resolvers`） |
| 圖表 | recharts |
| 圖示 | lucide-react |
| 日期處理 | date-fns |
| 部署 | Vercel |

## 檔案架構

```
project-root/
├── index.html
├── package.json
├── vite.config.ts            # Vite + PWA 設定
├── tailwind.config.js        # Tailwind 設定，用 CSS Variables 管理顏色
├── postcss.config.js
├── tsconfig.json
├── tsconfig.app.json         # paths alias: @/* → src/*
├── tsconfig.node.json
├── vercel.json               # SPA rewrite 設定
├── .env.example              # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── public/                   # PWA icons, logo
├── supabase/
│   └── migrations/           # SQL migration 檔案，按序號命名 (001_, 002_...)
├── docs/                     # 文件（如 DATABASE_SCHEMA.md）
└── src/
    ├── main.tsx              # 入口：ThemeProvider > RefreshProvider > ToastProvider > App
    ├── App.tsx               # BrowserRouter + Routes 定義
    ├── index.css             # Tailwind directives + CSS Variables (light/dark theme)
    ├── types/
    │   └── database.ts       # 所有資料表的 TypeScript 型別定義
    ├── lib/
    │   └── supabase/
    │       ├── client.ts     # Supabase client 初始化
    │       └── [table].ts    # 每張表一個檔案，封裝 CRUD 操作
    ├── hooks/
    │   └── use[Feature].ts   # 自訂 hook，封裝 API 呼叫 + 狀態管理
    ├── contexts/
    │   ├── ThemeContext.tsx   # Light/Dark 主題切換
    │   └── RefreshContext.tsx # 全域下拉重新整理
    ├── components/
    │   ├── layout/
    │   │   ├── Layout.tsx    # 主佈局 (Outlet)
    │   │   ├── BottomNav.tsx # 手機底部導覽列
    │   │   └── Sidebar.tsx   # 桌面側邊欄
    │   └── ui/               # 共用 UI 元件
    │       ├── Badge.tsx
    │       ├── Combobox.tsx   # 可搜尋下拉選單
    │       ├── DatePicker.tsx
    │       ├── EmptyState.tsx
    │       ├── ItemCard.tsx   # 卡片式列表項目
    │       ├── Select.tsx
    │       ├── Skeleton.tsx   # 載入骨架
    │       ├── Toast.tsx      # 全域通知
    │       └── ...
    ├── pages/
    │   └── [feature]/         # 每個功能模組一個資料夾
    │       ├── [Feature]ListPage.tsx    # 列表頁
    │       ├── [Feature]DetailPage.tsx  # 詳情頁
    │       └── [Feature]FormPage.tsx    # 新增/編輯共用表單頁
    └── utils/
        └── [helpers].ts      # 工具函式
```

## 關鍵設計模式

### 1. Supabase Service 層

每張表一個檔案 `src/lib/supabase/[table].ts`，封裝 CRUD：

```ts
import { supabase } from './client'

export async function getAll() {
  return supabase.from('table_name').select('*').order('created_at', { ascending: false })
}
export async function getById(id: number) {
  return supabase.from('table_name').select('*').eq('id', id).single()
}
export async function create(data: CreatePayload) {
  return supabase.from('table_name').insert(data).select().single()
}
export async function update(id: number, data: Partial<TableType>) {
  return supabase.from('table_name').update(data).eq('id', id)
}
export async function remove(id: number) {
  return supabase.from('table_name').delete().eq('id', id)
}
```

### 2. 表單頁

使用 react-hook-form + zod 驗證。自訂 `Input` 元件必須用 `forwardRef`，否則 `register()` 的 ref 會丟失：

```tsx
const schema = z.object({ ... })
type FormData = z.infer<typeof schema>

const Input = forwardRef<HTMLInputElement, Props>(({ error, ...rest }, ref) => (
  <input {...rest} ref={ref} className={...} />
))

const { register, handleSubmit, control, setValue } = useForm<FormData>({
  resolver: zodResolver(schema),
})
```

### 3. 主題系統

CSS Variables + `data-theme` attribute，Tailwind 中以 `var()` 引用：

```css
:root, [data-theme="light"] { --color-primary: #C4768A; ... }
[data-theme="dark"] { --color-primary: #D4899E; ... }
```

元件中使用 `text-[var(--color-text)]`、`bg-[var(--color-bg-card)]`。

### 4. 路由結構

扁平式路由，巢狀在 Layout 下：

```tsx
<Route path="/" element={<Layout />}>
  <Route index element={<HomePage />} />
  <Route path="items" element={<ItemListPage />} />
  <Route path="items/new" element={<ItemFormPage />} />
  <Route path="items/:id" element={<ItemDetailPage />} />
  <Route path="items/:id/edit" element={<ItemFormPage />} />
</Route>
```

### 5. Provider 包裹順序

```
ThemeProvider > RefreshProvider > ToastProvider > App
```

## 快速起步

```bash
# 安裝依賴
npm install

# 設定環境變數
cp .env.example .env
# 填入 Supabase URL 和 Anon Key

# 啟動開發伺服器
npm run dev

# 建構
npm run build
```

## 資料結構

詳見 [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)

## 部署

部署至 Vercel，`vercel.json` 已設定 SPA rewrite。Framework Preset 選擇 **Vite**，Output Directory 為 `dist`。
