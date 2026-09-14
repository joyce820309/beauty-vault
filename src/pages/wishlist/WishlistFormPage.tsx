import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { WishForm, type WishFormData } from './WishForm'
import { getWishlistItem, createWishlistItem, updateWishlistItem, uploadWishlistImage } from '@/lib/supabase/wishlist'
import { useToast } from '@/components/ui/Toast'
import { Skeleton } from '@/components/ui/Skeleton'
import type { WishlistItem } from '@/types/database'

export default function WishlistFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const isEdit = id !== undefined
  const [item, setItem] = useState<WishlistItem | null>(null)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    getWishlistItem(Number(id)).then(({ data }) => {
      setItem(data)
      setLoading(false)
    })
  }, [id, isEdit])

  async function handleSubmit(data: WishFormData, imageFile: File | null, imageUrl: string | null) {
    let finalImageUrl = imageUrl
    if (imageFile) {
      const url = await uploadWishlistImage(imageFile)
      if (url) finalImageUrl = url
      else showToast('圖片上傳失敗，品項仍會儲存（不含圖片）', 'error')
    }

    const payload = {
      item_type: data.item_type ?? 'makeup',
      brand: data.brand || null,
      name_zh: data.name_zh || null,
      name_en: data.name_en || null,
      shade: data.shade_en || data.shade_zh || null,
      shade_zh: data.shade_zh || null,
      shade_en: data.shade_en || null,
      price_type: data.price_type ?? 'normal',
      price: data.price_type === 'gift' ? 0 : (data.price === '' ? null : Number(data.price) || null),
      foreign_currency: data.foreign_currency || null,
      foreign_amount: data.foreign_amount === '' ? null : Number(data.foreign_amount) || null,
      exchange_rate: data.exchange_rate === '' ? null : Number(data.exchange_rate) || null,
      url: data.url || null,
      image_url: finalImageUrl ?? null,
      note: data.note || null,
    }

    if (isEdit) {
      const { error } = await updateWishlistItem(Number(id), payload)
      if (error) {
        showToast('更新失敗', 'error')
        return
      }
      showToast('已更新')
      navigate(`/my/wishlist/${id}`, { replace: true })
      return
    }

    const { data: created, error } = await createWishlistItem({
      ...payload,
      is_purchased: false,
    })
    if (error || !created) {
      showToast('新增失敗', 'error')
      return
    }
    showToast('已加入採購清單')
    navigate(`/my/wishlist/${created.id}`, { replace: true })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  if (isEdit && !item) {
    return <p className="text-center text-[var(--color-text-muted)] py-16">找不到此採購品項</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          onClick={() => navigate(isEdit ? `/my/wishlist/${id}` : '/my/wishlist')}
          className="text-[var(--color-text-muted)] min-h-0 min-w-0 p-1 text-lg"
        >
          ‹
        </button>
        <p className="text-sm font-semibold text-[var(--color-text)]">
          {isEdit ? '編輯品項' : '新增品項'}
        </p>
        <div className="w-6" />
      </div>
      <WishForm
        defaultValues={item ? {
          item_type: item.item_type ?? 'makeup',
          brand: item.brand ?? '',
          name_zh: item.name_zh ?? '',
          name_en: item.name_en ?? '',
          shade_zh: item.shade_zh ?? '',
          shade_en: item.shade_en ?? item.shade ?? '',
          price_type: item.price_type ?? 'normal',
          price: item.price ?? '',
          foreign_currency: item.foreign_currency ?? '',
          foreign_amount: item.foreign_amount ?? '',
          exchange_rate: item.exchange_rate ?? '',
          url: item.url ?? '',
          note: item.note ?? '',
        } : undefined}
        defaultImageUrl={item?.image_url}
        onSubmit={handleSubmit}
        onCancel={() => navigate(isEdit ? `/my/wishlist/${id}` : '/my/wishlist')}
        submitLabel={isEdit ? '儲存' : '加入清單'}
      />
    </div>
  )
}
