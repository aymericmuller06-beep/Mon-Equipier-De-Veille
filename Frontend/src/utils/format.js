export const STATUS_LABELS = { new: 'À traiter', validated: 'Validé', trash: 'Refusé' }

export function formatDate(value) {
  if (!value) return 'Date inconnue'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date inconnue' : date.toLocaleDateString('fr-FR')
}

export function formatRelative(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const days = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 30) return `il y a ${days} j`
  return date.toLocaleDateString('fr-FR')
}

// Corbeille : « supprimé dans 12 j » à partir de la date de suppression automatique donnée par le serveur
export function formatPurge(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000)
  if (days <= 0) return "Supprimé définitivement aujourd'hui"
  if (days === 1) return 'Supprimé définitivement demain'
  return `Supprimé définitivement dans ${days} j`
}

// Durée écoulée précise (« il y a 5 min », « il y a 3 h », « il y a 2 j »), pour les synchronisations
export function formatAgo(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `il y a ${days} j`
  return `le ${date.toLocaleDateString('fr-FR')}`
}

// Minuscules sans accents, pour chercher « securite » dans « Sécurité » (comme la recherche du serveur)
export function normalizeText(value) {
  return (value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
