import { useState, useEffect, useCallback } from 'react'
import { AutoTextarea, NoteContent } from '@/components/ui/AutoTextarea'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2, Camera, X, Pencil } from 'lucide-react'
import { DatePicker } from '@/components/ui/DatePicker'
import { Controller } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  getMedicationRecordById,
  deleteMedicationRecord,
  createMedicationItem,
  updateMedicationItem,
  deleteMedicationItem,
  uploadMedicationImage,
} from '@/lib/supabase/medications'
import { Skeleton } from '@/components/ui/Skeleton'
import { Lightbox } from '@/components/ui/Lightbox'
import { useToast } from '@/components/ui/Toast'
import type { MedicationRecordWithItems, MedicationItem } from '@/types/database'
import { format, parseISO } from 'date-fns'

// ---------- 藥品表單 schema ----------
const itemSchema = z.object({
  name: z.string().min(1, '請輸入藥品名稱'),
  ingredients: z.string().optional(),
  mfg_date: z.string().optional(),
  exp_date: z.string().optional(),
  note: z.string().optional(),
})
type ItemFormData = z.infer<typeof itemSchema>

type ImageEntry = { url: string; file?: File }

// ---------- 藥品新增 / 編輯表單 ----------
function MedicationItemForm({
  recordId,
  editing,
  onDone,
  onCancel,
}: {
  recordId: number
  editing: MedicationItem | null
  onDone: () => void
  onCancel: () => void
}) {
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [images, setImages] = useState<ImageEntry[]>(() => {
    if (editing?.image_urls?.length) return editing.image_urls.map(url => ({ url }))
    return [editing?.image_front_url, editing?.image_back_url]
      .filter(Boolean)
      .map(url => ({ url: url! }))
  })

  const { register, handleSubmit, control, formState: { errors } } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: editing?.name ?? '',
      ingredients: editing?.ingredients ?? '',
      mfg_date: editing?.mfg_date ?? '',
      exp_date: editing?.exp_date ?? '',
      note: editing?.note ?? '',
    },
  })

  function addImage(file: File) {
    setImages(prev => [...prev, { url: URL.createObjectURL(file), file }])
  }
  function removeImage(index: number) {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const onValid = async (data: ItemFormData) => {
    setSubmitting(true)
    const uploadedUrls: string[] = []
    for (const img of images) {
      if (img.file) {
        const url = await uploadMedicationImage(img.file)
        if (url) uploadedUrls.push(url)
        else { showToast('部分圖片上傳失敗', 'error'); setSubmitting(false); return }
      } else {
        uploadedUrls.push(img.url)
      }
    }

    const payload = {
      name: data.name,
      ingredients: data.ingredients || null,
      mfg_date: data.mfg_date || null,
      exp_date: data.exp_date || null,
      note: data.note || null,
      image_urls: uploadedUrls,
      image_front_url: null as string | null,
      image_back_url: null as string | null,
    }

    if (editing) {
      const { error } = await updateMedicationItem(editing.id, payload)
      if (error) { showToast('更新失敗', 'error'); setSubmitting(false); return }
      showToast('已更新藥品')
    } else {
      const { error } = await createMedicationItem({ medication_record_id: recordId, ...payload })
      if (error) { showToast('新增失敗', 'error'); setSubmitting(false); return }
      showToast('已新增藥品')
    }
    setSubmitting(false)
    onDone()
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4 bg-[var(--color-bg-muted)] rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--color-text)]">{editing ? '編輯藥品' : '新增藥品'}</p>
        <button type="button" onClick={onCancel} className="min-h-0 min-w-0 p-1 text-[var(--color-text-muted)]">
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* 藥品名稱 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">藥品名稱 *</label>
        <input
          {...register('name')}
          placeholder="例：氯雷他定、濕疹藥膏"
          className={`w-full px-3 py-2.5 rounded-xl text-sm text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none transition-all ${
            errors.name
              ? 'border-2 border-[var(--color-primary)] shadow-[0_0_0_3px_var(--color-focus-ring)]'
              : 'border border-[var(--color-border)]'
          }`}
        />
        {errors.name && <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-primary-dark)' }}>{errors.name.message}</p>}
      </div>

      {/* 藥品圖片（可多張） */}
      <div>
        <p className="text-xs text-[var(--color-text-muted)] mb-2">藥品圖片 <span className="opacity-60">（可多張）</span></p>
        <div className="flex gap-2 flex-wrap">
          {images.map((img, idx) => (
            <div key={idx} className="relative w-20 h-24 rounded-xl overflow-hidden bg-[var(--color-bg-muted)] flex-shrink-0">
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center min-h-0 min-w-0"
              >
                <X size={10} strokeWidth={2} />
              </button>
            </div>
          ))}
          <label className="cursor-pointer">
            <div className="w-20 h-24 rounded-xl border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center gap-1.5 text-[var(--color-text-muted)] hover:border-[var(--color-primary)] transition-colors bg-[var(--color-bg-muted)]">
              <Camera size={20} strokeWidth={1.5} />
              <span className="text-xs">新增</span>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) addImage(f)
              e.target.value = ''
            }} />
          </label>
        </div>
      </div>

      {/* 製造/有效期限 */}
      <div className="grid grid-cols-2 gap-3">
        <Controller name="mfg_date" control={control} render={({ field }) => (
          <DatePicker label="製造日期" value={field.value ?? ''} onChange={field.onChange} />
        )} />
        <Controller name="exp_date" control={control} render={({ field }) => (
          <DatePicker label="有效期限" value={field.value ?? ''} onChange={field.onChange} />
        )} />
      </div>

      {/* 成分 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">成分</label>
        <textarea
          {...register('ingredients')}
          rows={2}
          placeholder="主要成分（選填）"
          className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none resize-none"
        />
      </div>

      {/* 備註 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">備註</label>
        <AutoTextarea {...register('note')} placeholder="用法、注意事項…（選填）" />
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] min-h-0"
        >取消</button>
        <button type="submit" disabled={submitting}
          className="flex-1 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium min-h-0 disabled:opacity-60"
        >{submitting ? '儲存中…' : editing ? '儲存' : '新增'}</button>
      </div>
    </form>
  )
}

// ---------- 藥品卡片 ----------
function MedicationItemCard({
  item,
  onEdit,
  onDelete,
  onImageClick,
}: {
  item: MedicationItem
  onEdit: () => void
  onDelete: () => void
  onImageClick: (urls: string[], index: number) => void
}) {
  const images = item.image_urls?.length
    ? item.image_urls
    : [item.image_front_url, item.image_back_url].filter(Boolean) as string[]

  return (
    <div className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-bg-card)] overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="font-semibold text-[var(--color-text)]">{item.name}</p>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={onEdit} className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] min-h-0 min-w-0 transition-colors">
              <Pencil size={13} strokeWidth={1.5} />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg text-[var(--color-danger)] hover:bg-red-50 min-h-0 min-w-0 transition-colors">
              <Trash2 size={13} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* 圖片 */}
        {images.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {images.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onImageClick(images, idx)}
                className="w-16 h-20 rounded-lg overflow-hidden bg-[var(--color-bg-muted)] flex-shrink-0 min-h-0 min-w-0 hover:opacity-80 transition-opacity"
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* 日期 */}
        {(item.mfg_date || item.exp_date) && (
          <div className="flex gap-4 mb-2">
            {item.mfg_date && (
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">製造日期</p>
                <p className="text-sm text-[var(--color-text)]">{format(new Date(item.mfg_date), 'yyyy-MM-dd')}</p>
              </div>
            )}
            {item.exp_date && (
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">有效期限</p>
                <p className="text-sm text-[var(--color-text)]">{format(new Date(item.exp_date), 'yyyy-MM-dd')}</p>
              </div>
            )}
          </div>
        )}

        {/* 成分 */}
        {item.ingredients && (
          <div className="mb-2">
            <p className="text-xs text-[var(--color-text-muted)] mb-0.5">成分</p>
            <p className="text-sm text-[var(--color-text)] leading-relaxed">{item.ingredients}</p>
          </div>
        )}

        {/* 備註 */}
        {item.note && (
          <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-0.5">備註</p>
            <NoteContent text={item.note} />
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- 主頁面 ----------
export default function MedicationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [record, setRecord] = useState<MedicationRecordWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingItem, setEditingItem] = useState<MedicationItem | null>(null)
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null)

  const load = useCallback(async () => {
    const { data } = await getMedicationRecordById(Number(id))
    setRecord(data as MedicationRecordWithItems ?? null)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleDeleteRecord() {
    if (!confirm('確定要刪除此用藥紀錄？所有藥品資料也會一併刪除。')) return
    await deleteMedicationRecord(Number(id))
    navigate('/my/medications', { replace: true })
  }

  async function handleDeleteItem(itemId: number) {
    if (!confirm('確定要刪除此藥品？')) return
    await deleteMedicationItem(itemId)
    showToast('已刪除')
    await load()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    )
  }

  if (!record) {
    return <p className="text-center text-[var(--color-text-muted)] py-16">找不到此紀錄</p>
  }

  return (
    <div>
      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          images={lightbox.urls}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onPrev={lightbox.index > 0 ? () => setLightbox((l) => l && { ...l, index: l.index - 1 }) : undefined}
          onNext={lightbox.index < lightbox.urls.length - 1 ? () => setLightbox((l) => l && { ...l, index: l.index + 1 }) : undefined}
        />
      )}

      {/* 頂部 */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate(-1)} className="min-h-0 min-w-0 p-1 text-[var(--color-text-muted)]">
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <div className="flex gap-2">
          <Link
            to={`/my/medications/${id}/edit`}
            className="px-3 py-2 rounded-xl border border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-medium flex items-center min-h-0"
          >
            編輯
          </Link>
          <button
            onClick={handleDeleteRecord}
            className="px-3 py-2 rounded-xl border border-red-200 text-red-400 text-sm font-medium min-h-0"
          >
            刪除
          </button>
        </div>
      </div>

      {/* 大項目資訊 */}
      <div className="bg-[var(--color-bg-muted)] rounded-2xl px-4 py-4 mb-5">
        <p className="text-xs text-[var(--color-text-muted)] mb-1">
          {format(parseISO(record.pickup_date), 'yyyy年M月d日')}
        </p>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">{record.reason}</h2>
        {record.note && (
          <NoteContent text={record.note} />
        )}
      </div>

      {/* 藥品列表 */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-[var(--color-text)]">
          藥品清單
          <span className="text-[var(--color-text-muted)] font-normal ml-1.5">
            ({record.medication_items.length} 項)
          </span>
        </p>
        {!showItemForm && !editingItem && (
          <button
            onClick={() => setShowItemForm(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-medium min-h-0"
          >
            <Plus size={13} strokeWidth={2} />
            新增藥品
          </button>
        )}
      </div>

      {/* 新增 / 編輯表單 */}
      {(showItemForm || editingItem) && (
        <div className="mb-4">
          <MedicationItemForm
            recordId={record.id}
            editing={editingItem}
            onDone={async () => {
              setShowItemForm(false)
              setEditingItem(null)
              await load()
            }}
            onCancel={() => {
              setShowItemForm(false)
              setEditingItem(null)
            }}
          />
        </div>
      )}

      {/* 藥品卡片 */}
      {record.medication_items.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
          尚未新增任何藥品，點「新增藥品」開始記錄
        </p>
      ) : (
        <div className="space-y-3">
          {record.medication_items.map((item) => (
            <MedicationItemCard
              key={item.id}
              item={item}
              onEdit={() => { setEditingItem(item); setShowItemForm(false) }}
              onDelete={() => handleDeleteItem(item.id)}
              onImageClick={(urls, idx) => setLightbox({ urls, index: idx })}
            />
          ))}
        </div>
      )}

      <div className="h-8" />
    </div>
  )
}
