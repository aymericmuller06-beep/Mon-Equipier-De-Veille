# Équipier de Veille

Application de surveillance et de veille, containerisée avec Docker.

## Prérequis

- Docker
- Docker Compose

## Installation et démarrage

### Avec Docker Compose

1. Clonez ou téléchargez le projet
2. Placez-vous dans le répertoire du projet
3. Lancez l'application (en cas de changements back, utiliser `--build`) :

```bash
docker compose up --build -d
```

L'application sera accessible à `http://localhost:8000`

## Architecture

### Stack Technologique

- **Framework** : Flask (Python)
- **Base de données** : SQLite
- **Containerisation** : Docker + Docker Compose

### Docker Compose

- **Service web** : Application Python Flask
  - Port : `8000:8000`
  - Container : `equipier_veille_app`
  - Redémarrage automatique si arrêt inattendu

### Volumes

- `./data:/app/data` : Dossier partagé pour la persistence des données (base de données SQLite)

## Configuration

### Dockerfile

- **Image de base** : Python 3.14-slim
- **Framework** : Flask
- **Base de données** : SQLite (built-in Python)
- **Dépendances** : Installées depuis `requirements.txt`

### Fichier requirements.txt

Contient les dépendances Python nécessaires :
- `flask>=3.1.3` : Framework web

## Commandes utiles

```bash
# Démarrer l'application (avec rebuild si changements)
docker compose up --build -d

# Démarrer l'application (sans rebuild)
docker compose up -d

# Arrêter l'application
docker compose down

# Voir les logs en direct
docker compose logs -f web

# Redémarrer le service
docker compose restart web
```

## Structure du projet

```
.
├── dockerfile              # Configuration Docker
├── docker-compose.yml      # Configuration Docker Compose
├── requirements.txt        # Dépendances Python
├── README.md              # Ce fichier
├── Backend/
│   ├── main.py            # Point d'entrée de l'application Flask
│   ├── routes.py          # Endpoints API (CRUD pour themes, sources, articles, tags)
│   └── database.py        # Initialisation et gestion de la base SQLite
├── Frontend/              # À documenter
├── Data/                  # À documenter
├── Archives/              # Anciens fichiers
└── data/                  # Dossier pour les données persistantes (créé au démarrage)
```

## API Endpoints

### Themes
- `GET /themes` - Récupérer tous les thèmes
- `POST /themes` - Créer un thème
- `PUT /themes/<id>` - Modifier un thème
- `DELETE /themes/<id>` - Supprimer un thème

### Sources
- `GET /sources` - Récupérer toutes les sources
- `POST /sources` - Créer une source
- `PUT /sources/<id>` - Modifier une source
- `DELETE /sources/<id>` - Supprimer une source

### Articles
- `GET /articles` - Récupérer tous les articles
- `POST /articles` - Créer un article
- `PUT /articles/<id>` - Modifier un article
- `DELETE /articles/<id>` - Supprimer un article
- `GET /articles/<id>/tags` - Récupérer les tags d'un article
- `POST /articles/<id>/tags` - Ajouter un tag à un article
- `DELETE /articles/<id>/tags/<tag_id>` - Retirer un tag d'un article

### Tags
- `GET /tags` - Récupérer tous les tags
- `POST /tags` - Créer un tag
- `PUT /tags/<id>` - Modifier un tag
- `DELETE /tags/<id>` - Supprimer un tag

### Santé
- `GET /` - Vérifier que le serveur est opérationnel

## Données persistantes

Les données SQLite sont stockées dans le dossier `./data` monté dans le conteneur. Cela garantit que les données ne sont pas perdues lors de l'arrêt ou du redémarrage du conteneur.

### Tables de la base de données

- `themes` : Catégories de surveillance
- `sources` : Sources d'information (URLs)
- `articles` : Articles récupérés
- `tags` : Étiquettes pour classifier les articles
- `article_tags` : Relation many-to-many entre articles et tags

## Troubleshooting

- **Le port 8000 est déjà utilisé** : Modifiez le mapping des ports dans `docker-compose.yml` (ex: `"8001:8000"`)
- **Erreur de permissions sur ./data** : Le dossier est créé automatiquement au démarrage avec les bonnes permissions
- **Les changements du backend ne sont pas appliqués** : Utilisez `docker compose up --build -d` pour rebuilder l'image

---

*Mise à jour : 29/09/2026*
