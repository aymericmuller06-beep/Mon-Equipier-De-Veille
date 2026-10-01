# Equipier de Veille
Application de veille composée d'une interface web, d'une API Flask et d'une base SQLite.

## Installation et démarrage

Prérequis : Docker et Docker Compose.

Depuis la racine du projet, démarrez l'application complète :

```bash
docker compose up --build
```

Lancez en arrière-plan avec `docker compose up --build -d`.

- Interface web : <http://localhost:3000>
- API : <http://localhost:8000>

Pour arrêter les services lancés en arrière-plan :

```bash
docker compose down
```

## Lancer le frontend en local

Prérequis : Node.js et npm. Depuis la racine du projet :

```bash
cd Frontend
npm ci
npm run dev
```

Vite affiche l'adresse locale dans le terminal (par défaut <http://localhost:5173>). Le backend doit être démarré séparément.

La base SQLite est stockée dans `data/veille.db`.

Documentation complémentaire : [API](Backend/README.md) et [frontend](Frontend/README.md).
