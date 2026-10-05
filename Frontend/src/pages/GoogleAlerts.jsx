import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, RefreshCw, Inbox, CheckCircle2, Trash2, Layers, Newspaper } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import VeilleLayout from '../Components/VeilleLayout'
import { useWatch } from '../Context/WatchContext'
import { getSources, syncSource } from '../api/sources'
import { getArticles } from '../api/articles'

const STATUS_LABELS = { new: 'Nouveau', validated: 'Validé', trash: 'Corbeille' }

function formatDate(value) {
  if (!value) return 'Date inconnue'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date inconnue' : date.toLocaleDateString('fr-FR')
}

export default function GoogleAlerts() {
  const { currentWatch } = useWatch()
  const location = useLocation()
  const initialSync = location.state?.syncResult
  const initialSyncError = location.state?.syncError

  const [sources, setSources] = useState([])
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState(
    initialSync
      ? `${initialSync.inserted} nouvel(s) article(s) importé(s) (${initialSync.fetched} trouvés dans le flux).`
      : ''
  )
  const [syncError, setSyncError] = useState(initialSyncError || '')

  const load = useCallback(async () => {
    const sourcesData = await getSources(currentWatch.id, 'google_alerts')
    const articlesData = await getArticles({ themeId: currentWatch.id })
    const ids = new Set(sourcesData.map((s) => s.id))
    setSources(sourcesData)
    setArticles(articlesData.filter((a) => ids.has(a.source_id)))
  }, [currentWatch])

  useEffect(() => {
    if (!currentWatch) return
    let cancelled = false
    load()
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [currentWatch, load])

  // Synchronise toutes les alertes d'un coup
  const handleSyncAll = async () => {
    setSyncing(true)
    setError('')
    setSyncError('')
    setSyncMessage('')
    let inserted = 0
    let fetched = 0
    const failed = []
    for (const source of sources) {
      try {
        const result = await syncSource(source.id)
        inserted += result.inserted
        fetched += result.fetched
      } catch (err) {
        failed.push(`« ${source.name} » : ${err.message}`)
      }
    }
    setSyncMessage(`${inserted} nouvel(s) article(s) importé(s) (${fetched} trouvés dans les flux).`)
    if (failed.length > 0) setSyncError(failed.join(' — '))
    try {
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  const sourceNames = useMemo(
    () => Object.fromEntries(sources.map((s) => [s.id, s.name])),
    [sources]
  )

  const stats = useMemo(() => ({
    alerts: sources.length,
    total: articles.length,
    new: articles.filter((a) => a.status === 'new').length,
    validated: articles.filter((a) => a.status === 'validated').length,
    trash: articles.filter((a) => a.status === 'trash').length,
  }), [sources, articles])

  const countFor = (sourceId) => articles.filter((a) => a.source_id === sourceId).length

  return (
    <VeilleLayout>
      <h1>Google Alerts</h1>
      <p className="dashboard-subtitle">
        Toutes les alertes Google de {currentWatch ? <>la veille « {currentWatch.name} »</> : 'votre veille'}, regroupées ici.
      </p>

      {error && <p className="watch-selection-error">{error}</p>}
      {syncError && <p className="watch-selection-error">{syncError}</p>}
      {syncMessage && <p className="add-tool-sync-message">{syncMessage}</p>}

      {loading ? (
        <p className="dashboard-status">Chargement…</p>
      ) : sources.length > 0 ? (
        <>
          <div className="dashboard-stats">
            <div className="dashboard-stat-card">
              <Bell aria-hidden="true" />
              <span className="dashboard-stat-value">{stats.alerts}</span>
              <span className="dashboard-stat-label">Alertes</span>
            </div>
            <div className="dashboard-stat-card">
              <Layers aria-hidden="true" />
              <span className="dashboard-stat-value">{stats.total}</span>
              <span className="dashboard-stat-label">Articles collectés</span>
            </div>
            <div className="dashboard-stat-card">
              <Inbox aria-hidden="true" />
              <span className="dashboard-stat-value">{stats.new}</span>
              <span className="dashboard-stat-label">Nouveaux</span>
            </div>
            <div className="dashboard-stat-card">
              <CheckCircle2 aria-hidden="true" />
              <span className="dashboard-stat-value">{stats.validated}</span>
              <span className="dashboard-stat-label">Validés</span>
            </div>
            <div className="dashboard-stat-card">
              <Trash2 aria-hidden="true" />
              <span className="dashboard-stat-value">{stats.trash}</span>
              <span className="dashboard-stat-label">Corbeille</span>
            </div>
          </div>

          <div className="dashboard-grid">
            <section className="dashboard-section" aria-labelledby="alerts-title">
              <h2 id="alerts-title">Alertes</h2>
              <ul className="dashboard-source-list">
                {sources.map((source) => (
                  <li key={source.id}>
                    <a href={source.url} target="_blank" rel="noreferrer">{source.name}</a>
                    <span>{countFor(source.id)} article(s)</span>
                  </li>
                ))}
              </ul>
              <button type="button" className="add-tool-sync-button" onClick={handleSyncAll} disabled={syncing}>
                <RefreshCw aria-hidden="true" />
                {syncing ? 'Synchronisation…' : 'Tout synchroniser'}
              </button>
            </section>

            <section className="dashboard-section" aria-labelledby="alerts-articles-title">
              <h2 id="alerts-articles-title">Articles</h2>
              {articles.length > 0 ? (
                <ul className="dashboard-article-list">
                  {articles.map((article) => (
                    <li key={article.id}>
                      <a href={article.url} target="_blank" rel="noreferrer">{article.title}</a>
                      <span>{sourceNames[article.source_id]} · {formatDate(article.published_at)}</span>
                      <span className={`dashboard-article-status dashboard-article-status--${article.status}`}>
                        {STATUS_LABELS[article.status] || article.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-state">
                  <Newspaper aria-hidden="true" />
                  <p>Aucun article pour le moment.</p>
                  <span>Le flux est vide pour l’instant. Relancez la synchronisation plus tard.</span>
                </div>
              )}
            </section>
          </div>
        </>
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
