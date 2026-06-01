import { createContext, useContext, useState, useCallback } from 'react'

interface RefreshContextValue {
  refreshKey: number
  triggerRefresh: () => void
}

const RefreshContext = createContext<RefreshContextValue>({
  refreshKey: 0,
  triggerRefresh: () => {},
})

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), [])
  return (
    <RefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </RefreshContext.Provider>
  )
}

export function useRefreshKey() {
  return useContext(RefreshContext).refreshKey
}

export function useTriggerRefresh() {
  return useContext(RefreshContext).triggerRefresh
}
