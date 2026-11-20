"""Aides à l'ajout d'un outil : retrouver le flux RSS d'un site ou d'une chaîne YouTube"""
import logging

from flask import jsonify, request

from routes import api
from sync import describe_sync_error
from web import resolve_rss_feed, resolve_youtube_feed

logger = logging.getLogger(__name__)


@api.route("/tools/youtube/resolve", methods=["POST"])
def resolve_youtube():
    """Trouve le flux RSS d'une chaîne ou d'une playlist YouTube à partir de son lien"""
    data = request.get_json()
    url = (data or {}).get("url", "").strip()
    if not url:
        return jsonify({"error": "Le champ 'url' est requis"}), 400
    try:
        feed_url, name = resolve_youtube_feed(url)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.warning(f"✗ Résolution YouTube impossible pour '{url}': {e}")
        return jsonify({"error": "Impossible de joindre YouTube. Vérifiez le lien et réessayez."}), 502
    return jsonify({"feed_url": feed_url, "name": name})

@api.route("/tools/rss/resolve", methods=["POST"])
def resolve_rss():
    """Trouve le flux RSS d'un site à partir de l'adresse du site ou du flux lui-même"""
    data = request.get_json()
    url = (data or {}).get("url", "").strip()
    if not url:
        return jsonify({"error": "Le champ 'url' est requis"}), 400
    try:
        feed_url, name = resolve_rss_feed(url)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.warning(f"✗ Recherche de flux RSS impossible pour '{url}': {e}")
        return jsonify({"error": f"{describe_sync_error(e)}. Vérifiez l'adresse et réessayez."}), 502
    return jsonify({"feed_url": feed_url, "name": name[:150]})
