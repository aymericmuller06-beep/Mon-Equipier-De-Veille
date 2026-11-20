import os
import sqlite3
from datetime import datetime, timedelta, timezone

import maintenance
from conftest import make_article, make_source, make_theme


def days_ago(days):
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


# ---------- Purge de la corbeille ----------

def test_purge_deletes_only_old_trash(app, client, db):
    source_id = make_source(client, make_theme(client))
    old = make_article(db, source_id, url="https://exemple.fr/vieux", status="trash", status_changed_at=days_ago(31))
    recent = make_article(db, source_id, url="https://exemple.fr/recent", status="trash", status_changed_at=days_ago(29))
    validated = make_article(db, source_id, url="https://exemple.fr/valide", status="validated", status_changed_at=days_ago(90))

    with app.app_context():
        assert maintenance.purge_trash() == 1

    remaining = {row[0] for row in db.execute("SELECT id FROM articles")}
    assert remaining == {recent, validated}
    assert old not in remaining
    # L'article purgé ne sera pas réimporté
    assert [row[0] for row in db.execute("SELECT url FROM dismissed_articles")] == ["https://exemple.fr/vieux"]


def test_purge_can_be_disabled(app, client, db, monkeypatch):
    source_id = make_source(client, make_theme(client))
    make_article(db, source_id, status="trash", status_changed_at=days_ago(400))
    monkeypatch.setattr(maintenance, "TRASH_RETENTION_DAYS", 0)

    with app.app_context():
        assert maintenance.purge_trash() == 0
    assert db.execute("SELECT COUNT(*) FROM articles").fetchone()[0] == 1


def test_trash_articles_show_their_purge_date(client, db):
    source_id = make_source(client, make_theme(client))
    make_article(db, source_id, url="https://exemple.fr/1", status="trash", status_changed_at="2026-11-01T10:00:00+00:00")
    make_article(db, source_id, url="https://exemple.fr/2", status="new")

    articles = {a["url"]: a for a in client.get("/articles").get_json()}

    assert articles["https://exemple.fr/1"]["purge_at"] == "2026-12-01T10:00:00+00:00"
    assert articles["https://exemple.fr/2"]["purge_at"] is None


def test_empty_trash_route(client, db):
    theme_id = make_theme(client)
    other_theme = make_theme(client, "Autre veille")
    source_id = make_source(client, theme_id)
    other_source = make_source(client, other_theme)
    make_article(db, source_id, url="https://exemple.fr/1", status="trash", status_changed_at=days_ago(1))
    make_article(db, source_id, url="https://exemple.fr/2", status="new")
    make_article(db, other_source, url="https://exemple.fr/3", status="trash", status_changed_at=days_ago(1))

    response = client.delete(f"/articles/trash?theme_id={theme_id}")

    assert response.get_json() == {"deleted": 1}
    # Seule la corbeille de cette veille est vidée
    assert {row[0] for row in db.execute("SELECT url FROM articles")} == {"https://exemple.fr/2", "https://exemple.fr/3"}
    assert client.delete("/articles/trash").status_code == 400


# ---------- Sauvegardes ----------

def test_backup_is_a_valid_copy(app, client):
    make_theme(client, "Veille sauvegardée")

    path = maintenance.backup_database()

    copy = sqlite3.connect(path)
    assert copy.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    assert copy.execute("SELECT name FROM themes").fetchone()[0] == "Veille sauvegardée"
    assert not [name for name in os.listdir(maintenance.BACKUP_DIR) if name.endswith(".tmp")]


def test_only_the_latest_backups_are_kept(app, monkeypatch):
    monkeypatch.setattr(maintenance, "BACKUP_KEEP", 2)
    os.makedirs(maintenance.BACKUP_DIR)
    for stamp in ("20260101-000000", "20260102-000000", "20260103-000000"):
        open(os.path.join(maintenance.BACKUP_DIR, f"veille-{stamp}.db"), "w").close()

    newest = maintenance.backup_database()

    kept = [os.path.basename(path) for path in maintenance.list_backups()]
    assert kept == ["veille-20260103-000000.db", os.path.basename(newest)]


def test_backup_is_due_only_after_the_interval(app, monkeypatch):
    monkeypatch.setattr(maintenance, "BACKUP_INTERVAL_HOURS", 24)
    assert maintenance.backup_is_due() is True

    path = maintenance.backup_database()
    assert maintenance.backup_is_due() is False

    two_days_ago = datetime.now().timestamp() - 48 * 3600
    os.utime(path, (two_days_ago, two_days_ago))
    assert maintenance.backup_is_due() is True

    monkeypatch.setattr(maintenance, "BACKUP_INTERVAL_HOURS", 0)
    assert maintenance.backup_is_due() is False
