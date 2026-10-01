const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function apiFetch(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    })
  } catch {
    throw new Error('Impossible de joindre le serveur. Vérifiez que le backend est démarré.')
  }

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(body?.error || `Erreur ${response.status}`)
  }

  return body
}
