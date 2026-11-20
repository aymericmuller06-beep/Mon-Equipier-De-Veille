"""Chiffres du dashboard"""
from datetime import datetime, timedelta, timezone

from flask import jsonify, request

from database import get_db
from routes import api


@api.route("/stats", methods=["GET"])
def get_stats():
    """Chiffres du dashboard d'une veille"""
    theme_id = request.args.get("theme_id", type=int)
    if not theme_id:
        return jsonify({"error": "Le paramètre 'theme_id' est requis"}), 400
    days = min(request.args.get("days", default=14, type=int), 90)
    db = get_db()
    in_theme = "articles.source_id IN (SELECT id FROM sources WHERE theme_id = ?)"

    by_status = {"new": 0, "validated": 0, "trash": 0}
    for row in db.execute(f"SELECT status, COUNT(*) AS n FROM articles WHERE {in_theme} GROUP BY status", (theme_id,)):
        by_status[row["status"]] = row["n"]

    # Articles collectés par jour, jours sans article inclus
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=days - 1)
    counts = {row["day"]: row["n"] for row in db.execute(f"""
        SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n FROM articles
        WHERE {in_theme} AND substr(created_at, 1, 10) >= ? GROUP BY day
    """, (theme_id, start.isoformat()))}
    by_day = [
        {"date": (start + timedelta(days=i)).isoformat(), "count": counts.get((start + timedelta(days=i)).isoformat(), 0)}
        for i in range(days)
    ]

    by_source = [dict(row) for row in db.execute("""
        SELECT sources.id, sources.name, sources.tool_type,
            SUM(articles.status = 'new') AS new,
            SUM(articles.status = 'validated') AS validated,
            SUM(articles.status = 'trash') AS trash
        FROM sources LEFT JOIN articles ON articles.source_id = sources.id
        WHERE sources.theme_id = ?
        GROUP BY sources.id ORDER BY COUNT(articles.id) DESC
    """, (theme_id,))]
    for source in by_source:
        for key in ("new", "validated", "trash"):
            source[key] = source[key] or 0

    top_tags = [dict(row) for row in db.execute(f"""
        SELECT tags.id, tags.name, COUNT(*) AS count FROM article_tags
        JOIN tags ON tags.id = article_tags.tag_id
        JOIN articles ON articles.id = article_tags.article_id
        WHERE {in_theme} GROUP BY tags.id ORDER BY count DESC, tags.name LIMIT 8
    """, (theme_id,))]

    week_ago = (today - timedelta(days=6)).isoformat()
    collected_7d = db.execute(
        f"SELECT COUNT(*) FROM articles WHERE {in_theme} AND substr(created_at, 1, 10) >= ?", (theme_id, week_ago)
    ).fetchone()[0]
    processed_7d = db.execute(
        f"SELECT COUNT(*) FROM articles WHERE {in_theme} AND status != 'new' AND substr(status_changed_at, 1, 10) >= ?", (theme_id, week_ago)
    ).fetchone()[0]

    return jsonify({
        "by_status": by_status,
        "by_day": by_day,
        "by_source": by_source,
        "top_tags": top_tags,
        "collected_7d": collected_7d,
        "processed_7d": processed_7d,
    })
