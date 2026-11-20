import sqlite3

import database
from main import create_app


def columns(db, table):
    return {row[1] for row in db.execute(f"PRAGMA table_info({table})")}


def test_new_database_is_fully_migrated(db):
    assert db.execute("PRAGMA user_version").fetchone()[0] == len(database.MIGRATIONS)
    assert db.execute("PRAGMA journal_mode").fetchone()[0] == "wal"
    assert {"last_sync_at", "last_success_at", "last_error", "error_since"} <= columns(db, "sources")


def test_connections_wait_for_locks(db):
    assert db.execute("PRAGMA busy_timeout").fetchone()[0] == 5000
    assert db.execute("PRAGMA foreign_keys").fetchone()[0] == 1


def test_legacy_database_is_upgraded(tmp_path, monkeypatch):
    """Une base créée avant le suivi des versions (colonnes manquantes) est mise à niveau sans perte"""
    path = str(tmp_path / "ancienne.db")
    legacy = sqlite3.connect(path)
    legacy.executescript("""
        CREATE TABLE themes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE);
        CREATE TABLE sources (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, url TEXT NOT NULL, theme_id INTEGER);
        CREATE TABLE articles (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, url TEXT NOT NULL,
                               source_id INTEGER, status TEXT NOT NULL DEFAULT 'new');
        INSERT INTO themes (name) VALUES ('Ancienne veille');
        INSERT INTO sources (name, url, theme_id) VALUES ('Flux', 'https://exemple.fr/feed', 1);
        INSERT INTO articles (title, url, source_id, status) VALUES ('Gardé', 'https://exemple.fr/1', 1, 'new');
        INSERT INTO articles (title, url, source_id, status) VALUES ('Refusé', 'https://exemple.fr/2', 1, 'trash');
    """)
    legacy.close()
    monkeypatch.setattr(database, "DATABASE", path)

    create_app()

    db = sqlite3.connect(path)
    assert db.execute("PRAGMA user_version").fetchone()[0] == len(database.MIGRATIONS)
    assert {"accent_color", "description"} <= columns(db, "themes")
    assert {"tool_type", "include_keywords", "exclude_keywords", "last_error", "error_since"} <= columns(db, "sources")
    assert {"created_at", "status_changed_at", "status_reason"} <= columns(db, "articles")
    rows = dict(db.execute("SELECT title, status_changed_at FROM articles").fetchall())
    # Migration 2 : l'article en corbeille reçoit une date, pour pouvoir être purgé un jour
    assert rows["Refusé"] is not None
    assert rows["Gardé"] is None
    assert db.execute("SELECT name FROM themes").fetchone()[0] == "Ancienne veille"


def test_migrations_are_not_replayed(tmp_path, monkeypatch):
    path = str(tmp_path / "veille.db")
    monkeypatch.setattr(database, "DATABASE", path)
    create_app()
    db = sqlite3.connect(path)
    db.execute("INSERT INTO themes (name) VALUES ('Veille')")
    db.execute("INSERT INTO sources (name, url, theme_id) VALUES ('Flux', 'https://exemple.fr/feed', 1)")
    db.execute("INSERT INTO articles (title, url, source_id, status) VALUES ('Refusé', 'https://exemple.fr/1', 1, 'trash')")
    db.commit()

    create_app()

    # La migration 2 n'a pas été rejouée : l'article mis à la corbeille sans date le reste
    assert db.execute("SELECT status_changed_at FROM articles").fetchone()[0] is None
