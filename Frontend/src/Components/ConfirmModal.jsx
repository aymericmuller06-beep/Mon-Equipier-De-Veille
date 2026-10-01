import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmer l’action',
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'default',
  confirmPhrase,
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [typedPhrase, setTypedPhrase] = useState('')

  // Réinitialise l'état à chaque ouverture
  useEffect(() => {
    if (!isOpen) return
    setSubmitting(false)
    setError('')
    setTypedPhrase('')
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isPhraseRequired = Boolean(confirmPhrase)
  const isPhraseMatched = !isPhraseRequired || typedPhrase === confirmPhrase

  const handleConfirm = async () => {
    if (submitting || !isPhraseMatched) return
    setSubmitting(true)
    setError('')
    try {
      await onConfirm()
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="watch-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="watch-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="watch-modal-header">
          <h2 id="confirm-modal-title">{title}</h2>
          <button type="button" className="watch-modal-close" onClick={onClose} aria-label="Fermer la fenêtre">
            <X aria-hidden="true" />
          </button>
        </div>

        {message && <p className="confirm-modal-message">{message}</p>}

        {isPhraseRequired && (
          <div className="confirm-modal-phrase">
            <label htmlFor="confirm-modal-phrase-input">
              Pour confirmer, recopiez exactement : <strong>{confirmPhrase}</strong>
            </label>
            <input
              id="confirm-modal-phrase-input"
              type="text"
              value={typedPhrase}
              onChange={(event) => setTypedPhrase(event.target.value)}
              autoComplete="off"
              spellCheck="false"
            />
          </div>
        )}

        {error && <p className="watch-selection-error">{error}</p>}

        <div className="watch-modal-actions">
          <button type="button" className="watch-modal-cancel" onClick={onClose} disabled={submitting}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`watch-selection-submit ${variant === 'danger' ? 'watch-selection-submit--danger' : ''}`}
            onClick={handleConfirm}
            disabled={submitting || !isPhraseMatched}
          >
            {submitting ? 'Veuillez patienter…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
