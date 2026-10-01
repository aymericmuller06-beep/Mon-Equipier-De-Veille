import { apiFetch } from './client'

export function getThemes() {
  return apiFetch('/themes')
}

export function createTheme(name) {
  return apiFetch('/themes', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function updateThemeName(id, name) {
  return apiFetch(`/themes/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  })
}

export function updateThemeAccent(id, accentColor) {
  return apiFetch(`/themes/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ accent_color: accentColor }),
  })
}

export function deleteTheme(id) {
  return apiFetch(`/themes/${id}`, { method: 'DELETE' })
}
