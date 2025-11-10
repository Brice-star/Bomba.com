# 🛍️ BOMBA - Site E-commerce Vêtements Africains

**By Lyne's Design** - Site e-commerce professionnel pour la vente de tenues africaines authentiques et modernes.

[![Node.js](https://img.shields.io/badge/Node.js-22.14.0-green)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-blue)](https://www.mysql.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Integrated-blueviolet)](https://stripe.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## ✨ Fonctionnalités

- 🎨 Design moderne avec palette africaine (marron, beige, vert, orange)
- 📦 Gestion complète des produits (images, tailles, stock)
- 🛒 Panier intelligent avec localStorage et boutons quick-add
- 💳 Paiement sécurisé via Stripe Checkout
- 📊 Dashboard admin complet et responsive
- 🔐 Sécurité maximale (SQL injection, XSS, CSRF, Rate limiting, Anti-bot)
- 📱 100% Responsive sur tous les écrans (desktop, tablette, mobile)
- 🎯 UUID pour numéros de commande uniques (BOMBA-YYYYMMDD-XXXXXXXX)
- 🌍 Hero section avec motif africain subtil

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

## 🔑 Accès Admin

- URL : `http://localhost:3000/admin/login`
- Username : `admin`
- Password : `bomba2024`

⚠️ **IMPORTANT : Changez le mot de passe admin dès la première connexion en production !**

## 📚 Documentation

- **[DOCUMENTATION.md](./DOCUMENTATION.md)** : Configuration, structure, API, dépannage
- **[SECURITE_PRODUCTION.md](./SECURITE_PRODUCTION.md)** : Sécurité, déploiement, protection .env

## 🌐 Déploiement

⚠️ **Note importante** : Ce projet est une application **Node.js backend** qui nécessite un serveur pour fonctionner. GitHub Pages ne supporte que les sites statiques (HTML/CSS/JS).

### Options de déploiement recommandées :

1. **Heroku** (Gratuit pour commencer)
   - Support MySQL via ClearDB
   - Variables d'environnement sécurisées
   - [Guide de déploiement Heroku](https://devcenter.heroku.com/articles/deploying-nodejs)

2. **Railway.app** (Moderne et simple)
   - MySQL intégré
   - Déploiement automatique depuis GitHub
   - [Railway.app](https://railway.app/)

3. **Render** (Alternative moderne)
   - Base de données PostgreSQL/MySQL
   - SSL gratuit
   - [Render.com](https://render.com/)

4. **VPS** (Serveur dédié)
   - DigitalOcean, Linode, AWS EC2
   - Contrôle total
   - Configuration manuelle requise

### Variables d'environnement en production

Assurez-vous de configurer ces variables sur votre plateforme de déploiement :
```
DB_HOST=votre_host_mysql
DB_USER=votre_user
DB_PASS=votre_password
DB_NAME=bomba
SESSION_SECRET=une_tres_longue_cle_aleatoire_64_caracteres
STRIPE_SECRET_KEY=sk_live_votre_cle_live
STRIPE_PUBLIC_KEY=pk_live_votre_cle_live
NODE_ENV=production
PORT=3000
```

## 🛠️ Stack Technique

- **Backend** : Node.js + Express.js
- **Base de données** : MySQL 8.0
- **Paiement** : Stripe
- **Sécurité** : Helmet, bcryptjs, express-rate-limit
- **Frontend** : HTML5, CSS3, JavaScript ES6+

## 📦 Scripts NPM

```bash
npm start          # Démarrer le serveur
node init-db.js    # Réinitialiser la base de données
```

## 🔐 Sécurité

Le projet inclut :
- ✅ Protection SQL Injection
- ✅ Protection XSS
- ✅ Protection CSRF
- ✅ Rate Limiting (4 niveaux)
- ✅ Session sécurisée
- ✅ Anti-bot (production uniquement)
- ✅ Headers de sécurité (Helmet)

## 📝 Licence

Projet privé - Tous droits réservés

---

**Développé avec ❤️ pour BOMBA**
