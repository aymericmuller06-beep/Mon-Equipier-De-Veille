import json
import sqlite3
import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse
from flask import Blueprint, jsonify, request
from database import get_db
from sync import sync_source as run_source_sync

logger = logging.getLogger(__name__)
api = Blueprint("api", __name__)

# ==================== FONCTIONS DE VALIDATION ====================

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
TOOL_TYPES = {"rss", "google_alerts"}

def validate_tool_type(tool_type):
    """Valide qu'un type d'outil fait partie des types connus"""
    return tool_type in TOOL_TYPES

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
    return articles

def get_full_article(db, article_id):
    row = db.execute(ARTICLE_SELECT + " WHERE articles.id = ?", (article_id,)).fetchone()
    return attach_tags(db, [dict(row)])[0] if row else None


@api.route("/")
def read_root():
    return jsonify({
        "status": "online",
        "message": "Le serveur de veille Flask et SQLite sont opérationnels"
    })

# ==================== THEMES ====================
@api.route("/themes", methods=["GET"])
def get_themes():
    db = get_db()
    cursor = db.execute("SELECT * FROM themes")
    return jsonify([dict(row) for row in cursor.fetchall()])

@api.route("/themes", methods=["POST"])
def add_theme():
    data = request.get_json()
    if not data or "name" not in data:
        logger.warning("Tentative de créer un thème sans le champ 'name'")
        return jsonify({"error": "Le champ 'name' est requis"}), 400
    if not validate_length(data["name"], min_len=1, max_len=100):
        logger.warning(f"Nom de thème invalide (longueur): '{data['name']}'")
        return jsonify({"error": "Le nom doit avoir entre 1 et 100 caractères"}), 400
    description = data.get("description") or ""
    if not validate_length(description, min_len=0, max_len=500):
        logger.warning("Description de thème invalide (longueur)")
        return jsonify({"error": "La description doit faire au maximum 500 caractères"}), 400
    accent_color = data.get("accent_color", "green")
    if not validate_accent_color(accent_color):
        logger.warning(f"Couleur d'accent invalide rejetée: '{accent_color}'")
        return jsonify({"error": "Couleur d'accent invalide"}), 400
    db = get_db()
    try:
        cursor = db.execute(
            "INSERT INTO themes (name, accent_color, description) VALUES (?, ?, ?)",
            (data["name"], accent_color, description)
        )
        db.commit()
        logger.info(f"✓ Thème créé: '{data['name']}' (ID: {cursor.lastrowid})")
        return jsonify({"id": cursor.lastrowid, "name": data["name"], "accent_color": accent_color, "description": description}), 201
    except sqlite3.IntegrityError as e:
        logger.warning(f"✗ Thème dupliqué: '{data['name']}' - {str(e)}")
        return jsonify({"error": "Ce thème existe déjà"}), 409

@api.route("/themes/<int:theme_id>", methods=["PUT"])
def update_theme(theme_id):
    data = request.get_json()
    if not data or not any(k in data for k in ("name", "accent_color", "description")):
        logger.warning(f"Tentative de modifier le thème {theme_id} sans champ modifiable")
        return jsonify({"error": "Le champ 'name', 'accent_color' ou 'description' est requis"}), 400

    db = get_db()
    theme = db.execute("SELECT * FROM themes WHERE id = ?", (theme_id,)).fetchone()
    if theme is None:
        logger.warning(f"✗ Thème {theme_id} non trouvé pour modification")
        return jsonify({"error": "Thème non trouvé"}), 404

    if "name" in data and not validate_length(data["name"], min_len=1, max_len=100):
        logger.warning(f"Nom de thème invalide (longueur) lors de modification: '{data['name']}'")
        return jsonify({"error": "Le nom doit avoir entre 1 et 100 caractères"}), 400
    if "accent_color" in data and not validate_accent_color(data["accent_color"]):
        logger.warning(f"Couleur d'accent invalide rejetée lors de modification: '{data['accent_color']}'")
        return jsonify({"error": "Couleur d'accent invalide"}), 400
    if "description" in data and not validate_length(data["description"] or "", min_len=0, max_len=500):
        logger.warning(f"Description de thème invalide (longueur) lors de modification")
        return jsonify({"error": "La description doit faire au maximum 500 caractères"}), 400

    name = data.get("name", theme["name"])
    accent_color = data.get("accent_color", theme["accent_color"])
    description = data.get("description", theme["description"])
    try:
        db.execute("UPDATE themes SET name = ?, accent_color = ?, description = ? WHERE id = ?", (name, accent_color, description, theme_id))
        db.commit()
        logger.info(f"✓ Thème {theme_id} modifié: '{name}' / {accent_color} / '{description}'")
        return jsonify({"id": theme_id, "name": name, "accent_color": accent_color, "description": description}), 200
    except sqlite3.IntegrityError as e:
        logger.warning(f"✗ Thème {theme_id} dupliqué lors de la modification - {str(e)}")
        return jsonify({"error": "Ce nom de thème existe déjà"}), 409

@api.route("/themes/<int:theme_id>", methods=["DELETE"])
def delete_theme(theme_id):
    db = get_db()
    # Suppression explicite des données liées (anciennes bases sans ON DELETE CASCADE)
    db.execute("DELETE FROM articles WHERE source_id IN (SELECT id FROM sources WHERE theme_id = ?)", (theme_id,))
    db.execute("DELETE FROM sources WHERE theme_id = ?", (theme_id,))
    cursor = db.execute("DELETE FROM themes WHERE id = ?", (theme_id,))
    db.commit()
    if cursor.rowcount == 0:
        logger.warning(f"✗ Thème {theme_id} non trouvé pour suppression")
        return jsonify({"error": "Thème non trouvé"}), 404
    logger.info(f"✓ Thème {theme_id} supprimé")
    return jsonify({"message": f"Thème {theme_id} supprimé avec succès"}), 200

# ==================== SOURCES ====================
@api.route("/sources", methods=["GET"])
def get_sources():
    db = get_db()
    theme_id = request.args.get("theme_id")
    tool_type = request.args.get("tool_type")

    query = "SELECT * FROM sources"
    conditions = []
    params = []
    if theme_id:
        conditions.append("theme_id = ?")
        params.append(theme_id)
    if tool_type:
        conditions.append("tool_type = ?")
        params.append(tool_type)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    cursor = db.execute(query, params)
    return jsonify([dict(row) for row in cursor.fetchall()])

@api.route("/sources/<int:source_id>", methods=["GET"])
def get_source(source_id):
    db = get_db()
    source = db.execute("SELECT * FROM sources WHERE id = ?", (source_id,)).fetchone()
    if source is None:
        return jsonify({"error": "Source non trouvée"}), 404
    return jsonify(dict(source))

@api.route("/sources", methods=["POST"])
def add_source():
    data = request.get_json()
    if not data or not all(k in data for k in ("name", "url", "theme_id")):
        logger.warning("Tentative de créer une source avec champs manquants")
        return jsonify({"error": "Les champs 'name', 'url' et 'theme_id' sont requis"}), 400
    if not validate_length(data["name"], min_len=1, max_len=150):
        logger.warning(f"Nom de source invalide (longueur): '{data['name']}'")
        return jsonify({"error": "Le nom doit avoir entre 1 et 150 caractères"}), 400
    if not validate_url(data["url"]):
        logger.warning(f"URL invalide rejetée: '{data['url']}'")
        return jsonify({"error": "URL invalide. Format attendu: https://example.com"}), 400
    if not id_exists("themes", data["theme_id"]):
        logger.warning(f"Tentative créer source avec theme_id inexistant: {data['theme_id']}")
        return jsonify({"error": "Thème inexistant"}), 404
    tool_type = data.get("tool_type", "rss")
    if not validate_tool_type(tool_type):
        logger.warning(f"Type d'outil invalide rejeté: '{tool_type}'")
        return jsonify({"error": "Type d'outil invalide"}), 400
    db = get_db()
    try:
        cursor = db.execute(
            "INSERT INTO sources (name, url, theme_id, tool_type) VALUES (?, ?, ?, ?)",
            (data["name"], data["url"], data["theme_id"], tool_type)
        )
        db.commit()
        logger.info(f"✓ Source créée: '{data['name']}' (ID: {cursor.lastrowid}, theme_id: {data['theme_id']}, tool_type: {tool_type})")
        return jsonify({
            "id": cursor.lastrowid,
            "name": data["name"],
            "url": data["url"],
            "theme_id": data["theme_id"],
            "tool_type": tool_type
        }), 201
    except sqlite3.IntegrityError as e:
        logger.warning(f"✗ Erreur création source '{data['name']}': {str(e)}")
        return jsonify({"error": "Source en doublon"}), 400

@api.route("/sources/<int:source_id>", methods=["PUT"])
def update_source(source_id):
    data = request.get_json()
    if not data or not all(k in data for k in ("name", "url", "theme_id")):
        logger.warning(f"Tentative de modifier la source {source_id} avec champs manquants")
        return jsonify({"error": "Les champs 'name', 'url' et 'theme_id' sont requis"}), 400
    if not validate_length(data["name"], min_len=1, max_len=150):
        logger.warning(f"Nom de source invalide (longueur) lors de modification: '{data['name']}'")
        return jsonify({"error": "Le nom doit avoir entre 1 et 150 caractères"}), 400
    if not validate_url(data["url"]):
        logger.warning(f"URL invalide rejetée lors de modification: '{data['url']}'")
        return jsonify({"error": "URL invalide. Format attendu: https://example.com"}), 400
    if not id_exists("themes", data["theme_id"]):
        logger.warning(f"Tentative modifier source {source_id} avec theme_id inexistant: {data['theme_id']}")
        return jsonify({"error": "Thème inexistant"}), 404
    db = get_db()
    existing_source = db.execute("SELECT tool_type FROM sources WHERE id = ?", (source_id,)).fetchone()
    tool_type = data.get("tool_type", existing_source["tool_type"] if existing_source else "rss")
    if not validate_tool_type(tool_type):
        logger.warning(f"Type d'outil invalide rejeté lors de modification: '{tool_type}'")
        return jsonify({"error": "Type d'outil invalide"}), 400
    try:
        cursor = db.execute(
            "UPDATE sources SET name = ?, url = ?, theme_id = ?, tool_type = ? WHERE id = ?",
            (data["name"], data["url"], data["theme_id"], tool_type, source_id)
        )
        db.commit()
        if cursor.rowcount == 0:
            logger.warning(f"✗ Source {source_id} non trouvée pour modification")
            return jsonify({"error": "Source non trouvée"}), 404
        logger.info(f"✓ Source {source_id} modifiée: '{data['name']}'")
        return jsonify({"id": source_id, "name": data["name"], "url": data["url"], "theme_id": data["theme_id"], "tool_type": tool_type}), 200
    except sqlite3.IntegrityError as e:
        logger.warning(f"✗ Erreur modification source {source_id}: {str(e)}")
        return jsonify({"error": "Source en doublon"}), 400

@api.route("/sources/<int:source_id>/sync", methods=["POST"])
def sync_source(source_id):
    db = get_db()
    source = db.execute("SELECT * FROM sources WHERE id = ?", (source_id,)).fetchone()
    if source is None:
        logger.warning(f"✗ Source {source_id} non trouvée pour synchronisation")
        return jsonify({"error": "Source non trouvée"}), 404

    try:
        result = run_source_sync(source)
    except Exception as e:
        logger.warning(f"✗ Erreur de lecture du flux RSS pour la source {source_id}: {str(e)}")
        return jsonify({"error": "Impossible de lire ce flux RSS. Vérifiez l'URL."}), 502
    return jsonify(result), 200

@api.route("/sources/<int:source_id>", methods=["DELETE"])
def delete_source(source_id):
    db = get_db()
    db.execute("DELETE FROM articles WHERE source_id = ?", (source_id,))
    cursor = db.execute("DELETE FROM sources WHERE id = ?", (source_id,))
    db.commit()
    if cursor.rowcount == 0:
        logger.warning(f"✗ Source {source_id} non trouvée pour suppression")
        return jsonify({"error": "Source non trouvée"}), 404
    logger.info(f"✓ Source {source_id} supprimée")
    return jsonify({"message": f"Source {source_id} supprimée avec succès"}), 200

# ==================== ARTICLES ====================
@api.route("/articles", methods=["GET"])
def get_articles():
    db = get_db()
    filters = {
        "articles.source_id": request.args.get("source_id"),
        "sources.theme_id": request.args.get("theme_id"),
        "sources.tool_type": request.args.get("tool_type"),
        "articles.status": request.args.get("status"),
    }
    conditions = [f"{column} = ?" for column, value in filters.items() if value]
    params = [value for value in filters.values() if value]

    query = ARTICLE_SELECT
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    # sort=decision : derniers articles triés (validés / refusés) en premier
    if request.args.get("sort") == "decision":
        query += " ORDER BY articles.status_changed_at DESC, articles.id DESC"
    else:
        query += " ORDER BY COALESCE(articles.published_at, articles.created_at) DESC, articles.id DESC"
    limit = request.args.get("limit", type=int)
    if limit:
        query += " LIMIT ?"
        params.append(limit)

    articles = [dict(row) for row in db.execute(query, params).fetchall()]
    return jsonify(attach_tags(db, articles))

@api.route("/articles/<int:article_id>", methods=["PATCH"])
def patch_article(article_id):
    """Modifie le statut et/ou la note d'un article ; renvoie l'article complet"""
    data = request.get_json()
    if not data or not any(k in data for k in ("status", "status_reason")):
        return jsonify({"error": "Le champ 'status' ou 'status_reason' est requis"}), 400
    if "status" in data and not validate_status(data["status"]):
        logger.warning(f"Statut invalide rejeté pour l'article {article_id}: '{data['status']}'")
        return jsonify({"error": "Statut invalide"}), 400
    if "status_reason" in data and not validate_length(data["status_reason"] or "", min_len=0, max_len=2000):
        return jsonify({"error": "La note doit faire au maximum 2000 caractères"}), 400

    db = get_db()
    article = db.execute("SELECT status, status_reason, status_changed_at FROM articles WHERE id = ?", (article_id,)).fetchone()
    if article is None:
        return jsonify({"error": "Article non trouvé"}), 404

    status = data.get("status", article["status"])
    reason = data.get("status_reason", article["status_reason"]) or ""
    changed_at = now_iso() if status != article["status"] else article["status_changed_at"]
    db.execute(
        "UPDATE articles SET status = ?, status_reason = ?, status_changed_at = ? WHERE id = ?",
        (status, reason, changed_at, article_id)
    )
    db.commit()
    logger.info(f"✓ Article {article_id} mis à jour (statut: '{status}')")
    return jsonify(get_full_article(db, article_id)), 200

@api.route("/articles/trash", methods=["DELETE"])
def empty_trash():
    """Supprime définitivement les articles en corbeille d'une veille"""
    theme_id = request.args.get("theme_id", type=int)
    if not theme_id:
        return jsonify({"error": "Le paramètre 'theme_id' est requis"}), 400
    db = get_db()
    in_trash = "status = 'trash' AND source_id IN (SELECT id FROM sources WHERE theme_id = ?)"
    db.execute(f"INSERT OR IGNORE INTO dismissed_articles (source_id, url) SELECT source_id, url FROM articles WHERE {in_trash}", (theme_id,))
    cursor = db.execute(f"DELETE FROM articles WHERE {in_trash}", (theme_id,))
    db.commit()
    logger.info(f"✓ Corbeille de la veille {theme_id} vidée ({cursor.rowcount} article(s))")
    return jsonify({"deleted": cursor.rowcount}), 200

@api.route("/articles/<int:article_id>/status", methods=["PATCH"])
def update_article_status(article_id):
    data = request.get_json()
    if not data or "status" not in data:
        logger.warning(f"Tentative de modifier le statut de l'article {article_id} sans 'status'")
        return jsonify({"error": "Le champ 'status' est requis"}), 400
    if not validate_status(data["status"]):
        logger.warning(f"Statut invalide rejeté pour l'article {article_id}: '{data['status']}'")
        return jsonify({"error": "Statut invalide"}), 400
    reason = data.get("reason") or ""
    if not validate_length(reason, min_len=0, max_len=500):
        logger.warning(f"Raison de statut invalide (longueur) pour l'article {article_id}")
        return jsonify({"error": "La raison doit faire au maximum 500 caractères"}), 400
    db = get_db()
    cursor = db.execute(
        "UPDATE articles SET status = ?, status_reason = ?, status_changed_at = ? WHERE id = ?",
        (data["status"], reason, now_iso(), article_id)
    )
    db.commit()
    if cursor.rowcount == 0:
        logger.warning(f"✗ Article {article_id} non trouvé pour changement de statut")
        return jsonify({"error": "Article non trouvé"}), 404
    logger.info(f"✓ Article {article_id} statut -> '{data['status']}'")
    return jsonify({"id": article_id, "status": data["status"], "status_reason": reason}), 200

@api.route("/articles", methods=["POST"])
def add_article():
    data = request.get_json()
    if not data or not all(k in data for k in ("title", "url", "source_id")):
        logger.warning("Tentative de créer un article avec champs manquants")
        return jsonify({"error": "Les champs 'title', 'url' et 'source_id' sont requis"}), 400
    if not validate_length(data["title"], min_len=1, max_len=300):
        logger.warning(f"Titre d'article invalide (longueur): '{data['title']}'")
        return jsonify({"error": "Le titre doit avoir entre 1 et 300 caractères"}), 400
    if not validate_url(data["url"]):
        logger.warning(f"URL article invalide rejetée: '{data['url']}'")
        return jsonify({"error": "URL invalide. Format attendu: https://example.com"}), 400
    if not id_exists("sources", data["source_id"]):
        logger.warning(f"Tentative créer article avec source_id inexistant: {data['source_id']}")
        return jsonify({"error": "Source inexistante"}), 404
    db = get_db()
    try:
        cursor = db.execute(
            "INSERT INTO articles (title, url, published_at, source_id, created_at) VALUES (?, ?, ?, ?, ?)",
            (data["title"], data["url"], data.get("published_at"), data["source_id"], now_iso())
        )
        db.commit()
        logger.info(f"✓ Article créé: '{data['title']}' (ID: {cursor.lastrowid}, source_id: {data['source_id']})")
        return jsonify({
            "id": cursor.lastrowid,
            "title": data["title"],
            "url": data["url"],
            "published_at": data.get("published_at"),
            "source_id": data["source_id"]
        }), 201
    except sqlite3.IntegrityError as e:
        logger.warning(f"✗ Erreur création article: {str(e)}")
        return jsonify({"error": "Article en doublon"}), 400

@api.route("/articles/<int:article_id>", methods=["PUT"])
def update_article(article_id):
    data = request.get_json()
    if not data or not all(k in data for k in ("title", "url", "source_id")):
        logger.warning(f"Tentative de modifier l'article {article_id} avec champs manquants")
        return jsonify({"error": "Les champs 'title', 'url' et 'source_id' sont requis"}), 400
    if not validate_length(data["title"], min_len=1, max_len=300):
        logger.warning(f"Titre d'article invalide (longueur) lors de modification: '{data['title']}'")
        return jsonify({"error": "Le titre doit avoir entre 1 et 300 caractères"}), 400
    if not validate_url(data["url"]):
        logger.warning(f"URL article invalide rejetée lors de modification: '{data['url']}'")
        return jsonify({"error": "URL invalide. Format attendu: https://example.com"}), 400
    if not id_exists("sources", data["source_id"]):
        logger.warning(f"Tentative modifier article {article_id} avec source_id inexistant: {data['source_id']}")
        return jsonify({"error": "Source inexistante"}), 404
    db = get_db()
    try:
        cursor = db.execute(
            "UPDATE articles SET title = ?, url = ?, published_at = ?, source_id = ? WHERE id = ?",
            (data["title"], data["url"], data.get("published_at"), data["source_id"], article_id)
        )
        db.commit()
        if cursor.rowcount == 0:
            logger.warning(f"✗ Article {article_id} non trouvé pour modification")
            return jsonify({"error": "Article non trouvé"}), 404
        logger.info(f"✓ Article {article_id} modifié: '{data['title']}'")
        return jsonify({"id": article_id, "title": data["title"], "url": data["url"], "published_at": data.get("published_at"), "source_id": data["source_id"]}), 200
    except sqlite3.IntegrityError as e:
        logger.warning(f"✗ Erreur modification article {article_id}: {str(e)}")
        return jsonify({"error": "Article en doublon"}), 400

@api.route("/articles/<int:article_id>", methods=["DELETE"])
def delete_article(article_id):
    db = get_db()
    cursor = db.execute("DELETE FROM articles WHERE id = ?", (article_id,))
    db.commit()
    if cursor.rowcount == 0:
        logger.warning(f"✗ Article {article_id} non trouvé pour suppression")
        return jsonify({"error": "Article non trouvé"}), 404
    logger.info(f"✓ Article {article_id} supprimé")
    return jsonify({"message": f"Article {article_id} supprimé avec succès"}), 200

# --- Tags associés aux articles ---
@api.route("/articles/<int:article_id>/tags", methods=["GET"])
def get_article_tags(article_id):
    db = get_db()
    cursor = db.execute("""
        SELECT t.* FROM tags t
        JOIN article_tags at ON t.id = at.tag_id
        WHERE at.article_id = ?
    """, (article_id,))
    return jsonify([dict(row) for row in cursor.fetchall()])

@api.route("/articles/<int:article_id>/tags", methods=["POST"])
def add_tag_to_article(article_id):
    data = request.get_json()
    if not data or "tag_id" not in data:
        logger.warning(f"Tentative d'ajouter un tag à l'article {article_id} sans tag_id")
        return jsonify({"error": "Le champ 'tag_id' est requis"}), 400
    
    tag_id = data["tag_id"]
    if not id_exists("articles", article_id):
        logger.warning(f"Tentative ajouter tag à article inexistant: {article_id}")
        return jsonify({"error": "Article inexistant"}), 404
    if not id_exists("tags", tag_id):
        logger.warning(f"Tentative ajouter tag inexistant {tag_id} à article {article_id}")
        return jsonify({"error": "Tag inexistant"}), 404
    
    db = get_db()
    try:
        db.execute("INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)", (article_id, tag_id))
        db.commit()
        logger.info(f"✓ Tag {tag_id} associé à l'article {article_id}")
        return jsonify({"message": f"Tag {tag_id} associé à l'article {article_id}"}), 201
    except sqlite3.IntegrityError as e:
        logger.warning(f"✗ Erreur association article {article_id} et tag {tag_id}: {str(e)}")
        return jsonify({"error": "Association déjà existante"}), 409

@api.route("/articles/<int:article_id>/tags/<int:tag_id>", methods=["DELETE"])
def remove_tag_from_article(article_id, tag_id):
    db = get_db()
    cursor = db.execute("DELETE FROM article_tags WHERE article_id = ? AND tag_id = ?", (article_id, tag_id))
    db.commit()
    if cursor.rowcount == 0:
        logger.warning(f"✗ Association introuvable: article {article_id}, tag {tag_id}")
        return jsonify({"error": "Association introuvable"}), 404
    logger.info(f"✓ Tag {tag_id} retiré de l'article {article_id}")
    return jsonify({"message": f"Tag {tag_id} retiré de l'article {article_id}"}), 200

# ==================== TAGS ====================
@api.route("/tags", methods=["GET"])
def get_tags():
    db = get_db()
    cursor = db.execute("SELECT * FROM tags")
    return jsonify([dict(row) for row in cursor.fetchall()])

@api.route("/tags", methods=["POST"])
def add_tag():
    data = request.get_json()
    if not data or "name" not in data:
        logger.warning("Tentative de créer un tag sans le champ 'name'")
        return jsonify({"error": "Le champ 'name' est requis"}), 400
    if not validate_length(data["name"], min_len=1, max_len=50):
        logger.warning(f"Nom de tag invalide (longueur): '{data['name']}'")
        return jsonify({"error": "Le nom doit avoir entre 1 et 50 caractères"}), 400
    db = get_db()
    try:
        cursor = db.execute("INSERT INTO tags (name) VALUES (?)", (data["name"],))
        db.commit()
        logger.info(f"✓ Tag créé: '{data['name']}' (ID: {cursor.lastrowid})")
        return jsonify({"id": cursor.lastrowid, "name": data["name"]}), 201
    except sqlite3.IntegrityError as e:
        logger.warning(f"✗ Tag dupliqué: '{data['name']}' - {str(e)}")
        return jsonify({"error": "Ce tag existe déjà"}), 409

@api.route("/tags/<int:tag_id>", methods=["PUT"])
def update_tag(tag_id):
    data = request.get_json()
    if not data or "name" not in data:
        logger.warning(f"Tentative de modifier le tag {tag_id} sans le champ 'name'")
        return jsonify({"error": "Le champ 'name' est requis"}), 400
    if not validate_length(data["name"], min_len=1, max_len=50):
        logger.warning(f"Nom de tag invalide (longueur) lors de modification: '{data['name']}'")
        return jsonify({"error": "Le nom doit avoir entre 1 et 50 caractères"}), 400
    db = get_db()
    try:
        cursor = db.execute("UPDATE tags SET name = ? WHERE id = ?", (data["name"], tag_id))
        db.commit()
        if cursor.rowcount == 0:
            logger.warning(f"✗ Tag {tag_id} non trouvé pour modification")
            return jsonify({"error": "Tag non trouvé"}), 404
        logger.info(f"✓ Tag {tag_id} modifié: '{data['name']}'")
        return jsonify({"id": tag_id, "name": data["name"]}), 200
    except sqlite3.IntegrityError as e:
        logger.warning(f"✗ Tag {tag_id} dupliqué lors de la modification - {str(e)}")
        return jsonify({"error": "Ce nom de tag existe déjà"}), 409

@api.route("/tags/<int:tag_id>", methods=["DELETE"])
def delete_tag(tag_id):
    db = get_db()
    cursor = db.execute("DELETE FROM tags WHERE id = ?", (tag_id,))
    db.commit()
    if cursor.rowcount == 0:
        logger.warning(f"✗ Tag {tag_id} non trouvé pour suppression")
        return jsonify({"error": "Tag non trouvé"}), 404
    logger.info(f"✓ Tag {tag_id} supprimé")
    return jsonify({"message": f"Tag {tag_id} supprimé avec succès"}), 200

# ==================== STATISTIQUES ====================
@api.route("/stats", methods=["GET"])
def get_stats():
    """Chiffres du dashboard d'une veille"""
    theme_id = request.args.get("theme_id", type=int)
    if not theme_id:
        return jsonify({"error": "Le paramètre 'theme_id' est requis"}), 400
    days = min(request.args.get("days", default=14, type=int), 90)
    db = get_db()
    in_theme = "articles.source_id IN (SELECT id FROM sources WHERE theme_id = ?)"

    by_status = {"new": 0, "validated": 0, "trash": 0}
    for row in db.execute(f"SELECT status, COUNT(*) AS n FROM articles WHERE {in_theme} GROUP BY status", (theme_id,)):
        by_status[row["status"]] = row["n"]

    # Articles collectés par jour, jours sans article inclus
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=days - 1)
    counts = {row["day"]: row["n"] for row in db.execute(f"""
        SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n FROM articles
        WHERE {in_theme} AND substr(created_at, 1, 10) >= ? GROUP BY day
    """, (theme_id, start.isoformat()))}
    by_day = [
        {"date": (start + timedelta(days=i)).isoformat(), "count": counts.get((start + timedelta(days=i)).isoformat(), 0)}
        for i in range(days)
    ]

    by_source = [dict(row) for row in db.execute("""
        SELECT sources.id, sources.name,
            SUM(articles.status = 'new') AS new,
            SUM(articles.status = 'validated') AS validated,
            SUM(articles.status = 'trash') AS trash
        FROM sources LEFT JOIN articles ON articles.source_id = sources.id
        WHERE sources.theme_id = ?
        GROUP BY sources.id ORDER BY COUNT(articles.id) DESC
    """, (theme_id,))]
    for source in by_source:
        for key in ("new", "validated", "trash"):
            source[key] = source[key] or 0

    top_tags = [dict(row) for row in db.execute(f"""
        SELECT tags.id, tags.name, COUNT(*) AS count FROM article_tags
        JOIN tags ON tags.id = article_tags.tag_id
        JOIN articles ON articles.id = article_tags.article_id
        WHERE {in_theme} GROUP BY tags.id ORDER BY count DESC, tags.name LIMIT 8
    """, (theme_id,))]

    week_ago = (today - timedelta(days=6)).isoformat()
    collected_7d = db.execute(
        f"SELECT COUNT(*) FROM articles WHERE {in_theme} AND substr(created_at, 1, 10) >= ?", (theme_id, week_ago)
    ).fetchone()[0]
    processed_7d = db.execute(
        f"SELECT COUNT(*) FROM articles WHERE {in_theme} AND status != 'new' AND substr(status_changed_at, 1, 10) >= ?", (theme_id, week_ago)
    ).fetchone()[0]

    return jsonify({
        "by_status": by_status,
        "by_day": by_day,
        "by_source": by_source,
        "top_tags": top_tags,
        "collected_7d": collected_7d,
        "processed_7d": processed_7d,
    })

# ==================== SYSTEME ====================
@api.route("/system/reset", methods=["POST"])
def reset_database():
    """Vide toutes les tables de la base locale (reset complet, irréversible)."""
    # Le corps JSON obligatoire force une requête "preflight" CORS : un site tiers ne peut pas déclencher le reset
    data = request.get_json(silent=True)
    if not data or data.get("confirm") != "RESET":
        logger.warning("Tentative de réinitialisation sans confirmation")
        return jsonify({"error": "Confirmation requise"}), 400
    db = get_db()
    # Les tables filles (FK ON DELETE CASCADE) sont vidées automatiquement via "themes",
    # mais on nettoie explicitement chaque table pour ne rien laisser derrière.
    db.execute("DELETE FROM article_tags")
    db.execute("DELETE FROM dismissed_articles")
    db.execute("DELETE FROM articles")
    db.execute("DELETE FROM sources")
    db.execute("DELETE FROM tags")
    db.execute("DELETE FROM themes")
    db.execute("DELETE FROM sqlite_sequence")
    db.commit()
    logger.warning("⚠ Base de données réinitialisée : toutes les tables ont été vidées")
    return jsonify({"message": "Base de données réinitialisée"}), 200