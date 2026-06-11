import { useEffect, useRef } from 'react'
import { differenceInDays, parseISO, format } from 'date-fns'
import { getItems } from '@/lib/supabase/items'
import type { NotificationSettings, NotificationLog } from './useNotifications'

const SETTINGS_KEY = 'bv_notification_settings'
const LOGS_KEY = 'bv_notification_logs'
const FIRED_KEY = 'bv_notification_fired' // { "YYYY-MM-DD:ruleKey": true }
const MAX_LOGS = 50
const CHECK_INTERVAL_MS = 60_000 // 每分鐘檢查一次

function loadSettings(): NotificationSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function getFiredMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(FIRED_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function markFired(key: string) {
  const map = getFiredMap()
  map[key] = true
  // 只保留最近 7 天，避免無限累積
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  const cutoffStr = format(cutoff, 'yyyy-MM-dd')
  const pruned: Record<string, boolean> = {}
  for (const k of Object.keys(map)) {
    const dateStr = k.split(':')[0]
    if (dateStr >= cutoffStr) pruned[k] = true
  }
  localStorage.setItem(FIRED_KEY, JSON.stringify(pruned))
}

function appendLog(log: NotificationLog) {
  try {
    const raw = localStorage.getItem(LOGS_KEY)
    const logs: NotificationLog[] = raw ? JSON.parse(raw) : []
    const updated = [log, ...logs].slice(0, MAX_LOGS)
    localStorage.setItem(LOGS_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

function fireNotification(title: string, body: string, firedKey: string) {
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/pwa-192x192.png' })
    appendLog({
      id: crypto.randomUUID(),
      title,
      body,
      receivedAt: new Date().toISOString(),
    })
    markFired(firedKey)
  } catch {
    // Notification API not supported
  }
}

async function checkAndFire() {
  const settings = loadSettings()
  if (!settings?.masterEnabled) return
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

  const nowStr = format(new Date(), 'HH:mm')
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const firedMap = getFiredMap()

  // 拿出所有未丟棄、有到期日的品項
  const { data: items } = await getItems()
  const activeItems = (items ?? []).filter(
    (i) => i.exp_date && i.disposal_status !== 'disposed'
  )

  // ── 即期提醒 ────────────────────────────────────────
  if (settings.expiryReminder && nowStr === settings.expiryNotifyAt) {
    const days = settings.expiryDaysBefore
    const matching = activeItems.filter((i) => {
      const diff = differenceInDays(parseISO(i.exp_date!), new Date())
      return days === 0 ? diff === 0 : diff === days
    })
    for (const item of matching) {
      const key = `${todayStr}:expiry:${item.id}`
      if (firedMap[key]) continue
      const name = item.name_zh || item.name_en || '品項'
      const label = days === 0 ? '今日到期' : `${days} 天後到期`
      fireNotification(`⏰ 即將到期：${name}`, `${name} 將在 ${label}，記得確認！`, key)
    }
  }

  // ── 自訂規則 ────────────────────────────────────────
  for (const rule of settings.customRules) {
    if (!rule.enabled) continue
    if (nowStr !== rule.notifyAt) continue

    const days = rule.daysBeforeExpiry
    const matching = activeItems.filter((i) => {
      const diff = differenceInDays(parseISO(i.exp_date!), new Date())
      return days === 0 ? diff === 0 : diff === days
    })
    for (const item of matching) {
      const key = `${todayStr}:rule:${rule.id}:${item.id}`
      if (firedMap[key]) continue
      const name = item.name_zh || item.name_en || '品項'
      const label = days === 0 ? '今日到期' : `${days} 天後到期`
      fireNotification(
        `🔔 ${rule.label}：${name}`,
        `${name} 將在 ${label}，提醒來自自訂規則「${rule.label}」`,
        key
      )
    }
  }
}

export function useNotificationScheduler() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // 啟動時立即跑一次（避免整點剛過就要等一分鐘）
    checkAndFire()

    timerRef.current = setInterval(() => {
      checkAndFire()
    }, CHECK_INTERVAL_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])
}
