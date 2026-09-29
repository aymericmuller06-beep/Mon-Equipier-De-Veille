# Dockerfile pour le Frontend React/Vue/Svelte
# À adapter selon ta stack (React, Vue, Svelte, etc.)

FROM node:18-alpine

WORKDIR /app

# Copier package files
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le code source
COPY . .

# Exposer le port de dev
EXPOSE 3000

# Démarrer le serveur de dev (à ajuster si nécessaire)
CMD ["npm", "run", "dev"]
