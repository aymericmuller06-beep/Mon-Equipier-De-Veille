import { apiFetch } from './client'

export function getSources(themeId, toolType) {
  const params = new URLSearchParams()
  if (themeId) params.set('theme_id', themeId)
  if (toolType) params.set('tool_type', toolType)
  const query = params.toString() ? `?${params.toString()}` : ''
  return apiFetch(`/sources${query}`)
}

export function getSource(sourceId) {
  return apiFetch(`/sources/${sourceId}`)
}

// filters : { include_keywords?, exclude_keywords? } — mots-clés séparés par des virgules
export function createSource(name, url, themeId, toolType = 'rss', filters = {}) {
  return apiFetch('/sources', {
    method: 'POST',
    body: JSON.stringify({ name, url, theme_id: themeId, tool_type: toolType, ...filters }),
  })
}

// changes : { name?, include_keywords?, exclude_keywords?, apply_to_existing? } — renvoie la source et `trashed`
export function updateSource(sourceId, changes) {
  return apiFetch(`/sources/${sourceId}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  })
}

export function syncSource(sourceId) {
  return apiFetch(`/sources/${sourceId}/sync`, { method: 'POST' })
}

// Crée la source puis lance une première synchronisation ; une synchro en échec ne bloque pas la création
export async function createSourceAndSync(name, url, themeId, toolType, filters = {}) {
  const source = await createSource(name, url, themeId, toolType, filters)
  try {
    return { source, syncResult: await syncSource(source.id), syncError: '' }
  } catch (err) {
    return { source, syncResult: null, syncError: err.message }
  }
}
