"""Articles : liste, tri (statut et note), ajout manuel, corbeille et tags d'un article"""
import logging
import sqlite3
from datetime import datetime, timezone
from urllib.parse import urlparse

from flask import jsonify, request

from database import get_db
from maintenance import delete_articles_permanently
from routes import api
from routes.common import (
    ARTICLE_SELECT, MANUAL_SOURCE_NAME, MANUAL_TOOL_TYPE, attach_tags, get_full_article, id_exists, now_iso,
    validate_length, validate_status, validate_url,
)
from text import normalize
from web import fetch_page_title

logger = logging.getLogger(__name__)


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

    # q : recherche dans le titre et la note (sans majuscules ni accents)
    search = normalize((request.args.get("q") or "").strip())[:100]
    if search:
        escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        conditions.append(
            "normalize(articles.title || ' ' || COALESCE(articles.status_reason, '')) LIKE ? ESCAPE '\\'"
        )
        params.append(f"%{escaped}%")

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
    deleted = delete_articles_permanently(
        db, "status = 'trash' AND source_id IN (SELECT id FROM sources WHERE theme_id = ?)", (theme_id,)
    )
    db.commit()
    logger.info(f"✓ Corbeille de la veille {theme_id} vidée ({deleted} article(s))")
    return jsonify({"deleted": deleted}), 200

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

@api.route("/articles/manual", methods=["POST"])
def add_manual_article():
    """Ajoute à une veille un article trouvé soi-même ; le titre est récupéré sur la page s'il est omis"""
    data = request.get_json()
    if not data or not all(k in data for k in ("url", "theme_id")):
        return jsonify({"error": "Les champs 'url' et 'theme_id' sont requis"}), 400
    url = (data["url"] or "").strip()
    if not validate_url(url):
        return jsonify({"error": "URL invalide. Format attendu: https://example.com"}), 400
    if not id_exists("themes", data["theme_id"]):
        return jsonify({"error": "Thème inexistant"}), 404
    status = data.get("status") or "new"
    if status not in ("new", "validated"):
        return jsonify({"error": "Statut invalide"}), 400
    reason = (data.get("status_reason") or "").strip()
    if not validate_length(reason, min_len=0, max_len=2000):
        return jsonify({"error": "La note doit faire au maximum 2000 caractères"}), 400
    published_at = None
    if data.get("published_at"):
        try:
            # Midi UTC : la date choisie reste la même quel que soit le fuseau d'affichage
            published_at = datetime.fromisoformat(data["published_at"]).replace(hour=12, tzinfo=timezone.utc).isoformat()
        except (TypeError, ValueError):
            return jsonify({"error": "Date de publication invalide"}), 400

    db = get_db()
    duplicate = db.execute("""
        SELECT articles.status FROM articles JOIN sources ON sources.id = articles.source_id
        WHERE sources.theme_id = ? AND articles.url = ?
    """, (data["theme_id"], url)).fetchone()
    if duplicate:
        where = {"new": "dans les articles à traiter", "validated": "parmi les articles validés", "trash": "dans la corbeille"}[duplicate["status"]]
        return jsonify({"error": f"Cet article est déjà dans la veille, {where}."}), 409

    title = (data.get("title") or "").strip() or fetch_page_title(url) or urlparse(url).netloc
    title = title[:300]

    source = db.execute(
        "SELECT id FROM sources WHERE theme_id = ? AND tool_type = ?", (data["theme_id"], MANUAL_TOOL_TYPE)
    ).fetchone()
    source_id = source["id"] if source else db.execute(
        "INSERT INTO sources (name, url, theme_id, tool_type) VALUES (?, '', ?, ?)",
        (MANUAL_SOURCE_NAME, data["theme_id"], MANUAL_TOOL_TYPE)
    ).lastrowid

    now = now_iso()
    cursor = db.execute("""
        INSERT INTO articles (title, url, published_at, source_id, status, status_reason, created_at, status_changed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (title, url, published_at, source_id, status, reason, now, now if status != "new" else None))
    # Un article ajouté à la main puis supprimé peut être ajouté de nouveau
    db.execute("DELETE FROM dismissed_articles WHERE source_id = ? AND url = ?", (source_id, url))
    db.commit()
    logger.info(f"✓ Article ajouté manuellement: '{title}' (ID: {cursor.lastrowid}, veille: {data['theme_id']})")
    return jsonify(get_full_article(db, cursor.lastrowid)), 201

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
