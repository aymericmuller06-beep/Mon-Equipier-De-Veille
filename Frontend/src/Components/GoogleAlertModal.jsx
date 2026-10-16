import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import GoogleLogo from './GoogleLogo'
import ToolModal, { ToolSteps } from './ToolModal'

const FEED_PREFIX = 'https://www.google.com/alerts/feeds/'

const STEPS = [
  {
    action: <>Ouvrez <a href="https://www.google.com/alerts" target="_blank" rel="noreferrer">Google Alerts <ExternalLink aria-hidden="true" /></a> et tapez votre sujet.</>,
    detail: 'Restez simple : un ou deux mots-clés suffisent. Utilisez des guillemets pour une expression exacte.',
  },
  {
    action: <>Cliquez sur « Afficher les options », puis choisissez <strong>Envoyer à : Flux RSS</strong>.</>,
    detail: 'C’est le seul réglage obligatoire. Conseillé : Fréquence « Au fur et à mesure » et Nombre « Tous les résultats ».',
  },
  {
    action: <>Cliquez sur « Créer l’alerte », puis sur l’<strong>icône RSS</strong> (orange) à droite de votre alerte.</>,
  },
  {
    action: <>Copiez l’adresse de la page qui s’ouvre et collez-la ci-dessous.</>,
    detail: <>Elle commence par <code>{FEED_PREFIX}</code></>,
  },
]

function GoogleAlertModalContent({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const trimmedUrl = url.trim()
  const looksWrong = trimmedUrl !== '' && !trimmedUrl.startsWith(FEED_PREFIX)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!name.trim() || !trimmedUrl || submitting) return

    setSubmitting(true)
    setFormError('')
    try {
      await onCreate(name.trim(), trimmedUrl)
    } catch (err) {
      setFormError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <ToolModal title="Ajouter une Google Alert" icon={<GoogleLogo size={22} />} onClose={onClose} wide>
      <ToolSteps steps={STEPS} />

      <form className="watch-modal-form" onSubmit={handleSubmit}>
        <label htmlFor="google-alert-url">Adresse du flux RSS</label>
        <input
          autoFocus
          id="google-alert-url"
          type="url"
          placeholder={`${FEED_PREFIX}…`}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          required
        />
        {looksWrong && (
          <p className="tool-modal-warning">
            Ce n’est pas une adresse de flux Google Alerts : vérifiez que vous avez copié la page ouverte par l’icône RSS.
          </p>
        )}

        <label htmlFor="google-alert-name">Nom de l’alerte</label>
        <input
          id="google-alert-name"
          type="text"
          placeholder="Ex. : Concurrents"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={150}
          required
        />

        <p className="tool-modal-note">Un flux vide juste après la création est normal : il se remplit au fil des nouveaux résultats.</p>

        {formError && <p className="watch-selection-error">{formError}</p>}

        <div className="watch-modal-actions">
          <button type="button" className="watch-modal-cancel" onClick={onClose}>Annuler</button>
          <button className="watch-selection-submit" type="submit" disabled={submitting}>
            {submitting ? 'Ajout en cours…' : 'Ajouter et synchroniser'}
          </button>
        </div>
      </form>
    </ToolModal>
  )
}

// Le contenu n'est monté qu'à l'ouverture : son état repart de zéro à chaque fois
export default function GoogleAlertModal(props) {
  if (!props.isOpen) return null
  return <GoogleAlertModalContent {...props} />
}
