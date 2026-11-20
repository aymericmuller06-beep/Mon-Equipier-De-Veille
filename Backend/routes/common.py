"""Validations, constantes et fonctions partagées par les routes"""
import json
from datetime import datetime, timezone
from urllib.parse import urlparse

from database import get_db
from maintenance import purge_at


def validate_url(url):
    """Valide qu'une URL est bien formée (http ou https)"""
    try:
        result = urlparse(url)
        # Vérifier qu'elle a un scheme (http/https) ET un domaine
        is_valid = all([result.scheme in ['http', 'https'], result.netloc])
        return is_valid
    except:
        return False

def validate_length(value, min_len=1, max_len=255):
    """Valide que la longueur d'une chaîne est entre min et max"""
    if not isinstance(value, str):
        return False
    return min_len <= len(value) <= max_len

def id_exists(table, id_value):
    """Vérifie qu'une ID existe dans une table"""
    try:
        db = get_db()
        cursor = db.execute(f"SELECT id FROM {table} WHERE id = ?", (id_value,))
        return cursor.fetchone() is not None
    except:
        return False

ACCENT_COLORS = {"red", "orange", "yellow", "green", "blue", "indigo", "violet"}

def validate_accent_color(color):
    """Valide qu'une couleur d'accent fait partie des couleurs autorisées"""
    return color in ACCENT_COLORS

ARTICLE_STATUSES = {"new", "validated", "trash"}

def validate_status(status):
    """Valide qu'un statut d'article fait partie des statuts autorisés"""
    return status in ARTICLE_STATUSES

# Chaque outil ajouté dans la page "Ajouter un outil" doit déclarer son type ici
TOOL_TYPES = {"rss", "google_alerts", "google_news", "youtube", "reddit"}
# Source créée automatiquement par veille pour accueillir les articles ajoutés à la main
MANUAL_TOOL_TYPE = "manual"
MANUAL_SOURCE_NAME = "Ajout manuel"

def validate_tool_type(tool_type):
    """Valide qu'un type d'outil fait partie des types connus"""
    return tool_type in TOOL_TYPES

def read_keywords(data, key):
    """Liste de mots-clés séparés par des virgules ; None si la valeur est invalide"""
    value = data.get(key) or ""
    if not isinstance(value, str) or len(value) > 500:
        return None
    return ", ".join(keyword.strip() for keyword in value.split(",") if keyword.strip())

def now_iso():
    return datetime.now(timezone.utc).isoformat()

ARTICLE_SELECT = """
    SELECT articles.*, sources.name AS source_name, sources.tool_type AS tool_type
    FROM articles JOIN sources ON sources.id = articles.source_id
"""

def attach_tags(db, articles):
    """Ajoute à chaque article la liste de ses tags (une seule requête pour toute la liste)"""
    ids = [article["id"] for article in articles]
    tags_by_article = {article_id: [] for article_id in ids}
    if ids:
        rows = db.execute("""
            SELECT at.article_id, t.id, t.name FROM article_tags at
            JOIN tags t ON t.id = at.tag_id
            WHERE at.article_id IN (SELECT value FROM json_each(?))
            ORDER BY t.name
        """, (json.dumps(ids),)).fetchall()
        for row in rows:
            tags_by_article[row["article_id"]].append({"id": row["id"], "name": row["name"]})
    for article in articles:
        article["tags"] = tags_by_article[article["id"]]
        # Corbeille : date de suppression automatique (None pour les autres statuts)
        article["purge_at"] = purge_at(article)
    return articles

def get_full_article(db, article_id):
    row = db.execute(ARTICLE_SELECT + " WHERE articles.id = ?", (article_id,)).fetchone()
    return attach_tags(db, [dict(row)])[0] if row else None
