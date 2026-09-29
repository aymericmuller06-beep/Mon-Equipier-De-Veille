from flask import Flask, jsonify

# Initialisation de l'application Flask
app = Flask(__name__)

@app.route("/")
def read_root():
    """
    Route racine de test pour vérifier que l'API répond.
    """
    return jsonify({
        "status": "online",
        "message": "Le serveur de veille Flask est opérationnel"
    })

if __name__ == "__main__":
    # Lancement du serveur de développement en local
    app.run(host="0.0.0.0", port=8000, debug=True)