import { apiFetch } from './client'

// Renvoie { feed_url, name } pour un lien de chaîne ou de playlist YouTube
export function resolveYouTube(url) {
  return apiFetch('/tools/youtube/resolve', {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
}

// Renvoie { feed_url, name } pour l'adresse d'un site ou d'un flux RSS/Atom
export function resolveRss(url) {
  return apiFetch('/tools/rss/resolve', {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
}
