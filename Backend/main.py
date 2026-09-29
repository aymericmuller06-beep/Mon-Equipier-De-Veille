from flask import Flask
from flask_cors import CORS
from database import init_db, close_connection
from routes import api
import logging

app = Flask(__name__)
CORS(app)  # Activer CORS pour toutes les routes

# Configure le logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Enregistrement des routes et de la fermeture de connexion
app.register_blueprint(api)
app.teardown_appcontext(close_connection)

if __name__ == "__main__":
    init_db(app)
    app.run(host="0.0.0.0", port=8000, debug=True)