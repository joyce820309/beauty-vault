import { Link } from "react-router-dom";
import {
  Droplets,
  Sparkles,
  User,
  ChevronRight,
  Tag,
  Pill,
  Wrench,
  Activity,
  Download,
  Bell,
  FileText,
} from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import type { LucideIcon } from "lucide-react";

const RECORDS: { to: string; label: string; Icon: LucideIcon }[] = [
  { to: "/my/skin",        label: "膚況追蹤", Icon: Droplets },
  { to: "/my/aesthetic",   label: "醫美紀錄", Icon: Sparkles },
  { to: "/my/medications", label: "用藥紀錄", Icon: Pill },
  { to: "/tools",          label: "工具管理", Icon: Wrench },
]

const SETTINGS: { to: string; label: string; Icon: LucideIcon }[] = [
  { to: "/my/categories",   label: "類別管理",  Icon: Tag },
  { to: "/my/channels",     label: "通路管理",  Icon: Activity },
  { to: "/my/notifications",label: "推播通知",  Icon: Bell },
  { to: "/my/export",       label: "匯出文件",  Icon: FileText },
  { to: "/my/profile",      label: "個人檔案",  Icon: User },
]

function MenuGroup({ title, items }: { title: string; items: typeof RECORDS }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 px-1">
        {title}
      </p>
      <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden divide-y divide-[var(--color-border)]">
        {items.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 px-4 py-3.5 bg-[var(--color-bg-card)] hover:bg-[var(--color-primary-light)] transition-colors"
          >
            <Icon size={17} strokeWidth={1.5} className="text-[var(--color-primary)] shrink-0" />
            <span className="text-sm font-medium text-[var(--color-text)]">{label}</span>
            <ChevronRight size={15} strokeWidth={1.5} className="ml-auto text-[var(--color-text-muted)]" />
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function MyPage() {
  const { prompt, install } = useInstallPrompt()

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">我的</h2>
        <span className="text-xs text-[var(--color-text-muted)] opacity-50">v{__APP_VERSION__}</span>
      </div>

      <div className="space-y-5">
        {/* 安裝到桌面 */}
        {prompt && (
          <button
            onClick={install}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-[var(--color-primary)]/40 bg-[var(--color-primary-light)] hover:bg-[var(--color-primary-light)]/80 transition-colors"
          >
            <Download size={17} strokeWidth={1.5} className="text-[var(--color-primary)] shrink-0" />
            <div className="flex-1 text-left">
              <p className="font-medium text-[var(--color-primary)] text-sm">安裝到桌面</p>
              <p className="text-xs text-[var(--color-text-muted)]">加入主畫面，隨時快速開啟</p>
            </div>
            <ChevronRight size={15} strokeWidth={1.5} className="text-[var(--color-primary)]" />
          </button>
        )}

        <MenuGroup title="紀錄" items={RECORDS} />
        <MenuGroup title="設定" items={SETTINGS} />
      </div>
    </div>
  );
}
