import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BellOff,
  ChevronLeft,
  Clock,
  Plus,
  Trash2,
  History,
  CalendarClock,
} from 'lucide-react'
import Toggle from '@/components/ui/Toggle'
import { useNotifications } from '@/hooks/useNotifications'
import type { NotificationRule } from '@/hooks/useNotifications'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

type Tab = 'settings' | 'logs'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const {
    settings,
    logs,
    permission,
    toggleMaster,
    updateSettings,
    addCustomRule,
    updateCustomRule,
    deleteCustomRule,
    sendNotification,
    clearLogs,
  } = useNotifications()

  const [tab, setTab] = useState<Tab>('settings')
  const [showAddRule, setShowAddRule] = useState(false)
  const [newRule, setNewRule] = useState<Omit<NotificationRule, 'id'>>({
    label: '',
    enabled: true,
    daysBeforeExpiry: 7,
    notifyAt: '09:00',
  })

  async function handleToggleMaster() {
    const ok = await toggleMaster()
    if (!ok && !settings.masterEnabled) {
      alert('請在瀏覽器設定中允許通知權限後再試一次。')
    }
  }

  function handleAddRule() {
    if (!newRule.label.trim()) return
    addCustomRule(newRule)
    setNewRule({ label: '', enabled: true, daysBeforeExpiry: 7, notifyAt: '09:00' })
    setShowAddRule(false)
  }

  function handleTestNotification() {
    sendNotification('BeautyVault 測試通知', '推播通知設定成功！')
  }

  const permissionDenied = permission === 'denied'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate('/my')}
          className="p-1 rounded-lg hover:bg-[var(--color-primary-light)] transition-colors"
        >
          <ChevronLeft size={20} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
        </button>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">推播通知管理</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--color-bg-muted)] mb-4">
        {([['settings', '通知設定', CalendarClock], ['logs', '通知紀錄', History]] as const).map(
          ([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <Icon size={14} strokeWidth={1.5} />
              {label}
            </button>
          )
        )}
      </div>

      {tab === 'settings' && (
        <div className="space-y-4">
          {/* Permission warning */}
          {permissionDenied && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              推播通知已被封鎖。請至瀏覽器網站設定中允許通知，再回來開啟。
            </div>
          )}

          {/* Master toggle */}
          <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.masterEnabled
                  ? <Bell size={18} strokeWidth={1.5} className="text-[var(--color-primary)]" />
                  : <BellOff size={18} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
                }
                <div>
                  <p className="font-medium text-[var(--color-text)] text-sm">開啟推播通知</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {settings.masterEnabled ? '目前已開啟' : '目前已關閉'}
                  </p>
                </div>
              </div>
              <Toggle
                checked={settings.masterEnabled}
                onChange={handleToggleMaster}
                disabled={permissionDenied}
              />
            </div>
            {settings.masterEnabled && (
              <button
                onClick={handleTestNotification}
                className="mt-3 w-full text-xs text-[var(--color-primary)] border border-[var(--color-primary)]/30 rounded-lg py-1.5 hover:bg-[var(--color-primary-light)] transition-colors"
              >
                發送測試通知
              </button>
            )}
          </div>

          {/* Expiry reminder */}
          <div className={`p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] space-y-3 ${!settings.masterEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} strokeWidth={1.5} className="text-[var(--color-primary)]" />
                <span className="font-medium text-[var(--color-text)] text-sm">即期提醒</span>
              </div>
              <Toggle
                checked={settings.expiryReminder}
                onChange={() => updateSettings({ expiryReminder: !settings.expiryReminder })}
              />
            </div>

            {settings.expiryReminder && (
              <div className="space-y-2 pt-1 border-t border-[var(--color-border)]">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs text-[var(--color-text-muted)]">到期前幾天提醒</label>
                  <select
                    value={settings.expiryDaysBefore}
                    onChange={e => updateSettings({ expiryDaysBefore: Number(e.target.value) })}
                    className="text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] px-2 py-1"
                  >
                    {[3, 7, 14, 30].map(d => (
                      <option key={d} value={d}>{d} 天前</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs text-[var(--color-text-muted)]">通知時間（本機時間）</label>
                  <input
                    type="time"
                    value={settings.expiryNotifyAt}
                    onChange={e => updateSettings({ expiryNotifyAt: e.target.value })}
                    className="text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] px-2 py-1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Custom rules */}
          <div className={`space-y-2 ${!settings.masterEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-[var(--color-text)] text-sm">自訂提醒</span>
              <button
                onClick={() => setShowAddRule(true)}
                className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:opacity-80 transition-opacity"
              >
                <Plus size={14} strokeWidth={2} />
                新增
              </button>
            </div>

            {settings.customRules.length === 0 && !showAddRule && (
              <p className="text-xs text-[var(--color-text-muted)] text-center py-3">
                尚無自訂提醒，點擊「新增」加入
              </p>
            )}

            {settings.customRules.map(rule => (
              <div
                key={rule.id}
                className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    value={rule.label}
                    onChange={e => updateCustomRule(rule.id, { label: e.target.value })}
                    className="flex-1 text-sm font-medium bg-transparent text-[var(--color-text)] border-b border-[var(--color-border)] pb-0.5 focus:outline-none focus:border-[var(--color-primary)]"
                    placeholder="提醒名稱"
                  />
                  <div className="flex items-center gap-2">
                    <Toggle
                      checked={rule.enabled}
                      onChange={() => updateCustomRule(rule.id, { enabled: !rule.enabled })}
                      size="sm"
                    />
                    <button
                      onClick={() => deleteCustomRule(rule.id)}
                      className="p-1 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} strokeWidth={1.5} className="text-red-400" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 flex items-center gap-2">
                    <label className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">到期前</label>
                    <select
                      value={rule.daysBeforeExpiry}
                      onChange={e => updateCustomRule(rule.id, { daysBeforeExpiry: Number(e.target.value) })}
                      className="flex-1 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] px-2 py-1"
                    >
                      {[3, 7, 14, 30].map(d => (
                        <option key={d} value={d}>{d} 天</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[var(--color-text-muted)]">時間</label>
                    <input
                      type="time"
                      value={rule.notifyAt}
                      onChange={e => updateCustomRule(rule.id, { notifyAt: e.target.value })}
                      className="text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] px-2 py-1"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Add rule form */}
            {showAddRule && (
              <div className="p-3 rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary-light)] space-y-2">
                <p className="text-xs font-medium text-[var(--color-primary)]">新增自訂提醒</p>
                <input
                  autoFocus
                  value={newRule.label}
                  onChange={e => setNewRule(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="提醒名稱（例：護膚品快用完）"
                  className="w-full text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text)] px-3 py-1.5 focus:outline-none focus:border-[var(--color-primary)]"
                />
                <div className="flex gap-3">
                  <div className="flex-1 flex items-center gap-2">
                    <label className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">到期前</label>
                    <select
                      value={newRule.daysBeforeExpiry}
                      onChange={e => setNewRule(prev => ({ ...prev, daysBeforeExpiry: Number(e.target.value) }))}
                      className="flex-1 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text)] px-2 py-1"
                    >
                      {[3, 7, 14, 30].map(d => (
                        <option key={d} value={d}>{d} 天</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[var(--color-text-muted)]">時間</label>
                    <input
                      type="time"
                      value={newRule.notifyAt}
                      onChange={e => setNewRule(prev => ({ ...prev, notifyAt: e.target.value }))}
                      className="text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text)] px-2 py-1"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowAddRule(false)}
                    className="flex-1 text-xs text-[var(--color-text-muted)] border border-[var(--color-border)] rounded-lg py-1.5 hover:bg-[var(--color-bg-card)] transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddRule}
                    disabled={!newRule.label.trim()}
                    className="flex-1 text-xs text-white bg-[var(--color-primary)] rounded-lg py-1.5 hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    新增
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-3">
          {logs.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={clearLogs}
                className="text-xs text-red-400 hover:opacity-80 transition-opacity"
              >
                清除全部紀錄
              </button>
            </div>
          )}

          {logs.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-muted)]">
              <History size={32} strokeWidth={1} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">尚無通知紀錄</p>
            </div>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">{log.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{log.body}</p>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] whitespace-nowrap shrink-0">
                    {format(new Date(log.receivedAt), 'MM/dd HH:mm', { locale: zhTW })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
