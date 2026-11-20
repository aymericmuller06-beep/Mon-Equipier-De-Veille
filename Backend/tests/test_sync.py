import urllib.error
from email.message import Message

import pytest

import sync
from conftest import entry, make_source, make_theme
from web import RateLimitedError


# ---------- Filtres par mots-clés ----------

@pytest.mark.parametrize("include, exclude, title, expected", [
    ("", "", "N'importe quoi", True),
    ("IA", "", "L'IA au travail", True),
    ("IA", "", "Passer via le proxy", False),          # mot entier : « IA » ne correspond pas à « via »
    ("sécurité", "", "Securite des PME", True),        # sans accents ni majuscules
    ("cyber, ransomware", "", "Un RANSOMWARE frappe", True),
    ("", "promo", "Grosse promo sur les NAS", False),
    ("nas", "promo", "NAS en promo", False),            # l'exclusion l'emporte
])
def test_keyword_filter(include, exclude, title, expected):
    assert sync.keyword_filter(include, exclude)(title) is expected


def test_keyword_filter_reads_summary():
    assert sync.keyword_filter("proxmox", "")("Nouvelle vidéo", "Tuto Proxmox complet") is True


# ---------- Import des articles ----------

def test_sync_imports_new_articles_only_once(client, feed):
    source_id = make_source(client, make_theme(client))
    feed.entries = [entry("Un", "https://exemple.fr/1"), entry("Deux", "https://exemple.fr/2")]

    first = client.post(f"/sources/{source_id}/sync").get_json()
    second = client.post(f"/sources/{source_id}/sync").get_json()

    assert (first["fetched"], first["inserted"]) == (2, 2)
    assert second["inserted"] == 0
    assert len(client.get(f"/articles?source_id={source_id}").get_json()) == 2


def test_sync_applies_source_filters(client, feed):
    source_id = make_source(client, make_theme(client), include_keywords="docker")
    feed.entries = [entry("Docker 30 est sorti", "https://exemple.fr/1"), entry("Recette de crêpes", "https://exemple.fr/2")]

    result = client.post(f"/sources/{source_id}/sync").get_json()

    assert (result["inserted"], result["filtered"]) == (1, 1)


def test_deleted_articles_are_not_imported_again(client, feed):
    theme_id = make_theme(client)
    source_id = make_source(client, theme_id)
    feed.entries = [entry("Un", "https://exemple.fr/1")]
    client.post(f"/sources/{source_id}/sync")
    article_id = client.get("/articles").get_json()[0]["id"]

    client.patch(f"/articles/{article_id}", json={"status": "trash"})
    client.delete(f"/articles/trash?theme_id={theme_id}")
    result = client.post(f"/sources/{source_id}/sync").get_json()

    assert result["inserted"] == 0


def test_manual_source_cannot_be_synced(client):
    theme_id = make_theme(client)
    article = client.post("/articles/manual", json={"url": "https://exemple.fr/x", "title": "Trouvé", "theme_id": theme_id}).get_json()

    assert client.post(f"/sources/{article['source_id']}/sync").status_code == 400


# ---------- État de synchronisation ----------

def get_source(client, source_id):
    return client.get(f"/sources/{source_id}").get_json()


def test_successful_sync_is_recorded(client, feed):
    source_id = make_source(client, make_theme(client))
    assert get_source(client, source_id)["last_sync_at"] is None

    client.post(f"/sources/{source_id}/sync")

    source = get_source(client, source_id)
    assert source["last_sync_at"] == source["last_success_at"]
    assert source["last_error"] is None and source["error_since"] is None


def test_failed_sync_is_recorded_and_cleared_on_success(client, feed):
    source_id = make_source(client, make_theme(client))
    feed.error = urllib.error.HTTPError("https://exemple.fr/feed", 404, "Not Found", Message(), None)

    response = client.post(f"/sources/{source_id}/sync")
    first = get_source(client, source_id)
    client.post(f"/sources/{source_id}/sync")
    second = get_source(client, source_id)

    assert response.status_code == 502
    assert "Flux introuvable (erreur 404)" in response.get_json()["error"]
    assert first["last_error"].startswith("Flux introuvable")
    assert first["last_success_at"] is None
    # La série d'erreurs garde sa date de début
    assert second["error_since"] == first["error_since"]
    assert second["last_sync_at"] >= first["last_sync_at"]

    feed.error = None
    client.post(f"/sources/{source_id}/sync")
    repaired = get_source(client, source_id)
    assert repaired["last_error"] is None and repaired["error_since"] is None


def test_rate_limited_sync_returns_429(client, feed):
    source_id = make_source(client, make_theme(client), url="https://www.reddit.com/r/selfhosted/top/.rss", tool_type="reddit")
    feed.error = RateLimitedError("www.reddit.com", 42)

    response = client.post(f"/sources/{source_id}/sync")

    assert response.status_code == 429
    assert "42 s" in response.get_json()["error"]
    assert "limite le nombre de requêtes" in get_source(client, source_id)["last_error"]


def http_error(code):
    return urllib.error.HTTPError("https://exemple.fr", code, "", Message(), None)


@pytest.mark.parametrize("error, expected", [
    (http_error(410), "Flux introuvable (erreur 410)"),
    (http_error(403), "refuse l'accès au flux (erreur 403)"),
    (http_error(503), "en panne (erreur 503)"),
    (http_error(418), "erreur 418"),
    (urllib.error.URLError("nom inconnu"), "Site injoignable"),
    (TimeoutError(), "Site injoignable"),
    (ValueError("pas du XML"), "pas un flux RSS valide"),
    (RateLimitedError("www.reddit.com", 60), "www.reddit.com limite le nombre de requêtes"),
    (KeyError("x"), "Erreur inattendue (KeyError)"),
])
def test_describe_sync_error(error, expected):
    assert expected in sync.describe_sync_error(error)


# ---------- Synchronisation automatique et limite de Reddit ----------

def test_sync_all_spaces_reddit_requests(app, client, monkeypatch):
    theme_id = make_theme(client)
    make_source(client, theme_id, url="https://www.reddit.com/r/un/top/.rss", tool_type="reddit")
    make_source(client, theme_id, url="https://www.reddit.com/r/deux/top/.rss", tool_type="reddit")
    make_source(client, theme_id, url="https://exemple.fr/feed")
    make_source(client, theme_id, url="https://www.reddit.com/r/trois/top/.rss", tool_type="reddit")

    clock = [0.0]
    events = []
    limited_once = {"r/deux"}

    def fake_sync(source):
        clock[0] += 1
        name = source["url"].split("reddit.com/")[-1].split("/top")[0] if "reddit" in source["url"] else "exemple"
        events.append(name)
        if name in limited_once:
            limited_once.discard(name)
            raise RateLimitedError("www.reddit.com", 30)

    def fake_sleep(seconds):
        events.append(round(seconds))
        clock[0] += seconds

    monkeypatch.setattr(sync, "sync_source", fake_sync)
    monkeypatch.setattr(sync.time, "sleep", fake_sleep)
    monkeypatch.setattr(sync.time, "monotonic", lambda: clock[0])
    monkeypatch.setattr(sync, "REDDIT_MIN_INTERVAL_SECONDS", 60)

    with app.app_context():
        sync.sync_all_sources()

    # Les autres sources d'abord ; 60 s entre deux requêtes Reddit ; nouvel essai après le délai demandé
    assert events == ["exemple", "r/un", 60, "r/deux", 30, "r/deux", 60, "r/trois"]


def test_sync_all_continues_after_an_error(app, client, feed, monkeypatch):
    theme_id = make_theme(client)
    broken = make_source(client, theme_id, url="https://casse.fr/feed")
    working = make_source(client, theme_id, url="https://exemple.fr/feed")
    real_import = sync.import_entries

    def import_entries(source):
        if source["id"] == broken:
            raise ValueError("flux illisible")
        return real_import(source)

    monkeypatch.setattr(sync, "import_entries", import_entries)
    feed.entries = [entry("Un", "https://exemple.fr/1")]

    with app.app_context():
        sync.sync_all_sources()

    assert get_source(client, broken)["last_error"] is not None
    assert get_source(client, working)["last_error"] is None
    assert len(client.get(f"/articles?source_id={working}").get_json()) == 1
