import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const ACCENT_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet']

export default function CreateWatchModal({ isOpen, onClose, onCreate }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('') 
  const [accentColor, setAccentColor] = useState('green')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Réinitialise le formulaire à chaque ouverture
  useEffect(() => {
    if (!isOpen) return
    setTitle('')
    setDescription('')
    setAccentColor('green')
    setFormError('')
    setSubmitting(false)
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

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!title.trim() || submitting) return

    setSubmitting(true)
    setFormError('')
    try {
      await onCreate(title.trim(), description.trim(), accentColor)
    } catch (err) {
      setFormError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="watch-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="watch-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="watch-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="watch-modal-header">
          <h2 id="watch-modal-title">Créer une veille</h2>
          <button type="button" className="watch-modal-close" onClick={onClose} aria-label="Fermer la fenêtre">
            <X aria-hidden="true" />
          </button>
        </div>

        <form className="watch-modal-form" onSubmit={handleSubmit}>
          <label htmlFor="watch-title">Nom de la veille</label>
          <input
            autoFocus
            id="watch-title"
            name="watchTitle"
            type="text"
            placeholder="Ex. : Veille technologique"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />

          <label htmlFor="watch-description">Description</label>
          <textarea
            id="watch-description"
            name="watchDescription"
            placeholder="Ex. : Suivi des dernières tendances technologiques"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />

          <span className="watch-modal-label">Couleur</span>
          <div className="watch-modal-swatches" role="group" aria-label="Couleur de la veille">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`watch-modal-swatch watch-modal-swatch--${color} ${accentColor === color ? 'active' : ''}`}
                onClick={() => setAccentColor(color)}
                title={`Accent ${color}`}
                aria-label={`Choisir la couleur ${color}`}
                aria-pressed={accentColor === color}
              />
            ))}
          </div>

          {formError && <p className="watch-selection-error">{formError}</p>}

          <div className="watch-modal-actions">
            <button type="button" className="watch-modal-cancel" onClick={onClose}>Annuler</button>
            <button className="watch-selection-submit" type="submit" disabled={submitting}>
              {submitting ? 'Création…' : 'Créer et ouvrir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
