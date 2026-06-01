import { Link } from "react-router-dom";
import {
  Droplets,
  Sparkles,
  User,
  BarChart2,
  ShoppingBag,
  ChevronRight,
  Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const menuItems: { to: string; label: string; Icon: LucideIcon }[] = [
  { to: "/stats", label: "統計圖表", Icon: BarChart2 },
  { to: "/my/wishlist", label: "採購清單", Icon: ShoppingBag },
  { to: "/my/skin", label: "膚況追蹤", Icon: Droplets },
  { to: "/my/aesthetic", label: "醫美紀錄", Icon: Sparkles },
  { to: "/my/categories", label: "類別管理", Icon: Tag },
  { to: "/my/profile", label: "個人檔案", Icon: User },
];

export default function MyPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">
        我的
      </h2>
      <div className="space-y-2">
        {menuItems.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
          >
            <Icon
              size={18}
              strokeWidth={1.5}
              className="text-[var(--color-primary)]"
            />
            <span className="font-medium text-[var(--color-text)]">
              {label}
            </span>
            <ChevronRight
              size={16}
              strokeWidth={1.5}
              className="ml-auto text-[var(--color-text-muted)]"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
