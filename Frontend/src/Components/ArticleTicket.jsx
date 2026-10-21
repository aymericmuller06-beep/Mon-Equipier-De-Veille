import { useState } from 'react'
import { MessageSquareText } from 'lucide-react'
import ToolIcon from './ToolIcon'
import { STATUS_LABELS, formatDate, formatRelative } from '../utils/format'

const DECISION_LABELS = { validated: 'Validé', trash: 'Refusé' }

// Article présenté sur une ligne : source et dates, titre, tags et note, puis statut et actions à droite.
// `onDecide(article, status)` : valider / refuser (ouvre la fenêtre de note) ou remettre à traiter.
// `onEditNote(article)` : modifier la note sans changer le statut.
export default function ArticleTicket({ article, allTags, onDecide, onEditNote, onAddTag, onRemoveTag }) {
  const [addingTag, setAddingTag] = useState(false)
  const [tagName, setTagName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async (action) => {
    if (busy) return false
    setBusy(true)
    setError('')
    try {
      await action()
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  const submitTag = async () => {
    const name = tagName.trim()
    if (!name) return
    const ok = await run(() => onAddTag(article, name))
    if (ok) {
      setTagName('')
      setAddingTag(false)
    }
  }

  const suggestions = allTags.filter((tag) => !article.tags.some((t) => t.id === tag.id))
  const datalistId = `ticket-tags-${article.id}`

  return (
    <article className={`ticket ticket--${article.status}`} aria-busy={busy}>
      <div className="ticket-main">
        <p className="ticket-meta">
          <span className="ticket-source" title={article.source_name}>
            <ToolIcon type={article.tool_type} size={13} />
            {article.source_name}
          </span>
          <span>Publié le {formatDate(article.published_at || article.created_at)}</span>
          {article.created_at && <span>Collecté {formatRelative(article.created_at)}</span>}
          {article.status !== 'new' && article.status_changed_at && (
            <span>{DECISION_LABELS[article.status]} {formatRelative(article.status_changed_at)}</span>
          )}
        </p>

        <a className="ticket-title" href={article.url} target="_blank" rel="noreferrer" title={article.title}>
          {article.title}
        </a>

        <div className="ticket-extra">
          {article.tags.map((tag) => (
            <span key={tag.id} className="ticket-tag">
              #{tag.name}
              <button type="button" onClick={() => run(() => onRemoveTag(article, tag))} aria-label={`Retirer le tag ${tag.name}`} disabled={busy}>
                ×
              </button>
            </span>
          ))}
          {addingTag ? (
            <form className="ticket-tag-form" onSubmit={(event) => { event.preventDefault(); submitTag() }}>
              <input
                autoFocus
                list={datalistId}
                value={tagName}
                onChange={(event) => setTagName(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Escape') setAddingTag(false) }}
                onBlur={() => { if (!tagName.trim()) setAddingTag(false) }}
                placeholder="Nom du tag"
                maxLength={50}
                aria-label="Nom du tag"
              />
              <datalist id={datalistId}>
                {suggestions.map((tag) => <option key={tag.id} value={tag.name} />)}
              </datalist>
            </form>
          ) : (
            <button type="button" className="ticket-tag-add" onClick={() => setAddingTag(true)}>+ Tag</button>
          )}

          {article.status_reason ? (
            <button type="button" className="ticket-note" onClick={() => onEditNote(article)} title={`${article.status_reason}\n\nCliquer pour modifier`}>
              <MessageSquareText aria-hidden="true" />
              <span>{article.status_reason}</span>
            </button>
          ) : (
            <button type="button" className="ticket-tag-add" onClick={() => onEditNote(article)}>+ Note</button>
          )}
        </div>

        {error && <p className="ticket-error">{error}</p>}
      </div>

      <div className="ticket-side">
        <span className={`ticket-status ticket-status--${article.status}`}>{STATUS_LABELS[article.status]}</span>
        <div className="ticket-actions">
          {article.status !== 'new' && (
            <button type="button" className="ticket-button" onClick={() => run(() => onDecide(article, 'new'))} disabled={busy}>
              {article.status === 'trash' ? 'Restaurer' : 'Remettre à traiter'}
            </button>
          )}
          {article.status !== 'trash' && (
            <button type="button" className="ticket-button ticket-button--danger" onClick={() => onDecide(article, 'trash')} disabled={busy}>
              Refuser
            </button>
          )}
          {article.status !== 'validated' && (
            <button type="button" className="ticket-button ticket-button--primary" onClick={() => onDecide(article, 'validated')} disabled={busy}>
              Valider
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
