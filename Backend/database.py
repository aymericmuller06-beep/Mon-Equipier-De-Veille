import os
import logging
import sqlite3
from datetime import datetime, timezone
from flask import g
from text import normalize

logger = logging.getLogger(__name__)

# Par défaut : data/veille.db à la racine du projet. Surchargeable via DATABASE_PATH (Docker).
DATABASE = os.environ.get(
    "DATABASE_PATH",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "veille.db"),
)

def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys = ON;")
        # La synchro en tâche de fond et les requêtes écrivent en même temps : on attend le verrou au lieu d'échouer
        db.execute("PRAGMA busy_timeout = 5000;")
        # normalize() en SQL : recherche sans tenir compte des majuscules ni des accents
        db.create_function("normalize", 1, normalize, deterministic=True)
    return db

def close_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()

def migration_1_initial_schema(db):
    """Schéma complet ; rattrape aussi les bases créées avant le suivi des versions (colonnes ajoutées au fil du temps)"""
    db.execute("""
        CREATE TABLE IF NOT EXISTS themes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            accent_color TEXT NOT NULL DEFAULT 'green'
        )
    """)

    # Migration pour les bases créées avant l'ajout de accent_color
    theme_columns = [row["name"] for row in db.execute("PRAGMA table_info(themes)").fetchall()]
    if "accent_color" not in theme_columns:
        db.execute("ALTER TABLE themes ADD COLUMN accent_color TEXT NOT NULL DEFAULT 'green'")
    # Migration pour les bases créées avant l'ajout de description
    if "description" not in theme_columns:
        db.execute("ALTER TABLE themes ADD COLUMN description TEXT")
    
    db.execute("""
        CREATE TABLE IF NOT EXISTS sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            theme_id INTEGER,
            tool_type TEXT NOT NULL DEFAULT 'rss',
            FOREIGN KEY (theme_id) REFERENCES themes (id) ON DELETE CASCADE
        )
    """)

    # Migration pour les bases créées avant l'ajout de tool_type
    source_columns = [row["name"] for row in db.execute("PRAGMA table_info(sources)").fetchall()]
    if "tool_type" not in source_columns:
        db.execute("ALTER TABLE sources ADD COLUMN tool_type TEXT NOT NULL DEFAULT 'rss'")
    # Filtres par mots-clés (séparés par des virgules) appliqués à la synchronisation
    if "include_keywords" not in source_columns:
        db.execute("ALTER TABLE sources ADD COLUMN include_keywords TEXT NOT NULL DEFAULT ''")
    if "exclude_keywords" not in source_columns:
        db.execute("ALTER TABLE sources ADD COLUMN exclude_keywords TEXT NOT NULL DEFAULT ''")
    
    db.execute("""
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            published_at TEXT,
            source_id INTEGER,
            status TEXT NOT NULL DEFAULT 'new',
            status_reason TEXT,
            created_at TEXT,
            status_changed_at TEXT,
            FOREIGN KEY (source_id) REFERENCES sources (id) ON DELETE CASCADE
        )
    """)

    # Migration pour les bases créées avant l'ajout du statut des articles
    article_columns = [row["name"] for row in db.execute("PRAGMA table_info(articles)").fetchall()]
    if "source_id" not in article_columns:
        db.execute("ALTER TABLE articles ADD COLUMN source_id INTEGER REFERENCES sources (id) ON DELETE CASCADE")
    if "published_at" not in article_columns:
        db.execute("ALTER TABLE articles ADD COLUMN published_at TEXT")
    if "status" not in article_columns:
        db.execute("ALTER TABLE articles ADD COLUMN status TEXT NOT NULL DEFAULT 'new'")
    if "status_reason" not in article_columns:
        db.execute("ALTER TABLE articles ADD COLUMN status_reason TEXT")
    # Date de collecte (graphiques du dashboard) et date de la dernière décision
    if "created_at" not in article_columns:
        db.execute("ALTER TABLE articles ADD COLUMN created_at TEXT")
        db.execute("UPDATE articles SET created_at = COALESCE(published_at, CURRENT_TIMESTAMP)")
    if "status_changed_at" not in article_columns:
        db.execute("ALTER TABLE articles ADD COLUMN status_changed_at TEXT")

    # Un même article n'est importé qu'une fois par source
    try:
        db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_source_url ON articles (source_id, url)")
    except sqlite3.IntegrityError:
        logger.warning("Doublons d'articles existants : index d'unicité (source_id, url) non créé")
    db.execute("CREATE INDEX IF NOT EXISTS idx_articles_status ON articles (status)")

    # Articles supprimés définitivement : la synchronisation ne doit pas les réimporter
    db.execute("""
        CREATE TABLE IF NOT EXISTS dismissed_articles (
            source_id INTEGER NOT NULL,
            url TEXT NOT NULL,
            PRIMARY KEY (source_id, url),
            FOREIGN KEY (source_id) REFERENCES sources (id) ON DELETE CASCADE
        )
    """)

    db.execute("""
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )
    """)
    
    db.execute("""
        CREATE TABLE IF NOT EXISTS article_tags (
            article_id INTEGER,
            tag_id INTEGER,
            PRIMARY KEY (article_id, tag_id),
            FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
        )
    """)


def migration_2_trash_dates(db):
    """Les articles mis à la corbeille avant le suivi des dates de décision partent du jour de la migration,
    sinon la purge automatique ne les supprimerait jamais"""
    db.execute("""
        UPDATE articles SET status_changed_at = ?
        WHERE status = 'trash' AND status_changed_at IS NULL
    """, (datetime.now(timezone.utc).isoformat(),))


# Ajouter une migration = ajouter une fonction à la fin de cette liste, sans jamais modifier ni réordonner les précédentes.
# Le numéro de version de la base (PRAGMA user_version) indique les migrations déjà appliquées.
MIGRATIONS = [
    migration_1_initial_schema,
    migration_2_trash_dates,
]


def init_db(app):
    os.makedirs(os.path.dirname(DATABASE), exist_ok=True)
    with app.app_context():
        db = get_db()
        # WAL : les lectures ne sont plus bloquées par une écriture en cours (réglage conservé dans le fichier)
        db.execute("PRAGMA journal_mode = WAL;")

        version = db.execute("PRAGMA user_version").fetchone()[0]
        for number, migration in enumerate(MIGRATIONS, start=1):
            if version < number:
                migration(db)
                db.execute(f"PRAGMA user_version = {number}")
                db.commit()
                logger.info(f"✓ Migration {number} appliquée ({migration.__name__})")
