import { apiFetch } from './client'

export function getThemes() {
  return apiFetch('/themes')
}

export function createTheme(name, description, accentColor) {
  return apiFetch('/themes', {
    method: 'POST',
    body: JSON.stringify({ name, description, accent_color: accentColor }),
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
