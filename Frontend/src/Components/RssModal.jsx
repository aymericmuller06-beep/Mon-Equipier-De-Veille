import { useState } from 'react'
import RssLogo from './RssLogo'
import ToolModal, { ToolSteps } from './ToolModal'
import KeywordFilterFields from './KeywordFilterFields'
import { resolveRss } from '../api/tools'

const STEPS = [
  {
    action: <>Ouvrez le site à suivre : un blog, un média, un site officiel…</>,
  },
  {
    action: <>Copiez son adresse et collez-la ci-dessous : le flux RSS est retrouvé automatiquement.</>,
    detail: <>Si le site en a plusieurs (par rubrique), collez plutôt l’adresse du flux voulu, souvent derrière un lien « RSS » ou une icône <RssLogo size={12} />.</>,
  },
]

function RssModalContent({ onClose, onCreate }) {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [include, setInclude] = useState('')
  const [exclude, setExclude] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!url.trim() || submitting) return

    setSubmitting(true)
    setFormError('')
    try {
      // Le serveur trouve le flux du site (ou vérifie que l'adresse en est un) et son nom
      const resolved = await resolveRss(url.trim())
      await onCreate((name.trim() || resolved.name).slice(0, 150), resolved.feed_url, {
        include_keywords: include,
        exclude_keywords: exclude,
      })
    } catch (err) {
      setFormError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <ToolModal title="Suivre un flux RSS" icon={<RssLogo size={22} />} onClose={onClose} wide>
      <p className="tool-modal-intro">Chaque nouvel article publié par le site arrive dans vos articles à traiter.</p>

      <ToolSteps steps={STEPS} />

      <form className="watch-modal-form" onSubmit={handleSubmit}>
        <label htmlFor="rss-url">Adresse du site ou du flux</label>
        <input
          autoFocus
          id="rss-url"
          type="text"
          inputMode="url"
          placeholder="Ex. : https://www.cert.ssi.gouv.fr"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          required
        />

        <label htmlFor="rss-name">Nom affiché <span className="tool-modal-optional">(facultatif)</span></label>
        <input
          id="rss-name"
          type="text"
          placeholder="Par défaut : le nom du flux"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={150}
        />

        <KeywordFilterFields
          idPrefix="rss"
          include={include}
          exclude={exclude}
          onIncludeChange={setInclude}
          onExcludeChange={setExclude}
        />

        {formError && <p className="watch-selection-error">{formError}</p>}

        <div className="watch-modal-actions">
          <button type="button" className="watch-modal-cancel" onClick={onClose}>Annuler</button>
          <button className="watch-selection-submit" type="submit" disabled={submitting}>
            {submitting ? 'Recherche du flux…' : 'Ajouter et synchroniser'}
          </button>
        </div>
      </form>
    </ToolModal>
  )
}

export default function RssModal(props) {
  if (!props.isOpen) return null
  return <RssModalContent {...props} />
}
