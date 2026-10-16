import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Plus } from 'lucide-react'
import VeilleLayout from '../Components/VeilleLayout'
import ArticleBoard from '../Components/ArticleBoard'
import ToolIcon from '../Components/ToolIcon'
import { useWatch } from '../Context/useWatch'
import { createSourceAndSync, getSources, syncSource } from '../api/sources'
import { formatSyncResult } from '../utils/tools'

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

  // Synchronise tous les flux de l'outil d'un coup, puis recharge les tickets
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

  const handleCreate = async (name, url) => {
    const { source, syncResult, syncError: newSyncError } = await createSourceAndSync(name, url, currentWatch.id, tool.type)
    setSources((current) => [...current, source])
    setSyncMessage(syncResult ? `« ${source.name} » ajouté : ${formatSyncResult(syncResult)}` : '')
    setSyncError(newSyncError)
    setRefreshKey((key) => key + 1)
    setAddOpen(false)
  }

  const { Modal } = tool

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
              {sources.map((source) => (
                <li key={source.id}>
                  <a href={source.url} target="_blank" rel="noreferrer" title="Ouvrir le flux RSS">{source.name}</a>
                </li>
              ))}
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
    </VeilleLayout>
  )
}
