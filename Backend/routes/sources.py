"""Sources (flux) d'une veille et leur synchronisation"""
import logging
import sqlite3

from flask import jsonify, request

from database import get_db
from routes import api
from routes.common import MANUAL_TOOL_TYPE, id_exists, now_iso, read_keywords, validate_length, validate_tool_type, validate_url
from sync import describe_sync_error, keyword_filter, sync_source as run_source_sync
from web import RateLimitedError

logger = logging.getLogger(__name__)


# last_article_at : date du dernier article importé (un flux qui ne publie plus rien reste « en bonne santé »)
SOURCE_SELECT = """
    SELECT sources.*, (SELECT MAX(created_at) FROM articles WHERE articles.source_id = sources.id) AS last_article_at
    FROM sources
"""

@api.route("/sources", methods=["GET"])
def get_sources():
    db = get_db()
    theme_id = request.args.get("theme_id")
    tool_type = request.args.get("tool_type")

    query = SOURCE_SELECT
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
    source = db.execute(SOURCE_SELECT + " WHERE sources.id = ?", (source_id,)).fetchone()
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
    include_keywords = read_keywords(data, "include_keywords")
    exclude_keywords = read_keywords(data, "exclude_keywords")
    if include_keywords is None or exclude_keywords is None:
        return jsonify({"error": "Les mots-clés doivent faire au maximum 500 caractères"}), 400
    db = get_db()
    try:
        cursor = db.execute(
            "INSERT INTO sources (name, url, theme_id, tool_type, include_keywords, exclude_keywords) VALUES (?, ?, ?, ?, ?, ?)",
            (data["name"], data["url"], data["theme_id"], tool_type, include_keywords, exclude_keywords)
        )
        db.commit()
        logger.info(f"✓ Source créée: '{data['name']}' (ID: {cursor.lastrowid}, theme_id: {data['theme_id']}, tool_type: {tool_type})")
        return jsonify({
            "id": cursor.lastrowid,
            "name": data["name"],
            "url": data["url"],
            "theme_id": data["theme_id"],
            "tool_type": tool_type,
            "include_keywords": include_keywords,
            "exclude_keywords": exclude_keywords,
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

@api.route("/sources/<int:source_id>", methods=["PATCH"])
def patch_source(source_id):
    """Renomme une source et/ou change ses filtres ; `apply_to_existing` envoie à la corbeille
    les articles à traiter qui ne passent plus les filtres (sur leur titre)"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Aucune modification fournie"}), 400
    db = get_db()
    source = db.execute("SELECT * FROM sources WHERE id = ?", (source_id,)).fetchone()
    if source is None:
        return jsonify({"error": "Source non trouvée"}), 404

    name = data.get("name", source["name"])
    if not validate_length(name or "", min_len=1, max_len=150):
        return jsonify({"error": "Le nom doit avoir entre 1 et 150 caractères"}), 400
    include_keywords = read_keywords(data, "include_keywords") if "include_keywords" in data else source["include_keywords"]
    exclude_keywords = read_keywords(data, "exclude_keywords") if "exclude_keywords" in data else source["exclude_keywords"]
    if include_keywords is None or exclude_keywords is None:
        return jsonify({"error": "Les mots-clés doivent faire au maximum 500 caractères"}), 400

    db.execute(
        "UPDATE sources SET name = ?, include_keywords = ?, exclude_keywords = ? WHERE id = ?",
        (name.strip(), include_keywords, exclude_keywords, source_id)
    )

    trashed = 0
    if data.get("apply_to_existing"):
        matches = keyword_filter(include_keywords, exclude_keywords)
        pending = db.execute("SELECT id, title FROM articles WHERE source_id = ? AND status = 'new'", (source_id,)).fetchall()
        rejected = [(now_iso(), row["id"]) for row in pending if not matches(row["title"])]
        db.executemany(
            "UPDATE articles SET status = 'trash', status_reason = 'Écarté par les filtres de la source', status_changed_at = ? WHERE id = ?",
            rejected
        )
        trashed = len(rejected)

    db.commit()
    logger.info(f"✓ Source {source_id} modifiée ({trashed} article(s) écarté(s) par les filtres)")
    updated = dict(db.execute(SOURCE_SELECT + " WHERE sources.id = ?", (source_id,)).fetchone())
    return jsonify({**updated, "trashed": trashed}), 200

@api.route("/sources/<int:source_id>/sync", methods=["POST"])
def sync_source(source_id):
    db = get_db()
    source = db.execute("SELECT * FROM sources WHERE id = ?", (source_id,)).fetchone()
    if source is None:
        logger.warning(f"✗ Source {source_id} non trouvée pour synchronisation")
        return jsonify({"error": "Source non trouvée"}), 404
    if source["tool_type"] == MANUAL_TOOL_TYPE:
        return jsonify({"error": "Les articles ajoutés à la main n'ont pas de flux à synchroniser"}), 400

    try:
        result = run_source_sync(source)
    except RateLimitedError as e:
        logger.warning(f"✗ Source {source_id} : {e}")
        return jsonify({"error": f"{e.host} limite le nombre de requêtes : réessayez dans {e.retry_after} s (la synchronisation automatique s'en chargera sinon)."}), 429
    except Exception as e:
        logger.warning(f"✗ Erreur de lecture du flux RSS pour la source {source_id}: {str(e)}")
        return jsonify({"error": f"{describe_sync_error(e)}."}), 502
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
