import { useState } from 'react'
import ToolIcon from './ToolIcon'
import ToolModal from './ToolModal'

const STATUS_CHOICES = [
  { value: 'new', label: 'À traiter' },
  { value: 'validated', label: 'Validé' },
]

function ManualArticleModalContent({ onClose, onCreate, defaultStatus = 'new' }) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [publishedAt, setPublishedAt] = useState('')
  const [status, setStatus] = useState(defaultStatus)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!url.trim() || submitting) return

    setSubmitting(true)
    setFormError('')
    try {
      await onCreate({
        url: url.trim(),
        title: title.trim(),
        published_at: publishedAt || null,
        status,
        status_reason: note.trim(),
      })
    } catch (err) {
      setFormError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <ToolModal title="Ajouter un article" icon={<ToolIcon type="manual" size={20} />} onClose={onClose}>
      <p className="tool-modal-intro">Une page, une vidéo ou un document trouvé par vous-même.</p>

      <form className="watch-modal-form" onSubmit={handleSubmit}>
        <label htmlFor="manual-url">Lien</label>
        <input
          autoFocus
          id="manual-url"
          type="url"
          placeholder="https://…"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          required
        />

        <label htmlFor="manual-title">Titre <span className="tool-modal-optional">(facultatif)</span></label>
        <input
          id="manual-title"
          type="text"
          placeholder="Laissé vide : le titre de la page est récupéré"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={300}
        />

        <div className="tool-modal-row">
          <div>
            <label htmlFor="manual-date">Date de publication <span className="tool-modal-optional">(facultatif)</span></label>
            <input id="manual-date" type="date" value={publishedAt} onChange={(event) => setPublishedAt(event.target.value)} />
          </div>
          <div>
            <span className="watch-modal-label tool-modal-label-inline">Ajouter dans</span>
            <div className="tool-segmented" role="radiogroup" aria-label="Statut de l’article">
              {STATUS_CHOICES.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  role="radio"
                  aria-checked={status === choice.value}
                  className={status === choice.value ? 'is-active' : ''}
                  onClick={() => setStatus(choice.value)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label htmlFor="manual-note">Note <span className="tool-modal-optional">(facultatif)</span></label>
        <textarea
          id="manual-note"
          rows={2}
          placeholder="Pourquoi cet article est intéressant ?"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={2000}
        />

        {formError && <p className="watch-selection-error">{formError}</p>}

        <div className="watch-modal-actions">
          <button type="button" className="watch-modal-cancel" onClick={onClose}>Annuler</button>
          <button className="watch-selection-submit" type="submit" disabled={submitting}>
            {submitting ? 'Ajout en cours…' : 'Ajouter l’article'}
          </button>
        </div>
      </form>
    </ToolModal>
  )
}

export default function ManualArticleModal(props) {
  if (!props.isOpen) return null
  return <ManualArticleModalContent {...props} />
}
