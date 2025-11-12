# 🛍️ BOMBA - Site E-commerce Vêtements Africains

**By Lyne's Design** - Site e-commerce professionnel pour la vente de tenues africaines authentiques et modernes.

[![Node.js](https://img.shields.io/badge/Node.js-22.14.0-green)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-blue)](https://www.mysql.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Integrated-blueviolet)](https://stripe.com/)
[![License](https://img.shields.io/badge/License-Proprietary-yellow.svg)](LICENSE)

## ✨ Fonctionnalités principales

### 🛒 E-commerce complet
- 🎨 Design moderne avec palette africaine (marron, beige, vert, orange)
- 📦 Gestion complète des produits (images, tailles, stock)
- 🛒 Panier intelligent avec localStorage
- 💳 Paiement sécurisé via Stripe Checkout
- � 100% Responsive (desktop, tablette, mobile)
- 🎯 Numéros de commande uniques (BOMBA-YYYYMMDD-XXXXXXXX)

### 💱 Système multi-devises
- 🌍 Support 4 devises : EUR, USD, CAD, FCFA (XAF)
- 💰 Tous les produits en EUR avec estimation devise locale
- 🔄 Conversion automatique selon le pays du client
- 📊 Statistiques admin avec conversion multi-devises

### 🔐 Sécurité & Performance
- 🛡️ Protection SQL Injection, XSS, CSRF
- ⚡ Rate Limiting (100 requêtes/15min)
- 🔒 Sessions sécurisées
- 🤖 Anti-bot avec honeypot
- � Tracking visiteurs pour analytics

### 📊 Dashboard Admin
- 📈 Statistiques en temps réel avec graphiques
- 💰 Revenus multi-devises (vue détaillée ou convertie)
- 📦 Gestion produits (CRUD complet)
- 📋 Gestion commandes avec filtres
- 🖼️ Upload d'images produits
- 📊 Analytics visiteurs et ventes

---

## 🚀 Installation Rapide

### Prérequis
- Node.js 18+ (recommandé: 22.14.0)
- MySQL 8.0+
- Compte Stripe (gratuit pour tests)

### 1. Cloner le projet
```bash
git clone https://github.com/Brice-star/Bomba.com.git
cd Bomba.com
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Créer la base de données
```sql
CREATE DATABASE bomba CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Initialiser les tables
```bash
node init-db.js
```

### 5. Configurer l'environnement
1. Copier `.env.example` vers `.env`
```bash
cp .env.example .env
```

2. Modifier `.env` avec vos informations :
```env
# Base de données
DB_HOST=localhost
DB_USER=root
DB_PASS=votre_mot_de_passe
DB_NAME=bomba

# Session (générez une clé aléatoire)
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Stripe (obtenez vos clés sur https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_votre_cle
STRIPE_PUBLIC_KEY=pk_test_votre_cle
```

### 6. Démarrer le serveur
```bash
npm start
```

Site accessible sur : **http://localhost:3000**

---

## 🔑 Accès Admin

- URL : `http://localhost:3000/admin/login`
- Username : `admin`
- Password : `bomba2024`

⚠️ **IMPORTANT : Changez le mot de passe admin en production !**

---

## 💱 Système Multi-devises

### Configuration des devises

Le système supporte 4 devises principales :
- **EUR (€)** - Euro (devise principale pour tous les produits)
- **USD ($)** - Dollar américain
- **CAD (CAD$)** - Dollar canadien
- **XAF (FCFA)** - Franc CFA

### Taux de change

**Fichier :** `public/js/currencies.js`

```javascript
const TAUX_CHANGE = {
    XAF: 1,      // Base
    USD: 600,    // 1 USD = 600 FCFA
    EUR: 655,    // 1 EUR = 655 FCFA
    CAD: 445     // 1 CAD = 445 FCFA
};
```

⚠️ **Mise à jour des taux :** Modifier manuellement ces valeurs ou intégrer une API de taux en temps réel.

### Fonctionnement

1. **Création produit** : Tous les produits sont créés en EUR dans l'admin
2. **Affichage client** : Les prix sont affichés en EUR sur le site
3. **Sélection pays** : Le client choisit son pays lors du paiement
4. **Estimation locale** : Le système affiche une estimation dans sa devise locale
5. **Paiement** : Le paiement Stripe se fait en EUR
6. **Conversion bancaire** : La banque du client convertit automatiquement

### Mapping pays → devise

Le système détecte automatiquement la devise selon le pays :

- **FCFA (XAF)** : Bénin, Togo, Côte d'Ivoire, Sénégal, Cameroun, Mali, etc.
- **Euro (EUR)** : France, Belgique, Allemagne, Italie, Espagne, etc.
- **Dollar US (USD)** : États-Unis, Nigeria, Ghana, etc.
- **Dollar CA (CAD)** : Canada

### Statistiques admin

Le dashboard admin offre plusieurs vues pour les revenus :

1. **Vue "Détail"** : Affiche tous les revenus séparés par devise
   ```
   Exemple : €1,250.00 + $850.00 + 125,000 FCFA
   ```

2. **Vue "En EUR"** : Convertit tout en euros avec détails
   ```
   Total : €2,145.80
   Détails :
   • €1,250.00 (origine)
   • $850.00 → €829.27
   • 125,000 FCFA → €190.84
   ```

3. **Vue "En USD/CAD/FCFA"** : Même principe avec conversion vers la devise choisie

---

## 📊 Dashboard Admin

### Fonctionnalités

#### Statistiques globales
- 💰 Revenus totaux (multi-devises avec sélecteur de conversion)
- 📦 Nombre total de commandes
- ⏳ Commandes en attente
- 👔 Nombre de produits en stock

#### Gestion produits
- ➕ Ajouter un produit (nom, prix, devise, stock, tailles, image)
- ✏️ Modifier un produit existant
- 🗑️ Supprimer un produit
- 🖼️ Upload d'images (JPG/PNG, max 5MB)
- ✅ Badge authenticité

#### Gestion commandes
- 📋 Liste complète des commandes
- 🔍 Filtres par statut (toutes, en attente, confirmées, expédiées, livrées)
- 🔄 Mise à jour du statut en 1 clic
- 📄 Détails complets de chaque commande

#### Analytics
- 📈 Graphique visiteurs (30 derniers jours)
- 💹 Graphique ventes par jour
- 💰 Graphique revenus
- 📊 Répartition statuts commandes

---

## 🗄️ Base de données

### Tables principales

#### `produits`
```sql
CREATE TABLE produits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    prix DECIMAL(10,2) NOT NULL,
    devise VARCHAR(3) DEFAULT 'XAF',
    image_url VARCHAR(500),
    stock INT DEFAULT 0,
    tailles VARCHAR(255),
    categorie VARCHAR(100),
    authenticite ENUM('authentique', 'non_verifie') DEFAULT 'non_verifie',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `commandes`
```sql
CREATE TABLE commandes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_commande VARCHAR(50) UNIQUE NOT NULL,
    reference VARCHAR(20) UNIQUE,
    nom_client VARCHAR(255) NOT NULL,
    email_client VARCHAR(255) NOT NULL,
    telephone_client VARCHAR(50),
    adresse_livraison TEXT,
    pays VARCHAR(100),
    montant_total DECIMAL(10,2) NOT NULL,
    devise VARCHAR(3) DEFAULT 'XAF',
    statut ENUM('en_attente', 'confirmee', 'expediee', 'livree', 'annulee') DEFAULT 'en_attente',
    methode_paiement VARCHAR(50),
    stripe_session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Scripts de migration

```bash
node init-db.js                    # Initialisation complète
node add-devise-column.js          # Ajouter colonne devise
node add-reference-column.js       # Ajouter références commandes
node add-statistiques-tables.js    # Ajouter table visiteurs
node add-authenticite-column.js    # Ajouter badge authenticité
```

---

## 💳 Intégration Stripe

### Configuration

**Variables d'environnement requises :**
```env
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### Flux de paiement

1. Client remplit le formulaire sur `/paiement`
2. Sélection du pays → Affichage estimation devise locale
3. Clic "Valider et Payer"
4. Création session Stripe via API
5. Redirection vers Stripe Checkout
6. Paiement du client
7. Webhook Stripe → Mise à jour statut
8. Redirection `/confirmation`

### Cartes de test Stripe

```
Succès :      4242 4242 4242 4242
Échec :       4000 0000 0000 0002
3D Secure :   4000 0027 6000 3184

Date : n'importe quelle date future
CVC : n'importe quel code 3 chiffres
```

---

## 📡 API Endpoints

### Public

```
GET  /                          # Page d'accueil / catalogue
GET  /produit/:id               # Page produit individuel
GET  /panier                    # Panier d'achat
GET  /paiement                  # Formulaire paiement
GET  /confirmation              # Confirmation commande
GET  /suivi                     # Suivi de commande

POST /api/commandes             # Créer une commande
GET  /api/commandes/:numero     # Récupérer une commande
POST /api/stripe/create-checkout-session
POST /api/stripe/webhook        # Webhook Stripe
```

### Admin (authentification requise)

```
POST   /api/admin/login         # Connexion
POST   /api/admin/logout        # Déconnexion
GET    /api/admin/check         # Vérifier session

GET    /api/admin/produits      # Liste produits
POST   /api/admin/produits      # Créer produit
PUT    /api/admin/produits/:id  # Modifier produit
DELETE /api/admin/produits/:id  # Supprimer produit

GET    /api/admin/commandes     # Liste commandes
PUT    /api/admin/commandes/:id/statut  # Modifier statut

GET    /api/admin/statistiques  # Stats complètes
```

---

## 🛡️ Sécurité

### Protections actives

1. **Helmet** : En-têtes HTTP sécurisés
2. **Rate Limiting** : 100 requêtes / 15 minutes
3. **Anti-bot** : Honeypot en production
4. **Sessions** : Stockage sécurisé avec `express-session`
5. **Sanitization** : Protection XSS et injection SQL
6. **CORS** : Configuration stricte
7. **HTTPS** : Obligatoire en production

### Bonnes pratiques

- ✅ Fichier `.env` exclu de Git
- ✅ Mots de passe hashés avec bcrypt
- ✅ Validation des inputs côté serveur
- ✅ Logs détaillés pour débogage
- ✅ Gestion d'erreurs robuste

---

## 🌐 Déploiement

### Plateformes recommandées

1. **Railway.app** ⭐ (Recommandé)
   - Configuration automatique
   - MySQL intégré
   - Déploiement depuis GitHub
   - SSL gratuit

2. **Heroku**
   - Add-on ClearDB pour MySQL
   - Variables d'environnement faciles

3. **Render**
   - Base de données PostgreSQL/MySQL
   - Déploiement automatique

4. **VPS** (DigitalOcean, Linode, AWS EC2)
   - Contrôle total
   - Configuration manuelle

### Variables d'environnement production

```env
# Base de données
DB_HOST=votre_host_mysql
DB_USER=votre_user
DB_PASS=votre_password
DB_NAME=bomba

# Session
SESSION_SECRET=cle_aleatoire_64_caracteres

# Stripe (clés LIVE)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Serveur
NODE_ENV=production
PORT=3000
```

---

## 📦 Scripts NPM

```bash
npm start          # Démarrer le serveur (production)
npm run dev        # Démarrer en mode développement
node init-db.js    # Réinitialiser la base de données
```

---

## 🛠️ Stack Technique

**Backend**
- Node.js 22.14.0
- Express.js 4.x
- MySQL 8.0+

**Paiement**
- Stripe Checkout
- Stripe Webhooks

**Sécurité**
- Helmet
- bcryptjs
- express-rate-limit
- express-session

**Frontend**
- HTML5 / CSS3
- JavaScript ES6+ (Vanilla)
- Chart.js (graphiques admin)

---

## � Structure du projet

```
bomba-website/
├── server.js                    # Serveur Express principal
├── package.json                 # Dépendances
├── .env                         # Variables d'environnement
├── config/                      # Configuration
│   ├── database.js
│   ├── stripe.js
│   └── env-loader.js
├── middleware/                  # Middlewares Express
│   ├── auth.js
│   ├── security.js
│   ├── antibot.js
│   └── visitor-tracking.js
├── views/                       # Pages HTML
│   ├── index.html               # Catalogue
│   ├── produit.html
│   ├── panier.html
│   ├── paiement.html
│   ├── confirmation.html
│   ├── suivi.html
│   ├── admin-login.html
│   ├── admin-dashboard.html
│   └── [pages légales]
└── public/                      # Ressources publiques
    ├── css/
    │   ├── style.css
    │   └── admin.css
    ├── js/
    │   ├── main.js
    │   ├── panier.js
    │   ├── paiement.js
    │   ├── currencies.js        # Gestion devises
    │   ├── admin.js
    │   └── Chart.bundle.min.js
    └── images/
        └── products/
```

---

## 🆘 Dépannage

### Le serveur ne démarre pas

```bash
# Vérifier les variables d'environnement
cat .env

# Vérifier la connexion MySQL
node -e "require('./config/database')"

# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
```

### Erreur Stripe

- Vérifier les clés dans `.env`
- Vérifier le webhook configuré
- Consulter les logs dans la console

### Page admin inaccessible

- Vérifier les identifiants dans la table `admin_users`
- Vérifier `SESSION_SECRET` dans `.env`
- Vider les cookies du navigateur

---

## 📄 Licence

© 2025 BOMBA by Lyne's Design. Tous droits réservés.

---

## 🚀 Roadmap

### En cours
- ✅ Système multi-devises complet
- ✅ Estimation devise locale
- ✅ Dashboard admin avec analytics

### À venir
- � Notifications email (confirmation commande)
- 📱 Application mobile (React Native)
- 🌐 Multi-langue (FR/EN)
- 📊 API de taux de change en temps réel
- 🎨 Personnalisation thème

---

**Développé avec ❤️ pour BOMBA by Lyne's Design**

Pour toute question : [contact@bomba-shop.com](mailto:contact@bomba-shop.com)
