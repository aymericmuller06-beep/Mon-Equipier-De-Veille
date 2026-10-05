import { apiFetch } from './client'

export function getArticles({ themeId, status, sourceId } = {}) {
  const params = new URLSearchParams()
  if (sourceId) params.set('source_id', sourceId)
  if (themeId) params.set('theme_id', themeId)
  if (status) params.set('status', status)
  const query = params.toString() ? `?${params.toString()}` : ''
  return apiFetch(`/articles${query}`)
}

export function updateArticleStatus(id, status, reason = '') {
  return apiFetch(`/articles/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  })
}
