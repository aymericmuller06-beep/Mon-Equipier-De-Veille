import pytest

import web

RSS = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Blog test</title>
<item><title>Premier article</title><link>https://blog.fr/1</link></item>
</channel></rss>"""

HTML_WITH_FEED = b"""<html><head><title>Accueil</title>
<link rel="alternate" type="application/rss+xml" title="Flux" href="/le-flux.xml">
</head><body>Bonjour</body></html>"""

HTML_WITHOUT_FEED = b"<html><head><title>Accueil</title></head><body>Rien</body></html>"


@pytest.fixture
def site(monkeypatch):
    """Faux Internet : `site.pages[url] = contenu`, `site.redirects[url] = url_finale` ; le reste répond 404"""
    class FakeSite:
        pages = {}
        redirects = {}

    fake = FakeSite()

    def fetch(url, max_bytes, headers=None, with_final_url=False):
        final_url = fake.redirects.get(url, url)
        if final_url not in fake.pages:
            raise web.urllib.error.HTTPError(final_url, 404, "Not Found", None, None)
        return (fake.pages[final_url], final_url) if with_final_url else fake.pages[final_url]

    monkeypatch.setattr(web, "fetch", fetch)
    return fake


def test_feed_url_is_accepted_as_is(site):
    site.pages["https://blog.fr/rss"] = RSS
    assert web.resolve_rss_feed("https://blog.fr/rss") == ("https://blog.fr/rss", "Blog test")


def test_feed_announced_by_the_page_is_found(site):
    site.pages["https://blog.fr/"] = HTML_WITH_FEED
    site.pages["https://blog.fr/le-flux.xml"] = RSS
    # Adresse sans https:// ; lien relatif dans la page
    assert web.resolve_rss_feed("blog.fr/") == ("https://blog.fr/le-flux.xml", "Blog test")


def test_common_feed_path_is_tried(site):
    site.pages["https://blog.fr/"] = HTML_WITHOUT_FEED
    site.pages["https://blog.fr/rss.xml"] = RSS
    assert web.resolve_rss_feed("https://blog.fr/") == ("https://blog.fr/rss.xml", "Blog test")


def test_redirected_site_is_searched_at_its_new_address(site):
    site.redirects["https://ancien.fr/"] = "https://nouveau.fr/"
    site.pages["https://nouveau.fr/"] = HTML_WITHOUT_FEED
    site.pages["https://nouveau.fr/feed/"] = RSS
    assert web.resolve_rss_feed("https://ancien.fr/") == ("https://nouveau.fr/feed/", "Blog test")


def test_site_without_feed_gives_a_clear_error(site):
    site.pages["https://blog.fr/"] = HTML_WITHOUT_FEED
    with pytest.raises(ValueError, match="Aucun flux RSS trouvé"):
        web.resolve_rss_feed("https://blog.fr/")


def test_invalid_address_is_rejected(site):
    with pytest.raises(ValueError, match="Adresse invalide"):
        web.resolve_rss_feed("ftp://blog.fr")


def test_resolve_route(client, site):
    site.pages["https://blog.fr/"] = HTML_WITH_FEED
    site.pages["https://blog.fr/le-flux.xml"] = RSS

    ok = client.post("/tools/rss/resolve", json={"url": "https://blog.fr/"})
    missing = client.post("/tools/rss/resolve", json={"url": "https://inconnu.fr/"})

    assert ok.get_json() == {"feed_url": "https://blog.fr/le-flux.xml", "name": "Blog test"}
    assert missing.status_code == 502
    assert "erreur 404" in missing.get_json()["error"]
    assert client.post("/tools/rss/resolve", json={}).status_code == 400


def test_fetch_refuses_non_http_urls():
    with pytest.raises(ValueError):
        web.fetch("file:///etc/passwd", 100)


def test_page_title_extraction():
    assert web.extract_title('<meta property="og:title" content="Titre &amp; co">') == "Titre & co"
    assert web.extract_title("<title>\n  Simple   titre </title>") == "Simple titre"
    assert web.extract_title("<p>rien</p>") is None
