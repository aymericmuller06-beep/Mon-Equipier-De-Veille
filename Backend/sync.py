import logging
import os
import re
import threading
import time
import urllib.error
from datetime import datetime, timezone
from urllib.parse import urlparse

from database import get_db
from rss import fetch_rss_entries
from web import RateLimitedError
from text import normalize

logger = logging.getLogger(__name__)

# Reddit n'accepte qu'environ une requête par minute sans compte : on patiente avant de réessayer
MAX_RATE_LIMIT_WAIT_SECONDS = 90
# Synchro automatique : délai minimum entre deux requêtes vers Reddit, pour ne pas se faire refuser
REDDIT_MIN_INTERVAL_SECONDS = int(os.environ.get("REDDIT_MIN_INTERVAL_SECONDS", "60"))


def parse_keywords(value):
    return [normalize(keyword.strip()) for keyword in (value or "").split(",") if keyword.strip()]


def contains_keyword(text, keywords):
    # Mots entiers uniquement : « IA » ne doit pas correspondre à « via »
    return any(re.search(rf"\b{re.escape(keyword)}\b", text) for keyword in keywords)


def keyword_filter(include_keywords, exclude_keywords):
    """Renvoie une fonction (titre, résumé) -> bool selon les filtres d'une source"""
    include = parse_keywords(include_keywords)
    exclude = parse_keywords(exclude_keywords)

    def matches(title, summary=""):
        text = normalize(f"{title} {summary}")
        if include and not contains_keyword(text, include):
            return False
        return not contains_keyword(text, exclude)

    return matches


def describe_sync_error(error):
    """Message compréhensible pour une synchronisation échouée (affiché dans l'interface)"""
    if isinstance(error, RateLimitedError):
        return f"{error.host} limite le nombre de requêtes, nouvel essai à la prochaine synchronisation"
    if isinstance(error, urllib.error.HTTPError):
        if error.code in (404, 410):
            return f"Flux introuvable (erreur {error.code}) : son adresse a peut-être changé"
        if error.code in (401, 403):
            return f"Le site refuse l'accès au flux (erreur {error.code})"
        if error.code >= 500:
            return f"Le site est en panne (erreur {error.code})"
        return f"Le site a répondu par une erreur {error.code}"
    if isinstance(error, (urllib.error.URLError, TimeoutError, OSError)):
        return "Site injoignable (adresse inconnue ou délai dépassé)"
    if isinstance(error, ValueError):
        return "Le contenu reçu n'est pas un flux RSS valide"
    return f"Erreur inattendue ({type(error).__name__})"


def record_sync(source_id, error=None):
    """Enregistre le résultat de la dernière synchronisation d'une source"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    if error is None:
        db.execute(
            "UPDATE sources SET last_sync_at = ?, last_success_at = ?, last_error = NULL, error_since = NULL WHERE id = ?",
            (now, now, source_id),
        )
    else:
        db.rollback()
        db.execute(
            "UPDATE sources SET last_sync_at = ?, last_error = ?, error_since = COALESCE(error_since, ?) WHERE id = ?",
            (now, describe_sync_error(error), now, source_id),
        )
    db.commit()


def import_entries(source):
    """Importe les nouveaux articles d'une source. Lève une exception si le flux est illisible."""
    entries = fetch_rss_entries(source["url"])
    matches = keyword_filter(source["include_keywords"], source["exclude_keywords"])
    kept = [entry for entry in entries if matches(entry["title"], entry["summary"])]
    db = get_db()

    now = datetime.now(timezone.utc).isoformat()
    inserted = []
    for entry in kept:
        # L'index unique (source_id, url) ignore les articles déjà importés
        cursor = db.execute("""
            INSERT OR IGNORE INTO articles (title, url, published_at, source_id, created_at)
            SELECT ?, ?, ?, ?, ?
            WHERE NOT EXISTS (SELECT 1 FROM dismissed_articles WHERE source_id = ? AND url = ?)
        """, (entry["title"], entry["url"], entry["published_at"], source["id"], now, source["id"], entry["url"]))
        if cursor.rowcount:
            inserted.append({"id": cursor.lastrowid, "title": entry["title"], "url": entry["url"], "published_at": entry["published_at"]})

    db.commit()
    filtered = len(entries) - len(kept)
    logger.info(f"✓ Synchronisation source {source['id']}: {len(inserted)} nouvel(s) article(s) sur {len(entries)} trouvés dans le flux ({filtered} écarté(s) par les filtres)")
    return {"source_id": source["id"], "fetched": len(entries), "filtered": filtered, "inserted": len(inserted), "articles": inserted}


def sync_source(source):
    """Synchronise une source et enregistre le résultat (réussite ou erreur) ; relance l'exception en cas d'échec"""
    try:
        result = import_entries(source)
    except Exception as e:
        record_sync(source["id"], e)
        raise
    record_sync(source["id"])
    return result


def is_reddit(source):
    host = urlparse(source["url"]).netloc.lower()
    return host == "reddit.com" or host.endswith(".reddit.com")


def sync_all_sources():
    """Synchronise toutes les sources ; une source en erreur n'empêche pas les autres."""
    started = time.monotonic()
    # Les articles ajoutés à la main n'ont pas de flux à lire.
    # Reddit en dernier : ses requêtes sont espacées, les autres sources n'ont pas à les attendre.
    sources = sorted(get_db().execute("SELECT * FROM sources WHERE tool_type != 'manual'").fetchall(), key=is_reddit)
    last_reddit_request = None
    for source in sources:
        if is_reddit(source):
            if last_reddit_request is not None:
                wait = REDDIT_MIN_INTERVAL_SECONDS - (time.monotonic() - last_reddit_request)
                if wait > 0:
                    time.sleep(wait)
            last_reddit_request = time.monotonic()
        try:
            try:
                sync_source(source)
            except RateLimitedError as e:
                wait = min(e.retry_after, MAX_RATE_LIMIT_WAIT_SECONDS)
                logger.info(f"… {e.host} limite les requêtes : nouvel essai de la source {source['id']} dans {wait} s")
                time.sleep(wait)
                sync_source(source)
        except Exception as e:
            logger.warning(f"✗ Synchronisation automatique de la source {source['id']} échouée: {e}")
        if is_reddit(source):
            # Le nouvel essai éventuel compte aussi comme une requête
            last_reddit_request = time.monotonic()

    duration = time.monotonic() - started
    logger.info(f"Synchronisation automatique terminée : {len(sources)} source(s) en {duration:.0f} s")
    return duration


def start_scheduler(app, interval_minutes):
    """Lance la synchronisation automatique de toutes les sources en tâche de fond"""
    stop = threading.Event()

    def run():
        while not stop.wait(interval_minutes * 60):
            with app.app_context():
                duration = sync_all_sources()
            # Le prochain passage attend toujours l'intervalle complet : pas de chevauchement, mais un retard qui s'accumule
            if duration > interval_minutes * 60:
                logger.warning(
                    f"⚠ La synchronisation a duré {duration / 60:.0f} min, plus que l'intervalle de {interval_minutes} min : "
                    "trop de sources Reddit ? Augmentez SYNC_INTERVAL_MINUTES."
                )

    threading.Thread(target=run, name="sync-scheduler", daemon=True).start()
    logger.info(f"Synchronisation automatique toutes les {interval_minutes} min")
    return stop
