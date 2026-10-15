import os
import logging
import sqlite3
from flask import g

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
    return db

def close_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()

def init_db(app):
    os.makedirs(os.path.dirname(DATABASE), exist_ok=True)
    with app.app_context():
        db = get_db()

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
        
        db.commit()