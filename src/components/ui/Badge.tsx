import type { SensitiveSkinStatus, DisposalStatus } from "@/types/database";

const sensitiveLabels: Record<SensitiveSkinStatus, string> = {
  ok: "敏感肌 OK",
  ng: "敏感肌 NG",
  untested: "未測試",
};

const sensitiveColors: Record<SensitiveSkinStatus, string> = {
  ok: "bg-green-100 text-green-700",
  ng: "bg-red-100 text-red-700",
  untested: "bg-gray-100 text-gray-500",
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
