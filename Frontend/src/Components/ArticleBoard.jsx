import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Tags, X } from 'lucide-react'
import ArticleTicket from './ArticleTicket'
import ConfirmModal from './ConfirmModal'
import DecisionModal from './DecisionModal'
import ManualArticleModal from './ManualArticleModal'
import TagManagerModal from './TagManagerModal'
import TicketSkeletons from './TicketSkeletons'
import { useWatch } from '../Context/useWatch'
import { addManualArticle, addTagToArticle, emptyTrash, getArticles, removeTagFromArticle, updateArticle } from '../api/articles'
import { createTag, getTags } from '../api/tags'
import { normalizeText } from '../utils/format'

const TAB_LABELS = { new: 'À traiter', validated: 'Validés', trash: 'Corbeille', all: 'Tous' }

const EMPTY_MESSAGES = {
  new: ['Rien à traiter.', 'Les nouveaux articles collectés par vos outils apparaîtront ici.'],
  validated: ['Aucun article validé.', 'Validez des articles pour les retrouver ici.'],
  trash: ['La corbeille est vide.', 'Les articles refusés apparaîtront ici, et pourront être restaurés.'],
  all: ['Aucun article.', 'Les articles collectés par vos outils apparaîtront ici.'],
}

const TOAST_LABELS = { new: 'remis à traiter', validated: 'validé', trash: 'envoyé à la corbeille' }

// Période, d'après la date de publication (ou de collecte si le flux n'en donne pas), comme sur les tickets
const PERIODS = [
  { value: '', label: 'Toutes les dates' },
  { value: 'today', label: 'Aujourd’hui' },
  { value: '7d', label: '7 derniers jours', days: 7 },
  { value: '30d', label: '30 derniers jours', days: 30 },
]

function periodStart(period) {
  if (!period) return null
  if (period === 'today') {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return start.getTime()
  }
  return Date.now() - PERIODS.find((item) => item.value === period).days * 86400000
}

function matchesSearch(article, query) {
  if (!query) return true
  const haystack = [article.title, article.source_name, article.status_reason, ...article.tags.map((t) => t.name)]
    .filter(Boolean)
    .join(' ')
  return normalizeText(haystack).includes(query)
}

// Filtres gardés pendant la session (onglet ouvert), séparément pour chaque page et chaque veille
const DEFAULT_FILTERS = { status: null, search: '', tag: '', source: '', period: '', sort: 'recent' }

function readFilters(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key)) || {}
  } catch {
    return {}
  }
}

function saveFilters(key, filters) {
  try {
    sessionStorage.setItem(key, JSON.stringify(filters))
  } catch {
    // Stockage indisponible (navigation privée…) : les filtres ne seront simplement pas gardés
  }
}

// Liste d'articles sous forme de tickets, avec filtres et annulation de la dernière action.
// `statuses` : onglets affichés (un seul = page à statut fixe). `toolType` : limite à un outil.
// `canAddManual` : affiche le bouton d'ajout manuel (l'article est ajouté avec le premier statut des onglets).
// Arriver avec `state.tagId` (lien depuis la gestion des tags) affiche directement les articles de ce tag.
export default function ArticleBoard(props) {
  const location = useLocation()
  const tagId = location.state?.tagId
  // Recréée à chaque lien vers un tag, pour appliquer ce filtre même si la page était déjà ouverte
  return <Board key={tagId ? location.key : 'board'} {...props} linkedTagId={tagId} storageKey={location.pathname} />
}

function Board({ statuses, toolType, refreshKey = 0, canAddManual = false, linkedTagId, storageKey }) {
  const { currentWatch, watchId } = useWatch()
  const filtersKey = `filtres:${watchId}:${storageKey}`
  const [initialFilters] = useState(() => {
    if (linkedTagId) return { ...DEFAULT_FILTERS, tag: String(linkedTagId) }
    const saved = { ...DEFAULT_FILTERS, ...readFilters(filtersKey) }
    return statuses.includes(saved.status) ? saved : { ...saved, status: statuses[0] }
  })
  const [articles, setArticles] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [activeStatus, setActiveStatus] = useState(initialFilters.status || statuses[0])
  const [search, setSearch] = useState(initialFilters.search)
  const [tagFilter, setTagFilter] = useState(initialFilters.tag)
  const [sourceFilter, setSourceFilter] = useState(initialFilters.source)
  const [period, setPeriod] = useState(initialFilters.period)
  const [sort, setSort] = useState(initialFilters.sort)
  const [toast, setToast] = useState(null)
  const [isEmptyTrashOpen, setEmptyTrashOpen] = useState(false)
  const [isManualOpen, setManualOpen] = useState(false)
  const [isTagManagerOpen, setTagManagerOpen] = useState(false)
  // Article en cours de décision : { article, decision: 'validated' | 'trash' | 'note' }
  const [pending, setPending] = useState(null)

  useEffect(() => {
    if (!currentWatch) return
    let cancelled = false

    Promise.all([getArticles({ themeId: currentWatch.id, toolType }), getTags()])
      .then(([articlesData, tagsData]) => {
        if (cancelled) return
        setArticles(articlesData)
        setTags(tagsData)
      })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [currentWatch, toolType, refreshKey, reloadKey])

  useEffect(() => {
    saveFilters(filtersKey, { status: activeStatus, search, tag: tagFilter, source: sourceFilter, period, sort })
  }, [filtersKey, activeStatus, search, tagFilter, sourceFilter, period, sort])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  const replaceArticle = (updated) => {
    setArticles((current) => current.map((item) => (item.id === updated.id ? updated : item)))
  }

  const handleUpdate = async (article, changes) => {
    // Annuler ne revient que sur le statut : une note écrite entre-temps est conservée
    const previous = { status: article.status }
    const updated = await updateArticle(article.id, changes)
    replaceArticle(updated)
    if (changes.status && changes.status !== previous.status) {
      setToast({
        message: `« ${article.title} » ${TOAST_LABELS[changes.status]}.`,
        undo: async () => replaceArticle(await updateArticle(article.id, previous)),
      })
    }
  }

  // Valider / refuser passe par la fenêtre de note ; remettre à traiter est immédiat
  const handleDecide = async (article, status) => {
    if (status === 'new') return handleUpdate(article, { status })
    setPending({ article, decision: status })
  }

  const handleConfirmDecision = async (note) => {
    const { article, decision } = pending
    const changes = decision === 'note' ? { status_reason: note } : { status: decision, status_reason: note }
    await handleUpdate(article, changes)
    setPending(null)
  }

  const handleUndo = async () => {
    const { undo } = toast
    setToast(null)
    try {
      await undo()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAddTag = async (article, name) => {
    let tag = tags.find((item) => item.name.toLowerCase() === name.toLowerCase())
    if (!tag) {
      tag = await createTag(name)
      setTags((current) => [...current, tag])
    }
    if (article.tags.some((item) => item.id === tag.id)) return
    await addTagToArticle(article.id, tag.id)
    const nextTags = [...article.tags, { id: tag.id, name: tag.name }].sort((a, b) => a.name.localeCompare(b.name))
    replaceArticle({ ...article, tags: nextTags })
  }

  const handleRemoveTag = async (article, tag) => {
    await removeTagFromArticle(article.id, tag.id)
    replaceArticle({ ...article, tags: article.tags.filter((item) => item.id !== tag.id) })
  }

  const handleManualCreate = async (article) => {
    const created = await addManualArticle(currentWatch.id, article)
    setArticles((current) => [created, ...current])
    setManualOpen(false)
    setToast({ message: `« ${created.title} » ajouté.` })
  }

  const handleEmptyTrash = async () => {
    await emptyTrash(currentWatch.id)
    setArticles((current) => current.filter((article) => article.status !== 'trash'))
    setEmptyTrashOpen(false)
  }

  const counts = useMemo(() => ({
    new: articles.filter((a) => a.status === 'new').length,
    validated: articles.filter((a) => a.status === 'validated').length,
    trash: articles.filter((a) => a.status === 'trash').length,
    all: articles.length,
  }), [articles])

  const sources = useMemo(() => {
    const byId = new Map(articles.map((a) => [a.source_id, a.source_name]))
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [articles])

  const usedTags = useMemo(() => {
    const byId = new Map(articles.flatMap((a) => a.tags).map((t) => [t.id, t.name]))
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [articles])

  // Un filtre gardé en mémoire qui ne correspond plus à rien (tag supprimé, source retirée) est ignoré
  const activeTag = usedTags.some(([id]) => String(id) === tagFilter) ? tagFilter : ''
  const activeSource = sources.some(([id]) => String(id) === sourceFilter) ? sourceFilter : ''

  const visible = useMemo(() => {
    const query = normalizeText(search.trim())
    const since = periodStart(period)
    const list = articles.filter((article) => (
      (activeStatus === 'all' || article.status === activeStatus)
      && (!activeTag || article.tags.some((t) => String(t.id) === activeTag))
      && (!activeSource || String(article.source_id) === activeSource)
      && (since === null || new Date(article.published_at || article.created_at).getTime() >= since)
      && matchesSearch(article, query)
    ))
    return sort === 'oldest' ? [...list].reverse() : list
  }, [articles, activeStatus, activeTag, activeSource, period, search, sort])

  const hasFilters = Boolean(search || activeTag || activeSource || period)

  const clearFilters = () => {
    setSearch('')
    setTagFilter('')
    setSourceFilter('')
    setPeriod('')
  }

  if (loading) return <TicketSkeletons />
  if (error && articles.length === 0) {
    return <p className="dashboard-status dashboard-status--error">Impossible de contacter le serveur : {error}</p>
  }

  return (
    <div className="board">
      {statuses.length > 1 && (
        <div className="board-tabs" role="tablist" aria-label="Statut des articles">
          {statuses.map((status) => (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={activeStatus === status}
              className={activeStatus === status ? 'is-active' : ''}
              onClick={() => setActiveStatus(status)}
            >
              {TAB_LABELS[status]}
              <span className="board-tab-count">{counts[status]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="board-toolbar">
        <label className="board-search">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher (titre, note, tag…)"
            aria-label="Rechercher dans les articles"
          />
        </label>
        <div className="board-tag-filter">
          <select value={activeTag} onChange={(event) => setTagFilter(event.target.value)} aria-label="Filtrer par tag">
            <option value="">Tous les tags</option>
            {usedTags.map(([id, name]) => <option key={id} value={String(id)}>#{name}</option>)}
          </select>
          <button type="button" className="board-icon-button" onClick={() => setTagManagerOpen(true)} title="Gérer les tags" aria-label="Gérer les tags">
            <Tags aria-hidden="true" />
          </button>
        </div>
        {sources.length > 1 && (
          <select value={activeSource} onChange={(event) => setSourceFilter(event.target.value)} aria-label="Filtrer par source">
            <option value="">Toutes les sources</option>
            {sources.map(([id, name]) => <option key={id} value={String(id)}>{name}</option>)}
          </select>
        )}
        <select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Filtrer par date de publication">
          {PERIODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Trier">
          <option value="recent">Plus récents</option>
          <option value="oldest">Plus anciens</option>
        </select>
        <span className="board-count">{visible.length} article(s)</span>
        {hasFilters && (
          <button type="button" className="ticket-button" onClick={clearFilters}>
            <X aria-hidden="true" /> Effacer les filtres
          </button>
        )}
        {canAddManual && (
          <button type="button" className="ticket-button ticket-button--primary board-add-button" onClick={() => setManualOpen(true)}>
            <Plus aria-hidden="true" /> Ajouter un article
          </button>
        )}
        {activeStatus === 'trash' && !toolType && counts.trash > 0 && (
          <button type="button" className="ticket-button ticket-button--danger" onClick={() => setEmptyTrashOpen(true)}>
            Vider la corbeille
          </button>
        )}
      </div>

      {error && <p className="watch-selection-error">{error}</p>}

      {visible.length > 0 ? (
        <div className="ticket-list">
          {visible.map((article) => (
            <ArticleTicket
              key={article.id}
              article={article}
              allTags={tags}
              onDecide={handleDecide}
              onEditNote={(item) => setPending({ article: item, decision: 'note' })}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>{hasFilters ? 'Aucun article ne correspond à ces filtres.' : EMPTY_MESSAGES[activeStatus][0]}</p>
          <span>{hasFilters ? 'Modifiez la recherche ou les filtres.' : EMPTY_MESSAGES[activeStatus][1]}</span>
        </div>
      )}

      {toast && (
        <div className="board-toast" role="status">
          <span>{toast.message}</span>
          {toast.undo && <button type="button" onClick={handleUndo}>Annuler</button>}
        </div>
      )}

      <DecisionModal
        article={pending?.article}
        decision={pending?.decision}
        onClose={() => setPending(null)}
        onConfirm={handleConfirmDecision}
      />

      <ManualArticleModal
        isOpen={isManualOpen}
        onClose={() => setManualOpen(false)}
        onCreate={handleManualCreate}
        defaultStatus={statuses[0] === 'validated' ? 'validated' : 'new'}
      />

      <TagManagerModal
        isOpen={isTagManagerOpen}
        onClose={() => setTagManagerOpen(false)}
        onChanged={() => setReloadKey((key) => key + 1)}
      />

      <ConfirmModal
        isOpen={isEmptyTrashOpen}
        onClose={() => setEmptyTrashOpen(false)}
        onConfirm={handleEmptyTrash}
        title="Vider la corbeille"
        message={`Supprimer définitivement les ${counts.trash} article(s) de la corbeille ? Ils ne pourront plus être restaurés.`}
        confirmLabel="Vider la corbeille"
        variant="danger"
      />
    </div>
  )
}
