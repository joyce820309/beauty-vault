import { useState, useEffect } from "react";
import { Copy, Check, ChevronDown, ChevronRight, FileText, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useItems } from "@/hooks/useItems";
import { useProfile } from "@/hooks/useSkinRecords";
import { useCategories } from "@/contexts/CategoriesContext";
import { getTools } from "@/lib/supabase/tools";
import type { Item, Tool } from "@/types/database";

const AI_PREAMBLE = `***推薦產品前，須確認為2026年仍在售且台灣可購買。***
***所有建議需誠實中立，不鼓勵衝動購買或高風險產品。***

`;

// ─── 匯出群組定義 ─────────────────────────────────────────────────────────────
interface ItemGroup {
  kind: "items"
  label: string
  categories: string[]   // 對應 Item.category value
}

interface ToolGroup {
  kind: "tools"
  label: string
}

type ExportGroup = ItemGroup | ToolGroup

// 彩妝 1–11
const MAKEUP_GROUPS: ExportGroup[] = [
  { kind: "items", label: "粉底",                  categories: ["foundation"] },
  { kind: "items", label: "妝前乳",                categories: ["primer"] },
  { kind: "items", label: "防曬",                  categories: ["sunscreen"] },
  { kind: "items", label: "遮瑕",                  categories: ["concealer"] },
  { kind: "items", label: "眼影",                  categories: ["eyeshadow"] },
  { kind: "items", label: "腮紅",                  categories: ["blush"] },
  { kind: "items", label: "唇彩",                  categories: ["lip"] },
  { kind: "items", label: "定妝",                  categories: ["setting", "parent_setting"] },
  { kind: "items", label: "修容類（打亮／陰影）",  categories: ["highlighter"] },
  { kind: "items", label: "眼線／臥蠶",            categories: ["eyeliner", "mascara"] },
  { kind: "items", label: "眉毛",                  categories: ["brow"] },
]

// 保養 12–18（美容工具第 18 項從 tools 表撈）
const SKINCARE_GROUPS: ExportGroup[] = [
  { kind: "items", label: "化妝水",       categories: ["toner"] },
  { kind: "items", label: "精華液",       categories: ["serum"] },
  { kind: "items", label: "乳液／乳霜",   categories: ["lotion", "cream"] },
  { kind: "items", label: "眼霜",         categories: ["eye_care"] },
  { kind: "items", label: "面膜／泥膜",   categories: ["mask"] },
  { kind: "items", label: "保濕棒／油類", categories: ["face_oil"] },
  { kind: "tools", label: "美容工具" },
]

// ─── 格式化 ───────────────────────────────────────────────────────────────────
function formatItemLine(item: Item): string {
  const brand = item.brand_zh || item.brand_en || "";
  const name = item.name_zh ? `【${item.name_zh}】` : item.name_en ? `【${item.name_en}】` : "";
  const shade = item.shade_zh || item.shade_en || "";
  return `${brand}${name}${shade ? `　＃${shade}` : ""}`.trim();
}

function formatToolLine(tool: Tool): string {
  const brand = tool.brand_zh || tool.brand_en || "";
  const name = tool.name_zh ? `【${tool.name_zh}】` : tool.name_en ? `【${tool.name_en}】` : "";
  return `${brand}${name}`.trim();
}

// ─── 群組文字產生（單一群組，不含編號） ─────────────────────────────────────
// getParentValue: 給定品項 category value，回傳其父類 value（或 null）
function buildGroupText(
  group: ExportGroup,
  items: Item[],
  tools: Tool[],
  getParentValue: (categoryValue: string | null) => string | null,
): string {
  let rows: string[] = [];

  if (group.kind === "items") {
    const filtered = items.filter((i) => {
      if (i.disposal_status === "disposed") return false;
      const cat = i.category ?? "";
      // 直接命中，或子類的父類 value 命中
      return group.categories.includes(cat) || group.categories.includes(getParentValue(cat) ?? "");
    });
    rows = filtered.map((item, idx) => `    (${idx + 1}) ${formatItemLine(item)}`);
  } else {
    const active = tools.filter((t) => t.status !== "retired");
    rows = active.map((tool, idx) => `    (${idx + 1}) ${formatToolLine(tool)}`);
  }

  if (rows.length === 0) return "";
  return `${group.label}：\n${rows.join("\n")}`;
}

// ─── 群組清單文字產生（含連續編號，startNo 可跨彩妝/保養銜接） ───────────────
function buildGroupsText(
  groups: ExportGroup[],
  items: Item[],
  tools: Tool[],
  title: string,
  getParentValue: (categoryValue: string | null) => string | null,
  startNo: number = 1,
): { text: string; nextNo: number } {
  let no = startNo;
  const sections: string[] = [];

  for (const g of groups) {
    const body = buildGroupText(g, items, tools, getParentValue);
    if (body) {
      sections.push(`${no}. ${body}`);
      no++;
    }
  }

  if (sections.length === 0) {
    return { text: `【我已擁有的${title}】\n（尚無資料）`, nextNo: no };
  }
  return {
    text: `【我已擁有的${title}】\n\n${sections.join("\n\n")}`,
    nextNo: no,
  };
}

// ─── 子元件 ───────────────────────────────────────────────────────────────────
function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-muted)] transition-colors"
      >
        <span className="font-medium text-sm text-[var(--color-text)]">{title}</span>
        {open
          ? <ChevronDown size={16} className="text-[var(--color-text-muted)]" />
          : <ChevronRight size={16} className="text-[var(--color-text-muted)]" />}
      </button>
      {open && <div className="px-4 pb-4 pt-2 bg-[var(--color-bg-card)]">{children}</div>}
    </div>
  );
}

function ExportButton({ label, getText }: { label: string; getText: () => string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = getText();
    if (!text.trim()) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors text-sm text-[var(--color-text)] min-h-0 w-full"
    >
      {copied
        ? <Check size={15} className="text-[var(--color-primary)] shrink-0" />
        : <Copy size={15} className="text-[var(--color-text-muted)] shrink-0" />}
      <span className={copied ? "text-[var(--color-primary)]" : ""}>{copied ? "已複製！" : label}</span>
    </button>
  );
}

// ─── 主頁面 ───────────────────────────────────────────────────────────────────
export default function ExportPage() {
  const { items, loading: itemsLoading } = useItems();
  const { profile, loading: profileLoading } = useProfile();
  const { getParentOf } = useCategories();
  const [tools, setTools] = useState<Tool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(true);

  useEffect(() => {
    getTools().then(({ data }) => {
      setTools(data ?? []);
      setToolsLoading(false);
    });
  }, []);

  // 給定品項 category value，回傳父類的 value（用於匯出比對）
  function getParentValue(categoryValue: string | null): string | null {
    return getParentOf(categoryValue)?.value ?? null;
  }

  const skinText = profile?.export_skin_template ?? "";
  const loading = itemsLoading || profileLoading || toolsLoading;

  function getMakeupText() {
    return buildGroupsText(MAKEUP_GROUPS, items, tools, "彩妝品", getParentValue, 1).text;
  }

  function getSkincareText() {
    return buildGroupsText(SKINCARE_GROUPS, items, tools, "保養品", getParentValue, 12).text;
  }

  function getAllText() {
    const skinSection = skinText ? AI_PREAMBLE + skinText : "";
    const makeup = buildGroupsText(MAKEUP_GROUPS, items, tools, "彩妝品", getParentValue, 1);
    const skincare = buildGroupsText(SKINCARE_GROUPS, items, tools, "保養品", getParentValue, makeup.nextNo);
    return [skinSection, makeup.text, skincare.text].filter(Boolean).join("\n\n");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[var(--color-text-muted)] text-sm">
        載入中…
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <FileText size={18} strokeWidth={1.5} className="text-[var(--color-primary)]" />
        <h2 className="text-xl font-semibold text-[var(--color-text)]">匯出文件</h2>
      </div>

      <p className="text-xs text-[var(--color-text-muted)] mb-4">
        純文字格式，可直接貼到 AI 對話框。已丟棄品項自動排除。
      </p>

      <div className="space-y-3">

        {/* Export All */}
        <div className="p-4 rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary-light)]">
          <p className="text-sm font-semibold text-[var(--color-primary)] mb-2">Export All</p>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">膚況 + 所有彩妝品 + 所有保養品</p>
          <ExportButton label="複製完整文件" getText={getAllText} />
        </div>

        {/* 膚況區 */}
        <Section title="膚況區">
          <div className="space-y-2">
            {skinText ? (
              <ExportButton label="複製膚況區" getText={() => skinText} />
            ) : (
              <p className="text-xs text-[var(--color-text-muted)]">尚未設定膚況模板。</p>
            )}
            <Link
              to="/my/profile"
              className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
            >
              <Settings size={12} />
              前往個人檔案編輯模板
            </Link>
          </div>
        </Section>

        {/* 彩妝品區 */}
        <Section title="彩妝品區" defaultOpen>
          <div className="space-y-2">
            <ExportButton label="複製所有彩妝品" getText={getMakeupText} />
            <div className="pt-1">
              <p className="text-xs text-[var(--color-text-muted)] mb-2">依類別分開複製：</p>
              <div className="grid grid-cols-2 gap-2">
                {MAKEUP_GROUPS.map((g) => (
                  <ExportButton
                    key={g.label}
                    label={g.label}
                    getText={() => buildGroupText(g, items, tools, getParentValue)}
                  />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* 保養品區 */}
        <Section title="保養品區" defaultOpen>
          <div className="space-y-2">
            <ExportButton label="複製所有保養品" getText={getSkincareText} />
            <div className="pt-1">
              <p className="text-xs text-[var(--color-text-muted)] mb-2">依類別分開複製：</p>
              <div className="grid grid-cols-2 gap-2">
                {SKINCARE_GROUPS.map((g) => (
                  <ExportButton
                    key={g.label}
                    label={g.label}
                    getText={() => buildGroupText(g, items, tools, getParentValue)}
                  />
                ))}
              </div>
            </div>
          </div>
        </Section>

      </div>
    </div>
  );
}
