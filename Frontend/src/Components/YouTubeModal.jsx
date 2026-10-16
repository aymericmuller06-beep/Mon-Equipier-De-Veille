import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import YouTubeLogo from './YouTubeLogo'
import ToolModal, { ToolSteps } from './ToolModal'
import { resolveYouTube } from '../api/tools'

const STEPS = [
  {
    action: <>Ouvrez sur <a href="https://www.youtube.com" target="_blank" rel="noreferrer">YouTube <ExternalLink aria-hidden="true" /></a> la chaîne ou la playlist à suivre.</>,
  },
  {
    action: <>Copiez l’adresse de la page dans la barre du navigateur et collez-la ci-dessous.</>,
    detail: <>Par exemple <code>youtube.com/@nomdelachaine</code> ou <code>youtube.com/playlist?list=…</code></>,
  },
]

function YouTubeModalContent({ onClose, onCreate }) {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!url.trim() || submitting) return

    setSubmitting(true)
    setFormError('')
    try {
      // Le serveur retrouve le flux RSS de la chaîne et son nom exact
      const resolved = await resolveYouTube(url.trim())
      await onCreate((name.trim() || resolved.name).slice(0, 150), resolved.feed_url)
    } catch (err) {
      setFormError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <ToolModal title="Suivre une chaîne YouTube" icon={<YouTubeLogo size={22} />} onClose={onClose} wide>
      <p className="tool-modal-intro">Chaque nouvelle vidéo publiée arrive dans vos articles à traiter.</p>

      <ToolSteps steps={STEPS} />

      <form className="watch-modal-form" onSubmit={handleSubmit}>
        <label htmlFor="youtube-url">Lien de la chaîne ou de la playlist</label>
        <input
          autoFocus
          id="youtube-url"
          type="text"
          inputMode="url"
          placeholder="https://www.youtube.com/@…"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          required
        />

        <label htmlFor="youtube-name">Nom affiché <span className="tool-modal-optional">(facultatif)</span></label>
        <input
          id="youtube-name"
          type="text"
          placeholder="Par défaut : le nom de la chaîne"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={150}
        />

        <div className="tool-modal-note">
          <p><strong>Surveiller un sujet plutôt qu’une chaîne ?</strong> YouTube ne propose pas de flux pour une recherche. Créez à la place une Google Alert avec <code>votre sujet site:youtube.com</code>.</p>
          <p><strong>Une seule vidéo ?</strong> Utilisez « Ajouter un article ».</p>
        </div>

        {formError && <p className="watch-selection-error">{formError}</p>}

        <div className="watch-modal-actions">
          <button type="button" className="watch-modal-cancel" onClick={onClose}>Annuler</button>
          <button className="watch-selection-submit" type="submit" disabled={submitting}>
            {submitting ? 'Recherche de la chaîne…' : 'Ajouter et synchroniser'}
          </button>
        </div>
      </form>
    </ToolModal>
  )
}

export default function YouTubeModal(props) {
  if (!props.isOpen) return null
  return <YouTubeModalContent {...props} />
}
