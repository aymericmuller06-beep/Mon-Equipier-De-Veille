import { useEffect, useId, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import ToolIcon from './ToolIcon'
import { useWatch } from '../Context/useWatch'
import { getArticles } from '../api/articles'
import { formatRelative } from '../utils/format'

const MIN_LENGTH = 2
const MAX_RESULTS = 8
const DEBOUNCE_MS = 250

const STATUS_LABELS = {
  new: 'À traiter',
  validated: 'Validé',
  trash: 'Corbeille',
}

// Recherche dans les articles de la veille (titre et note), depuis la barre du haut.
// Les résultats s'ouvrent dans un nouvel onglet ; ↑ ↓ pour naviguer, Entrée pour ouvrir, Échap pour fermer.
export default function ArticleSearch() {
  const { currentWatch } = useWatch()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const inputRef = useRef(null)
  const wrapperRef = useRef(null)
  const listId = useId()

  const trimmed = query.trim()
  const ready = trimmed.length >= MIN_LENGTH

  // Recherche différée : une requête quand l'utilisateur marque une pause, les réponses périmées sont ignorées
  useEffect(() => {
    if (!ready || !currentWatch) return
    let cancelled = false
    const timer = setTimeout(() => {
      setStatus('loading')
      getArticles({ themeId: currentWatch.id, q: trimmed, limit: MAX_RESULTS })
        .then((articles) => {
          if (cancelled) return
          setResults(articles)
          setActive(-1)
          setStatus('done')
        })
        .catch(() => { if (!cancelled) setStatus('error') })
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [trimmed, ready, currentWatch])

  // Fermeture au clic en dehors
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const clear = () => {
    setQuery('')
    setResults([])
    setStatus('idle')
    inputRef.current?.focus()
  }

  const openArticle = (article) => {
    window.open(article.url, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      if (open) setOpen(false)
      else clear()
      return
    }
    if (!open || !results.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => (index + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => (index <= 0 ? results.length - 1 : index - 1))
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault()
      openArticle(results[active])
    }
  }

  const showPanel = open && ready
  const activeId = active >= 0 ? `${listId}-${active}` : undefined

  return (
    <div className="article-search" ref={wrapperRef}>
      <Search className="article-search-icon" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="Rechercher un article"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-activedescendant={activeId}
        aria-autocomplete="list"
        placeholder="Rechercher un article…"
        value={query}
        maxLength={100}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {query && (
        <button type="button" className="article-search-clear" onClick={clear} aria-label="Effacer la recherche">
          <X aria-hidden="true" />
        </button>
      )}

      {showPanel && (
        <div className="article-search-panel">
          {status === 'error' && <p className="article-search-message">Recherche impossible : le serveur ne répond pas.</p>}
          {status === 'done' && results.length === 0 && (
            <p className="article-search-message">Aucun article ne contient « {trimmed} ».</p>
          )}
          {status === 'loading' && results.length === 0 && <p className="article-search-message">Recherche…</p>}

          {results.length > 0 && (
            <ul id={listId} role="listbox" aria-label="Articles trouvés">
              {results.map((article, index) => (
                <li
                  key={article.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  className={index === active ? 'is-active' : ''}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => openArticle(article)}
                >
                  <span className="article-search-logo" aria-hidden="true"><ToolIcon type={article.tool_type} size={16} /></span>
                  <span className="article-search-text">
                    <span className="article-search-title">{article.title}</span>
                    <span className="article-search-meta">
                      {article.source_name} · {formatRelative(article.published_at || article.created_at)}
                    </span>
                  </span>
                  <span className={`article-search-status article-search-status--${article.status}`}>
                    {STATUS_LABELS[article.status] ?? article.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {results.length === MAX_RESULTS && (
            <p className="article-search-message article-search-message--hint">Seuls les {MAX_RESULTS} plus récents sont affichés : précisez la recherche.</p>
          )}
        </div>
      )}
    </div>
  )
}
