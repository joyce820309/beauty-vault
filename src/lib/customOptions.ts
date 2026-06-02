const KEY = 'beauty-vault:option-history'

function load(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  catch { return {} }
}

export function getCustomOptions(field: string): string[] {
  return load()[field] ?? []
}

export function addCustomOption(field: string, value: string) {
  if (!value?.trim()) return
  try {
    const stored = load()
    const list = stored[field] ?? []
    if (!list.includes(value)) {
      stored[field] = [...list, value].slice(-300)
      localStorage.setItem(KEY, JSON.stringify(stored))
    }
  } catch {}
}
