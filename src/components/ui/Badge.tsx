import type { SensitiveSkinStatus } from "@/types/database";

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
  urgent: "bg-red-100 text-red-700",
  warning: "bg-orange-100 text-orange-700",
  caution: "bg-yellow-100 text-yellow-700",
  ok: "bg-green-100 text-green-700",
};

const expiryLabels: Record<string, string> = {
  urgent: "緊急",
  warning: "警告",
  caution: "注意",
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

export function PriceBadge({
  priceType,
  currency,
}: {
  priceType: string | null;
  currency?: string | null;
}) {
  if (priceType === "gift") {
    return (
      <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
        贈品
      </span>
    );
  }
  if (priceType === "split") {
    return (
      <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium bg-sky-100 text-sky-700">
        組合價
      </span>
    );
  }
  if (currency) {
    return (
      <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
        {currency}
      </span>
    );
  }
  return null;
}
