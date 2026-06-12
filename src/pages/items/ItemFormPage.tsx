import { useEffect, useState, forwardRef } from "react";
import { AutoTextarea } from "@/components/ui/AutoTextarea";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Combobox } from "@/components/ui/Combobox";
import { CategorySelect } from "@/components/ui/CategorySelect";
import { DatePicker } from "@/components/ui/DatePicker";
import { useComboboxOptions } from "@/hooks/useComboboxOptions";
import { createItem, getItemById, updateItem } from "@/lib/supabase/items";
import { supabase } from "@/lib/supabase/client";
import { SENSITIVE_SKIN_OPTIONS } from "@/utils/categories";
import { Camera } from "lucide-react";
import Toggle from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { addCustomOption } from "@/lib/customOptions";
import { useChannels } from "@/hooks/useChannels";
import type { ItemType, PriceType } from "@/types/database";

// 全形數字（注音輸入法數字鍵）→ 半形
function toHalfWidth(str: string): string {
  return str
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/．/g, '.')
}

const schema = z.object({
  item_type: z.enum(["makeup", "skincare"]),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  brand_zh: z.string().optional(),
  brand_en: z.string().optional(),
  name_zh: z.string().optional(),
  name_en: z.string().optional(),
  shade_zh: z.string().optional(),
  shade_en: z.string().optional(),
  mfg_date: z.string().optional(),
  exp_date: z.string().optional(),
  price: z.coerce.number().int().nonnegative().optional().or(z.literal("")),
  price_type: z.enum(["normal", "split", "gift", "present"]).optional(),
  original_price: z.coerce
    .number()
    .int()
    .nonnegative()
    .optional()
    .or(z.literal("")),
  purchase_date: z.string().optional(),
  note: z.string().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional().or(z.literal("")),
  review: z.string().optional(),
  sensitive_skin_ok: z.enum(["all_ok", "avoid_postop", "sensitive_avoid", "ng", "untested", "ok"]).optional(),
  currency: z.string().optional(),
  fragrance: z.enum(["strong", "mild", "none"]).optional(),
  is_dud: z.boolean().optional(),
  is_sample: z.boolean().optional(),
  is_favorite: z.boolean().optional(),
  volume_ml: z.coerce.number().nonnegative().optional().or(z.literal("")),
  channel: z.string().optional(),
});

type FormData = z.infer<typeof schema>;


function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
        {label}
        {required && <span className="ml-0.5 text-[var(--color-primary)]">*</span>}
      </label>
      {children}
      {error && (
        <p
          className="text-xs font-medium mt-1.5"
          style={{ color: "var(--color-primary-dark)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { error?: string }
>(({ error, className, ...rest }, ref) => (
  <input
    {...rest}
    ref={ref}
    className={`w-full px-3 py-2.5 rounded-xl text-sm text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none transition-all ${
      error
        ? "border-2 border-[var(--color-primary)] shadow-[0_0_0_3px_var(--color-focus-ring)]"
        : "border border-[var(--color-border)]"
    } ${className ?? ""}`}
  />
));

const CURRENCIES = [
  { code: "JPY", label: "🇯🇵 JPY", rate: "0.22" },
  { code: "KRW", label: "🇰🇷 KRW", rate: "0.024" },
  { code: "USD", label: "🇺🇸 USD", rate: "32" },
  { code: "EUR", label: "🇪🇺 EUR", rate: "35" },
  { code: "GBP", label: "🇬🇧 GBP", rate: "41" },
  { code: "HKD", label: "🇭🇰 HKD", rate: "4.1" },
];

export default function ItemFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEdit = !!id;
  const { brands, names, brandZhOptions, nameZhOptions, shadeEnOptions } =
    useComboboxOptions();
  const { channels } = useChannels();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);

  const [showCurrencyPanel, setShowCurrencyPanel] = useState(false);
  const [foreignAmount, setForeignAmount] = useState("");
  const [rate, setRate] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("");

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      item_type: "makeup",
      sensitive_skin_ok: "untested",
      price_type: "normal",
    },
  });

  const itemType = watch("item_type") as ItemType;
  const priceType = watch("price_type") as PriceType;

  // register 的數字欄位包裝：type="text" + inputMode + 全形轉半形
  function numReg(name: Parameters<typeof register>[0]) {
    const { onChange, ...rest } = register(name)
    return {
      ...rest,
      type: "text" as const,
      inputMode: "decimal" as const,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        e.target.value = toHalfWidth(e.target.value)
        onChange(e)
      },
    }
  }

  useEffect(() => {
    if (!isEdit) return;
    getItemById(Number(id)).then(({ data }) => {
      if (!data) return;
      Object.entries(data).forEach(([k, v]) => {
        if (v !== null && v !== undefined) {
          // 舊版 'ok' → 新值 'all_ok'
          const val = (k === 'sensitive_skin_ok' && v === 'ok') ? 'all_ok' : v
          setValue(k as keyof FormData, val as never)
        }
      });
      // category/item_type 即使是空值也要明確設定，避免驗證失敗
      setValue('item_type', data.item_type ?? 'makeup');
      setValue('category', data.category ?? '');
      if (data.image_url) setImagePreview(data.image_url);
    });
  }, [id, isEdit, setValue]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function uploadImage(file: File): Promise<string | null> {
    const ext = file.name.split(".").pop();
    const path = `items/${Date.now()}.${ext}`;
    const compressed = await compressImage(file);
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, compressed);
    if (error) return null;
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 800;
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas
          .getContext("2d")!
          .drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.8);
      };
      img.src = URL.createObjectURL(file);
    });
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    let image_url: string | undefined;

    if (imageFile) {
      const url = await uploadImage(imageFile);
      if (url) {
        image_url = url;
      } else {
        showToast("圖片上傳失敗，品項仍會儲存（不含圖片）", "error");
      }
    }

    const payload = {
      ...data,
      price:
        data.price_type === "gift"
          ? 0
          : data.price === ""
            ? null
            : Number(data.price),
      price_type: data.price_type ?? "normal",
      original_price:
        data.price_type === "split" && data.original_price !== ""
          ? Number(data.original_price)
          : null,
      rating: data.rating !== "" && data.rating != null ? Number(data.rating) : null,
      brand_zh: data.brand_zh || null,
      brand_en: data.brand_en || null,
      name_zh: data.name_zh || null,
      name_en: data.name_en || null,
      shade_zh: itemType === "makeup" ? (data.shade_zh || null) : null,
      shade_en: itemType === "makeup" ? (data.shade_en || null) : null,
      mfg_date: data.mfg_date || null,
      exp_date: data.exp_date || null,
      purchase_date: data.purchase_date || null,
      note: data.note || null,
      review: data.review || null,
      category: data.category || null,
      subcategory: data.subcategory || null,
      currency: data.currency || null,
      sensitive_skin_ok:
        itemType === "skincare" ? (data.sensitive_skin_ok ?? "untested") : null,
      fragrance: itemType === "skincare" ? (data.fragrance ?? null) : null,
      is_dud: data.is_dud ?? false,
      is_sample: data.is_sample ?? false,
      is_favorite: data.is_favorite ?? false,
      volume_ml: data.volume_ml !== "" && data.volume_ml != null ? Number(data.volume_ml) : null,
      channel: data.channel || null,
      ...(image_url ? { image_url } : {}),
    };

    try {
      if (isEdit) {
        await updateItem(Number(id), payload);
        showToast("品項已更新");
      } else {
        const { data: created, error } = await createItem(payload as never);
        if (error) throw error;
        setCreatedId(created?.id ?? null);
      }
      // 儲存成功後，將新值加入本地建議清單
      if (data.brand_en) addCustomOption('brand_en', data.brand_en)
      if (data.brand_zh) addCustomOption('brand_zh', data.brand_zh)
      if (data.name_en) addCustomOption('name_en_full',
        data.brand_en ? `${data.brand_en} — ${data.name_en}` : data.name_en
      )
      if (data.name_zh) addCustomOption('name_zh', data.name_zh)
      if (data.shade_en) addCustomOption('shade_en', data.shade_en)
      if (isEdit) navigate(`/items/${id}`, { replace: true })
    } catch (err) {
      const detail =
        err instanceof Error ? err.message
        : typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: unknown }).message)
        : undefined
      showToast("儲存失敗，請稍後再試", "error", detail)
    }
    setSubmitting(false);
  };

  const activeType =
    "bg-[var(--color-primary)] text-white border-[var(--color-primary)]";
  const inactiveType =
    "bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border-[var(--color-border)]";

  return (
    <div>

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-[var(--color-text-muted)] min-h-0 min-w-0 p-1"
        >
          ‹
        </button>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">
          {isEdit ? "編輯品項" : "新增品項"}
        </h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* 品項類型 */}
        <Field label="品項類型" required error={errors.item_type?.message}>
          <div className="flex gap-2">
            {(["makeup", "skincare"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setValue("item_type", t);
                  setValue("category", "");
                }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors min-h-0 ${
                  itemType === t ? activeType : inactiveType
                }`}
              >
                {t === "makeup" ? "化妝品" : "保養品"}
              </button>
            ))}
          </div>
        </Field>

        {/* 類別 */}
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <CategorySelect
              label="類別"
              value={field.value ?? ""}
              onChange={field.onChange}
              itemType={itemType}
              error={errors.category?.message}
            />
          )}
        />
        {/* 品牌 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Controller
            name="brand_en"
            control={control}
            render={({ field }) => (
              <Combobox
                label="品牌（原文）"
                value={field.value ?? ""}
                onChange={field.onChange}
                options={brands}
                placeholder="英文 / 日文 / 韓文品牌名"
                error={errors.brand_en?.message}
              />
            )}
          />
          <Controller
            name="brand_zh"
            control={control}
            render={({ field }) => (
              <Combobox
                label="品牌（中文）"
                value={field.value ?? ""}
                onChange={field.onChange}
                options={brandZhOptions}
                placeholder="中文名稱（選填）"
              />
            )}
          />
        </div>

        {/* 品名 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Controller
            name="name_en"
            control={control}
            render={({ field }) => (
              <Combobox
                label="品名（原文）"
                value={field.value ?? ""}
                onChange={(v) => {
                  const parts = v.split(" — ");
                  field.onChange(parts[1] ?? v);
                  if (parts.length === 2 && !watch("brand_en"))
                    setValue("brand_en", parts[0]);
                }}
                options={names}
                placeholder="英文 / 日文 / 韓文品名"
                error={errors.name_en?.message}
              />
            )}
          />
          <Controller
            name="name_zh"
            control={control}
            render={({ field }) => (
              <Combobox
                label="品名（中文）"
                value={field.value ?? ""}
                onChange={field.onChange}
                options={nameZhOptions}
                placeholder="中文名稱（選填）"
              />
            )}
          />
        </div>

        {/* 色號（化妝品專屬） */}
        {itemType === "makeup" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Controller
              name="shade_en"
              control={control}
              render={({ field }) => (
                <Combobox
                  label="色號（原文）"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={shadeEnOptions}
                  placeholder="色號名稱（選填）"
                />
              )}
            />
            <Field label="色號（中文）">
              <Input {...register("shade_zh")} placeholder="中文色號（選填）" />
            </Field>
          </div>
        )}

        {/* 日期：製造日期 + 有效期限 並排 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <Controller
            name="mfg_date"
            control={control}
            render={({ field }) => {
              const mfg = field.value
              function applyShelfLife(years: number) {
                const base = mfg || new Date().toISOString().slice(0, 10)
                const d = new Date(base)
                d.setFullYear(d.getFullYear() + years)
                setValue("exp_date", d.toISOString().slice(0, 10))
              }
              return (
                <div>
                  <DatePicker
                    label="製造日期"
                    value={mfg ?? ""}
                    onChange={field.onChange}
                  />
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-xs text-[var(--color-text-muted)]">推算到期日：</span>
                    {[3, 5].map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => applyShelfLife(y)}
                        className="px-2.5 py-0.5 rounded-full text-xs font-medium border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors min-h-0"
                      >
                        +{y} 年
                      </button>
                    ))}
                  </div>
                </div>
              )
            }}
          />
          <Controller
            name="exp_date"
            control={control}
            render={({ field }) => {
              const exp = field.value
              function applyShelfLife(years: number) {
                const base = exp || new Date().toISOString().slice(0, 10)
                const d = new Date(base)
                d.setFullYear(d.getFullYear() - years)
                setValue("mfg_date", d.toISOString().slice(0, 10))
              }
              return (
                <div>
                  <DatePicker
                    label="有效期限"
                    value={exp ?? ""}
                    onChange={field.onChange}
                  />
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-xs text-[var(--color-text-muted)]">反推製造日：</span>
                    {[3, 5].map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => applyShelfLife(y)}
                        className="px-2.5 py-0.5 rounded-full text-xs font-medium border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors min-h-0"
                      >
                        -{y} 年
                      </button>
                    ))}
                  </div>
                </div>
              )
            }}
          />
        </div>

        {/* 購入日期 + 購入金額 並排 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <Controller
            name="purchase_date"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="購入日期"
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            )}
          />

          {/* 金額 */}
          <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-medium text-[var(--color-text)] whitespace-nowrap">
              購入金額（NTD）
            </label>
            <div className="flex gap-1.5">
              {(
                [
                  { value: "normal",  label: "一般" },
                  { value: "split",   label: "組合價" },
                  { value: "gift",    label: "贈品" },
                  { value: "present", label: "禮物" },
                ] as const
              ).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setValue("price_type", t.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors min-h-0 ${
                    priceType === t.value
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border-[var(--color-border)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {priceType !== "gift" && (
            <div className="space-y-2">
              {priceType === "split" && (
                <div>
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">
                    組合總價（NT$）
                  </p>
                  <Input
                    {...numReg("original_price")}
                    placeholder="例：1500（整組售價）"
                    error={errors.original_price?.message}
                  />
                </div>
              )}
              <div>
                {priceType === "split" && (
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">
                    此品項分攤金額（NT$）
                  </p>
                )}
                <div className="relative">
                  {/* 使用 Controller 讓 setValue 能正確更新顯示 */}
                  <Controller
                    name="price"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const v = toHalfWidth(e.target.value)
                          field.onChange(v === "" ? "" : v)
                        }}
                        placeholder={
                          priceType === "split" ? "此色號分攤金額" : "0"
                        }
                        error={errors.price?.message}
                        className="pr-20"
                      />
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrencyPanel((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-primary)] font-medium min-h-0 min-w-0 hover:underline"
                  >
                    外幣換算
                  </button>
                </div>
              </div>
            </div>
          )}
          {priceType === "gift" && (
            <p className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-muted)] px-3 py-2 rounded-xl">
              贈品金額記為 $0，不計入統計花費
            </p>
          )}

          {/* 外幣換算面板 */}
          {showCurrencyPanel && priceType !== "gift" && (
            <div className="bg-[var(--color-bg-muted)] rounded-xl p-3 space-y-3">
              <p className="text-xs font-medium text-[var(--color-text)]">
                外幣換算
              </p>
              <div className="flex flex-wrap gap-2">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setRate(c.rate);
                      setSelectedCurrency(c.code);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs border transition-colors min-h-0 ${
                      selectedCurrency === c.code
                        ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                        : "bg-[var(--color-bg-card)] text-[var(--color-text)] border-[var(--color-border)]"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={foreignAmount}
                  onChange={(e) => setForeignAmount(toHalfWidth(e.target.value))}
                  placeholder="外幣金額"
                  className="flex-1 px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm bg-[var(--color-bg-card)] text-[var(--color-text)] focus:outline-none"
                />
                <span className="text-xs text-[var(--color-text-muted)]">
                  ×
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(toHalfWidth(e.target.value))}
                  placeholder="匯率"
                  className="w-20 px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm bg-[var(--color-bg-card)] text-[var(--color-text)] focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!foreignAmount || !rate}
                  onClick={() => {
                    const ntd = Math.round(
                      Number(foreignAmount) * Number(rate),
                    );
                    setValue("price", ntd);
                    if (selectedCurrency)
                      setValue("currency", selectedCurrency);
                    setShowCurrencyPanel(false);
                    setForeignAmount("");
                    setSelectedCurrency("");
                  }}
                  className="px-3 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-medium min-h-0 disabled:opacity-40"
                >
                  填入
                </button>
              </div>
              {foreignAmount && rate && (
                <p className="text-xs text-[var(--color-primary)] font-medium">
                  ≈ NT${" "}
                  {Math.round(
                    Number(foreignAmount) * Number(rate),
                  ).toLocaleString()}
                </p>
              )}
            </div>
          )}
          {errors.price && (
            <p
              className="text-xs font-medium"
              style={{ color: "var(--color-primary-dark)" }}
            >
              {errors.price.message}
            </p>
          )}
        </div>
        </div>{/* end 購入日期 + 購入金額 grid */}

        {/* 通路 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">通路</label>
          <div className="flex flex-wrap gap-2">
            {channels.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setValue('channel', watch('channel') === ch.label ? undefined : ch.label)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors min-h-0 ${
                  watch('channel') === ch.label ? activeType : inactiveType
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        {/* 圖片 */}
        <Field label="產品圖片">
          <label className="inline-block cursor-pointer">
            {imagePreview ? (
              <div className="relative w-32 h-32">
                <img
                  src={imagePreview}
                  alt="preview"
                  className="w-full h-full object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setImageFile(null);
                    setImagePreview(null);
                    const input = (e.currentTarget.closest('label') as HTMLLabelElement)
                      ?.querySelector('input[type="file"]') as HTMLInputElement | null;
                    if (input) input.value = '';
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center min-h-0 min-w-0"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="w-32 h-32 border-2 border-dashed border-[var(--color-border)] rounded-xl flex flex-col items-center justify-center text-[var(--color-text-muted)] text-sm hover:border-[var(--color-primary)] transition-colors gap-1.5">
                <Camera size={24} strokeWidth={1.5} />
                <span>上傳圖片</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
        </Field>

        {/* 功能欄 */}
        <div className="bg-[var(--color-bg-muted)] rounded-2xl px-4 py-3 space-y-3">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">功能標記</p>

          {/* 香味（保養品專屬） */}
          {itemType === "skincare" && (
            <div>
              <p className="text-sm font-medium text-[var(--color-text)] mb-2">香味</p>
              <div className="flex gap-2">
                {([
                  { value: "strong", label: "太香" },
                  { value: "mild",   label: "微香" },
                  { value: "none",   label: "無香" },
                ] as const).map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setValue("fragrance", watch("fragrance") === o.value ? undefined : o.value)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors min-h-0 ${
                      watch("fragrance") === o.value ? activeType : inactiveType
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ML 數（保養品） */}
          {itemType === "skincare" && (
            <div>
              <p className="text-sm font-medium text-[var(--color-text)] mb-2">容量（ml）</p>
              <Input
                {...numReg("volume_ml")}
                placeholder="例：50"
              />
            </div>
          )}

          {/* 最愛 */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">最愛</p>
              <p className="text-xs text-[var(--color-text-muted)]">喜歡，下次還想買</p>
            </div>
            <Toggle
              checked={!!watch("is_favorite")}
              onChange={() => {
                const next = !watch("is_favorite")
                setValue("is_favorite", next)
                if (next) setValue("is_dud", false)
              }}
              color="primary"
            />
          </div>

          {/* 雷品 */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">雷品</p>
              <p className="text-xs text-[var(--color-text-muted)]">踩雷，不推薦</p>
            </div>
            <Toggle
              checked={!!watch("is_dud")}
              onChange={() => {
                const next = !watch("is_dud")
                setValue("is_dud", next)
                if (next) setValue("is_favorite", false)
              }}
              color="accent"
            />
          </div>

          {/* 小樣 */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">小樣</p>
              <p className="text-xs text-[var(--color-text-muted)]">試用品、隨贈樣品</p>
            </div>
            <Toggle
              checked={!!watch("is_sample")}
              onChange={() => setValue("is_sample", !watch("is_sample"))}
              color="accent"
            />
          </div>
        </div>

        {/* 備註 */}
        <Field label="備註">
          <AutoTextarea
            {...register("note")}
            placeholder={"選填\n支援 - 開頭的條列格式"}
          />
        </Field>

        {/* 評分 */}
        <Field label="評分">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setValue("rating", watch("rating") === n ? "" : n)}
                className={`w-10 h-10 rounded-full text-2xl transition-colors min-h-0 min-w-0 ${
                  Number(watch("rating")) >= n
                    ? "text-yellow-400"
                    : "text-[var(--color-border)]"
                }`}
              >
                ★
              </button>
            ))}
            {watch("rating") && (
              <button
                type="button"
                onClick={() => setValue("rating", "")}
                className="ml-1 text-xs text-[var(--color-text-muted)] underline min-h-0 self-center"
              >
                清除
              </button>
            )}
          </div>
        </Field>

        {/* 心得 */}
        <Field label="心得">
          <AutoTextarea
            {...register("review")}
            placeholder="記錄使用感受、上妝效果、發色…"
          />
        </Field>

        {/* 保養品專屬 */}
        {itemType === "skincare" && (
          <Field label="敏感肌適用">
            <div className="space-y-2">
              {/* 上排：三種 OK 情境 */}
              <div className="flex gap-2">
                {SENSITIVE_SKIN_OPTIONS.slice(0, 3).map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setValue("sensitive_skin_ok", o.value)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors min-h-0 ${
                      watch("sensitive_skin_ok") === o.value ? activeType : inactiveType
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {/* 下排：NG + 未測試 */}
              <div className="flex gap-2">
                {SENSITIVE_SKIN_OPTIONS.slice(3).map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setValue("sensitive_skin_ok", o.value)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors min-h-0 ${
                      watch("sensitive_skin_ok") === o.value ? activeType : inactiveType
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </Field>
        )}

        {/* 送出 */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium text-sm disabled:opacity-60 transition-opacity"
        >
          {submitting ? "儲存中…" : isEdit ? "儲存變更" : "新增品項"}
        </button>
      </form>

      <div className="h-8" />

      {/* 新增成功後：詢問是否繼續新增 */}
      {createdId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}>
          <div className="w-full max-w-sm bg-[var(--color-bg-card)] rounded-2xl p-6 shadow-xl"
            style={{ animation: 'selectFadeIn 0.15s ease' }}>
            <p className="text-base font-semibold text-[var(--color-text)] mb-1">品項已新增！</p>
            <p className="text-sm text-[var(--color-text-muted)] mb-5">要繼續新增另一筆嗎？</p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  reset({ item_type: "makeup", sensitive_skin_ok: "untested", price_type: "normal" });
                  setImageFile(null);
                  setImagePreview(null);
                  setShowCurrencyPanel(false);
                  setForeignAmount("");
                  setRate("");
                  setSelectedCurrency("");
                  setCreatedId(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium text-sm"
              >
                繼續新增
              </button>
              <button
                type="button"
                onClick={() => navigate(`/items/${createdId}`)}
                className="w-full py-3 bg-[var(--color-bg-muted)] text-[var(--color-text)] rounded-xl font-medium text-sm"
              >
                查看品項
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
