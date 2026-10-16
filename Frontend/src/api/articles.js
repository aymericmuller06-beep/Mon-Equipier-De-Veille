import { apiFetch } from './client'

export function getArticles({ themeId, status, sourceId, toolType, limit, sort } = {}) {
  const params = new URLSearchParams()
  if (sourceId) params.set('source_id', sourceId)
  if (themeId) params.set('theme_id', themeId)
  if (status) params.set('status', status)
  if (toolType) params.set('tool_type', toolType)
  if (limit) params.set('limit', limit)
  if (sort) params.set('sort', sort)
  const query = params.toString() ? `?${params.toString()}` : ''
  return apiFetch(`/articles${query}`)
}

// changes : { status?, status_reason? } — renvoie l'article complet (tags inclus)
export function updateArticle(id, changes) {
  return apiFetch(`/articles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  })
}

export function emptyTrash(themeId) {
  return apiFetch(`/articles/trash?theme_id=${themeId}`, { method: 'DELETE' })
}

export function addTagToArticle(articleId, tagId) {
  return apiFetch(`/articles/${articleId}/tags`, {
    method: 'POST',
    body: JSON.stringify({ tag_id: tagId }),
  })
}

export function removeTagFromArticle(articleId, tagId) {
  return apiFetch(`/articles/${articleId}/tags/${tagId}`, { method: 'DELETE' })
}

// article : { url, title?, published_at?, status?, status_reason? } — le titre est récupéré sur la page s'il est vide
export function addManualArticle(themeId, article) {
  return apiFetch('/articles/manual', {
    method: 'POST',
    body: JSON.stringify({ theme_id: themeId, ...article }),
  })
}
