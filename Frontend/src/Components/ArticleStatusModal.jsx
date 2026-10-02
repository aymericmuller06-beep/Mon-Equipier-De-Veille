import { useEffect, useState } from 'react'
import { X, CheckCircle2, XCircle } from 'lucide-react'

// Modal de traitement d'un article : Valider ou Refuser (corbeille), avec raison optionnelle
export default function ArticleStatusModal({ isOpen, onClose, article, onSubmit }) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setReason('')
    setSubmitting(false)
    setError('')
  }, [isOpen, article])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !article) return null

  const handleDecision = async (status) => {
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      await onSubmit(status, reason.trim())
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="watch-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="watch-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-status-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="watch-modal-header">
          <h2 id="article-status-modal-title">Traiter l’article</h2>
          <button type="button" className="watch-modal-close" onClick={onClose} aria-label="Fermer la fenêtre">
            <X aria-hidden="true" />
          </button>
        </div>

        <p className="confirm-modal-message">{article.title}</p>

        <div className="watch-modal-form">
          <label htmlFor="article-status-reason">Raison (optionnel)</label>
          <textarea
            id="article-status-reason"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Pourquoi valider ou refuser cet article ?"
          />
        </div>

        {error && <p className="watch-selection-error">{error}</p>}

        <div className="watch-modal-actions">
          <button type="button" className="watch-modal-cancel" onClick={onClose} disabled={submitting}>
            Annuler
          </button>
          <button
            type="button"
            className="watch-selection-submit watch-selection-submit--danger"
            onClick={() => handleDecision('trash')}
            disabled={submitting}
          >
            <XCircle aria-hidden="true" /> Refuser
          </button>
          <button
            type="button"
            className="watch-selection-submit"
            onClick={() => handleDecision('validated')}
            disabled={submitting}
          >
            <CheckCircle2 aria-hidden="true" /> Valider
          </button>
        </div>
      </div>
    </div>
  )
}
