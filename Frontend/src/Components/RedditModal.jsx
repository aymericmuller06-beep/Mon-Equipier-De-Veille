import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import RedditLogo from './RedditLogo'
import ToolModal from './ToolModal'
import KeywordFilterFields from './KeywordFilterFields'

const REDDIT = 'https://www.reddit.com'
const SUBREDDIT_NAME_RE = /^[A-Za-z0-9_]{2,21}$/
// « r/nom », « /r/nom » ou un lien reddit.com/r/nom/… (y compris le lien d'un post)
const SUBREDDIT_IN_TEXT_RE = /(?:^|\/)r\/([A-Za-z0-9_]{2,21})(?:[/?#]|$)/i

// « Populaires » limite chaque synchro aux meilleurs posts : bien moins de bruit que « Nouveaux »
const SORTS = [
  { value: 'top-week', label: 'Les 10 plus populaires de la semaine', sort: 'top', period: 'week', limit: 10 },
  { value: 'top-day', label: 'Les 10 plus populaires du jour', sort: 'top', period: 'day', limit: 10 },
  { value: 'new', label: 'Tous les nouveaux posts (beaucoup plus de volume)', sort: 'new', period: '', limit: 25 },
]

// Astuces de recherche Reddit, formulées comme des phrases : ce que ça fait, puis l'exemple à taper
const SEARCH_TIPS = [
  { meaning: 'Chercher une expression exacte : mettez-la entre guillemets', example: '"home assistant"' },
  { meaning: 'Accepter un mot ou l’autre : séparez-les par OR', example: 'docker OR podman' },
  { meaning: 'Chercher seulement dans le titre des posts : ajoutez title: devant le mot', example: 'title:proxmox' },
]

// Renvoie le nom du subreddit, '' si le champ est vide, null s'il est illisible
function parseSubreddit(value) {
  const text = value.trim()
  if (!text) return ''
  if (SUBREDDIT_NAME_RE.test(text)) return text
  const match = text.match(SUBREDDIT_IN_TEXT_RE)
  return match ? match[1] : null
}

// Construit l'adresse du flux RSS Reddit (et la page équivalente pour l'aperçu)
function buildUrls(subreddit, query, sortValue) {
  const { sort, period, limit } = SORTS.find((item) => item.value === sortValue)
  const base = subreddit ? `${REDDIT}/r/${subreddit}` : REDDIT
  const params = new URLSearchParams()

  if (query) {
    params.set('q', query)
    params.set('sort', sort)
    if (subreddit) params.set('restrict_sr', 'on')
  }
  if (period) params.set('t', period)
  const previewQuery = params.toString()
  params.set('limit', limit)

  // Recherche : /search.rss — sinon le listing du subreddit : /top/.rss ou /new/.rss
  const [feedPath, previewPath] = query ? ['/search.rss', '/search'] : [`/${sort}/.rss`, `/${sort}/`]
  return {
    feed: `${base}${feedPath}?${params.toString()}`,
    preview: `${base}${previewPath}?${previewQuery}`,
  }
}

function defaultName(subreddit, query) {
  if (subreddit && query) return `${query} — r/${subreddit}`
  return subreddit ? `r/${subreddit}` : query
}

function RedditModalContent({ onClose, onCreate }) {
  const [subredditInput, setSubredditInput] = useState('')
  const [query, setQuery] = useState('')
  const [sortValue, setSortValue] = useState(SORTS[0].value)
  const [name, setName] = useState('')
  const [include, setInclude] = useState('')
  const [exclude, setExclude] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const subreddit = parseSubreddit(subredditInput)
  const trimmedQuery = query.trim()
  const isPostLink = /\/comments\//i.test(subredditInput)
  const canSubmit = subreddit !== null && Boolean(subreddit || trimmedQuery)
  const urls = canSubmit ? buildUrls(subreddit, trimmedQuery, sortValue) : null

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit || submitting) return

    setSubmitting(true)
    setFormError('')
    try {
      await onCreate((name.trim() || defaultName(subreddit, trimmedQuery)).slice(0, 150), urls.feed, {
        include_keywords: include,
        exclude_keywords: exclude,
      })
    } catch (err) {
      setFormError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <ToolModal title="Suivre Reddit" icon={<RedditLogo size={22} />} onClose={onClose} wide>
      <p className="tool-modal-intro">
        Suivez un subreddit, une recherche, ou une recherche dans un subreddit. Aucun compte n’est nécessaire.
      </p>

      <form className="watch-modal-form" onSubmit={handleSubmit}>
        <label htmlFor="reddit-subreddit">Subreddit <span className="tool-modal-optional">(facultatif)</span></label>
        <input
          autoFocus
          id="reddit-subreddit"
          type="text"
          placeholder="Ex. : r/selfhosted ou https://www.reddit.com/r/selfhosted"
          value={subredditInput}
          onChange={(event) => setSubredditInput(event.target.value)}
        />
        {subreddit === null && (
          <p className="tool-modal-warning">Nom de subreddit illisible : tapez par exemple <code>r/selfhosted</code> ou collez le lien du subreddit.</p>
        )}
        {subreddit && isPostLink && (
          <p className="tool-modal-warning">
            C’est le lien d’un post : c’est tout <strong>r/{subreddit}</strong> qui sera suivi. Pour garder ce seul post, utilisez « Ajouter un article ».
          </p>
        )}

        <label htmlFor="reddit-query">Mots-clés de recherche <span className="tool-modal-optional">(facultatif si un subreddit est indiqué)</span></label>
        <input
          id="reddit-query"
          type="text"
          placeholder="Ex. : backup NAS"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <ul className="tool-search-tips" aria-label="Astuces de recherche">
          {SEARCH_TIPS.map((tip) => (
            <li key={tip.example}>{tip.meaning}, par exemple <code>{tip.example}</code></li>
          ))}
        </ul>

        <label htmlFor="reddit-sort">Posts à récupérer</label>
        <select id="reddit-sort" value={sortValue} onChange={(event) => setSortValue(event.target.value)}>
          {SORTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>

        <label htmlFor="reddit-name">Nom affiché <span className="tool-modal-optional">(facultatif)</span></label>
        <input
          id="reddit-name"
          type="text"
          placeholder={canSubmit ? defaultName(subreddit, trimmedQuery) : 'Par défaut : le subreddit ou la recherche'}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={150}
        />

        <KeywordFilterFields
          idPrefix="reddit"
          include={include}
          exclude={exclude}
          onIncludeChange={setInclude}
          onExcludeChange={setExclude}
        />

        {urls && (
          <a className="tool-modal-preview" href={urls.preview} target="_blank" rel="noreferrer">
            Voir ces posts sur Reddit <ExternalLink aria-hidden="true" />
          </a>
        )}

        <p className="tool-modal-note">
          Reddit n’accepte qu’environ une requête par minute sans compte : si la première synchronisation est refusée, la synchronisation automatique prendra le relais.
        </p>

        {formError && <p className="watch-selection-error">{formError}</p>}

        <div className="watch-modal-actions">
          <button type="button" className="watch-modal-cancel" onClick={onClose}>Annuler</button>
          <button className="watch-selection-submit" type="submit" disabled={submitting || !canSubmit}>
            {submitting ? 'Ajout en cours…' : 'Ajouter et synchroniser'}
          </button>
        </div>
      </form>
    </ToolModal>
  )
}

export default function RedditModal(props) {
  if (!props.isOpen) return null
  return <RedditModalContent {...props} />
}
