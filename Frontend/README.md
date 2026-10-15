# Frontend

Interface web en React + Vite.

```bash
npm ci
npm run dev     # serveur de développement sur http://localhost:5173
npm run lint    # vérification du code
npm run build   # build de production dans dist/
```

L'adresse de l'API est lue dans `VITE_API_URL` (copiez `.env.example` en `.env` si besoin). Elle est intégrée au moment du build : en Docker, elle se règle dans `docker-compose.yml` (`args`).
