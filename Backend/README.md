# Backend

API Flask + SQLite. Le lancement et la configuration sont décrits dans le [README principal](../README.md).

Dans l'API, une « veille » s'appelle un **thème**.

## Organisation du code

| Fichier | Rôle |
|---|---|
| `main.py` | Création de l'application (`create_app`) et lancement des tâches de fond |
| `database.py` | Connexion SQLite et migrations versionnées (`MIGRATIONS`) |
| `routes/` | Routes de l'API, un fichier par ressource : `themes`, `sources`, `articles` (et leurs tags), `tags`, `stats`, `tools`, `system`. Validations communes dans `routes/common.py` |
| `sync.py` | Synchronisation des sources (filtres, dédoublonnage, état, espacement Reddit) |
| `maintenance.py` | Purge de la corbeille et sauvegardes |
| `rss.py`, `web.py` | Lecture des flux et des pages web (titre d'une page, flux d'un site ou d'une chaîne YouTube) |
| `tests/` | Tests pytest (voir le README principal) |

Pour ajouter une route, déclarez-la avec `@api.route` dans le fichier de sa ressource. Pour une nouvelle ressource, créez le fichier dans `routes/` et ajoutez-le à l'import de `routes/__init__.py`.

## Endpoints

| Méthodes | URL | Action |
|---|---|---|
| GET, POST | `/themes` | Lister ou créer des veilles |
| PUT, DELETE | `/themes/<id>` | Modifier ou supprimer une veille |
| GET, POST | `/sources` | Lister (`?theme_id=`, `?tool_type=`) ou créer des sources. Chaque source inclut l'état de sa dernière synchro (voir plus bas) |
| GET, PUT, DELETE | `/sources/<id>` | Lire, modifier ou supprimer une source |
| PATCH | `/sources/<id>` | Renommer une source ou changer ses filtres par mots-clés (`apply_to_existing` envoie à la corbeille les articles à traiter qui ne passent plus les filtres) |
| POST | `/sources/<id>/sync` | Importer les nouveaux articles du flux |
| POST | `/tools/rss/resolve` | Trouver le flux RSS d'un site à partir de son adresse (`{"url"}` → `{"feed_url", "name"}`) |
| POST | `/tools/youtube/resolve` | Trouver le flux d'une chaîne ou d'une playlist YouTube à partir de son lien |
| POST | `/articles/manual` | Ajouter à une veille un article trouvé soi-même (`url`, `theme_id`, titre facultatif) |
| GET, POST | `/articles` | Lister (`?theme_id=`, `?status=`, `?source_id=`, `?tool_type=`, `?limit=`, `?sort=decision`) ou créer des articles. Chaque article inclut `source_name`, `tags` et `purge_at` (date de suppression automatique s'il est dans la corbeille, sinon `null`) |
| PATCH | `/articles/<id>` | Changer le statut (`new`, `validated`, `trash`) et/ou la note (`status_reason`) |
| PUT, DELETE | `/articles/<id>` | Modifier ou supprimer un article |
| DELETE | `/articles/trash?theme_id=` | Vider la corbeille d'une veille (les articles ne seront pas réimportés) |
| GET, POST | `/tags` | Lister ou créer des tags |
| PUT, DELETE | `/tags/<id>` | Modifier ou supprimer un tag |
| GET, POST | `/articles/<id>/tags` | Lire ou associer les tags d'un article |
| DELETE | `/articles/<id>/tags/<tag_id>` | Retirer un tag d'un article |
| GET | `/stats?theme_id=` | Chiffres du dashboard (statuts, articles par jour, pertinence par source, tags) |
| POST | `/system/reset` | Vider la base (corps requis : `{"confirm": "RESET"}`) |

## État de synchronisation des sources

Chaque source renvoie, en plus de ses réglages :

| Champ | Contenu |
|---|---|
| `last_sync_at` | Dernière tentative de synchronisation (`null` si jamais synchronisée) |
| `last_success_at` | Dernière synchronisation réussie |
| `last_error` | Message de la dernière erreur, `null` si la dernière synchro a réussi |
| `error_since` | Début de la série d'erreurs en cours, `null` si la dernière synchro a réussi |
| `last_article_at` | Date du dernier article importé |

L'interface en tire une pastille par flux : erreur passagère (moins de 24 h d'erreurs), en panne (24 h ou plus), rien de neuf (aucun article depuis 30 jours).
