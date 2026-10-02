import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export default function GoogleAlertModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Réinitialise le formulaire à chaque ouverture
  useEffect(() => {
    if (!isOpen) return
    setName('')
    setUrl('')
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
    if (!name.trim() || !url.trim() || submitting) return

    setSubmitting(true)
    setFormError('')
    try {
      await onCreate(name.trim(), url.trim())
    } catch (err) {
      setFormError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="watch-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="watch-modal google-alert-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-alert-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="watch-modal-header">
          <h2 id="google-alert-modal-title">Ajouter une Google Alert</h2>
          <button type="button" className="watch-modal-close" onClick={onClose} aria-label="Fermer la fenêtre">
            <X aria-hidden="true" />
          </button>
        </div>

        <ol className="google-alert-tuto">
          <li>Rendez-vous sur <a href="https://www.google.com/alerts" target="_blank" rel="noreferrer">google.com/alerts</a> et connectez-vous.</li>
          <li>Saisissez le sujet ou mot-clé à surveiller dans le champ de recherche.</li>
          <li>Cliquez sur « Afficher les options » pour dérouler les réglages avancés.</li>
          <li>Dans « Envoyer par », choisissez <strong>Flux RSS</strong> (au lieu de E-mail).</li>
          <li>Cliquez sur « Créer l'alerte », puis sur l'icône RSS qui apparaît à côté de votre nouvelle alerte pour en copier l'URL.</li>
          <li>Collez cette URL ci-dessous.</li>
        </ol>

        <form className="watch-modal-form" onSubmit={handleSubmit}>
          <label htmlFor="google-alert-name">Nom de l'alerte</label>
          <input
            autoFocus
            id="google-alert-name"
            type="text"
            placeholder="Ex. : Veille concurrentielle"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <label htmlFor="google-alert-url">URL du flux RSS de l'alerte</label>
          <input
            id="google-alert-url"
            type="url"
            placeholder="https://www.google.com/alerts/feeds/..."
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            required
          />

          {formError && <p className="watch-selection-error">{formError}</p>}

          <div className="watch-modal-actions">
            <button type="button" className="watch-modal-cancel" onClick={onClose}>Annuler</button>
            <button className="watch-selection-submit" type="submit" disabled={submitting}>
              {submitting ? 'Ajout en cours…' : 'Ajouter et synchroniser'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
