import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AlertTriangle, Plus, SlidersHorizontal } from 'lucide-react'
import VeilleLayout from '../Components/VeilleLayout'
import ArticleBoard from '../Components/ArticleBoard'
import ToolIcon from '../Components/ToolIcon'
import SourceSettingsModal from '../Components/SourceSettingsModal'
import { useWatch } from '../Context/useWatch'
import { createSourceAndSync, getSources, syncSource, updateSource } from '../api/sources'
import { formatSyncResult, sourceHealth } from '../utils/tools'

// Page d'un outil à flux (Google Alerts, Google News, YouTube…) : ses flux, leur synchro et leurs articles
export default function ToolPage({ tool }) {
  const { currentWatch } = useWatch()
  const location = useLocation()
  const initialSync = location.state?.syncResult

  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isAddOpen, setAddOpen] = useState(false)
  const [editedSource, setEditedSource] = useState(null)
  const [syncMessage, setSyncMessage] = useState(initialSync ? formatSyncResult(initialSync) : '')
  const [syncError, setSyncError] = useState(location.state?.syncError || '')

  useEffect(() => {
    if (!currentWatch) return
    let cancelled = false
    getSources(currentWatch.id, tool.type)
      .then((data) => { if (!cancelled) setSources(data) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [currentWatch, tool.type])

  // Après une synchro : recharge les sources pour afficher leur nouvel état (réussite, erreur)
  const reloadSources = async () => {
    try {
      setSources(await getSources(currentWatch.id, tool.type))
    } catch {
      // L'état affiché sera simplement un peu ancien
    }
  }

  // Synchronise tous les flux de l'outil d'un coup, puis recharge les tickets
  const handleSyncAll = async () => {
    setSyncing(true)
    setSyncError('')
    setSyncMessage('')
    let inserted = 0
    let failed = 0
    for (const source of sources) {
      try {
        inserted += (await syncSource(source.id)).inserted
      } catch {
        // Le détail de l'erreur s'affiche dans l'encart d'état des flux, rechargé juste après
        failed += 1
      }
    }
    setSyncMessage(`${inserted} nouvel(s) article(s) importé(s)${failed ? `, ${failed} flux en erreur (détails ci-dessus)` : ''}.`)
    setRefreshKey((key) => key + 1)
    await reloadSources()
    setSyncing(false)
  }

  const handleCreate = async (name, url, filters) => {
    const { source, syncResult, syncError: newSyncError } = await createSourceAndSync(name, url, currentWatch.id, tool.type, filters)
    await reloadSources()
    setSyncMessage(syncResult ? `« ${source.name} » ajouté : ${formatSyncResult(syncResult)}` : '')
    setSyncError(newSyncError)
    setRefreshKey((key) => key + 1)
    setAddOpen(false)
  }

  const handleSaveSource = async (changes) => {
    const { trashed, ...updated } = await updateSource(editedSource.id, changes)
    setSources((current) => current.map((source) => (source.id === updated.id ? updated : source)))
    setSyncError('')
    setSyncMessage(`« ${updated.name} » mis à jour${trashed ? ` : ${trashed} article(s) envoyé(s) à la corbeille` : ''}.`)
    if (trashed) setRefreshKey((key) => key + 1)
    setEditedSource(null)
  }

  const { Modal } = tool
  const healths = new Map(sources.map((source) => [source.id, sourceHealth(source)]))
  const failing = sources.filter((source) => ['warning', 'error'].includes(healths.get(source.id).level))

  return (
    <VeilleLayout>
      <h1 className="page-title-with-logo"><ToolIcon type={tool.type} size={30} /> {tool.label}</h1>
      <p className="dashboard-subtitle">
        {tool.subtitle} Synchronisation automatique toutes les heures, ou à la demande.
      </p>

      {error && <p className="watch-selection-error">{error}</p>}

      {loading ? (
        <p className="dashboard-status">Chargement…</p>
      ) : sources.length > 0 ? (
        <>
          <div className="alerts-bar">
            <ul className="alerts-list" aria-label={tool.feedsLabel}>
              {sources.map((source) => {
                const health = healths.get(source.id)
                return (
                  <li key={source.id} className={source.include_keywords || source.exclude_keywords ? 'is-filtered' : ''}>
                    <span
                      className={`source-health source-health--${health.level}`}
                      title={`${health.label} — ${health.detail}`}
                      role="img"
                      aria-label={`${health.label} : ${health.detail}`}
                    />
                    <a href={source.url} target="_blank" rel="noreferrer" title="Ouvrir le flux RSS">{source.name}</a>
                    <button
                      type="button"
                      onClick={() => setEditedSource(source)}
                      aria-label={`Réglages et filtres de « ${source.name} »`}
                      title={source.include_keywords || source.exclude_keywords ? 'Filtres actifs — modifier' : 'Réglages et filtres'}
                    >
                      <SlidersHorizontal aria-hidden="true" />
                    </button>
                  </li>
                )
              })}
              <li className="alerts-list-add">
                <button type="button" onClick={() => setAddOpen(true)}>
                  <Plus aria-hidden="true" /> {tool.addLabel}
                </button>
              </li>
            </ul>
            <button type="button" className="add-tool-sync-button" onClick={handleSyncAll} disabled={syncing}>
              {syncing ? 'Synchronisation…' : 'Tout synchroniser'}
            </button>
          </div>
          {failing.length > 0 && (
            <div className="source-health-alert" role="status">
              <AlertTriangle aria-hidden="true" />
              <ul>
                {failing.map((source) => {
                  const health = healths.get(source.id)
                  return <li key={source.id}><strong>« {source.name} » — {health.label.toLowerCase()} :</strong> {health.detail}</li>
                })}
              </ul>
            </div>
          )}
          {syncError && <p className="watch-selection-error">{syncError}</p>}
          {syncMessage && <p className="add-tool-sync-message">{syncMessage}</p>}

          <ArticleBoard statuses={['new', 'validated', 'trash', 'all']} toolType={tool.type} refreshKey={refreshKey} />
        </>
      ) : (
        <div className="empty-state">
          <p>{tool.emptyLabel}</p>
          <span>
            <button type="button" className="link-button" onClick={() => setAddOpen(true)}>{tool.addLabel}</button>
            {' '}ou parcourez les autres outils dans <Link to="/veille/ajouter-un-outil">Ajouter un outil</Link>.
          </span>
        </div>
      )}

      <Modal isOpen={isAddOpen} onClose={() => setAddOpen(false)} onCreate={handleCreate} />
      <SourceSettingsModal source={editedSource} onClose={() => setEditedSource(null)} onSave={handleSaveSource} />
    </VeilleLayout>
  )
}
