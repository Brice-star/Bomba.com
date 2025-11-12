# 🚀 GUIDE DE DÉPLOIEMENT BOMBA SUR RAILWAY

## ✅ PRÉ-REQUIS (Vous avez déjà tout !)
- ✅ Compte GitHub avec le projet BOMBA
- ✅ Projet prêt et testé localement
- ✅ Carte bancaire (pour vérification uniquement, pas de frais)

---

## 📝 ÉTAPE 1 : CRÉER UN COMPTE RAILWAY (5 minutes)

### 1.1 Inscription
1. Allez sur : **https://railway.app**
2. Cliquez sur **"Start a New Project"** ou **"Login"**
3. Choisissez **"Login with GitHub"**
4. Autorisez Railway à accéder à GitHub
5. ✅ Vous êtes connecté !

### 1.2 Vérification (Optionnel pour plus de crédits)
- Railway offre **500 heures gratuites par mois**
- Pour débloquer plus : ajoutez une carte (pas de débit automatique)

---

## 🗄️ ÉTAPE 2 : CRÉER LA BASE DE DONNÉES MYSQL (3 minutes)

### 2.1 Créer un nouveau projet
1. Sur Railway, cliquez sur **"New Project"**
2. Choisissez **"Deploy MySQL"**
3. Attendez 30 secondes (icône tournante)
4. ✅ MySQL est créé !

### 2.2 Récupérer les identifiants de connexion
1. Cliquez sur votre base MySQL (icône violette)
2. Allez dans l'onglet **"Variables"**
3. **NOTEZ CES INFORMATIONS** (vous en aurez besoin) :
   ```
   MYSQLHOST = railway.internal (ou une URL)
   MYSQLPORT = 3306
   MYSQLUSER = root
   MYSQLPASSWORD = (un long mot de passe généré)
   MYSQLDATABASE = railway
   ```

### 2.3 Configurer la base de données
1. Allez dans l'onglet **"Data"** de MySQL
2. Cliquez sur **"Query"** ou **"Connect"**
3. **COPIEZ ET COLLEZ** le contenu du fichier `config/init_database.sql`
4. Exécutez la requête
5. ✅ Les tables sont créées !

**Fichier à copier** : `C:\Users\HP\Desktop\Bomba website\config\init_database.sql`

---

## 🚀 ÉTAPE 3 : DÉPLOYER L'APPLICATION (5 minutes)

### 3.1 Connecter GitHub
1. Dans le même projet Railway, cliquez sur **"New"** (ou + en haut à droite)
2. Choisissez **"GitHub Repo"**
3. Sélectionnez **"Brice-star/Bomba.com"**
4. Railway va automatiquement détecter Node.js
5. ✅ Déploiement en cours...

### 3.2 Attendre le build
- Railway installe les dépendances (`npm install`)
- Prend environ **2-3 minutes**
- Vous verrez des logs défiler
- Attendez le message **"Build successful"** ou **"Deployed"**

---

## ⚙️ ÉTAPE 4 : CONFIGURER LES VARIABLES D'ENVIRONNEMENT (10 minutes)

### 4.1 Accéder aux variables
1. Cliquez sur votre application Node.js (pas MySQL)
2. Allez dans l'onglet **"Variables"**
3. Cliquez sur **"New Variable"** ou **"Raw Editor"**

### 4.2 Ajouter TOUTES ces variables

**COPIEZ-COLLEZ** ces lignes une par une en remplaçant les valeurs :

```bash
# ===== IMPORTANT : REMPLACEZ LES VALEURS ENTRE <...> =====

# 1. Base de données (récupérées de l'étape 2.2)
DB_HOST=<COPIEZ MYSQLHOST>
DB_PORT=<COPIEZ MYSQLPORT>
DB_USER=<COPIEZ MYSQLUSER>
DB_PASSWORD=<COPIEZ MYSQLPASSWORD>
DB_NAME=<COPIEZ MYSQLDATABASE>

# 2. Serveur
NODE_ENV=production
PORT=3000

# 3. URL de votre site (on la mettra après déploiement)
BASE_URL=https://votre-app.up.railway.app
SITE_URL=https://votre-app.up.railway.app

# 4. Session (CHANGEZ ce secret !)
SESSION_SECRET=bomba-railway-prod-secret-2025-change-this-to-something-very-long-and-random-123456789

# 5. Stripe (VOS clés de test ou production)
# Allez sur https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_VOTRE_CLE_SECRETE
STRIPE_PUBLIC_KEY=pk_test_VOTRE_CLE_PUBLIQUE

# 6. Admin (mot de passe temporaire, changez-le après première connexion)
ADMIN_USER=admin
ADMIN_PASS=MotDePasseTemporaire123!

# 7. Email (si vous voulez les notifications - OPTIONNEL)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=votre-email@gmail.com
# SMTP_PASS=votre-mot-de-passe-application
```

### 4.3 Comment remplir chaque variable

#### **DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME**
- Allez dans MySQL (icône violette) → Variables
- Copiez `MYSQLHOST` → Collez dans `DB_HOST`
- Copiez `MYSQLPORT` → Collez dans `DB_PORT`
- Copiez `MYSQLUSER` → Collez dans `DB_USER`
- Copiez `MYSQLPASSWORD` → Collez dans `DB_PASSWORD`
- Copiez `MYSQLDATABASE` → Collez dans `DB_NAME`

#### **SESSION_SECRET**
- Créez un texte aléatoire très long (50+ caractères)
- Exemple : `bomba-secret-prod-2025-xyz789-abc123-def456-ghi789-jkl012`

#### **STRIPE_SECRET_KEY et STRIPE_PUBLIC_KEY**
1. Allez sur : **https://dashboard.stripe.com/register**
2. Créez un compte Stripe (gratuit)
3. Allez dans **Développeurs → Clés API**
4. Copiez :
   - **Clé secrète** (`sk_test_...`) → `STRIPE_SECRET_KEY`
   - **Clé publiable** (`pk_test_...`) → `STRIPE_PUBLIC_KEY`

#### **BASE_URL et SITE_URL**
- Pour l'instant, mettez : `https://bomba.up.railway.app`
- On mettra la vraie URL après déploiement

---

## 🌐 ÉTAPE 5 : OBTENIR L'URL PUBLIQUE (2 minutes)

### 5.1 Générer un domaine
1. Dans l'onglet **"Settings"** de votre app Node.js
2. Cherchez **"Networking"** ou **"Domains"**
3. Cliquez sur **"Generate Domain"**
4. Railway crée automatiquement une URL : `bomba.up.railway.app`
5. ✅ Votre site est accessible !

### 5.2 Mettre à jour les URLs
1. Retournez dans **"Variables"**
2. Modifiez :
   ```
   BASE_URL=https://bomba.up.railway.app
   SITE_URL=https://bomba.up.railway.app
   ```
   (Remplacez par VOTRE vraie URL Railway)
3. Cliquez sur **"Save"**
4. L'application va redémarrer automatiquement

---

## ✅ ÉTAPE 6 : VÉRIFIER LE DÉPLOIEMENT (3 minutes)

### 6.1 Vérifier les logs
1. Allez dans l'onglet **"Deployments"**
2. Cliquez sur le dernier déploiement
3. Vérifiez les logs :
   ```
   ✅ Connexion à la base de données MySQL réussie
   ✅ Stripe initialisé
   🚀 Serveur BOMBA lancé sur le port 3000
   ```

### 6.2 Tester le site
1. Ouvrez l'URL Railway dans votre navigateur
2. La page d'accueil doit s'afficher
3. Testez :
   - ✅ Navigation (boutique, produits)
   - ✅ Panier
   - ✅ Connexion admin : `https://votre-url.up.railway.app/admin/login`

---

## 🔐 ÉTAPE 7 : SÉCURISER L'ADMIN (2 minutes)

### 7.1 Première connexion
1. Allez sur : `https://votre-url.up.railway.app/admin/login`
2. Connectez-vous avec :
   - **Username** : `admin`
   - **Password** : `MotDePasseTemporaire123!` (celui défini dans les variables)

### 7.2 Changer le mot de passe
1. Après connexion, changez immédiatement le mot de passe
2. Utilisez un mot de passe FORT :
   - 12+ caractères
   - Majuscules + minuscules + chiffres + symboles
   - Exemple : `Bomba2025!Admin@Secure#`

---

## 🎨 ÉTAPE 8 : AJOUTER DES PRODUITS (5 minutes)

### 8.1 Accéder au dashboard
1. Connecté en tant qu'admin
2. Allez dans **"Produits"**
3. Cliquez sur **"Ajouter un produit"**

### 8.2 Créer votre premier produit
1. Nom : `Robe Africaine Élégante`
2. Prix : `45000` (XAF)
3. Description : Description détaillée
4. Catégorie : `Femme`
5. Tailles : `S,M,L,XL`
6. Stock : `10`
7. Upload une image
8. ✅ Produit créé !

---

## 🔄 ÉTAPE 9 : MISES À JOUR FUTURES (Automatique !)

### Quand vous modifiez le code localement

```powershell
# 1. Modifier vos fichiers localement
# 2. Sauvegarder les changements

# 3. Envoyer sur GitHub
git add -A
git commit -m "Description des changements"
git push origin main

# 4. Railway détecte automatiquement et redéploie !
# ✅ Votre site est mis à jour en 2-3 minutes
```

**C'est automatique !** Chaque `git push` déclenche un redéploiement.

---

## 🆘 DÉPANNAGE

### Problème : "Application failed to respond"
**Solution** :
1. Vérifiez les variables d'environnement (surtout `DB_*`)
2. Allez dans **Deployments** → **View Logs**
3. Cherchez les erreurs en rouge

### Problème : "Cannot connect to database"
**Solution** :
1. Vérifiez que MySQL et l'app sont dans le **même projet Railway**
2. Variables `DB_HOST`, `DB_PASSWORD` correctes ?
3. Utilisez `MYSQLHOST` (pas une IP externe)

### Problème : "Stripe error"
**Solution** :
1. Vérifiez `STRIPE_SECRET_KEY` commence par `sk_test_` ou `sk_live_`
2. Vérifiez `STRIPE_PUBLIC_KEY` commence par `pk_test_` ou `pk_live_`
3. Pas d'espaces avant/après les clés

### Problème : Page blanche
**Solution** :
1. Vérifiez les logs : **Deployments** → **View Logs**
2. Erreur `MODULE_NOT_FOUND` ? → `railway restart`
3. Vérifiez que `NODE_ENV=production` est défini

---

## 💰 COÛTS

### Plan gratuit Railway
- ✅ **500 heures par mois** = ~16 heures par jour
- ✅ **500 MB RAM**
- ✅ **MySQL inclus**
- ✅ **Déploiements illimités**

**Largement suffisant pour commencer !**

Si votre site devient populaire :
- Plan Hobby : ~5$/mois (crédits gratuits les premiers mois)

---

## 🎯 RÉCAPITULATIF RAPIDE

```
1. ✅ Compte Railway créé
2. ✅ MySQL déployé + tables créées
3. ✅ App GitHub connectée
4. ✅ Variables d'environnement configurées
5. ✅ Domaine généré
6. ✅ Site accessible publiquement
7. ✅ Admin sécurisé
8. ✅ Produits ajoutés
9. ✅ Déploiement automatique activé
```

---

## 📞 AIDE

Si vous bloquez à une étape :
1. Vérifiez les **logs Railway** (onglet Deployments)
2. Comparez vos variables avec celles du guide
3. Railway a un **excellent support communautaire**

---

## 🎉 FÉLICITATIONS !

Votre site BOMBA est maintenant en ligne et accessible par le monde entier ! 🌍

**URL de votre site** : `https://votre-app.up.railway.app`

**Prochaines étapes** :
- ✅ Ajoutez vos produits
- ✅ Testez les paiements Stripe
- ✅ Partagez le lien !
- 🚀 Lancez vos campagnes marketing

---

**Bon déploiement ! 🚀**
