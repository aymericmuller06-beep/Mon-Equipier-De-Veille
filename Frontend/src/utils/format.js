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
