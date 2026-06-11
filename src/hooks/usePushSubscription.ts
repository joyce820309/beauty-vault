import { useState, useEffect, useCallback } from 'react'
import { savePushSubscription, deletePushSubscription, getMySubscription } from '@/lib/supabase/pushSubscriptions'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

export type PushStatus = 'unsupported' | 'loading' | 'subscribed' | 'unsubscribed' | 'error'

export function usePushSubscription() {
  const [status, setStatus] = useState<PushStatus>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }

    // 檢查目前 SW 的訂閱狀態
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      if (!sub) { setStatus('unsubscribed'); return }

      // 確認 DB 裡也有（避免 SW 有但 DB 沒有的狀態）
      const saved = await getMySubscription(sub.endpoint)
      if (saved) {
        setStatus('subscribed')
      } else {
        // SW 有訂閱但 DB 無記錄，重新存一次
        await savePushSubscription(sub)
        setStatus('subscribed')
      }
    }).catch(() => setStatus('unsubscribed'))
  }, [])

  const subscribe = useCallback(async (): Promise<boolean> => {
    setErrorMsg(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY,
      })
      const { error } = await savePushSubscription(sub)
      if (error) throw new Error(error.message)
      setStatus('subscribed')
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : '訂閱失敗'
      setErrorMsg(msg)
      setStatus('error')
      return false
    }
  }, [])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setErrorMsg(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await deletePushSubscription(sub.endpoint)
        await sub.unsubscribe()
      }
      setStatus('unsubscribed')
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : '取消訂閱失敗'
      setErrorMsg(msg)
      setStatus('error')
      return false
    }
  }, [])

  return { status, errorMsg, subscribe, unsubscribe }
}
