import html
import logging
import re
from calendar import timegm
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlparse

import feedparser

from web import fetch

logger = logging.getLogger(__name__)

MAX_FEED_BYTES = 5 * 1024 * 1024
TAG_RE = re.compile(r"<[^>]+>")


def clean_title(title):
    """Retire les balises HTML (ex. <b> dans les titres Google Alerts) et décode les entités"""
    return html.unescape(TAG_RE.sub("", title)).strip()


def clean_link(link):
    """Extrait l'URL réelle des liens de redirection Google (google.com/url?url=...)"""
    parsed = urlparse(link)
    if parsed.netloc.endswith("google.com") and parsed.path == "/url":
        target = parse_qs(parsed.query).get("url") or parse_qs(parsed.query).get("q")
        if target:
            return target[0]
    return link


# Google News renvoie jusqu'à 100 résultats par recherche
def fetch_rss_entries(url, limit=100):
    """Récupère et normalise les entrées d'un flux RSS/Atom (titre, lien, date)"""
    content = fetch(url, MAX_FEED_BYTES)

    parsed = feedparser.parse(content)
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

        # Le résumé (description des vidéos YouTube) ne sert qu'aux filtres par mots-clés : il n'est pas stocké
        entries.append({
            "title": clean_title(title),
            "url": clean_link(link),
            "published_at": published_at,
            "summary": clean_title(entry.get("summary") or ""),
        })

    return entries
