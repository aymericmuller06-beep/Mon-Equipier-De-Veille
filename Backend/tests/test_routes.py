from conftest import make_article, make_source, make_theme


def test_root(client):
    assert client.get("/").get_json()["status"] == "online"


# ---------- Veilles (thèmes) ----------

def test_theme_creation_and_validation(client):
    created = client.post("/themes", json={"name": "Cyber", "accent_color": "blue", "description": "Menaces"})
    assert created.status_code == 201
    assert created.get_json()["accent_color"] == "blue"

    assert client.post("/themes", json={"name": "Cyber"}).status_code == 409
    assert client.post("/themes", json={"name": "Autre", "accent_color": "fuchsia"}).status_code == 400
    assert client.post("/themes", json={"name": "x" * 101}).status_code == 400
    assert client.post("/themes", json={}).status_code == 400


def test_theme_update(client):
    theme_id = make_theme(client)
    make_theme(client, "Prise")

    updated = client.put(f"/themes/{theme_id}", json={"description": "Nouvelle description"}).get_json()

    assert updated["name"] == "Veille test"
    assert updated["description"] == "Nouvelle description"
    assert client.put(f"/themes/{theme_id}", json={"name": "Prise"}).status_code == 409
    assert client.put("/themes/999", json={"name": "Fantôme"}).status_code == 404


def test_deleting_a_theme_deletes_its_sources_and_articles(client, db):
    theme_id = make_theme(client)
    source_id = make_source(client, theme_id)
    make_article(db, source_id)

    assert client.delete(f"/themes/{theme_id}").status_code == 200
    assert db.execute("SELECT COUNT(*) FROM sources").fetchone()[0] == 0
    assert db.execute("SELECT COUNT(*) FROM articles").fetchone()[0] == 0
    assert client.delete(f"/themes/{theme_id}").status_code == 404


# ---------- Sources ----------

def test_source_validation(client):
    theme_id = make_theme(client)
    base = {"name": "Flux", "url": "https://exemple.fr/feed", "theme_id": theme_id}

    assert client.post("/sources", json={**base, "url": "pas-une-url"}).status_code == 400
    assert client.post("/sources", json={**base, "url": "javascript:alert(1)"}).status_code == 400
    assert client.post("/sources", json={**base, "tool_type": "myspace"}).status_code == 400
    assert client.post("/sources", json={**base, "theme_id": 999}).status_code == 404
    assert client.post("/sources", json={**base, "include_keywords": "x" * 501}).status_code == 400


def test_sources_list_filters_and_status_fields(client):
    theme_id = make_theme(client)
    make_source(client, theme_id, tool_type="rss")
    make_source(client, theme_id, url="https://www.youtube.com/feeds/videos.xml?channel_id=x", tool_type="youtube")
    make_source(client, make_theme(client, "Autre"))

    sources = client.get(f"/sources?theme_id={theme_id}&tool_type=youtube").get_json()

    assert len(sources) == 1
    assert {"last_sync_at", "last_success_at", "last_error", "error_since", "last_article_at"} <= set(sources[0])


def test_changing_filters_can_trash_pending_articles(client, db):
    source_id = make_source(client, make_theme(client))
    kept = make_article(db, source_id, title="Docker et Podman", url="https://exemple.fr/1")
    trashed = make_article(db, source_id, title="Recette de crêpes", url="https://exemple.fr/2")
    validated = make_article(db, source_id, title="Autre sujet validé", url="https://exemple.fr/3", status="validated")

    result = client.patch(f"/sources/{source_id}", json={"include_keywords": "docker", "apply_to_existing": True}).get_json()

    assert result["trashed"] == 1
    assert result["include_keywords"] == "docker"
    statuses = dict(db.execute("SELECT id, status FROM articles").fetchall())
    assert statuses == {kept: "new", trashed: "trash", validated: "validated"}


def test_deleting_a_source_deletes_its_articles(client, db):
    source_id = make_source(client, make_theme(client))
    make_article(db, source_id)

    assert client.delete(f"/sources/{source_id}").status_code == 200
    assert db.execute("SELECT COUNT(*) FROM articles").fetchone()[0] == 0
    assert client.delete(f"/sources/{source_id}").status_code == 404


# ---------- Articles ----------

def test_changing_status_records_the_decision_date(client, db):
    article_id = make_article(db, make_source(client, make_theme(client)))

    validated = client.patch(f"/articles/{article_id}", json={"status": "validated", "status_reason": "Pertinent"}).get_json()
    noted = client.patch(f"/articles/{article_id}", json={"status_reason": "Très pertinent"}).get_json()

    assert validated["status"] == "validated"
    assert validated["status_changed_at"] is not None
    # Modifier seulement la note ne change pas la date de décision
    assert noted["status_changed_at"] == validated["status_changed_at"]
    assert noted["status_reason"] == "Très pertinent"


def test_status_validation(client, db):
    article_id = make_article(db, make_source(client, make_theme(client)))

    assert client.patch(f"/articles/{article_id}", json={"status": "archived"}).status_code == 400
    assert client.patch(f"/articles/{article_id}", json={}).status_code == 400
    assert client.patch(f"/articles/{article_id}", json={"status_reason": "x" * 2001}).status_code == 400
    assert client.patch("/articles/999", json={"status": "trash"}).status_code == 404


def test_old_status_route_is_gone(client, db):
    article_id = make_article(db, make_source(client, make_theme(client)))
    assert client.patch(f"/articles/{article_id}/status", json={"status": "trash"}).status_code in (404, 405)


def test_article_filters_and_search(client, db):
    theme_id = make_theme(client)
    source_id = make_source(client, theme_id)
    make_article(db, source_id, title="Sécurité des PME", url="https://exemple.fr/1")
    make_article(db, source_id, title="Nouveau NAS", url="https://exemple.fr/2", status="validated")
    make_article(db, make_source(client, make_theme(client, "Autre")), title="Sécurité ailleurs", url="https://exemple.fr/3")

    def titles(query):
        return sorted(a["title"] for a in client.get(f"/articles?{query}").get_json())

    assert titles(f"theme_id={theme_id}") == ["Nouveau NAS", "Sécurité des PME"]
    assert titles(f"theme_id={theme_id}&status=validated") == ["Nouveau NAS"]
    # Sans accents ni majuscules
    assert titles(f"theme_id={theme_id}&q=SECURITE") == ["Sécurité des PME"]
    # Les caractères spéciaux de LIKE sont cherchés tels quels
    assert titles(f"theme_id={theme_id}&q=%25") == []
    assert len(client.get("/articles?limit=1").get_json()) == 1


def test_manual_article(client):
    theme_id = make_theme(client)
    body = {"url": "https://exemple.fr/trouve", "title": "Trouvé moi-même", "theme_id": theme_id, "status": "validated"}

    created = client.post("/articles/manual", json=body)
    duplicate = client.post("/articles/manual", json=body)

    assert created.status_code == 201
    assert created.get_json()["tool_type"] == "manual"
    assert created.get_json()["status_changed_at"] is not None
    assert duplicate.status_code == 409
    assert "articles validés" in duplicate.get_json()["error"]
    assert client.post("/articles/manual", json={**body, "url": "https://exemple.fr/autre", "status": "trash"}).status_code == 400
    assert client.post("/articles/manual", json={**body, "published_at": "pas une date"}).status_code == 400
    # Une seule source « Ajout manuel » par veille
    assert len(client.get(f"/sources?theme_id={theme_id}&tool_type=manual").get_json()) == 1


# ---------- Tags ----------

def test_tags_on_articles(client, db):
    article_id = make_article(db, make_source(client, make_theme(client)))
    tag = client.post("/tags", json={"name": "urgent"}).get_json()

    assert client.post("/tags", json={"name": "urgent"}).status_code == 409
    assert client.post(f"/articles/{article_id}/tags", json={"tag_id": tag["id"]}).status_code == 201
    assert client.post(f"/articles/{article_id}/tags", json={"tag_id": tag["id"]}).status_code == 409
    assert client.post(f"/articles/{article_id}/tags", json={"tag_id": 999}).status_code == 404
    assert client.get("/articles").get_json()[0]["tags"] == [{"id": tag["id"], "name": "urgent"}]

    assert client.delete(f"/articles/{article_id}/tags/{tag['id']}").status_code == 200
    assert client.get("/articles").get_json()[0]["tags"] == []


def test_tag_rename_and_delete(client):
    tag_id = client.post("/tags", json={"name": "a"}).get_json()["id"]
    client.post("/tags", json={"name": "b"})

    assert client.put(f"/tags/{tag_id}", json={"name": "b"}).status_code == 409
    assert client.put(f"/tags/{tag_id}", json={"name": "c"}).get_json()["name"] == "c"
    assert client.delete(f"/tags/{tag_id}").status_code == 200
    assert [t["name"] for t in client.get("/tags").get_json()] == ["b"]


def test_tag_usage_per_watch(client, db):
    theme_id = make_theme(client, "Cyber")
    other_theme = make_theme(client, "IA")
    source_id = make_source(client, theme_id)
    other_source = make_source(client, other_theme)
    tag_id = client.post("/tags", json={"name": "urgent"}).get_json()["id"]
    unused_id = client.post("/tags", json={"name": "inutile"}).get_json()["id"]
    for url, status, source in (("1", "new", source_id), ("2", "validated", source_id), ("3", "validated", source_id), ("4", "new", other_source)):
        article_id = make_article(db, source, url=f"https://exemple.fr/{url}", status=status)
        client.post(f"/articles/{article_id}/tags", json={"tag_id": tag_id})

    tags = {tag["id"]: tag for tag in client.get(f"/tags?theme_id={theme_id}").get_json()}

    assert tags[tag_id] == {"id": tag_id, "name": "urgent", "new": 1, "validated": 2, "trash": 0, "total": 4, "other_themes": ["IA"]}
    assert tags[unused_id]["total"] == 0 and tags[unused_id]["other_themes"] == []
    # Sans veille : la liste simple, comme avant
    assert set(client.get("/tags").get_json()[0]) == {"id", "name"}


def test_tag_merge(client, db):
    source_id = make_source(client, make_theme(client))
    typo = client.post("/tags", json={"name": "cyebr"}).get_json()["id"]
    good = client.post("/tags", json={"name": "cyber"}).get_json()["id"]
    both = make_article(db, source_id, url="https://exemple.fr/1")
    only_typo = make_article(db, source_id, url="https://exemple.fr/2")
    for article_id, tag_id in ((both, typo), (both, good), (only_typo, typo)):
        client.post(f"/articles/{article_id}/tags", json={"tag_id": tag_id})

    result = client.post(f"/tags/{typo}/merge", json={"into": good})

    assert result.get_json() == {"id": good, "name": "cyber", "moved": 1}
    assert [t["name"] for t in client.get("/tags").get_json()] == ["cyber"]
    tags_by_article = {a["id"]: [t["name"] for t in a["tags"]] for a in client.get("/articles").get_json()}
    assert tags_by_article == {both: ["cyber"], only_typo: ["cyber"]}
    assert client.post(f"/tags/{good}/merge", json={"into": good}).status_code == 400
    assert client.post(f"/tags/{good}/merge", json={"into": 999}).status_code == 404
    assert client.post(f"/tags/{good}/merge", json={}).status_code == 400


# ---------- Dashboard ----------

def test_stats(client, db):
    theme_id = make_theme(client)
    source_id = make_source(client, theme_id)
    make_article(db, source_id, url="https://exemple.fr/1")
    make_article(db, source_id, url="https://exemple.fr/2", status="validated", status_changed_at="2026-11-02T10:00:00+00:00")
    make_article(db, source_id, url="https://exemple.fr/3", status="trash", status_changed_at="2026-11-02T10:00:00+00:00")

    stats = client.get(f"/stats?theme_id={theme_id}&days=7").get_json()

    assert stats["by_status"] == {"new": 1, "validated": 1, "trash": 1}
    assert len(stats["by_day"]) == 7
    assert stats["by_source"][0]["validated"] == 1
    assert client.get("/stats").status_code == 400


# ---------- Système ----------

def test_reset_requires_confirmation(client, db):
    make_source(client, make_theme(client))

    assert client.post("/system/reset", json={}).status_code == 400
    assert client.post("/system/reset", json={"confirm": "RESET"}).status_code == 200
    assert client.get("/themes").get_json() == []
    assert db.execute("SELECT COUNT(*) FROM sources").fetchone()[0] == 0
