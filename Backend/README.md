# Backend - Équipier de Veille

API Flask pour la gestion de surveillance et veille (themes, sources, articles, tags).

## 🚀 Quick Start

```bash
# Depuis la racine du projet:
docker compose up --build -d

# Accéder à l'API:
curl http://localhost:8000/
```

---

## 📦 Prérequis

- Python 3.14+ (dans le conteneur Docker)
- Flask 3.1.3+
- SQLite (built-in)

## 🔧 Installation locale (sans Docker)

```bash
# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt

# Démarrer l'app
python main.py
```

L'API sera accessible sur `http://localhost:8000`

---

## 📡 API Endpoints

### Themes
```
GET    /themes              # Récupérer tous les thèmes
POST   /themes              # Créer un thème
PUT    /themes/<id>         # Modifier un thème
DELETE /themes/<id>         # Supprimer un thème
```

### Sources
```
GET    /sources             # Récupérer toutes les sources
POST   /sources             # Créer une source
PUT    /sources/<id>        # Modifier une source
DELETE /sources/<id>        # Supprimer une source
```

### Articles
```
GET    /articles            # Récupérer tous les articles
POST   /articles            # Créer un article
PUT    /articles/<id>       # Modifier un article
DELETE /articles/<id>       # Supprimer un article
```

### Tags
```
GET    /tags                # Récupérer tous les tags
POST   /tags                # Créer un tag
PUT    /tags/<id>           # Modifier un tag
DELETE /tags/<id>           # Supprimer un tag
```

### Article-Tags (relations)
```
GET    /articles/<id>/tags              # Tags d'un article
POST   /articles/<id>/tags              # Associer un tag à un article
DELETE /articles/<id>/tags/<tag_id>     # Retirer un tag d'un article
```

---

## 🗄️ Base de données

### Tables

| Table | Colonnes |
|-------|----------|
| `themes` | id, name (UNIQUE) |
| `sources` | id, name, url, theme_id (FK) |
| `articles` | id, title, url, published_at, source_id (FK) |
| `tags` | id, name (UNIQUE) |
| `article_tags` | article_id (FK), tag_id (FK) |

### Cascade DELETE
- Supprimer un **thème** → supprime ses sources et articles
- Supprimer une **source** → supprime ses articles
- Supprimer un **article** → supprime ses associations de tags

---

## 🔍 Validation des données

### Themes
- `name`: 1-100 caractères

### Sources
- `name`: 1-150 caractères
- `url`: URL valide (http/https)
- `theme_id`: Le thème doit exister

### Articles
- `title`: 1-300 caractères
- `url`: URL valide (http/https)
- `source_id`: La source doit exister

### Tags
- `name`: 1-50 caractères

---

## 📊 Logging

Tous les événements sont loggés dans la console/logs:
- ✓ Actions réussies (création, modification, suppression)
- ✗ Erreurs de validation
- ⚠ Avertissements (données en doublon, etc.)

Format: `[TIMESTAMP] LEVEL - Message`

---

## 🔒 Configuration

### Variables d'environnement

```bash
FLASK_ENV=production      # production ou development
```

### Fichier de configuration

Voir `main.py` pour la configuration Flask.

---

## 🛠️ Développement

### Structure du code

```
Backend/
├── main.py          # Initialisation Flask, gestion des erreurs
├── routes.py        # Tous les endpoints API
├── database.py      # Initialisation SQLite, gestion de la connection
└── requirements.txt # Dépendances Python
```

### Ajouter une nouvelle route

1. Ajouter la fonction dans `routes.py`
2. Appliquer la validation (`validate_*` fonctions)
3. Logger les actions
4. Documenter dans ce README

Exemple:
```python
@api.route("/themes/<int:theme_id>", methods=["DELETE"])
def delete_theme(theme_id):
    db = get_db()
    cursor = db.execute("DELETE FROM themes WHERE id = ?", (theme_id,))
    db.commit()
    if cursor.rowcount == 0:
        logger.warning(f"✗ Thème {theme_id} non trouvé")
        return jsonify({"error": "Thème non trouvé"}), 404
    logger.info(f"✓ Thème {theme_id} supprimé")
    return jsonify({"message": f"Thème {theme_id} supprimé"}), 200
```

---

## 🐛 Troubleshooting

| Problème | Solution |
|----------|----------|
| `ModuleNotFoundError: No module named 'flask'` | `pip install -r requirements.txt` |
| Port 8000 déjà utilisé | Modifier le port dans `main.py` ou Docker |
| Erreur de connexion DB | Vérifier que `./data/` a les bonnes permissions |
| Données perdues après restart | Les données sont en volume Docker (`./data`) |

---

## 📈 Améliorations futures

- [ ] Authentification/autorisation
- [ ] Rate limiting
- [ ] Pagination des résultats
- [ ] Filtrage/recherche avancée
- [ ] Historique des modifications
- [ ] Export de données (CSV, JSON)

---

*Mise à jour: 29/09/2026*
