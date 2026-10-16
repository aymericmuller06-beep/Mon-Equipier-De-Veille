import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import ToolIcon from './ToolIcon'
import ToolModal from './ToolModal'

const EDITIONS = [
  { value: 'fr:FR', label: 'Français — France' },
  { value: 'fr:BE', label: 'Français — Belgique' },
  { value: 'fr:CH', label: 'Français — Suisse' },
  { value: 'fr:CA', label: 'Français — Canada' },
  { value: 'en:US', label: 'Anglais — États-Unis' },
  { value: 'en:GB', label: 'Anglais — Royaume-Uni' },
]

const PERIODS = [
  { value: '1d', label: 'Dernières 24 heures' },
  { value: '7d', label: '7 derniers jours' },
  { value: '30d', label: '30 derniers jours' },
  { value: '', label: 'Sans limite (les plus pertinents)' },
]

const SYNTAX_TIPS = [
  { example: '"intelligence artificielle"', meaning: 'expression exacte' },
  { example: 'Renault OR Peugeot', meaning: 'l’un ou l’autre' },
  { example: 'jaguar -voiture', meaning: 'exclure un mot' },
  { example: 'site:lemonde.fr', meaning: 'un seul site' },
]

// Construit l'adresse du flux RSS de recherche Google News (et la page équivalente pour l'aperçu)
function buildUrls(query, edition, period) {
  const [lang, country] = edition.split(':')
  const fullQuery = period ? `${query} when:${period}` : query
  const params = `q=${encodeURIComponent(fullQuery)}&hl=${lang}&gl=${country}&ceid=${country}:${lang}`
  return {
    feed: `https://news.google.com/rss/search?${params}`,
    preview: `https://news.google.com/search?${params}`,
  }
}

function GoogleNewsModalContent({ onClose, onCreate }) {
  const [query, setQuery] = useState('')
  const [name, setName] = useState('')
  const [edition, setEdition] = useState(EDITIONS[0].value)
  const [period, setPeriod] = useState('7d')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const trimmedQuery = query.trim()
  const urls = buildUrls(trimmedQuery, edition, period)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!trimmedQuery || submitting) return

    setSubmitting(true)
    setFormError('')
    try {
      await onCreate((name.trim() || trimmedQuery).slice(0, 150), urls.feed)
    } catch (err) {
      setFormError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <ToolModal title="Ajouter une recherche Google News" icon={<ToolIcon type="google_news" size={22} />} onClose={onClose} wide>
      <p className="tool-modal-intro">
        Aucun compte n’est nécessaire : tapez votre sujet, la recherche Google Actualités est créée pour vous.
      </p>

      <form className="watch-modal-form" onSubmit={handleSubmit}>
        <label htmlFor="google-news-query">Que voulez-vous surveiller ?</label>
        <input
          autoFocus
          id="google-news-query"
          type="text"
          placeholder="Ex. : cybersécurité PME"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          required
        />
        <ul className="tool-syntax" aria-label="Astuces de recherche">
          {SYNTAX_TIPS.map((tip) => (
            <li key={tip.example}><code>{tip.example}</code> {tip.meaning}</li>
          ))}
        </ul>

        <div className="tool-modal-row">
          <div>
            <label htmlFor="google-news-edition">Langue et pays</label>
            <select id="google-news-edition" value={edition} onChange={(event) => setEdition(event.target.value)}>
              {EDITIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="google-news-period">Ancienneté des articles</label>
            <select id="google-news-period" value={period} onChange={(event) => setPeriod(event.target.value)}>
              {PERIODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
        </div>

        <label htmlFor="google-news-name">Nom de la recherche <span className="tool-modal-optional">(facultatif)</span></label>
        <input
          id="google-news-name"
          type="text"
          placeholder={trimmedQuery || 'Par défaut : les mots-clés'}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={150}
        />

        {trimmedQuery && (
          <a className="tool-modal-preview" href={urls.preview} target="_blank" rel="noreferrer">
            Voir les résultats dans Google News <ExternalLink aria-hidden="true" />
          </a>
        )}

        {formError && <p className="watch-selection-error">{formError}</p>}

        <div className="watch-modal-actions">
          <button type="button" className="watch-modal-cancel" onClick={onClose}>Annuler</button>
          <button className="watch-selection-submit" type="submit" disabled={submitting || !trimmedQuery}>
            {submitting ? 'Ajout en cours…' : 'Ajouter et synchroniser'}
          </button>
        </div>
      </form>
    </ToolModal>
  )
}

export default function GoogleNewsModal(props) {
  if (!props.isOpen) return null
  return <GoogleNewsModalContent {...props} />
}
