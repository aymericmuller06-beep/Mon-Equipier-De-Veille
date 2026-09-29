# Équipier de Veille

Application de surveillance et de veille, avec architecture séparant Frontend et Backend.

## 🚀 Démarrage rapide

### Prérequis
- Docker
- Docker Compose

### Installation et lancement

```bash
# 1. Cloner le projet
git clone <repo>
cd Equipier_de_Veille

# 2. Initialiser le Frontend React
cd Frontend
npm create vite@latest . -- --template react
npm install
cd ..

# 3. Démarrer l'application complète
docker compose up --build -d

# 4. Accéder à l'application
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8000
```

---

## 📁 Structure du projet

```
Equipier_de_Veille/
├── Backend/                    # API Flask + SQLite
│   ├── main.py
│   ├── routes.py
│   ├── database.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── README.md              # Documentation Backend
├── Frontend/                   # Application React
│   ├── src/
│   ├── package.json
│   ├── Dockerfile
│   └── README.md              # Documentation Frontend
├── data/                       # Données persistantes (SQLite)
├── docker-compose.yml          # Configuration services
├── README.md                   # Ce fichier
└── .gitignore
```

---

## 🏗️ Architecture

### Services Docker

| Service | Port | Description |
|---------|------|-------------|
| **backend** | 8000 | API Flask avec SQLite |
| **frontend** | 3000 | Application web (React/Vue/Svelte) |

### Communication

```
Frontend (React, port 3000)
    ↓ HTTP/REST
Backend API (Flask, port 8000)
    ↓ SQL
SQLite (./data)
```

---

## 📚 Documentation

- **[Backend](./Backend/README.md)** - API endpoints, configuration, déploiement
- **[Frontend](./Frontend/README.md)** - Setup, build, structure du projet

---

## 🔧 Commandes utiles

```bash
# Démarrer les services
docker compose up --build -d

# Voir les logs en direct
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f backend
docker compose logs -f frontend

# Arrêter les services
docker compose down

# Redémarrer après changements backend
docker compose up --build -d

# Accéder au shell du backend
docker compose exec backend /bin/bash
```

---

## 💾 Données persistantes

Les données SQLite sont stockées dans `./data/` en volume Docker. Elles persisten même après l'arrêt des conteneurs.

Pour réinitialiser la base:
```bash
rm -rf ./data
docker compose up --build -d
```

---

## 🐛 Troubleshooting

| Problème | Solution |
|----------|----------|
| Port 3000/8000 déjà utilisé | Modifier les ports dans `docker-compose.yml` |
| Changements backend pas appliqués | Utiliser `docker compose up --build -d` |
| Frontend ne se connecte pas au backend | Vérifier que `VITE_API_URL` pointe sur `http://localhost:8000` |
| Erreur de permissions sur ./data | Le dossier est créé automatiquement, vérifier les droits |

---

## 📝 Notes de développement

- **Backend**: Flask + SQLite avec validation des données
- **Frontend**: React 18+ avec Vite
- **Logging**: Les erreurs sont loggées côté backend, messages simplifiés pour le client
- **Validation**: URLs, longueurs min/max, existence des références

---

*Mise à jour: 29/09/2026*
