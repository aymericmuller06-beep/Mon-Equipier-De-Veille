import html
import logging
import re
import urllib.request
from calendar import timegm
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlparse

import feedparser

logger = logging.getLogger(__name__)

FETCH_TIMEOUT_SECONDS = 15
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


def fetch_rss_entries(url, limit=50):
    """Récupère et normalise les entrées d'un flux RSS/Atom (titre, lien, date)"""
    request = urllib.request.Request(url, headers={"User-Agent": "EquipierDeVeille/1.0"})
    with urllib.request.urlopen(request, timeout=FETCH_TIMEOUT_SECONDS) as response:
        content = response.read(MAX_FEED_BYTES)

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

        entries.append({"title": clean_title(title), "url": clean_link(link), "published_at": published_at})

    return entries
