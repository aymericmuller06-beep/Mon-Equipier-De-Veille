# Backend - Équipier de Veille
API Flask pour gérer les thèmes, les sources, les articles et les tags.

## Installation et démarrage

Depuis la racine du projet, démarrez les services avec Docker :

```bash
docker compose up --build
```

L'API est disponible sur <http://localhost:8000>. La base SQLite est conservée dans `data/veille.db`.

Pour vérifier que l'API répond :

```bash
curl http://localhost:8000/themes
```

## Endpoints

| Méthodes | URL | Action |
|---|---|---|
| GET, POST | `/themes` | Lire ou créer des thèmes |
| PUT, DELETE | `/themes/<id>` | Modifier ou supprimer un thème |
| GET, POST | `/sources` | Lire ou créer des sources |
| PUT, DELETE | `/sources/<id>` | Modifier ou supprimer une source |
| GET, POST | `/articles` | Lire ou créer des articles |
| PUT, DELETE | `/articles/<id>` | Modifier ou supprimer un article |
| GET, POST | `/tags` | Lire ou créer des tags |
| PUT, DELETE | `/tags/<id>` | Modifier ou supprimer un tag |
| GET, POST | `/articles/<id>/tags` | Lire ou associer les tags d'un article |
| DELETE | `/articles/<id>/tags/<tag_id>` | Retirer un tag d'un article |
