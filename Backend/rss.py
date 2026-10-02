import logging
from calendar import timegm
from datetime import datetime, timezone

import feedparser

logger = logging.getLogger(__name__)


def fetch_rss_entries(url, limit=50):
    """Récupère et normalise les entrées d'un flux RSS/Atom (titre, lien, date)"""
    parsed = feedparser.parse(url)
    if parsed.bozo and not parsed.entries:
        raise ValueError(f"Flux RSS invalide ou inaccessible ({getattr(parsed, 'bozo_exception', 'erreur inconnue')})")

    entries = []
    for entry in parsed.entries[:limit]:
        link = entry.get("link")
        title = entry.get("title")
        if not link or not title:
            continue

        published_at = None
        time_struct = entry.get("published_parsed") or entry.get("updated_parsed")
        if time_struct:
            published_at = datetime.fromtimestamp(timegm(time_struct), tz=timezone.utc).isoformat()

        entries.append({"title": title, "url": link, "published_at": published_at})

    return entries
