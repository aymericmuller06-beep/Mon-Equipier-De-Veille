# Frontend

Interface web développée avec React et Vite.

## Installation et démarrage

Prérequis : Node.js et npm. Depuis le dossier `Frontend/` :

```bash
npm ci
npm run dev
```

Ouvrez l'adresse affichée dans le terminal (par défaut <http://localhost:5173>).

## Avec Docker

Depuis la racine du projet, démarrez l'application :

```bash
docker compose up --build
```

L'interface est disponible sur <http://localhost:3000>.

Vérification et build de production :

```bash
npm run lint
npm run build
```