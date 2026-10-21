import logging
import re
import threading
import unicodedata
from datetime import datetime, timezone

from database import get_db
from rss import fetch_rss_entries

logger = logging.getLogger(__name__)


def normalize(text):
    """Minuscules sans accents, pour comparer « Sécurité » et « securite »"""
    decomposed = unicodedata.normalize("NFD", text.lower())
    return "".join(char for char in decomposed if unicodedata.category(char) != "Mn")


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


def sync_source(source):
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


def sync_all_sources():
    """Synchronise toutes les sources ; une source en erreur n'empêche pas les autres."""
    # Les articles ajoutés à la main n'ont pas de flux à lire
    sources = get_db().execute("SELECT * FROM sources WHERE tool_type != 'manual'").fetchall()
    for source in sources:
        try:
            sync_source(source)
        except Exception as e:
            logger.warning(f"✗ Synchronisation automatique de la source {source['id']} échouée: {e}")


def start_scheduler(app, interval_minutes):
    """Lance la synchronisation automatique de toutes les sources en tâche de fond"""
    stop = threading.Event()

    def run():
        while not stop.wait(interval_minutes * 60):
            with app.app_context():
                sync_all_sources()

    threading.Thread(target=run, name="sync-scheduler", daemon=True).start()
    logger.info(f"Synchronisation automatique toutes les {interval_minutes} min")
    return stop
