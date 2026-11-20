# Mon équipier de veille

Application de veille : créez des espaces de veille, branchez-y des sources (Google Alerts, Google News, YouTube, Reddit, n'importe quel flux RSS), puis triez les articles collectés. Chaque article est un ticket que l'on valide ou refuse, avec des tags et une note pour garder la raison du choix. Le dashboard résume la veille en un coup d'œil.

- **Frontend** : React + Vite ([Frontend/](Frontend/README.md))
- **Backend** : API Flask + SQLite ([Backend/](Backend/README.md))

## Démarrer avec Docker

```bash
docker compose up --build -d
```

- Interface : <http://localhost:3000>
- API : <http://localhost:8000>

Arrêter : `docker compose down`. Les données sont conservées dans `data/veille.db` (avec ses fichiers `veille.db-wal` et `veille.db-shm`), et les sauvegardes dans `data/backups/`.

Le frontend Docker est une version compilée : après une modification du code, reconstruisez-le avec `docker compose up --build -d frontend`. Pour un rechargement automatique pendant le développement, gardez le backend dans Docker et lancez le frontend avec `npm run dev` (voir ci-dessous).

## Démarrer en local (développement)

Backend (Python 3.12+) :

```bash
cd Backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
FLASK_DEBUG=1 python main.py
```

Frontend (Node 20+), dans un autre terminal :

```bash
cd Frontend
npm ci
npm run dev
```

L'interface est sur <http://localhost:5173>.

## Configuration du backend

| Variable | Par défaut | Rôle |
|---|---|---|
| `SYNC_INTERVAL_MINUTES` | `60` | Fréquence de synchronisation automatique des sources (`0` pour désactiver) |
| `REDDIT_MIN_INTERVAL_SECONDS` | `60` | Délai entre deux requêtes vers Reddit pendant la synchro automatique (Reddit refuse les requêtes trop rapprochées) |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Adresses autorisées à appeler l'API depuis un navigateur |
| `DATABASE_PATH` | `data/veille.db` | Emplacement de la base SQLite |
| `TRASH_RETENTION_DAYS` | `30` | Jours avant qu'un article de la corbeille soit supprimé définitivement (`0` pour désactiver) |
| `BACKUP_INTERVAL_HOURS` | `24` | Fréquence des sauvegardes automatiques de la base (`0` pour désactiver) |
| `BACKUP_KEEP` | `7` | Nombre de sauvegardes conservées (les plus anciennes sont supprimées) |
| `BACKUP_DIR` | `data/backups` | Dossier des sauvegardes (à côté de la base par défaut) |
| `FLASK_DEBUG` | désactivé | `1` pour le mode debug (uniquement en local) |

Côté frontend, l'adresse de l'API se règle avec `VITE_API_URL` (voir `Frontend/.env.example`).

## Maintenance automatique

Au démarrage puis toutes les heures, le backend :

- supprime les articles restés dans la corbeille plus de `TRASH_RETENTION_DAYS` jours (comme « Vider la corbeille », ils ne seront pas réimportés) ;
- sauvegarde la base si la dernière sauvegarde date de plus de `BACKUP_INTERVAL_HOURS` heures. Les fichiers s'appellent `veille-AAAAMMJJ-HHMMSS.db` (heure UTC).

Les sauvegardes restent sur la même machine que la base : pensez à les copier ailleurs régulièrement.

### Restaurer une sauvegarde

```bash
docker compose stop backend
cp data/backups/veille-AAAAMMJJ-HHMMSS.db data/veille.db
rm -f data/veille.db-wal data/veille.db-shm   # indispensable : ces fichiers appartiennent à l'ancienne base
docker compose start backend
```

## Évolutions de la base

Le schéma est versionné (`PRAGMA user_version`). Pour le faire évoluer, ajoutez une fonction à la fin de la liste `MIGRATIONS` dans `Backend/database.py`. Elle s'appliquera une seule fois, au prochain démarrage. Ne modifiez jamais une migration déjà livrée.
