import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import ArticleTicket from './ArticleTicket'
import ConfirmModal from './ConfirmModal'
import ManualArticleModal from './ManualArticleModal'
import { useWatch } from '../Context/useWatch'
import { addManualArticle, addTagToArticle, emptyTrash, getArticles, removeTagFromArticle, updateArticle } from '../api/articles'
import { createTag, getTags } from '../api/tags'

const TAB_LABELS = { new: 'À traiter', validated: 'Validés', trash: 'Corbeille', all: 'Tous' }

const EMPTY_MESSAGES = {
  new: ['Rien à traiter.', 'Les nouveaux articles collectés par vos outils apparaîtront ici.'],
  validated: ['Aucun article validé.', 'Validez des articles pour les retrouver ici.'],
  trash: ['La corbeille est vide.', 'Les articles refusés apparaîtront ici, et pourront être restaurés.'],
  all: ['Aucun article.', 'Les articles collectés par vos outils apparaîtront ici.'],
}

const TOAST_LABELS = { new: 'remis à traiter', validated: 'validé', trash: 'envoyé à la corbeille' }

function matchesSearch(article, query) {
  if (!query) return true
  const haystack = [article.title, article.source_name, article.status_reason, ...article.tags.map((t) => t.name)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

// Liste d'articles sous forme de tickets, avec filtres et annulation de la dernière action.
// `statuses` : onglets affichés (un seul = page à statut fixe). `toolType` : limite à un outil.
// `canAddManual` : affiche le bouton d'ajout manuel (l'article est ajouté avec le premier statut des onglets).
export default function ArticleBoard({ statuses, toolType, refreshKey = 0, canAddManual = false }) {
  const { currentWatch } = useWatch()
  const [articles, setArticles] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeStatus, setActiveStatus] = useState(statuses[0])
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [sort, setSort] = useState('recent')
  const [toast, setToast] = useState(null)
  const [isEmptyTrashOpen, setEmptyTrashOpen] = useState(false)
  const [isManualOpen, setManualOpen] = useState(false)

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
  }, [currentWatch, toolType, refreshKey])

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

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    const list = articles.filter((article) => (
      (activeStatus === 'all' || article.status === activeStatus)
      && (!tagFilter || article.tags.some((t) => String(t.id) === tagFilter))
      && (!sourceFilter || String(article.source_id) === sourceFilter)
      && matchesSearch(article, query)
    ))
    return sort === 'oldest' ? [...list].reverse() : list
  }, [articles, activeStatus, tagFilter, sourceFilter, search, sort])

  const hasFilters = Boolean(search || tagFilter || sourceFilter)

  if (loading) return <p className="dashboard-status">Chargement des articles…</p>
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
        <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} aria-label="Filtrer par tag">
          <option value="">Tous les tags</option>
          {usedTags.map(([id, name]) => <option key={id} value={String(id)}>#{name}</option>)}
        </select>
        {sources.length > 1 && (
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} aria-label="Filtrer par source">
            <option value="">Toutes les sources</option>
            {sources.map(([id, name]) => <option key={id} value={String(id)}>{name}</option>)}
          </select>
        )}
        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Trier">
          <option value="recent">Plus récents</option>
          <option value="oldest">Plus anciens</option>
        </select>
        <span className="board-count">{visible.length} article(s)</span>
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
        <div className="ticket-grid">
          {visible.map((article) => (
            <ArticleTicket
              key={article.id}
              article={article}
              allTags={tags}
              onUpdate={handleUpdate}
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

      <ManualArticleModal
        isOpen={isManualOpen}
        onClose={() => setManualOpen(false)}
        onCreate={handleManualCreate}
        defaultStatus={statuses[0] === 'validated' ? 'validated' : 'new'}
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
