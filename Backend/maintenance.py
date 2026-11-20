import logging
import os
import sqlite3
import threading
from datetime import datetime, timedelta, timezone

from database import DATABASE, get_db

logger = logging.getLogger(__name__)

# Nombre de jours avant qu'un article refusé soit supprimé définitivement (0 = jamais)
TRASH_RETENTION_DAYS = int(os.environ.get("TRASH_RETENTION_DAYS", "30"))
# Sauvegarde de la base : fréquence en heures (0 = désactivée) et nombre de copies conservées
BACKUP_INTERVAL_HOURS = int(os.environ.get("BACKUP_INTERVAL_HOURS", "24"))
BACKUP_KEEP = max(1, int(os.environ.get("BACKUP_KEEP", "7")))
BACKUP_DIR = os.environ.get("BACKUP_DIR", os.path.join(os.path.dirname(DATABASE), "backups"))

BACKUP_PREFIX = "veille-"
BACKUP_SUFFIX = ".db"
# La maintenance vérifie toutes les heures s'il y a quelque chose à faire
CHECK_INTERVAL_SECONDS = 3600


def delete_articles_permanently(db, condition, params=()):
    """Supprime les articles correspondant à `condition` (SQL sur la table articles) et note leur URL
    pour que la synchronisation ne les réimporte pas. Ne fait pas le commit. Renvoie le nombre supprimé."""
    db.execute(f"INSERT OR IGNORE INTO dismissed_articles (source_id, url) SELECT source_id, url FROM articles WHERE {condition}", params)
    return db.execute(f"DELETE FROM articles WHERE {condition}", params).rowcount


def purge_at(article):
    """Date (ISO) à laquelle un article de la corbeille sera supprimé automatiquement, ou None"""
    if TRASH_RETENTION_DAYS <= 0 or article.get("status") != "trash" or not article.get("status_changed_at"):
        return None
    try:
        changed_at = datetime.fromisoformat(article["status_changed_at"])
    except ValueError:
        return None
    return (changed_at + timedelta(days=TRASH_RETENTION_DAYS)).isoformat()


def purge_trash():
    """Supprime les articles restés en corbeille plus de TRASH_RETENTION_DAYS jours"""
    if TRASH_RETENTION_DAYS <= 0:
        return 0
    db = get_db()
    deleted = delete_articles_permanently(
        db,
        "status = 'trash' AND julianday(status_changed_at) <= julianday('now', ?)",
        (f"-{TRASH_RETENTION_DAYS} days",),
    )
    db.commit()
    if deleted:
        logger.info(f"✓ Corbeille : {deleted} article(s) supprimé(s) après {TRASH_RETENTION_DAYS} jours")
    return deleted


def list_backups():
    """Sauvegardes existantes, de la plus ancienne à la plus récente (le nom contient la date)"""
    if not os.path.isdir(BACKUP_DIR):
        return []
    names = [n for n in os.listdir(BACKUP_DIR) if n.startswith(BACKUP_PREFIX) and n.endswith(BACKUP_SUFFIX)]
    return [os.path.join(BACKUP_DIR, n) for n in sorted(names)]


def backup_is_due():
    if BACKUP_INTERVAL_HOURS <= 0:
        return False
    backups = list_backups()
    if not backups:
        return True
    age_seconds = datetime.now().timestamp() - os.path.getmtime(backups[-1])
    return age_seconds >= BACKUP_INTERVAL_HOURS * 3600


def backup_database():
    """Copie la base avec l'API de sauvegarde de SQLite (cohérente même pendant des écritures, WAL compris),
    puis ne garde que les BACKUP_KEEP copies les plus récentes. Renvoie le chemin de la copie."""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    path = os.path.join(BACKUP_DIR, f"{BACKUP_PREFIX}{stamp}{BACKUP_SUFFIX}")
    temp_path = path + ".tmp"

    source = sqlite3.connect(DATABASE)
    target = sqlite3.connect(temp_path)
    try:
        source.backup(target)
    finally:
        target.close()
        source.close()
    # Écrite sous un nom temporaire puis renommée : une copie interrompue n'est jamais prise pour une sauvegarde
    os.replace(temp_path, path)

    for old in list_backups()[:-BACKUP_KEEP]:
        os.remove(old)
    logger.info(f"✓ Sauvegarde de la base : {path} ({BACKUP_KEEP} copie(s) conservée(s) au maximum)")
    return path


def run_maintenance():
    """Une passe de maintenance ; une tâche en erreur n'empêche pas l'autre"""
    try:
        purge_trash()
    except Exception as e:
        logger.warning(f"✗ Purge de la corbeille échouée: {e}")
    try:
        if backup_is_due():
            backup_database()
    except Exception as e:
        logger.warning(f"✗ Sauvegarde de la base échouée: {e}")


def start_maintenance(app):
    """Lance la maintenance (purge de la corbeille, sauvegardes) au démarrage puis toutes les heures"""
    stop = threading.Event()

    def run():
        while True:
            with app.app_context():
                run_maintenance()
            if stop.wait(CHECK_INTERVAL_SECONDS):
                break

    threading.Thread(target=run, name="maintenance", daemon=True).start()
    retention = f"{TRASH_RETENTION_DAYS} j" if TRASH_RETENTION_DAYS > 0 else "désactivée"
    backups = f"toutes les {BACKUP_INTERVAL_HOURS} h dans {BACKUP_DIR}" if BACKUP_INTERVAL_HOURS > 0 else "désactivées"
    logger.info(f"Maintenance : purge de la corbeille {retention}, sauvegardes {backups}")
    return stop
