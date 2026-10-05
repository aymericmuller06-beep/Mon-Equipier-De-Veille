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
          <li>Saisissez le sujet ou mot-clé à surveiller dans le champ de recherche (privilégiez une requête simple : trop de termes = peu de résultats).</li>
          <li>Cliquez sur « Afficher les options » et réglez :
            <ul>
              <li><strong>Fréquence</strong> : « Au fur et à mesure »</li>
              <li><strong>Sources</strong> : « Automatique » (ou celles de votre choix)</li>
              <li><strong>Langue</strong> et <strong>Région</strong> : selon vos besoins</li>
              <li><strong>Nombre</strong> : « Tous les résultats »</li>
              <li><strong>Envoyer à</strong> : <strong>Flux RSS</strong> (au lieu de votre adresse e-mail)</li>
            </ul>
          </li>
          <li>Cliquez sur « Créer l'alerte ».</li>
          <li>Dans la liste « Mes alertes », cliquez sur l'icône RSS à côté de l'alerte : une page s'ouvre.</li>
          <li>Copiez l'URL de cette page. Elle doit ressembler à <code>https://www.google.com/alerts/feeds/…/…</code>.</li>
          <li>Collez cette URL ci-dessous, puis cliquez sur « Ajouter et synchroniser ».</li>
        </ol>
        <p className="google-alert-tuto-note">
          Le flux se remplit au fur et à mesure : un flux vide juste après la création est normal. Relancez la synchronisation plus tard depuis la page Google Alerts.
        </p>

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
