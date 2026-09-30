# Equipier de Veille

Projet de gestion de sources, thèmes et articles.

## Structure du projet

```
.
├── Backend/              # API Flask
│   ├── main.py          # Application principale
│   ├── routes.py        # Endpoints API
│   ├── database.py       # Configuration SQLite
│   ├── Dockerfile       # Build backend
│   ├── requirements.txt  # Dépendances Python
│   └── README.md        # Documentation API
├── Frontend/            # Application frontend
├── Data/               # Données
├── data/               # Volume SQLite
├── docker-compose.yml   # Configuration services
└── README.md           # Ce fichier
```

## Démarrage

### Avec Docker Compose
```bash
docker compose up --build -d
```

Backend accessible sur `http://localhost:8000`

### Backend uniquement (local)
```bash
cd Backend
pip install -r requirements.txt
python main.py
```

## API Backend

Endpoints API pour thèmes, sources, articles et tags.

Voir [Backend/README.md](Backend/README.md) pour la documentation complète.

Validation:
- URLs: format http/https valide
- Textes: longueurs min/max selon ressource  
- Relations: existence des IDs

## Base de données

SQLite automatiquement initialisée. Fichier: `data/veille.db`

Schéma:
- `themes` - Thèmes de veille
- `sources` - Sources d'information
- `articles` - Articles collectés
- `tags` - Tags pour classification
- `article_tags` - Relation many-to-many

Contraintes:
- Clés étrangères activées
- Cascade delete sur suppressions

## Services

| Service | Port | Build |
|---------|------|-------|
| backend | 8000 | ./Backend |
| frontend | 3000 | ./Frontend |

## Frontend

Dossier Frontend/ prêt pour l'application frontend.

```bash
cd Frontend
npm run dev
```

Configuration pour communiquer avec le backend sur `http://localhost:8000`:
- Variable d'environnement `REACT_APP_API_URL`
- CORS géré côté backend
