# Mon équipier de veille

Application de veille : créez des espaces de veille, branchez-y des Google Alerts, puis triez les articles collectés. Chaque article est un ticket que l'on valide ou refuse, avec des tags et une note pour garder la raison du choix. Le dashboard résume la veille en un coup d'œil.

- **Frontend** : React + Vite ([Frontend/](Frontend/README.md))
- **Backend** : API Flask + SQLite ([Backend/](Backend/README.md))

## Démarrer avec Docker

```bash
docker compose up --build -d
```

- Interface : <http://localhost:3000>
- API : <http://localhost:8000>

Arrêter : `docker compose down`. Les données sont conservées dans `data/veille.db`.

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
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Adresses autorisées à appeler l'API depuis un navigateur |
| `DATABASE_PATH` | `data/veille.db` | Emplacement de la base SQLite |
| `FLASK_DEBUG` | désactivé | `1` pour le mode debug (uniquement en local) |

Côté frontend, l'adresse de l'API se règle avec `VITE_API_URL` (voir `Frontend/.env.example`).
