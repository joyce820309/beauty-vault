import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/'

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    const { error: signInError } = await signIn(email.trim(), password)
    setSubmitting(false)
    if (signInError) {
      setError('登入失敗，請確認帳號與密碼')
      return
    }
    navigate(redirectTo, { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-6 text-[var(--color-text)]">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-[var(--color-primary)]">BeautyVault</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">請登入以存取你的資料</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">電子郵件</span>
            <span className="relative block">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--color-text)]">密碼</span>
            <span className="relative block">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
              />
            </span>
          </label>

          {error && (
            <p className="text-sm font-medium" style={{ color: 'var(--color-danger)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[var(--color-primary)] py-3 text-sm font-medium text-white transition-opacity disabled:opacity-60"
          >
            {submitting ? '登入中…' : '登入'}
          </button>
        </form>
      </div>
    </div>
  )
}
