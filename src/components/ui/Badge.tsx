import type { SensitiveSkinStatus, DisposalStatus } from "@/types/database";

const sensitiveLabels: Record<SensitiveSkinStatus, string> = {
  all_ok:          "全可用",
  avoid_postop:    "醫美後避開",
  sensitive_avoid: "敏感期避開",
  ng:              "NG",
  untested:        "未測試",
  ok:              "全可用",   // legacy
};

const sensitiveColors: Record<SensitiveSkinStatus, string> = {
  all_ok:          "bg-[#90B4A0]/25 text-[#3A7060]",
  avoid_postop:    "bg-[var(--color-accent)]/15 text-[var(--color-accent)]",
  sensitive_avoid: "bg-[var(--color-caution)]/15 text-[var(--color-caution)]",
  ng:              "bg-[var(--color-primary)]/15 text-[var(--color-primary-dark)]",
  untested:        "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]",
  ok:              "bg-[#90B4A0]/25 text-[#3A7060]",   // legacy
};

export function SensitiveBadge({ status }: { status: SensitiveSkinStatus }) {
  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${sensitiveColors[status]}`}
    >
      {sensitiveLabels[status]}
    </span>
  );
}

const expiryColors: Record<string, string> = {
  expired: "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]",
  urgent:  "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
  warning: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  caution: "bg-[var(--color-caution)]/10 text-[var(--color-caution)]",
  notice:  "bg-[var(--color-accent)]/10 text-[var(--color-accent)]",
  ok:      "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]",
};

const expiryLabels: Record<string, string> = {
  expired: "已過期",
  urgent: "緊急",
  warning: "警告",
  caution: "注意",
  notice: "通知",
  ok: "正常",
};

export function ExpiryBadge({ level }: { level: string }) {
  if (level === "ok") return null;
  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${expiryColors[level]}`}
    >
      {expiryLabels[level]}
    </span>
  );
}

export function DisposalBadge({ status }: { status: DisposalStatus | null }) {
  if (!status || status === "kept") return null;
  if (status === "watching") {
    return (
      <span
        className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
        style={{
          color: "var(--color-accent)",
          backgroundColor:
            "color-mix(in srgb, var(--color-accent) 12%, transparent)",
        }}
      >
        觀察中
      </span>
    );
  }
  return (
    <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium text-[var(--color-text-muted)] bg-[var(--color-bg-muted)]">
      已丟棄
    </span>
  );
}

export function PriceBadge({
  priceType,
  currency,
}: {
  priceType: string | null;
  currency?: string | null;
}) {
  if (priceType === "gift") {
    return (
      <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium bg-[var(--color-freebie-badge-bg)] text-[var(--color-freebie-badge-text)]">
        贈品
      </span>
    );
  }
  if (priceType === "present") {
    return (
      <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold tracking-wide bg-[var(--color-present-badge-bg)] text-[var(--color-present-badge-text)] shadow-[0_1px_4px_rgba(168,79,104,0.16)]">
        禮物
      </span>
    );
  }
  if (priceType === "split") {
    return (
      <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
        組合價
      </span>
    );
  }
  if (currency) {
    return (
      <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]">
        {currency}
      </span>
    );
  }
  return null;
}
