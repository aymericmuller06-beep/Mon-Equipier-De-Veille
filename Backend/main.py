from flask import Flask
from database import init_db, close_connection
from routes import api

app = Flask(__name__)

# Enregistrement des routes et de la fermeture de connexion
app.register_blueprint(api)
app.teardown_appcontext(close_connection)

if __name__ == "__main__":
    init_db(app)
    app.run(host="0.0.0.0", port=8000, debug=True)