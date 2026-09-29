import sqlite3
from flask import Blueprint, jsonify, request
from database import get_db

api = Blueprint("api", __name__)

@api.route("/")
def read_root():
    return jsonify({
        "status": "online",
        "message": "Le serveur de veille Flask et SQLite sont opérationnels"
    })

# ==================== THEMES ====================
@api.route("/themes", methods=["GET"])
def get_themes():
    db = get_db()
    cursor = db.execute("SELECT * FROM themes")
    return jsonify([dict(row) for row in cursor.fetchall()])

@api.route("/themes", methods=["POST"])
def add_theme():
    data = request.get_json()
    if not data or "name" not in data:
        return jsonify({"error": "Le champ 'name' est requis"}), 400
    db = get_db()
    try:
        cursor = db.execute("INSERT INTO themes (name) VALUES (?)", (data["name"],))
        db.commit()
        return jsonify({"id": cursor.lastrowid, "name": data["name"]}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Ce thème existe déjà"}), 409

@api.route("/themes/<int:theme_id>", methods=["PUT"])
def update_theme(theme_id):
    data = request.get_json()
    if not data or "name" not in data:
        return jsonify({"error": "Le champ 'name' est requis"}), 400
    db = get_db()
    try:
        cursor = db.execute("UPDATE themes SET name = ? WHERE id = ?", (data["name"], theme_id))
        db.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Thème non trouvé"}), 404
        return jsonify({"id": theme_id, "name": data["name"]}), 200
    except sqlite3.IntegrityError:
        return jsonify({"error": "Ce nom de thème existe déjà"}), 409

@api.route("/themes/<int:theme_id>", methods=["DELETE"])
def delete_theme(theme_id):
    db = get_db()
    cursor = db.execute("DELETE FROM themes WHERE id = ?", (theme_id,))
    db.commit()
    if cursor.rowcount == 0:
        return jsonify({"error": "Thème non trouvé"}), 404
    return jsonify({"message": f"Thème {theme_id} supprimé avec succès"}), 200

# ==================== SOURCES ====================
@api.route("/sources", methods=["GET"])
def get_sources():
    db = get_db()
    cursor = db.execute("SELECT * FROM sources")
    return jsonify([dict(row) for row in cursor.fetchall()])

@api.route("/sources", methods=["POST"])
def add_source():
    data = request.get_json()
    if not data or not all(k in data for k in ("name", "url", "theme_id")):
        return jsonify({"error": "Les champs 'name', 'url' et 'theme_id' sont requis"}), 400
    db = get_db()
    try:
        cursor = db.execute(
            "INSERT INTO sources (name, url, theme_id) VALUES (?, ?, ?)",
            (data["name"], data["url"], data["theme_id"])
        )
        db.commit()
        return jsonify({
            "id": cursor.lastrowid,
            "name": data["name"],
            "url": data["url"],
            "theme_id": data["theme_id"]
        }), 201
    except sqlite3.IntegrityError as e:
        return jsonify({"error": f"Erreur d'intégrité (theme_id invalide ?) : {str(e)}"}), 400

@api.route("/sources/<int:source_id>", methods=["PUT"])
def update_source(source_id):
    data = request.get_json()
    if not data or not all(k in data for k in ("name", "url", "theme_id")):
        return jsonify({"error": "Les champs 'name', 'url' et 'theme_id' sont requis"}), 400
    db = get_db()
    try:
        cursor = db.execute(
            "UPDATE sources SET name = ?, url = ?, theme_id = ? WHERE id = ?",
            (data["name"], data["url"], data["theme_id"], source_id)
        )
        db.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Source non trouvée"}), 404
        return jsonify({"id": source_id, "name": data["name"], "url": data["url"], "theme_id": data["theme_id"]}), 200
    except sqlite3.IntegrityError as e:
        return jsonify({"error": f"Erreur d'intégrité : {str(e)}"}), 400

@api.route("/sources/<int:source_id>", methods=["DELETE"])
def delete_source(source_id):
    db = get_db()
    cursor = db.execute("DELETE FROM sources WHERE id = ?", (source_id,))
    db.commit()
    if cursor.rowcount == 0:
        return jsonify({"error": "Source non trouvée"}), 404
    return jsonify({"message": f"Source {source_id} supprimée avec succès"}), 200

# ==================== ARTICLES ====================
@api.route("/articles", methods=["GET"])
def get_articles():
    db = get_db()
    cursor = db.execute("SELECT * FROM articles")
    return jsonify([dict(row) for row in cursor.fetchall()])

@api.route("/articles", methods=["POST"])
def add_article():
    data = request.get_json()
    if not data or not all(k in data for k in ("title", "url", "source_id")):
        return jsonify({"error": "Les champs 'title', 'url' et 'source_id' sont requis"}), 400
    db = get_db()
    try:
        cursor = db.execute(
            "INSERT INTO articles (title, url, published_at, source_id) VALUES (?, ?, ?, ?)",
            (data["title"], data["url"], data.get("published_at"), data["source_id"])
        )
        db.commit()
        return jsonify({
            "id": cursor.lastrowid,
            "title": data["title"],
            "url": data["url"],
            "published_at": data.get("published_at"),
            "source_id": data["source_id"]
        }), 201
    except sqlite3.IntegrityError as e:
        return jsonify({"error": f"Erreur d'intégrité (source_id invalide ?) : {str(e)}"}), 400

@api.route("/articles/<int:article_id>", methods=["PUT"])
def update_article(article_id):
    data = request.get_json()
    if not data or not all(k in data for k in ("title", "url", "source_id")):
        return jsonify({"error": "Les champs 'title', 'url' et 'source_id' sont requis"}), 400
    db = get_db()
    try:
        cursor = db.execute(
            "UPDATE articles SET title = ?, url = ?, published_at = ?, source_id = ? WHERE id = ?",
            (data["title"], data["url"], data.get("published_at"), data["source_id"], article_id)
        )
        db.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Article non trouvé"}), 404
        return jsonify({"id": article_id, "title": data["title"], "url": data["url"], "published_at": data.get("published_at"), "source_id": data["source_id"]}), 200
    except sqlite3.IntegrityError as e:
        return jsonify({"error": f"Erreur d'intégrité : {str(e)}"}), 400

@api.route("/articles/<int:article_id>", methods=["DELETE"])
def delete_article(article_id):
    db = get_db()
    cursor = db.execute("DELETE FROM articles WHERE id = ?", (article_id,))
    db.commit()
    if cursor.rowcount == 0:
        return jsonify({"error": "Article non trouvé"}), 404
    return jsonify({"message": f"Article {article_id} supprimé avec succès"}), 200

# --- Tags associés aux articles ---
@api.route("/articles/<int:article_id>/tags", methods=["GET"])
def get_article_tags(article_id):
    db = get_db()
    cursor = db.execute("""
        SELECT t.* FROM tags t
        JOIN article_tags at ON t.id = at.tag_id
        WHERE at.article_id = ?
    """, (article_id,))
    return jsonify([dict(row) for row in cursor.fetchall()])

@api.route("/articles/<int:article_id>/tags", methods=["POST"])
def add_tag_to_article(article_id):
    data = request.get_json()
    if not data or "tag_id" not in data:
        return jsonify({"error": "Le champ 'tag_id' est requis"}), 400
    
    tag_id = data["tag_id"]
    db = get_db()
    try:
        db.execute("INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)", (article_id, tag_id))
        db.commit()
        return jsonify({"message": f"Tag {tag_id} associé à l'article {article_id}"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "L'association existe déjà ou l'article/tag est invalide"}), 400

@api.route("/articles/<int:article_id>/tags/<int:tag_id>", methods=["DELETE"])
def remove_tag_from_article(article_id, tag_id):
    db = get_db()
    cursor = db.execute("DELETE FROM article_tags WHERE article_id = ? AND tag_id = ?", (article_id, tag_id))
    db.commit()
    if cursor.rowcount == 0:
        return jsonify({"error": "Association introuvable"}), 404
    return jsonify({"message": f"Tag {tag_id} retiré de l'article {article_id}"}), 200

# ==================== TAGS ====================
@api.route("/tags", methods=["GET"])
def get_tags():
    db = get_db()
    cursor = db.execute("SELECT * FROM tags")
    return jsonify([dict(row) for row in cursor.fetchall()])

@api.route("/tags", methods=["POST"])
def add_tag():
    data = request.get_json()
    if not data or "name" not in data:
        return jsonify({"error": "Le champ 'name' est requis"}), 400
    db = get_db()
    try:
        cursor = db.execute("INSERT INTO tags (name) VALUES (?)", (data["name"],))
        db.commit()
        return jsonify({"id": cursor.lastrowid, "name": data["name"]}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Ce tag existe déjà"}), 409

@api.route("/tags/<int:tag_id>", methods=["PUT"])
def update_tag(tag_id):
    data = request.get_json()
    if not data or "name" not in data:
        return jsonify({"error": "Le champ 'name' est requis"}), 400
    db = get_db()
    try:
        cursor = db.execute("UPDATE tags SET name = ? WHERE id = ?", (data["name"], tag_id))
        db.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Tag non trouvé"}), 404
        return jsonify({"id": tag_id, "name": data["name"]}), 200
    except sqlite3.IntegrityError:
        return jsonify({"error": "Ce nom de tag existe déjà"}), 409

@api.route("/tags/<int:tag_id>", methods=["DELETE"])
def delete_tag(tag_id):
    db = get_db()
    cursor = db.execute("DELETE FROM tags WHERE id = ?", (tag_id,))
    db.commit()
    if cursor.rowcount == 0:
        return jsonify({"error": "Tag non trouvé"}), 404
    return jsonify({"message": f"Tag {tag_id} supprimé avec succès"}), 200