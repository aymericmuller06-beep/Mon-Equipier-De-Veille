import html
import re
import urllib.error
import urllib.request
from urllib.parse import parse_qs, urlparse

import feedparser

FETCH_TIMEOUT_SECONDS = 15
MAX_PAGE_BYTES = 2 * 1024 * 1024
USER_AGENT = "Mozilla/5.0 (compatible; EquipierDeVeille/1.0)"
# Sans ce cookie, YouTube renvoie la page de consentement RGPD au lieu de la chaîne
YOUTUBE_CONSENT_COOKIE = "SOCS=CAI; CONSENT=YES+1"

OG_TITLE_RE = re.compile(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']', re.IGNORECASE)
OG_TITLE_REVERSED_RE = re.compile(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:title["\']', re.IGNORECASE)
TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
CHANNEL_ID_RE = re.compile(r"^UC[\w-]{22}$")
CANONICAL_CHANNEL_RE = re.compile(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']https://www\.youtube\.com/channel/(UC[\w-]{22})["\']', re.IGNORECASE)
CHANNEL_ID_JSON_RE = re.compile(r'"(?:externalId|channelId)":"(UC[\w-]{22})"')

YOUTUBE_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com"}
YOUTUBE_FEED = "https://www.youtube.com/feeds/videos.xml"


class RateLimitedError(Exception):
    """Le site refuse temporairement nos requêtes (HTTP 429) ; `retry_after` en secondes"""

    def __init__(self, host, retry_after):
        super().__init__(f"{host} limite le nombre de requêtes (réessayer dans {retry_after} s)")
        self.host = host
        self.retry_after = retry_after


def read_retry_after(error):
    # Reddit envoie x-ratelimit-reset, les autres sites Retry-After
    for header in ("Retry-After", "x-ratelimit-reset"):
        try:
            return max(1, int(float(error.headers.get(header))))
        except (TypeError, ValueError):
            continue
    return 60


def fetch(url, max_bytes, headers=None):
    """Télécharge une URL http(s) avec délai et taille maximale ; renvoie les octets lus"""
    if urlparse(url).scheme not in ("http", "https"):
        raise ValueError("Seules les URL http(s) sont acceptées")
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, **(headers or {})})
    try:
        with urllib.request.urlopen(request, timeout=FETCH_TIMEOUT_SECONDS) as response:
            return response.read(max_bytes)
    except urllib.error.HTTPError as e:
        if e.code == 429:
            raise RateLimitedError(urlparse(url).netloc, read_retry_after(e)) from e
        raise


def fetch_html(url):
    host = urlparse(url).netloc.lower()
    headers = {"Accept-Language": "fr-FR,fr;q=0.9"}
    if host in YOUTUBE_HOSTS or host == "youtu.be":
        headers["Cookie"] = YOUTUBE_CONSENT_COOKIE
    return fetch(url, MAX_PAGE_BYTES, headers).decode("utf-8", errors="replace")


def extract_title(page):
    """Titre d'une page HTML : og:title en priorité, sinon la balise <title>"""
    match = OG_TITLE_RE.search(page) or OG_TITLE_REVERSED_RE.search(page) or TITLE_RE.search(page)
    if not match:
        return None
    title = " ".join(html.unescape(match.group(1)).split())
    return title or None


def fetch_page_title(url):
    """Récupère le titre d'une page ; None si la page est inaccessible ou sans titre"""
    try:
        return extract_title(fetch_html(url))
    except Exception:
        return None


def resolve_youtube_feed(url):
    """Transforme un lien de chaîne ou de playlist YouTube en flux RSS ; renvoie (url_du_flux, nom)"""
    parsed = urlparse(url if "://" in url else f"https://{url}")
    if parsed.netloc.lower() not in YOUTUBE_HOSTS:
        raise ValueError("Ce lien n'est pas un lien YouTube (youtube.com).")

    playlist_id = (parse_qs(parsed.query).get("list") or [None])[0]
    if playlist_id:
        feed_url = f"{YOUTUBE_FEED}?playlist_id={playlist_id}"
    else:
        segments = [segment for segment in parsed.path.split("/") if segment]
        if len(segments) >= 2 and segments[0] == "channel" and CHANNEL_ID_RE.match(segments[1]):
            channel_id = segments[1]
        elif segments and (segments[0].startswith("@") or segments[0] in ("c", "user")):
            # Lien par pseudo (@nom, /c/nom, /user/nom) : l'identifiant se trouve dans la page de la chaîne
            channel_path = segments[0] if segments[0].startswith("@") else "/".join(segments[:2])
            page = fetch_html(f"https://www.youtube.com/{channel_path}")
            match = CANONICAL_CHANNEL_RE.search(page) or CHANNEL_ID_JSON_RE.search(page)
            if not match:
                raise ValueError("Impossible de trouver l'identifiant de cette chaîne.")
            channel_id = match.group(1)
        else:
            raise ValueError("Collez le lien d'une chaîne (youtube.com/@nom) ou d'une playlist (…?list=…).")
        feed_url = f"{YOUTUBE_FEED}?channel_id={channel_id}"

    # Le flux lui-même donne le nom exact de la chaîne ou de la playlist
    feed = feedparser.parse(fetch(feed_url, MAX_PAGE_BYTES))
    if feed.bozo and not feed.entries and not feed.feed.get("title"):
        raise ValueError("YouTube ne fournit pas de flux pour ce lien (playlist privée ou chaîne introuvable).")
    return feed_url, feed.feed.get("title") or "YouTube"
