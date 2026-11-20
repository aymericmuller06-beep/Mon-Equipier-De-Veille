import GoogleAlertModal from '../Components/GoogleAlertModal'
import GoogleNewsModal from '../Components/GoogleNewsModal'
import YouTubeModal from '../Components/YouTubeModal'
import RedditModal from '../Components/RedditModal'
import RssModal from '../Components/RssModal'
import { formatAgo } from './format'

// Outils à flux proposés dans « Ajouter un outil ». `type` = tool_type côté serveur (TOOL_TYPES dans routes.py),
// `colors` = couleurs du logo, la première est la couleur principale (cartes de « Ajouter un outil »)
export const TOOLS = [
  {
    type: 'google_alerts',
    label: 'Google Alerts',
    slug: 'google-alerts',
    colors: ['#4285F4', '#EA4335', '#FBBC05', '#34A853'],
    description: 'Suivez un sujet grâce aux alertes de votre compte Google.',
    subtitle: 'Les articles de vos alertes Google.',
    feedsLabel: 'Alertes',
    addLabel: 'Ajouter une alerte',
    emptyLabel: 'Aucune alerte Google pour le moment.',
    Modal: GoogleAlertModal,
  },
  {
    type: 'google_news',
    label: 'Google News',
    slug: 'google-news',
    colors: ['#0C9D58', '#4285F4', '#EA4335', '#FFC107'],
    description: 'Recherchez un sujet dans Google Actualités, sans compte Google.',
    subtitle: 'Les articles de vos recherches Google Actualités.',
    feedsLabel: 'Recherches',
    addLabel: 'Ajouter une recherche',
    emptyLabel: 'Aucune recherche Google News pour le moment.',
    Modal: GoogleNewsModal,
  },
  {
    type: 'youtube',
    label: 'YouTube',
    slug: 'youtube',
    colors: ['#FF0000', '#FF7A7A', '#B30000'],
    description: 'Recevez les nouvelles vidéos d’une chaîne ou d’une playlist.',
    subtitle: 'Les nouvelles vidéos des chaînes et playlists suivies.',
    feedsLabel: 'Chaînes',
    addLabel: 'Ajouter une chaîne',
    emptyLabel: 'Aucune chaîne YouTube suivie pour le moment.',
    Modal: YouTubeModal,
  },
  {
    type: 'reddit',
    label: 'Reddit',
    slug: 'reddit',
    colors: ['#FF4500', '#FF9566', '#C23500'],
    description: 'Suivez les posts les plus populaires d’un subreddit ou d’une recherche.',
    subtitle: 'Les posts Reddit de vos subreddits et recherches.',
    feedsLabel: 'Subreddits et recherches',
    addLabel: 'Ajouter un subreddit',
    emptyLabel: 'Aucun subreddit ni recherche Reddit suivi pour le moment.',
    Modal: RedditModal,
  },
  {
    type: 'rss',
    label: 'Flux RSS',
    slug: 'flux-rss',
    colors: ['#F26522', '#F79B5E', '#C24E14'],
    description: 'Suivez n’importe quel site qui publie un flux RSS : blogs, médias, sites officiels…',
    subtitle: 'Les nouveaux articles des sites suivis par leur flux RSS.',
    feedsLabel: 'Flux',
    addLabel: 'Ajouter un flux',
    emptyLabel: 'Aucun flux RSS suivi pour le moment.',
    Modal: RssModal,
  },
]

export const toolPath = (tool) => `/veille/outils/${tool.slug}`

export const formatSyncResult = (result) => {
  const filtered = result.filtered ? `, ${result.filtered} écarté(s) par les filtres` : ''
  return `${result.inserted} nouvel(s) article(s) importé(s) (${result.fetched} trouvés dans le flux${filtered}).`
}

// Une source qui n'a rien publié depuis ce délai est signalée (flux abandonné ou filtres trop stricts)
const QUIET_DAYS = 30
// Au-delà de ce délai d'erreurs d'affilée, une erreur n'est plus passagère : la source est en panne
const BROKEN_HOURS = 24
const hoursSince = (value) => (Date.now() - new Date(value).getTime()) / 3600000

// État d'une source d'après sa dernière synchronisation :
// { level: 'ok' | 'quiet' | 'warning' | 'error' | 'pending', label (court), detail (infobulle) }
export function sourceHealth(source) {
  const lastArticle = source.last_article_at ? `Dernier article reçu ${formatAgo(source.last_article_at)}.` : 'Aucun article reçu pour le moment.'

  if (!source.last_sync_at) {
    return { level: 'pending', label: 'Pas encore synchronisé', detail: `En attente de la prochaine synchronisation. ${lastArticle}` }
  }
  if (source.last_error) {
    const broken = hoursSince(source.error_since || source.last_sync_at) >= BROKEN_HOURS
    const since = source.last_success_at ? `Dernière synchro réussie ${formatAgo(source.last_success_at)}.` : 'Aucune synchro réussie pour le moment.'
    return {
      level: broken ? 'error' : 'warning',
      label: broken ? 'En panne' : 'Erreur passagère',
      detail: `${source.last_error}. ${since}${broken ? '' : ' Nouvel essai à la prochaine synchronisation.'}`,
    }
  }
  if (!source.last_article_at || hoursSince(source.last_article_at) >= QUIET_DAYS * 24) {
    return {
      level: 'quiet',
      label: 'Rien de neuf',
      detail: `Synchronisé ${formatAgo(source.last_sync_at)}, mais ${source.last_article_at ? `aucun nouvel article depuis plus de ${QUIET_DAYS} jours` : 'aucun article reçu'} : flux abandonné ou filtres trop stricts ?`,
    }
  }
  return { level: 'ok', label: 'OK', detail: `Synchronisé ${formatAgo(source.last_sync_at)}. ${lastArticle}` }
}
