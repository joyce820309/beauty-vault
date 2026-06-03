import { NavLink } from "react-router-dom";
import {
  Home,
  Package,
  Search,
  BarChart2,
  Droplets,
  Sparkles,
  Tag,
  User,
  CalendarClock,
  ShoppingBag,
  Pill,
  Wrench,
} from "lucide-react";

const navItems = [
  { to: "/", label: "首頁", Icon: Home },
  { to: "/items", label: "品項管理", Icon: Package },
  { to: "/tools", label: "工具管理", Icon: Wrench },
  { to: "/expiry", label: "即期管理", Icon: CalendarClock },
  { to: "/my/wishlist", label: "採購清單", Icon: ShoppingBag },
  { to: "/search", label: "搜尋", Icon: Search },
  { to: "/stats", label: "統計圖表", Icon: BarChart2 },
  { to: "/my/skin", label: "膚況追蹤", Icon: Droplets },
  { to: "/my/aesthetic", label: "醫美紀錄", Icon: Sparkles },
  { to: "/my/medications", label: "用藥紀錄", Icon: Pill },
  { to: "/my/categories", label: "類別管理", Icon: Tag },
  { to: "/my/profile", label: "個人檔案", Icon: User },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[var(--color-bg-card)] border-r border-[var(--color-border)] flex flex-col">
      <div className="px-6 py-5 border-b border-[var(--color-border)]">
        <h1 className="text-lg font-semibold text-[var(--color-primary)]">
          BeautyVault
        </h1>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                isActive
                  ? "bg-[var(--color-primary-light)] text-[var(--color-primary-dark)] font-medium"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
