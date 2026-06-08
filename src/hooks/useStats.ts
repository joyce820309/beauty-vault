import { useMemo } from 'react'
import { subMonths, parseISO, startOfMonth, format } from 'date-fns'
import type { Item } from '@/types/database'
import { getExpiryLevel } from '@/utils/expiry'

export function useStats(items: Item[], getCategoryLabel: (v: string | null) => string = (v) => v ?? '其他') {
  return useMemo(() => {
    const now = new Date()

    // 總覽卡片
    const totalCount = items.length
    const totalSpend = items.reduce((s, i) => s + (i.price ?? 0), 0)
    const thisYearSpend = items
      .filter((i) => i.purchase_date && parseISO(i.purchase_date).getFullYear() === now.getFullYear())
      .reduce((s, i) => s + (i.price ?? 0), 0)
    const expiringCount = items.filter((i) => {
      const lvl = getExpiryLevel(i.exp_date)
      return lvl === 'urgent' || lvl === 'warning'
    }).length

    // 化妝品圓餅（品項數）
    const makeupByCategory = groupBy(
      items.filter((i) => i.item_type === 'makeup'),
      (i) => getCategoryLabel(i.category)
    )
    const makeupPieCount = toPieData(makeupByCategory, 'count')
    const makeupPiePrice = toPieData(
      groupByPrice(items.filter((i) => i.item_type === 'makeup'), (i) => getCategoryLabel(i.category)),
      'price'
    )

    // 保養品圓餅
    const skincareByCategory = groupBy(
      items.filter((i) => i.item_type === 'skincare'),
      (i) => getCategoryLabel(i.category)
    )
    const skincarePieCount = toPieData(skincareByCategory, 'count')
    const skincarePiePrice = toPieData(
      groupByPrice(items.filter((i) => i.item_type === 'skincare'), (i) => getCategoryLabel(i.category)),
      'price'
    )

    // 品牌圓餅（前 8 名 + 其他）
    const TOP_N = 8
    const brandCountMap = groupBy(
      items.filter(i => i.brand_en || i.brand_zh),
      (i) => i.brand_en || i.brand_zh || '不詳'
    )
    const brandPriceMap = groupByPrice(
      items.filter(i => i.brand_en || i.brand_zh),
      (i) => i.brand_en || i.brand_zh || '不詳'
    )
    function toTopN(map: Record<string, number>): { name: string; value: number }[] {
      const sorted = Object.entries(map).sort((a, b) => b[1] - a[1])
      const top = sorted.slice(0, TOP_N).map(([name, value]) => ({ name, value }))
      const rest = sorted.slice(TOP_N).reduce((s, [, v]) => s + v, 0)
      if (rest > 0) top.push({ name: '其他', value: rest })
      return top
    }
    const brandPieCount = toTopN(brandCountMap)
    const brandPiePrice = toTopN(brandPriceMap)

    // 消費趨勢（近 12 個月）
    const trendMonths = Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(startOfMonth(now), 11 - i)
      return { key: format(d, 'yyyy-MM'), label: format(d, 'M月'), date: d }
    })
    const trendLine = trendMonths.map(({ key, label }) => {
      const monthItems = items.filter((i) => i.purchase_date?.startsWith(key))
      return {
        month: label,
        化妝品: monthItems.filter((i) => i.item_type === 'makeup').reduce((s, i) => s + (i.price ?? 0), 0),
        保養品: monthItems.filter((i) => i.item_type === 'skincare').reduce((s, i) => s + (i.price ?? 0), 0),
      }
    })

    return {
      totalCount, totalSpend, thisYearSpend, expiringCount,
      makeupPieCount, makeupPiePrice,
      skincarePieCount, skincarePiePrice,
      brandPieCount, brandPiePrice,
      trendLine,
    }
  }, [items])
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, number> {
  return arr.reduce((acc, item) => {
    const k = key(item)
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
}

function groupByPrice<T extends { price: number | null }>(
  arr: T[],
  key: (item: T) => string
): Record<string, number> {
  return arr.reduce((acc, item) => {
    const k = key(item)
    acc[k] = (acc[k] ?? 0) + (item.price ?? 0)
    return acc
  }, {} as Record<string, number>)
}

function toPieData(map: Record<string, number>, _type: string) {
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export type TrendRange = '3m' | '6m' | '1y' | 'all'
export function filterTrend(trendLine: ReturnType<typeof useStats>['trendLine'], range: TrendRange) {
  if (range === 'all') return trendLine
  const n = range === '3m' ? 3 : range === '6m' ? 6 : 12
  return trendLine.slice(-n)
}
