import { useEffect, useState } from 'react'
import { Bell, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import VeilleLayout from '../Components/VeilleLayout'
import { useWatch } from '../Context/WatchContext'
import { getSources, syncSource } from '../api/sources'

export default function GoogleAlerts() {
  const { currentWatch } = useWatch()
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncingId, setSyncingId] = useState(null)
  const [syncMessage, setSyncMessage] = useState('')

  useEffect(() => {
    if (!currentWatch) return
    let cancelled = false

    getSources(currentWatch.id, 'google_alerts')
      .then((data) => { if (!cancelled) setSources(data) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [currentWatch])

  const handleSync = async (source) => {
    setSyncingId(source.id)
    setError('')
    setSyncMessage('')
    try {
      const result = await syncSource(source.id)
      setSyncMessage(`${result.inserted} nouvel(s) article(s) importé(s) depuis « ${source.name} » (${result.fetched} trouvés dans le flux).`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSyncingId(null)
    }
  }

  return (
    <VeilleLayout>
      <h1>Google Alerts</h1>
      <p className="dashboard-subtitle">
        Alertes Google connectées à {currentWatch ? <>la veille « {currentWatch.name} »</> : 'votre veille'}.
      </p>

      {error && <p className="watch-selection-error">{error}</p>}
      {syncMessage && <p className="add-tool-sync-message">{syncMessage}</p>}

      {loading ? (
        <p className="dashboard-status">Chargement…</p>
      ) : sources.length > 0 ? (
        <ul className="dashboard-source-list">
          {sources.map((source) => (
            <li key={source.id}>
              <a href={source.url} target="_blank" rel="noreferrer">{source.name}</a>
              <button
                type="button"
                className="add-tool-sync-button"
                onClick={() => handleSync(source)}
                disabled={syncingId === source.id}
              >
                <RefreshCw aria-hidden="true" />
                {syncingId === source.id ? 'Synchronisation…' : 'Synchroniser'}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <Bell aria-hidden="true" />
          <p>Aucune alerte Google pour le moment.</p>
          <span>Ajoutez-en une depuis <Link to="/veille/ajouter-un-outil">Ajouter un outil</Link>.</span>
        </div>
      )}
    </VeilleLayout>
  )
}
