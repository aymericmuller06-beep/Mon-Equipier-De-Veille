# Équipier de Veille

Application de surveillance et de veille, containerisée avec Docker.

## Prérequis

- Docker
- Docker Compose

## Installation et démarrage

### Avec Docker Compose

1. Clonez ou téléchargez le projet
2. Placez-vous dans le répertoire du projet
3. Lancez l'application :

```bash
docker-compose up -d
```

L'application sera accessible à `http://localhost:8000`

## Architecture

### Docker Compose

- **Service web** : Application Python Flask
  - Port : `8000:8000`
  - Container : `equipier_veille_app`
  - Redémarrage automatique si arrêt inattendu

### Volumes

- `./data:/app/data` : Dossier partagé pour la persistence des données (base de données SQLite, etc.)

## Configuration

### Dockerfile

- **Image de base** : Python 3.14-slim
- **Runtime** : flask
- **Dépendances** : Installées depuis `requirements.txt`

### Fichier requirements.txt

Assurez-vous que le fichier `requirements.txt` contient les dépendances nécessaires, notamment :
- `fastapi`
- `uvicorn`
- Autres dépendances du projet

## Commandes utiles

```bash
# Démarrer l'application
docker-compose up -d

# Arrêter l'application
docker-compose down

# Voir les logs
docker-compose logs -f web

# Redémarrer le service
docker-compose restart web
```

## Structure du projet

```
.
├── dockerfile          # Configuration Docker
├── docker-compose.yml  # Configuration Docker Compose
├── requirements.txt    # Dépendances Python
├── main.py            # Point d'entrée de l'application
├── data/              # Dossier pour les données persistantes
└── README.md          # Ce fichier
```

## Données persistantes

Les données SQLite et autres fichiers de données sont stockés dans le dossier `./data` monté dans le conteneur. Cela garantit que les données ne sont pas perdues lors de l'arrêt ou du redémarrage du conteneur.

## Troubleshooting

- **Le port 8000 est déjà utilisé** : Modifiez le mapping des ports dans `docker-compose.yml`
- **Erreur de permissions sur ./data** : Assurez-vous que le dossier `data` existe ou sera créé avec les bonnes permissions

---

*Mise à jour : 28/09/2026*
