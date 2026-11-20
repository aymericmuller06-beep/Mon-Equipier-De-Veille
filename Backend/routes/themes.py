"""Veilles (appelées « thèmes » dans l'API)"""
import logging
import sqlite3

from flask import jsonify, request

from database import get_db
from routes import api
from routes.common import validate_accent_color, validate_length

logger = logging.getLogger(__name__)


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
        logger.warning("Description de thème invalide (longueur) lors de modification")
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
