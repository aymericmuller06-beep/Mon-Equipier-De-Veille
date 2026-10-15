import { apiFetch } from './client'

export function getTags() {
  return apiFetch('/tags')
}

export function createTag(name) {
  return apiFetch('/tags', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}
