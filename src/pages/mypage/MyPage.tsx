import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Droplets,
  Sparkles,
  User,
  BarChart2,
  ShoppingBag,
  ChevronRight,
  Tag,
  Pill,
  Wrench,
  Activity,
  Download,
} from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import type { LucideIcon } from "lucide-react";
import { getDataHealthCounts } from "@/lib/supabase/items";

const menuItems: { to: string; label: string; Icon: LucideIcon }[] = [
  { to: "/stats",           label: "統計圖表", Icon: BarChart2 },
  { to: "/my/wishlist",     label: "採購清單", Icon: ShoppingBag },
  { to: "/tools",           label: "工具管理", Icon: Wrench },
  { to: "/my/skin",         label: "膚況追蹤", Icon: Droplets },
  { to: "/my/aesthetic",    label: "醫美紀錄", Icon: Sparkles },
  { to: "/my/medications",  label: "用藥紀錄", Icon: Pill },
  { to: "/my/categories",   label: "類別管理", Icon: Tag },
  { to: "/my/channels",     label: "通路管理", Icon: Activity },
  { to: "/my/profile",      label: "個人檔案", Icon: User },
];

type HealthCounts = { noCategory: number; noExpiry: number; noPurchaseDate: number; noChannel: number }

const HEALTH_CHECKS: { key: keyof HealthCounts; label: string; filter: string }[] = [
  { key: 'noCategory',     label: '未設定類別',   filter: 'no-category' },
  { key: 'noExpiry',       label: '未設定效期',   filter: 'no-expiry' },
  { key: 'noPurchaseDate', label: '未設定購入日期', filter: 'no-purchase-date' },
  { key: 'noChannel',      label: '未設定通路',   filter: 'no-channel' },
]

function HealthRow({ label, count, to }: { label: string; count: number; to: string }) {
  const healthy = count === 0
  return (
    <Link
      to={to}
      className="flex items-center px-4 py-3 hover:bg-[var(--color-primary-light)]/20 transition-colors"
    >
      <span className={`w-2 h-2 rounded-full mr-3 flex-shrink-0 ${healthy ? 'bg-green-400' : 'bg-amber-400'}`} />
      <span className="text-sm text-[var(--color-text)] flex-1">{label}</span>
      {healthy ? (
        <span className="text-xs text-green-600 mr-2">已完善</span>
      ) : (
        <span className="text-sm font-semibold text-amber-600 mr-2">{count} 筆</span>
      )}
      <ChevronRight size={14} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
    </Link>
  )
}

export default function MyPage() {
  const [health, setHealth] = useState<HealthCounts | null>(null)
  const { prompt, install } = useInstallPrompt()

  useEffect(() => {
    getDataHealthCounts().then(setHealth)
  }, [])

  const totalIssues = health ? health.noCategory + health.noExpiry + health.noPurchaseDate + health.noChannel : null

  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">我的</h2>

      {/* 資料健康度 */}
      <div className="border border-[var(--color-border)] rounded-xl bg-[var(--color-bg-card)] overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
          <Activity size={15} strokeWidth={1.5} className="text-[var(--color-primary)]" />
          <span className="text-sm font-semibold text-[var(--color-text)]">資料健康度</span>
          {totalIssues !== null && totalIssues === 0 && (
            <span className="ml-auto text-xs text-green-600 font-medium">全數完善</span>
          )}
          {totalIssues !== null && totalIssues > 0 && (
            <span className="ml-auto text-xs text-amber-600 font-medium">{totalIssues} 筆待補完</span>
          )}
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {health === null ? (
            <div className="px-4 py-3 text-xs text-[var(--color-text-muted)]">載入中…</div>
          ) : HEALTH_CHECKS.map(({ key, label, filter }) => (
            <HealthRow
              key={key}
              label={label}
              count={health[key]}
              to={`/items?filter=${filter}`}
            />
          ))}
        </div>
      </div>

      {/* 安裝到桌面 */}
      {prompt && (
        <button
          onClick={install}
          className="w-full flex items-center gap-3 p-4 rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary-light)] hover:bg-[var(--color-primary-light)]/80 transition-colors mb-2"
        >
          <Download size={18} strokeWidth={1.5} className="text-[var(--color-primary)]" />
          <div className="flex-1 text-left">
            <p className="font-medium text-[var(--color-primary)] text-sm">安裝到桌面</p>
            <p className="text-xs text-[var(--color-text-muted)]">加入主畫面，隨時快速開啟</p>
          </div>
          <ChevronRight size={16} strokeWidth={1.5} className="text-[var(--color-primary)]" />
        </button>
      )}

      {/* 功能選單 */}
      <div className="space-y-2">
        {menuItems.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
          >
            <Icon size={18} strokeWidth={1.5} className="text-[var(--color-primary)]" />
            <span className="font-medium text-[var(--color-text)]">{label}</span>
            <ChevronRight size={16} strokeWidth={1.5} className="ml-auto text-[var(--color-text-muted)]" />
          </Link>
        ))}
      </div>
    </div>
  );
}
