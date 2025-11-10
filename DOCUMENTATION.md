# 📚 DOCUMENTATION BOMBA - Site E-commerce

## 🚀 Démarrage Rapide

### Prérequis
- Node.js v22.14.0+
- MySQL 8.0+
- Compte Stripe (test ou production)

### Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer la base de données
# Créer une base de données MySQL nommée "bomba"
mysql -u root -p
CREATE DATABASE bomba;
exit

# 3. Initialiser les tables
node init-db.js

# 4. Configurer les variables d'environnement
# Copier .env.example vers .env et remplir les valeurs

# 5. Démarrer le serveur
npm start
```

Le site sera accessible sur `http://localhost:3000`

---

## 🔐 Sécurité

### Protections Actives

#### ✅ Toujours Actif (Dev + Prod)
- **SQL Injection** : Requêtes préparées partout
- **XSS Protection** : Helmet.js + sanitization
- **CSRF Protection** : SameSite cookies + CORS
- **Rate Limiting** :
  - Général : 1000 req/15min (dev) → 100 req/15min (prod)
  - API : 30 req/min
  - Auth : 5 tentatives/15min
  - Paiement : 3 req/5min
- **Session Security** : httpOnly, secure (prod), SameSite strict

#### 🔄 Actif en Production Uniquement
- **Anti-bot** : Détection User-Agent, honeypot, blacklist IP
- **HTTPS forcé** : Cookies secure

### Avant Déploiement Production

1. **Environnement** : Définir `NODE_ENV=production`
2. **SESSION_SECRET** : Changer dans `.env`
3. **Admin** : Changer mot de passe (actuellement `bomba2024`)
4. **Stripe** : Activer clés LIVE (décommenter dans `.env`)
5. **HTTPS** : Activer SSL/TLS

---

## 💳 Paiement Stripe

### Configuration Test
```env
STRIPE_SECRET_KEY=sk_test_51SRiIzBHXmj...
STRIPE_PUBLIC_KEY=pk_test_51SRiIzBHXmj...
```

### Carte de Test
- **Numéro** : 4242 4242 4242 4242
- **Date** : N'importe quelle date future
- **CVC** : N'importe quel 3 chiffres

### Passage en Production
1. Obtenir clés live depuis [dashboard.stripe.com](https://dashboard.stripe.com)
2. Décommenter et remplir dans `.env` :
   ```env
   # STRIPE_SECRET_KEY=sk_live_...
   # STRIPE_PUBLIC_KEY=pk_live_...
   ```
3. Redémarrer le serveur

---

## 🗄️ Base de Données

### Tables Principales

#### `produits`
- `id`, `nom`, `description`, `prix`, `categorie`
- `image_principale`, `images_secondaires`
- `tailles_disponibles`, `stock`

#### `commandes`
- `id`, `numero_commande`, `nom_client`, `email_client`
- `telephone`, `pays`, `adresse`
- `montant_total`, `statut`, `date_commande`
- `stripe_session_id`, `stripe_payment_intent`, `paiement_confirme`

#### `admin`
- `id`, `username`, `password` (hashé bcrypt)

### Identifiants Admin par Défaut
- **Username** : `admin`
- **Password** : `bomba2024`
- ⚠️ **À CHANGER EN PRODUCTION !**

---

## 📂 Structure du Projet

```
Bomba website/
├── config/
│   ├── db.js              # Connexion MySQL
│   └── stripe.js          # Configuration Stripe
├── middleware/
│   ├── antibot.js         # Détection bots
│   ├── auth.js            # Authentification admin
│   └── security.js        # Protections sécurité
├── public/
│   ├── css/               # Styles
│   ├── js/                # Scripts frontend
│   └── images/            # Images produits
├── routes/
│   ├── admin.js           # Routes admin
│   ├── commandes.js       # Gestion commandes
│   ├── produits.js        # Gestion produits
│   └── stripe.js          # Paiements Stripe
├── views/                 # Pages HTML
├── .env                   # Variables environnement
├── server.js              # Serveur Express
├── init-db.js             # Script initialisation BD
└── package.json           # Dépendances

```

---

## 🔧 Maintenance

### Commandes Utiles

```bash
# Démarrer le serveur
npm start

# Réinitialiser la base de données
node init-db.js

# Voir les logs en temps réel
# Le serveur affiche automatiquement les logs dans la console
```

### Ajouter des Produits
1. Connexion admin : `http://localhost:3000/admin/login`
2. Onglet "Produits" → "Ajouter un produit"
3. Remplir le formulaire et sauvegarder

### Gérer les Commandes
1. Onglet "Commandes"
2. Cliquer sur 👁️ pour voir les détails
3. Cliquer sur ✏️ pour modifier le statut

---

## 📊 URLs du Site

### Pages Publiques
- **Accueil** : `http://localhost:3000/`
- **Panier** : `http://localhost:3000/panier`
- **Paiement** : `http://localhost:3000/paiement`
- **Suivi** : `http://localhost:3000/suivi`
- **Produit** : `http://localhost:3000/produit/:id`

### Administration
- **Login** : `http://localhost:3000/admin/login`
- **Dashboard** : `http://localhost:3000/admin/dashboard`

### API Endpoints
- `GET /api/produits` - Liste des produits
- `GET /api/produits/:id` - Détails produit
- `POST /api/commandes` - Créer commande
- `POST /api/stripe/create-checkout-session` - Paiement Stripe
- `POST /api/admin/login` - Connexion admin

---

## 🐛 Dépannage

### Le serveur ne démarre pas
- Vérifier que MySQL est lancé
- Vérifier que le port 3000 est libre
- Vérifier le fichier `.env`

### Erreurs de paiement
- Vérifier les clés Stripe dans `.env`
- En dev, utiliser uniquement les clés **test** (sk_test_...)
- En prod, utiliser les clés **live** (sk_live_...)

### Problèmes de connexion admin
- Vérifier que la table `admin` existe
- Réinitialiser avec : `node init-db.js`
- Username: `admin` / Password: `bomba2024`

---

## 📦 Dépendances Principales

```json
{
  "express": "^4.18.2",
  "mysql2": "^3.6.5",
  "stripe": "^14.9.0",
  "bcryptjs": "^2.4.3",
  "helmet": "^7.1.0",
  "express-rate-limit": "^7.1.5",
  "express-session": "^1.17.3"
}
```

---

## 📝 Notes Importantes

1. **Sécurité** : Le site est configuré pour être sécurisé dès l'installation
2. **Stripe** : Les paiements sont gérés par Stripe (PCI-DSS compliant)
3. **Anti-bot** : Activé uniquement en production pour éviter les faux positifs
4. **Sessions** : Expiration après 24h d'inactivité
5. **Rate Limiting** : Plus permissif en dev, strict en prod

---

## 🎨 Personnalisation

### Couleurs (CSS Variables)
```css
--marron-fonce: #3E2723;
--marron-clair: #8D6E63;
--gris-clair: #D7CCC8;
--vert: #2E7D32;
--orange: #BF6B04;
```

### Logo
Modifier dans chaque fichier HTML : `<div class="logo">BOMBA</div>`

---

**Site créé avec ❤️ pour BOMBA**
