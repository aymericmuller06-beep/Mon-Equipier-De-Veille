import os
import sqlite3
from flask import g

os.makedirs("/app/data", exist_ok=True)
DATABASE = "/app/data/veille.db"

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
    with app.app_context():
        db = get_db()
        
        db.execute("""
            CREATE TABLE IF NOT EXISTS themes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            )
        """)
        
        db.execute("""
            CREATE TABLE IF NOT EXISTS sources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                url TEXT NOT NULL,
                theme_id INTEGER,
                FOREIGN KEY (theme_id) REFERENCES themes (id) ON DELETE CASCADE
            )
        """)
        
        db.execute("""
            CREATE TABLE IF NOT EXISTS articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                published_at TEXT,
                source_id INTEGER,
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