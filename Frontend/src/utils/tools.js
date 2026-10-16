import GoogleAlertModal from '../Components/GoogleAlertModal'
import GoogleNewsModal from '../Components/GoogleNewsModal'
import YouTubeModal from '../Components/YouTubeModal'

// Outils à flux proposés dans « Ajouter un outil ». `type` = tool_type côté serveur (TOOL_TYPES dans routes.py)
export const TOOLS = [
  {
    type: 'google_alerts',
    label: 'Google Alerts',
    slug: 'google-alerts',
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
    description: 'Recevez les nouvelles vidéos d’une chaîne ou d’une playlist.',
    subtitle: 'Les nouvelles vidéos des chaînes et playlists suivies.',
    feedsLabel: 'Chaînes',
    addLabel: 'Ajouter une chaîne',
    emptyLabel: 'Aucune chaîne YouTube suivie pour le moment.',
    Modal: YouTubeModal,
  },
]

export const toolPath = (tool) => `/veille/outils/${tool.slug}`

export const formatSyncResult = (result) => (
  `${result.inserted} nouvel(s) article(s) importé(s) (${result.fetched} trouvés dans le flux).`
)
