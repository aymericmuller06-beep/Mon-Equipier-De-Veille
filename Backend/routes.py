import sqlite3
import logging
from urllib.parse import urlparse
from flask import Blueprint, jsonify, request
from database import get_db

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
    accent_color = data.get("accent_color", "green")
    if not validate_accent_color(accent_color):
        logger.warning(f"Couleur d'accent invalide rejetée: '{accent_color}'")
        return jsonify({"error": "Couleur d'accent invalide"}), 400
    db = get_db()
    try:
        cursor = db.execute("INSERT INTO themes (name, accent_color) VALUES (?, ?)", (data["name"], accent_color))
        db.commit()
        logger.info(f"✓ Thème créé: '{data['name']}' (ID: {cursor.lastrowid})")
        return jsonify({"id": cursor.lastrowid, "name": data["name"], "accent_color": accent_color}), 201
    except sqlite3.IntegrityError as e:
        logger.warning(f"✗ Thème dupliqué: '{data['name']}' - {str(e)}")
        return jsonify({"error": "Ce thème existe déjà"}), 409

@api.route("/themes/<int:theme_id>", methods=["PUT"])
def update_theme(theme_id):
    data = request.get_json()
    if not data or not any(k in data for k in ("name", "accent_color")):
        logger.warning(f"Tentative de modifier le thème {theme_id} sans 'name' ni 'accent_color'")
        return jsonify({"error": "Le champ 'name' ou 'accent_color' est requis"}), 400

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

    name = data.get("name", theme["name"])
    accent_color = data.get("accent_color", theme["accent_color"])
    try:
        db.execute("UPDATE themes SET name = ?, accent_color = ? WHERE id = ?", (name, accent_color, theme_id))
        db.commit()
        logger.info(f"✓ Thème {theme_id} modifié: '{name}' / {accent_color}")
        return jsonify({"id": theme_id, "name": name, "accent_color": accent_color}), 200
    except sqlite3.IntegrityError as e:
        logger.warning(f"✗ Thème {theme_id} dupliqué lors de la modification - {str(e)}")
        return jsonify({"error": "Ce nom de thème existe déjà"}), 409

@api.route("/themes/<int:theme_id>", methods=["DELETE"])
def delete_theme(theme_id):
    db = get_db()
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
    cursor = db.execute("SELECT * FROM sources")
    return jsonify([dict(row) for row in cursor.fetchall()])

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
    db = get_db()
    try:
        cursor = db.execute(
            "INSERT INTO sources (name, url, theme_id) VALUES (?, ?, ?)",
            (data["name"], data["url"], data["theme_id"])
        )
        db.commit()
        logger.info(f"✓ Source créée: '{data['name']}' (ID: {cursor.lastrowid}, theme_id: {data['theme_id']})")
        return jsonify({
            "id": cursor.lastrowid,
            "name": data["name"],
            "url": data["url"],
            "theme_id": data["theme_id"]
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
    try:
        cursor = db.execute(
            "UPDATE sources SET name = ?, url = ?, theme_id = ? WHERE id = ?",
            (data["name"], data["url"], data["theme_id"], source_id)
        )
        db.commit()
        if cursor.rowcount == 0:
            logger.warning(f"✗ Source {source_id} non trouvée pour modification")
            return jsonify({"error": "Source non trouvée"}), 404
        logger.info(f"✓ Source {source_id} modifiée: '{data['name']}'")
        return jsonify({"id": source_id, "name": data["name"], "url": data["url"], "theme_id": data["theme_id"]}), 200
    except sqlite3.IntegrityError as e:
        logger.warning(f"✗ Erreur modification source {source_id}: {str(e)}")
        return jsonify({"error": "Source en doublon"}), 400

@api.route("/sources/<int:source_id>", methods=["DELETE"])
def delete_source(source_id):
    db = get_db()
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
    cursor = db.execute("SELECT * FROM articles")
    return jsonify([dict(row) for row in cursor.fetchall()])

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
            "INSERT INTO articles (title, url, published_at, source_id) VALUES (?, ?, ?, ?)",
            (data["title"], data["url"], data.get("published_at"), data["source_id"])
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

# ==================== SYSTEME ====================
@api.route("/system/reset", methods=["POST"])
def reset_database():
    """Vide toutes les tables de la base locale (reset complet, irréversible)."""
    db = get_db()
    # Les tables filles (FK ON DELETE CASCADE) sont vidées automatiquement via "themes",
    # mais on nettoie explicitement chaque table pour ne rien laisser derrière.
    db.execute("DELETE FROM article_tags")
    db.execute("DELETE FROM articles")
    db.execute("DELETE FROM sources")
    db.execute("DELETE FROM tags")
    db.execute("DELETE FROM themes")
    db.execute("DELETE FROM sqlite_sequence")
    db.commit()
    logger.warning("⚠ Base de données réinitialisée : toutes les tables ont été vidées")
    return jsonify({"message": "Base de données réinitialisée"}), 200