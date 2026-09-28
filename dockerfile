# Version officielle, stable à ce jour 28/09/2026
FROM python:3.14-slim

# Définit le dossier de travail dans le conteneur
WORKDIR /app

# Installe les dépendances système nécessaires si besoin
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Copie le fichier des dépendances Python et les installe
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copie le reste du code source de l'application dans le conteneur
COPY . .

# Indique le port sur lequel l'application écoute
EXPOSE 8000

# Commande pour lancer l'application (par exemple avec FastAPI/Uvicorn)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]