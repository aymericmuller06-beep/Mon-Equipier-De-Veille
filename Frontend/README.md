# Frontend - Équipier de Veille

Application web React pour la gestion de surveillance et veille.

## 🚀 Quick Start

```bash
# Depuis la racine du projet:
docker compose up --build -d

# Frontend accessible sur: http://localhost:3000
```

---

## 📦 Prérequis

- Node.js 18+ 
- npm ou yarn

---

## 🔧 Installation locale

### 1. Initialiser le projet React (première fois)

```bash
cd Frontend

# Créer un nouveau projet React avec Vite
npm create vite@latest . -- --template react
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Démarrer le serveur de développement

```bash
npm run dev
```

Accéder à `http://localhost:3000`

---

## 🎯 Configuration API

Le Frontend communique avec le Backend API via les variables d'environnement.

### Fichier `.env.local` (créer à la racine de Frontend)

```env
VITE_API_URL=http://localhost:8000
```

### Fichier `.env.production` (optionnel, pour la prod)

```env
VITE_API_URL=https://api.votredomaine.com
```

### Exemple d'utilisation dans un composant React

```javascript
import { useEffect, useState } from 'react';

export default function ThemeList() {
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetch(`${API_URL}/themes`)
      .then(res => res.json())
      .then(data => {
        setThemes(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Chargement...</p>;
  if (error) return <p>Erreur: {error}</p>;

  return (
    <ul>
      {themes.map(theme => (
        <li key={theme.id}>{theme.name}</li>
      ))}
    </ul>
  );
}
```

---

## 📁 Structure recommandée

```
Frontend/
├── src/
│   ├── components/
│   │   ├── ThemeList.jsx
│   │   ├── SourceForm.jsx
│   │   └── ArticleCard.jsx
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── ThemesPage.jsx
│   │   └── SourcesPage.jsx
│   ├── services/
│   │   └── api.js              # Centralisez les appels API ici
│   ├── hooks/
│   │   ├── useFetch.js
│   │   └── useApi.js
│   ├── App.jsx                 # Composant root
│   ├── App.css
│   └── main.jsx                # Point d'entrée
├── public/                      # Assets statiques
├── index.html
├── vite.config.js
├── package.json
├── .env.local
├── Dockerfile
└── README.md
```

---

## 🛠️ Service API centralisé (Recommandé)

Créer `src/services/api.js` pour éviter les duplications:

```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = {
  // Themes
  getThemes: () => fetch(`${API_URL}/themes`).then(r => r.json()),
  createTheme: (name) => 
    fetch(`${API_URL}/themes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    }).then(r => r.json()),
  updateTheme: (id, name) =>
    fetch(`${API_URL}/themes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    }).then(r => r.json()),
  deleteTheme: (id) =>
    fetch(`${API_URL}/themes/${id}`, { method: 'DELETE' }).then(r => r.json()),

  // Sources
  getSources: () => fetch(`${API_URL}/sources`).then(r => r.json()),
  createSource: (name, url, theme_id) =>
    fetch(`${API_URL}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url, theme_id })
    }).then(r => r.json()),

  // Articles
  getArticles: () => fetch(`${API_URL}/articles`).then(r => r.json()),
  createArticle: (title, url, source_id, published_at) =>
    fetch(`${API_URL}/articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, url, source_id, published_at })
    }).then(r => r.json()),

  // Tags
  getTags: () => fetch(`${API_URL}/tags`).then(r => r.json()),
  createTag: (name) =>
    fetch(`${API_URL}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    }).then(r => r.json()),
};
```

Puis utiliser partout:
```javascript
import { api } from './services/api';

const handleAddTheme = async () => {
  try {
    const result = await api.createTheme('Mon thème');
    console.log('Créé:', result);
  } catch (error) {
    console.error('Erreur:', error);
  }
};
```

---

## 🚀 Build pour production

```bash
npm run build    # Crée dist/
npm run preview  # Prévisualiser la build
```

---

## 🐳 Docker

Le `Dockerfile` de Frontend est fourni et va:
1. Installer les dépendances Node
2. Builder l'app avec `npm run build`
3. Servir statiquement avec un serveur web

Le build se lance automatiquement avec `docker compose up --build`.

---

## 🎨 Styling (Recommandations)

### Option 1: Tailwind CSS (Recommandé pour ce projet)
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Option 2: CSS Modules
```css
/* ThemeList.module.css */
.container {
  display: flex;
  gap: 1rem;
}
```

```javascript
import styles from './ThemeList.module.css';

export default function ThemeList() {
  return <div className={styles.container}>...</div>;
}
```

### Option 3: Styled Components
```bash
npm install styled-components
```

---

## 🪝 Custom Hooks

### Hook pour les requêtes (useFetch.js)

```javascript
import { useEffect, useState } from 'react';

export function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(url)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e); setLoading(false); });
  }, [url]);

  return { data, loading, error };
}
```

Utilisation:
```javascript
const { data: themes, loading, error } = useFetch(`${API_URL}/themes`);
```

---

## 🔌 API à consommer

Voir [Backend/README.md](../Backend/README.md) pour la liste complète des endpoints.

### Endpoints principaux

```
GET    /themes              - Récupérer tous les thèmes
POST   /themes              - Créer un thème
PUT    /themes/:id          - Modifier
DELETE /themes/:id          - Supprimer

GET    /sources             - Récupérer toutes les sources
POST   /sources             - Créer une source
...
```

---

## 🛠️ Commandes utiles

```bash
# Développement
npm run dev

# Build pour production
npm run build

# Aperçu build
npm run preview

# Linter (si Eslint configuré)
npm run lint
```

---

## 📦 Dépendances recommandées

```bash
# Routage
npm install react-router-dom

# État global (optionnel)
npm install zustand
# ou
npm install jotai

# HTTP client (alternative à fetch)
npm install axios

# UI Components (optionnel)
npm install @headlessui/react
npm install @heroicons/react

# Styling
npm install -D tailwindcss postcss autoprefixer
```

---

## 🐛 Troubleshooting

| Problème | Solution |
|----------|----------|
| Port 3000 déjà utilisé | Vite utilisera le port suivant, ou changer `vite.config.js` |
| CORS error | Vérifier que le Backend a CORS activé |
| API unreachable | `docker compose logs backend` pour vérifier le Backend |
| Module not found | `npm install` et `npm cache clean` |
| Erreurs de build | Vérifier la Node version (`node --version` doit être 18+) |

---

## 🎯 Checklist de démarrage

- [ ] `npm create vite@latest . -- --template react`
- [ ] `npm install`
- [ ] Créer `src/services/api.js`
- [ ] Installer Tailwind (optionnel): `npm install -D tailwindcss postcss autoprefixer`
- [ ] Créer `.env.local` avec `VITE_API_URL`
- [ ] `npm run dev` pour tester localement
- [ ] `docker compose up --build -d` pour le full stack

---

## 📚 Ressources

- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [React Router](https://reactrouter.com)

---

*Mise à jour: 29/09/2026*
