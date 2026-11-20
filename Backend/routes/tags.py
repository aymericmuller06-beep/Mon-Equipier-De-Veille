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
