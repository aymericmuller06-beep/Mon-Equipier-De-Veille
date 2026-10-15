import logging
import threading
from datetime import datetime, timezone

from database import get_db
from rss import fetch_rss_entries

logger = logging.getLogger(__name__)


def sync_source(source):
    """Importe les nouveaux articles d'une source. Lève une exception si le flux est illisible."""
    entries = fetch_rss_entries(source["url"])
    db = get_db()

    now = datetime.now(timezone.utc).isoformat()
    inserted = []
    for entry in entries:
        # L'index unique (source_id, url) ignore les articles déjà importés
        cursor = db.execute("""
            INSERT OR IGNORE INTO articles (title, url, published_at, source_id, created_at)
            SELECT ?, ?, ?, ?, ?
            WHERE NOT EXISTS (SELECT 1 FROM dismissed_articles WHERE source_id = ? AND url = ?)
        """, (entry["title"], entry["url"], entry["published_at"], source["id"], now, source["id"], entry["url"]))
        if cursor.rowcount:
            inserted.append({"id": cursor.lastrowid, **entry})

    db.commit()
    logger.info(f"✓ Synchronisation source {source['id']}: {len(inserted)} nouvel(s) article(s) sur {len(entries)} trouvés dans le flux")
    return {"source_id": source["id"], "fetched": len(entries), "inserted": len(inserted), "articles": inserted}


def sync_all_sources():
    """Synchronise toutes les sources ; une source en erreur n'empêche pas les autres."""
    sources = get_db().execute("SELECT * FROM sources").fetchall()
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
