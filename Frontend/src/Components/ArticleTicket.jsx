import { useState } from 'react'
import GoogleLogo from './GoogleLogo'
import { STATUS_LABELS, formatDate, formatRelative } from '../utils/format'

// Raccourcis de note : un clic ajoute le texte à la note en cours
const NOTE_PRESETS = {
  validated: ['Info clé', 'À partager', 'À approfondir', 'Concurrent', 'Chiffre intéressant'],
  trash: ['Hors sujet', 'Doublon', 'Trop ancien', 'Source peu fiable', 'Homonyme'],
}

const DECISION_LABELS = { validated: 'Validé', trash: 'Refusé' }

// Article présenté comme un ticket : titre, dates, tags, note et actions de tri
export default function ArticleTicket({ article, allTags, onUpdate, onAddTag, onRemoveTag }) {
  const [editingNote, setEditingNote] = useState(false)
  const [draft, setDraft] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const [tagName, setTagName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async (action) => {
    if (busy) return
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

  const startEditingNote = () => {
    setDraft(article.status_reason || '')
    setEditingNote(true)
  }

  // Une note en cours d'écriture est enregistrée avec la décision
  const decide = async (status) => {
    const changes = { status }
    if (editingNote) changes.status_reason = draft.trim()
    const ok = await run(() => onUpdate(article, changes))
    if (ok) setEditingNote(false)
  }

  const saveNote = async () => {
    const ok = await run(() => onUpdate(article, { status_reason: draft.trim() }))
    if (ok) setEditingNote(false)
  }

  const cancelNote = () => setEditingNote(false)

  const addPreset = (preset) => {
    setDraft((current) => (current.trim() ? `${current.trim()} — ${preset}` : preset))
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
  const presets = article.status === 'new'
    ? [...NOTE_PRESETS.validated.slice(0, 3), ...NOTE_PRESETS.trash.slice(0, 3)]
    : NOTE_PRESETS[article.status]
  const datalistId = `ticket-tags-${article.id}`

  return (
    <article className={`ticket ticket--${article.status}`} aria-busy={busy}>
      <header className="ticket-meta">
        <span className="ticket-source" title={article.source_name}>
          {article.tool_type === 'google_alerts' && <GoogleLogo size={13} />}
          {article.source_name}
        </span>
        <span className={`ticket-status ticket-status--${article.status}`}>{STATUS_LABELS[article.status]}</span>
      </header>

      <a className="ticket-title" href={article.url} target="_blank" rel="noreferrer">
        {article.title}
      </a>

      <p className="ticket-dates">
        <span>Publié le {formatDate(article.published_at || article.created_at)}</span>
        {article.created_at && <span>Collecté {formatRelative(article.created_at)}</span>}
        {article.status !== 'new' && article.status_changed_at && (
          <span>{DECISION_LABELS[article.status]} {formatRelative(article.status_changed_at)}</span>
        )}
      </p>

      <div className="ticket-tags" aria-label="Tags">
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
          <button type="button" className="ticket-tag-add" onClick={() => setAddingTag(true)}>
            + Tag
          </button>
        )}
      </div>

      {editingNote ? (
        <div className="ticket-note-editor">
          <textarea
            autoFocus
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) saveNote()
              if (event.key === 'Escape') cancelNote()
            }}
            placeholder="Pourquoi garder ou écarter cet article ?"
            maxLength={2000}
            aria-label="Note sur l’article"
          />
          <div className="ticket-presets">
            {presets.map((preset) => (
              <button key={preset} type="button" onClick={() => addPreset(preset)}>{preset}</button>
            ))}
          </div>
          <div className="ticket-note-actions">
            <span className="ticket-hint">Ctrl + Entrée pour enregistrer</span>
            <button type="button" className="ticket-button" onClick={cancelNote} disabled={busy}>Annuler</button>
            <button type="button" className="ticket-button ticket-button--primary" onClick={saveNote} disabled={busy}>Enregistrer</button>
          </div>
        </div>
      ) : article.status_reason ? (
        <button type="button" className="ticket-note" onClick={startEditingNote} title="Modifier la note">
          <span>{article.status_reason}</span>
          <span className="ticket-note-edit">Modifier</span>
        </button>
      ) : (
        <button type="button" className="ticket-note-add" onClick={startEditingNote}>
          Ajouter une note
        </button>
      )}

      {error && <p className="ticket-error">{error}</p>}

      <footer className="ticket-actions">
        {article.status !== 'new' && (
          <button type="button" className="ticket-button" onClick={() => decide('new')} disabled={busy}>
            {article.status === 'trash' ? 'Restaurer' : 'Remettre à traiter'}
          </button>
        )}
        {article.status !== 'trash' && (
          <button type="button" className="ticket-button ticket-button--danger" onClick={() => decide('trash')} disabled={busy}>
            Refuser
          </button>
        )}
        {article.status !== 'validated' && (
          <button type="button" className="ticket-button ticket-button--primary" onClick={() => decide('validated')} disabled={busy}>
            Valider
          </button>
        )}
      </footer>
    </article>
  )
}
