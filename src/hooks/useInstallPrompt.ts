import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// 全域快取，讓多個元件共享同一個 prompt 實例
let _cachedPrompt: BeforeInstallPromptEvent | null = null
const _listeners = new Set<(p: BeforeInstallPromptEvent | null) => void>()

function setGlobalPrompt(p: BeforeInstallPromptEvent | null) {
  _cachedPrompt = p
  _listeners.forEach(fn => fn(p))
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  setGlobalPrompt(e as BeforeInstallPromptEvent)
})

export function useInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(_cachedPrompt)

  useEffect(() => {
    _listeners.add(setPrompt)
    return () => { _listeners.delete(setPrompt) }
  }, [])

  async function install() {
    if (!prompt) return false
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setGlobalPrompt(null)
    return outcome === 'accepted'
  }

  return { prompt, install }
}
