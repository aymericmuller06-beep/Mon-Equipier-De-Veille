"""Routes de l'API, regroupées par ressource. Toutes sont déclarées sur le blueprint `api`."""
from flask import Blueprint

api = Blueprint("api", __name__)

# Importés après la création du blueprint : chaque module y déclare ses routes
from routes import articles, sources, stats, system, tags, themes, tools  # noqa: E402,F401
