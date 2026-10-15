# Backend

API Flask + SQLite. Le lancement et la configuration sont décrits dans le [README principal](../README.md).

Dans l'API, une « veille » s'appelle un **thème**.

## Endpoints

| Méthodes | URL | Action |
|---|---|---|
| GET, POST | `/themes` | Lister ou créer des veilles |
| PUT, DELETE | `/themes/<id>` | Modifier ou supprimer une veille |
| GET, POST | `/sources` | Lister (`?theme_id=`, `?tool_type=`) ou créer des sources |
| GET, PUT, DELETE | `/sources/<id>` | Lire, modifier ou supprimer une source |
| POST | `/sources/<id>/sync` | Importer les nouveaux articles du flux |
| GET, POST | `/articles` | Lister (`?theme_id=`, `?status=`, `?source_id=`, `?tool_type=`, `?limit=`, `?sort=decision`) ou créer des articles. Chaque article inclut `source_name` et `tags` |
| PATCH | `/articles/<id>` | Changer le statut (`new`, `validated`, `trash`) et/ou la note (`status_reason`) |
| PUT, DELETE | `/articles/<id>` | Modifier ou supprimer un article |
| DELETE | `/articles/trash?theme_id=` | Vider la corbeille d'une veille (les articles ne seront pas réimportés) |
| GET, POST | `/tags` | Lister ou créer des tags |
| PUT, DELETE | `/tags/<id>` | Modifier ou supprimer un tag |
| GET, POST | `/articles/<id>/tags` | Lire ou associer les tags d'un article |
| DELETE | `/articles/<id>/tags/<tag_id>` | Retirer un tag d'un article |
| GET | `/stats?theme_id=` | Chiffres du dashboard (statuts, articles par jour, pertinence par source, tags) |
| POST | `/system/reset` | Vider la base (corps requis : `{"confirm": "RESET"}`) |
