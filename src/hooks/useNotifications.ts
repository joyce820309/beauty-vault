import { useEffect, useState, useCallback } from 'react'

export interface NotificationRule {
  id: string
  label: string
  enabled: boolean
  daysBeforeExpiry: number
  notifyAt: string // HH:mm
}

export interface NotificationLog {
  id: string
  title: string
  body: string
  receivedAt: string // ISO
}

export interface NotificationSettings {
  masterEnabled: boolean
  expiryReminder: boolean
  expiryDaysBefore: number
  expiryNotifyAt: string
  customRules: NotificationRule[]
}

const SETTINGS_KEY = 'bv_notification_settings'
const LOGS_KEY = 'bv_notification_logs'
const MAX_LOGS = 50

const DEFAULT_SETTINGS: NotificationSettings = {
  masterEnabled: false,
  expiryReminder: true,
  expiryDaysBefore: 7,
  expiryNotifyAt: '09:00',
  customRules: [],
}

function loadSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function loadLogs(): NotificationLog[] {
  try {
    const raw = localStorage.getItem(LOGS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLogs(logs: NotificationLog[]) {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, MAX_LOGS)))
}

export function useNotifications() {
  const [settings, setSettings] = useState<NotificationSettings>(loadSettings)
  const [logs, setLogs] = useState<NotificationLog[]>(loadLogs)
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof Notification === 'undefined') return 'denied'
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [])

  const updateSettings = useCallback((patch: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }))
  }, [])

  const toggleMaster = useCallback(async (): Promise<boolean> => {
    if (!settings.masterEnabled) {
      const perm = await requestPermission()
      if (perm !== 'granted') return false
      setSettings(prev => ({ ...prev, masterEnabled: true }))
      return true
    } else {
      setSettings(prev => ({ ...prev, masterEnabled: false }))
      return false
    }
  }, [settings.masterEnabled, requestPermission])

  const addCustomRule = useCallback((rule: Omit<NotificationRule, 'id'>) => {
    const newRule: NotificationRule = { ...rule, id: crypto.randomUUID() }
    setSettings(prev => ({
      ...prev,
      customRules: [...prev.customRules, newRule],
    }))
    return newRule
  }, [])

  const updateCustomRule = useCallback((id: string, patch: Partial<Omit<NotificationRule, 'id'>>) => {
    setSettings(prev => ({
      ...prev,
      customRules: prev.customRules.map(r => r.id === id ? { ...r, ...patch } : r),
    }))
  }, [])

  const deleteCustomRule = useCallback((id: string) => {
    setSettings(prev => ({
      ...prev,
      customRules: prev.customRules.filter(r => r.id !== id),
    }))
  }, [])

  const sendNotification = useCallback((title: string, body: string) => {
    if (permission !== 'granted' || !settings.masterEnabled) return
    try {
      new Notification(title, { body, icon: '/pwa-192x192.png' })
      const log: NotificationLog = {
        id: crypto.randomUUID(),
        title,
        body,
        receivedAt: new Date().toISOString(),
      }
      setLogs(prev => {
        const updated = [log, ...prev].slice(0, MAX_LOGS)
        saveLogs(updated)
        return updated
      })
    } catch {
      // Notification API not supported
    }
  }, [permission, settings.masterEnabled])

  const clearLogs = useCallback(() => {
    setLogs([])
    localStorage.removeItem(LOGS_KEY)
  }, [])

  return {
    settings,
    logs,
    permission,
    requestPermission,
    updateSettings,
    toggleMaster,
    addCustomRule,
    updateCustomRule,
    deleteCustomRule,
    sendNotification,
    clearLogs,
  }
}
