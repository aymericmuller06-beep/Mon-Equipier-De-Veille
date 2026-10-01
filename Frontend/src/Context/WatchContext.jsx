import { createContext, useContext, useEffect, useState } from 'react'
import { getThemes, createTheme, updateThemeAccent, deleteTheme } from '../api/themes'

const WatchContext = createContext(null)

export function WatchProvider({ children }) {
  const [watches, setWatches] = useState([])
  const [watchTitle, setWatchTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Les "veilles" sont persistées côté backend sous forme de thèmes
  useEffect(() => {
    let cancelled = false

    getThemes()
      .then((themes) => { if (!cancelled) setWatches(themes) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  const selectWatch = async (title) => {
    const cleanTitle = title.trim()
    if (!cleanTitle) return

    const existing = watches.find((watch) => watch.name === cleanTitle)
    if (existing) {
      setWatchTitle(existing.name)
      return
    }

    const created = await createTheme(cleanTitle)
    setWatches((currentWatches) => [...currentWatches, created])
    setWatchTitle(created.name)
  }

  const getWatchAccent = (title) => {
    const watch = watches.find((item) => item.name === title)
    return watch?.accent_color || 'green'
  }

  const setWatchAccent = async (title, color) => {
    const watch = watches.find((item) => item.name === title)
    if (!watch) return

    await updateThemeAccent(watch.id, color)
    setWatches((currentWatches) => (
      currentWatches.map((item) => (item.id === watch.id ? { ...item, accent_color: color } : item))
    ))
  }

  const deleteWatch = async (title) => {
    const watch = watches.find((item) => item.name === title)
    if (!watch) return

    await deleteTheme(watch.id)
    setWatches((currentWatches) => currentWatches.filter((item) => item.id !== watch.id))
    setWatchTitle((currentTitle) => (currentTitle === title ? '' : currentTitle))
  }

  return (
    <WatchContext.Provider value={{ watchTitle, watches, loading, error, selectWatch, getWatchAccent, setWatchAccent, deleteWatch }}>
      {children}
    </WatchContext.Provider>
  )
}

export function useWatch() {
  const context = useContext(WatchContext)
  if (!context) throw new Error('useWatch doit être utilisé dans WatchProvider')
  return context
}