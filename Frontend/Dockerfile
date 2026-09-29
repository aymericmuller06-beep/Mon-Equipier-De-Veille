# Dockerfile pour le Frontend React/Vue/Svelte
# À adapter selon ta stack (React, Vue, Svelte, etc.)

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
