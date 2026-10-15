import { apiFetch } from './client'

export function getStats(themeId, days = 14) {
  return apiFetch(`/stats?theme_id=${themeId}&days=${days}`)
}
