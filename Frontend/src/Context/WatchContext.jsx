import { createContext, useContext, useState } from 'react'

const WatchContext = createContext(null)

export function WatchProvider({ children }) {
  const [watches, setWatches] = useState([])
  const [watchTitle, setWatchTitle] = useState('')
  const [watchAccents, setWatchAccents] = useState({})

  const selectWatch = (title) => {
    const cleanTitle = title.trim()
    if (!cleanTitle) return

    setWatches((currentWatches) => (
      currentWatches.includes(cleanTitle) ? currentWatches : [...currentWatches, cleanTitle]
    ))
    setWatchTitle(cleanTitle)
  }

  const getWatchAccent = (title) => watchAccents[title] || 'green'

  const setWatchAccent = (title, color) => {
    if (!title) return
    setWatchAccents((currentAccents) => ({ ...currentAccents, [title]: color }))
  }

  return (
    <WatchContext.Provider value={{ watchTitle, watches, selectWatch, getWatchAccent, setWatchAccent }}>
      {children}
    </WatchContext.Provider>
  )
}

export function useWatch() {
  const context = useContext(WatchContext)
  if (!context) throw new Error('useWatch doit être utilisé dans WatchProvider')
  return context
}