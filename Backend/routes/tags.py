"""Tags (communs à toutes les veilles)"""
import logging
import sqlite3

from flask import jsonify, request

from database import get_db
from routes import api
from routes.common import validate_length

logger = logging.getLogger(__name__)


@api.route("/tags", methods=["GET"])
def get_tags():
    """Liste des tags. Avec `?theme_id=`, ajoute leur utilisation : nombre d'articles par statut dans cette veille
    (`new`, `validated`, `trash`), nombre total d'articles toutes veilles confondues (`total`)
    et noms des autres veilles qui l'utilisent (`other_themes`)."""
    db = get_db()
    tags = [dict(row) for row in db.execute("SELECT * FROM tags ORDER BY name")]
    theme_id = request.args.get("theme_id", type=int)
    if not theme_id:
        return jsonify(tags)

    usage = {tag["id"]: {"new": 0, "validated": 0, "trash": 0, "total": 0, "other_themes": []} for tag in tags}
    rows = db.execute("""
        SELECT article_tags.tag_id, sources.theme_id, themes.name AS theme_name, articles.status, COUNT(*) AS n
        FROM article_tags
        JOIN articles ON articles.id = article_tags.article_id
        JOIN sources ON sources.id = articles.source_id
        JOIN themes ON themes.id = sources.theme_id
        GROUP BY article_tags.tag_id, sources.theme_id, articles.status
    """)
    for row in rows:
        tag_usage = usage.get(row["tag_id"])
        if tag_usage is None:
            continue
        tag_usage["total"] += row["n"]
        if row["theme_id"] == theme_id:
            tag_usage[row["status"]] += row["n"]
        elif row["theme_name"] not in tag_usage["other_themes"]:
            tag_usage["other_themes"].append(row["theme_name"])
    return jsonify([{**tag, **usage[tag["id"]]} for tag in tags])

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

@api.route("/tags/<int:tag_id>/merge", methods=["POST"])
def merge_tag(tag_id):
    """Fusionne un tag dans un autre (`into`) : ses articles reçoivent l'autre tag, puis il est supprimé"""
    data = request.get_json()
    target_id = (data or {}).get("into")
    if not isinstance(target_id, int):
        return jsonify({"error": "Le champ 'into' (identifiant du tag cible) est requis"}), 400
    if target_id == tag_id:
        return jsonify({"error": "Un tag ne peut pas être fusionné avec lui-même"}), 400
    db = get_db()
    source = db.execute("SELECT * FROM tags WHERE id = ?", (tag_id,)).fetchone()
    target = db.execute("SELECT * FROM tags WHERE id = ?", (target_id,)).fetchone()
    if source is None or target is None:
        return jsonify({"error": "Tag non trouvé"}), 404

    # Un article qui avait déjà les deux tags ne garde qu'une fois le tag cible
    moved = db.execute(
        "INSERT OR IGNORE INTO article_tags (article_id, tag_id) SELECT article_id, ? FROM article_tags WHERE tag_id = ?",
        (target_id, tag_id),
    ).rowcount
    db.execute("DELETE FROM article_tags WHERE tag_id = ?", (tag_id,))
    db.execute("DELETE FROM tags WHERE id = ?", (tag_id,))
    db.commit()
    logger.info(f"✓ Tag '{source['name']}' fusionné dans '{target['name']}' ({moved} article(s) étiqueté(s))")
    return jsonify({"id": target_id, "name": target["name"], "moved": moved}), 200
