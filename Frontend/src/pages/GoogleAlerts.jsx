import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import VeilleLayout from '../Components/VeilleLayout'
import ArticleBoard from '../Components/ArticleBoard'
import GoogleLogo from '../Components/GoogleLogo'
import { useWatch } from '../Context/useWatch'
import { getSources, syncSource } from '../api/sources'

export default function GoogleAlerts() {
  const { currentWatch } = useWatch()
  const location = useLocation()
  const initialSync = location.state?.syncResult

  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [syncMessage, setSyncMessage] = useState(
    initialSync ? `${initialSync.inserted} nouvel(s) article(s) importé(s) (${initialSync.fetched} trouvés dans le flux).` : ''
  )
  const [syncError, setSyncError] = useState(location.state?.syncError || '')

  useEffect(() => {
    if (!currentWatch) return
    let cancelled = false
    getSources(currentWatch.id, 'google_alerts')
      .then((data) => { if (!cancelled) setSources(data) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [currentWatch])

  // Synchronise toutes les alertes d'un coup, puis recharge les tickets
  const handleSyncAll = async () => {
    setSyncing(true)
    setSyncError('')
    setSyncMessage('')
    let inserted = 0
    const failed = []
    for (const source of sources) {
      try {
        inserted += (await syncSource(source.id)).inserted
      } catch (err) {
        failed.push(`« ${source.name} » : ${err.message}`)
      }
    }
    setSyncMessage(`${inserted} nouvel(s) article(s) importé(s).`)
    if (failed.length > 0) setSyncError(failed.join(' — '))
    setRefreshKey((key) => key + 1)
    setSyncing(false)
  }

  return (
    <VeilleLayout>
      <h1 className="page-title-with-logo"><GoogleLogo size={30} /> Google Alerts</h1>
      <p className="dashboard-subtitle">
        Les articles de vos alertes Google. Synchronisation automatique toutes les heures, ou à la demande.
      </p>

      {error && <p className="watch-selection-error">{error}</p>}

      {loading ? (
        <p className="dashboard-status">Chargement…</p>
      ) : sources.length > 0 ? (
        <>
          <div className="alerts-bar">
            <ul className="alerts-list" aria-label="Alertes">
              {sources.map((source) => (
                <li key={source.id}>
                  <a href={source.url} target="_blank" rel="noreferrer" title="Ouvrir le flux RSS">{source.name}</a>
                </li>
              ))}
            </ul>
            <button type="button" className="add-tool-sync-button" onClick={handleSyncAll} disabled={syncing}>
              {syncing ? 'Synchronisation…' : 'Tout synchroniser'}
            </button>
          </div>
          {syncError && <p className="watch-selection-error">{syncError}</p>}
          {syncMessage && <p className="add-tool-sync-message">{syncMessage}</p>}

          <ArticleBoard statuses={['new', 'validated', 'trash', 'all']} toolType="google_alerts" refreshKey={refreshKey} />
        </>
      ) : (
        <div className="empty-state">
          <p>Aucune alerte Google pour le moment.</p>
          <span>Ajoutez-en une depuis <Link to="/veille/ajouter-un-outil">Ajouter un outil</Link>.</span>
        </div>
      )}
    </VeilleLayout>
  )
}
