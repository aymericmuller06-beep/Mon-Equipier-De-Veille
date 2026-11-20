"""État du serveur et réinitialisation de la base"""
import logging

from flask import jsonify, request

from database import get_db
from routes import api

logger = logging.getLogger(__name__)


@api.route("/")
def read_root():
    return jsonify({
        "status": "online",
        "message": "Le serveur de veille Flask et SQLite sont opérationnels"
    })


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
