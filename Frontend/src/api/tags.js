import { apiFetch } from './client'

// Avec themeId : chaque tag inclut son utilisation (new, validated, trash dans cette veille, total, other_themes)
export function getTags(themeId) {
  return apiFetch(themeId ? `/tags?theme_id=${themeId}` : '/tags')
}

export function createTag(name) {
  return apiFetch('/tags', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function renameTag(tagId, name) {
  return apiFetch(`/tags/${tagId}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  })
}

export function deleteTag(tagId) {
  return apiFetch(`/tags/${tagId}`, { method: 'DELETE' })
}

// Les articles du tag reçoivent le tag `intoId`, puis le tag est supprimé
export function mergeTag(tagId, intoId) {
  return apiFetch(`/tags/${tagId}/merge`, {
    method: 'POST',
    body: JSON.stringify({ into: intoId }),
  })
}
