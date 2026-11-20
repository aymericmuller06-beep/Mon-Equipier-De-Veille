import { useEffect, useState } from 'react'
import { getThemes, createTheme, updateThemeAccent, deleteTheme } from '../api/themes'
import { resetDatabase } from '../api/system'
import { WatchContext } from './useWatch'

const WATCH_ID_STORAGE_KEY = 'watchId'
// Serveur injoignable au chargement des veilles : nouvel essai automatique à ce rythme
const RETRY_DELAY_MS = 5000

export function WatchProvider({ children }) {
  const [watches, setWatches] = useState([])
  // Persistée pour survivre à un rechargement de page (sinon /veille/* retombe sans veille sélectionnée)
  const [watchId, setWatchId] = useState(() => Number(localStorage.getItem(WATCH_ID_STORAGE_KEY)) || null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  // Les "veilles" sont persistées côté backend sous forme de thèmes
  useEffect(() => {
    let cancelled = false

    getThemes()
      .then((themes) => {
        if (cancelled) return
        setWatches(themes)
        setError(null)
      })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [attempt])

  // Tant que le serveur ne répond pas, on réessaie : la page se remplit dès qu'il revient
  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setAttempt((count) => count + 1), RETRY_DELAY_MS)
    return () => clearTimeout(timer)
  }, [error, attempt])

  useEffect(() => {
    if (watchId) {
      localStorage.setItem(WATCH_ID_STORAGE_KEY, String(watchId))
    } else {
      localStorage.removeItem(WATCH_ID_STORAGE_KEY)
    }
  }, [watchId])

  // Thème backend correspondant à la veille actuellement ouverte
  const currentWatch = watches.find((item) => item.id === watchId) || null
  const watchTitle = currentWatch?.name || ''

  const selectWatch = (id) => {
    if (watches.some((watch) => watch.id === id)) setWatchId(id)
  }

  const createWatch = async (title, description = '', accentColor = 'green') => {
    const cleanTitle = title.trim()
    if (!cleanTitle) return

    const created = await createTheme(cleanTitle, description.trim(), accentColor)
    setWatches((currentWatches) => [...currentWatches, created])
    setWatchId(created.id)
    return created
  }

  const setWatchAccent = async (id, color) => {
    await updateThemeAccent(id, color)
    setWatches((currentWatches) => (
      currentWatches.map((item) => (item.id === id ? { ...item, accent_color: color } : item))
    ))
  }

  const deleteWatch = async (id) => {
    await deleteTheme(id)
    setWatches((currentWatches) => currentWatches.filter((item) => item.id !== id))
    setWatchId((currentId) => (currentId === id ? null : currentId))
  }

  const resetAllData = async () => {
    await resetDatabase()
    setWatches([])
    setWatchId(null)
  }

  return (
    <WatchContext.Provider value={{ watchId, watchTitle, watches, currentWatch, loading, error, selectWatch, createWatch, setWatchAccent, deleteWatch, resetAllData }}>
      {children}
    </WatchContext.Provider>
  )
}
