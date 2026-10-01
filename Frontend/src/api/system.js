import { apiFetch } from './client'

export function resetDatabase() {
  return apiFetch('/system/reset', { method: 'POST' })
}
