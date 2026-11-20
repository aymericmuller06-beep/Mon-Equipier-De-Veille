import os
import sys
import tempfile

# À régler avant d'importer l'application : base jetable et aucune tâche de fond
os.environ["DATABASE_PATH"] = os.path.join(tempfile.mkdtemp(prefix="veille-tests-"), "import.db")
os.environ["BACKGROUND_TASKS"] = "0"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest  # noqa: E402

import database  # noqa: E402
import maintenance  # noqa: E402
import sync  # noqa: E402
import web  # noqa: E402
from main import create_app  # noqa: E402


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    """Aucun test ne doit dépendre d'Internet : toute requête réelle échoue"""
    def blocked(*args, **kwargs):
        raise RuntimeError("Accès réseau interdit pendant les tests : simulez la réponse")
    monkeypatch.setattr(web.urllib.request, "urlopen", blocked)


@pytest.fixture
def app(tmp_path, monkeypatch):
    """Application sur une base neuve, propre à chaque test"""
    db_path = str(tmp_path / "veille.db")
    monkeypatch.setattr(database, "DATABASE", db_path)
    monkeypatch.setattr(maintenance, "DATABASE", db_path)
    monkeypatch.setattr(maintenance, "BACKUP_DIR", str(tmp_path / "backups"))
    return create_app()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def db(app):
    with app.app_context():
        yield database.get_db()


@pytest.fixture
def feed(monkeypatch):
    """Flux simulé : `feed.entries` est renvoyé par chaque synchronisation, `feed.error` est levée si définie"""
    class FakeFeed:
        entries = []
        error = None

    fake = FakeFeed()

    def fetch_rss_entries(url):
        if fake.error is not None:
            raise fake.error
        return list(fake.entries)

    monkeypatch.setattr(sync, "fetch_rss_entries", fetch_rss_entries)
    return fake


def entry(title, url, summary="", published_at="2026-11-01T10:00:00+00:00"):
    return {"title": title, "url": url, "summary": summary, "published_at": published_at}


def make_theme(client, name="Veille test"):
    response = client.post("/themes", json={"name": name})
    assert response.status_code == 201, response.get_json()
    return response.get_json()["id"]


def make_source(client, theme_id, url="https://exemple.fr/feed", tool_type="rss", **extra):
    response = client.post("/sources", json={"name": "Source test", "url": url, "theme_id": theme_id, "tool_type": tool_type, **extra})
    assert response.status_code == 201, response.get_json()
    return response.get_json()["id"]


def make_article(db, source_id, title="Article", url="https://exemple.fr/a", status="new", status_changed_at=None, created_at="2026-11-01T10:00:00+00:00"):
    cursor = db.execute(
        "INSERT INTO articles (title, url, source_id, status, status_changed_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (title, url, source_id, status, status_changed_at, created_at),
    )
    db.commit()
    return cursor.lastrowid
