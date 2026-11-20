import logging
import os

from flask import Flask
from flask_cors import CORS

from database import init_db, close_connection
from routes import api
from sync import start_scheduler
from maintenance import start_maintenance

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

DEBUG = os.environ.get("FLASK_DEBUG") == "1"
# Seul le frontend peut appeler l'API depuis un navigateur
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
SYNC_INTERVAL_MINUTES = int(os.environ.get("SYNC_INTERVAL_MINUTES", "60"))
# Synchro et maintenance en tâche de fond ; les tests les désactivent (BACKGROUND_TASKS=0)
BACKGROUND_TASKS = os.environ.get("BACKGROUND_TASKS", "1") == "1"


def create_app():
    """Crée l'application et prépare la base (sans lancer les tâches de fond)"""
    app = Flask(__name__)
    CORS(app, origins=CORS_ORIGINS)
    app.register_blueprint(api)
    app.teardown_appcontext(close_connection)
    init_db(app)
    return app


app = create_app()

# En mode debug, le reloader lance deux processus : on ne démarre les tâches de fond que dans le processus enfant
if BACKGROUND_TASKS and (not DEBUG or os.environ.get("WERKZEUG_RUN_MAIN") == "true"):
    if SYNC_INTERVAL_MINUTES > 0:
        start_scheduler(app, SYNC_INTERVAL_MINUTES)
    start_maintenance(app)

if __name__ == "__main__":
    app.run(host=os.environ.get("HOST", "127.0.0.1"), port=8000, debug=DEBUG)
