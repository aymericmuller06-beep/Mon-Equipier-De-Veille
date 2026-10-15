import { createContext, useContext } from 'react'

export const WatchContext = createContext(null)

export function useWatch() {
  const context = useContext(WatchContext)
  if (!context) throw new Error('useWatch doit être utilisé dans WatchProvider')
  return context
}
