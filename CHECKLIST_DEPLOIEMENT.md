# 🚀 DÉPLOIEMENT RAPIDE - CHECKLIST

## ✅ AVANT DE COMMENCER

- [ ] Compte GitHub avec projet BOMBA synchronisé
- [ ] Compte Stripe créé (gratuit) : https://dashboard.stripe.com/register
- [ ] Clés Stripe récupérées (test ou live)
- [ ] 30 minutes de temps disponible

---

## 📝 ÉTAPES RAILWAY (ordre chronologique)

### 1️⃣ Créer compte Railway (2 min)
- [ ] Aller sur https://railway.app
- [ ] Login avec GitHub
- [ ] Autoriser Railway

### 2️⃣ Créer MySQL (3 min)
- [ ] New Project → Deploy MySQL
- [ ] Attendre déploiement (30 sec)
- [ ] Noter les variables MySQL (onglet Variables) :
  ```
  MYSQLHOST = _________________
  MYSQLPORT = _________________
  MYSQLUSER = _________________
  MYSQLPASSWORD = _________________
  MYSQLDATABASE = _________________
  ```

### 3️⃣ Initialiser la base de données (2 min)
- [ ] MySQL → Data → Query
- [ ] Copier-coller le contenu de `config/init_database.sql`
- [ ] Exécuter la requête
- [ ] Vérifier que les tables sont créées

### 4️⃣ Déployer l'application (3 min)
- [ ] Dans le projet → New → GitHub Repo
- [ ] Sélectionner `Brice-star/Bomba.com`
- [ ] Attendre le build (2-3 min)
- [ ] Vérifier "Build successful"

### 5️⃣ Configurer les variables (10 min)
- [ ] App Node.js → Variables → Raw Editor
- [ ] Copier le template ci-dessous et remplir :

```bash
# Base de données (depuis étape 2)
DB_HOST=<MYSQLHOST>
DB_PORT=<MYSQLPORT>
DB_USER=<MYSQLUSER>
DB_PASSWORD=<MYSQLPASSWORD>
DB_NAME=<MYSQLDATABASE>

# Serveur
NODE_ENV=production
PORT=3000

# URLs (temporaire, on mettra la vraie après)
BASE_URL=https://bomba.up.railway.app
SITE_URL=https://bomba.up.railway.app

# Session (CHANGEZ ce secret !)
SESSION_SECRET=votre-secret-tres-long-et-aleatoire-ici-123456789

# Stripe (vos vraies clés)
STRIPE_SECRET_KEY=sk_test_VOTRE_CLE
STRIPE_PUBLIC_KEY=pk_test_VOTRE_CLE

# Admin
ADMIN_USER=admin
ADMIN_PASS=VotreMotDePasseTemporaire123!
```

- [ ] Sauvegarder les variables
- [ ] Attendre redémarrage automatique

### 6️⃣ Générer le domaine (2 min)
- [ ] App → Settings → Networking
- [ ] Generate Domain
- [ ] Copier l'URL : `https://____________.up.railway.app`
- [ ] Retourner dans Variables
- [ ] Modifier BASE_URL et SITE_URL avec la vraie URL
- [ ] Sauvegarder

### 7️⃣ Vérifier les logs (2 min)
- [ ] App → Deployments → Dernier déploiement
- [ ] Vérifier ces lignes :
  ```
  ✅ Connexion à la base de données MySQL réussie
  ✅ Stripe initialisé
  🚀 Serveur BOMBA lancé sur le port 3000
  ```

### 8️⃣ Tester le site (5 min)
- [ ] Ouvrir l'URL Railway dans le navigateur
- [ ] Page d'accueil s'affiche correctement
- [ ] Navigation fonctionne
- [ ] Aller sur `/admin/login`
- [ ] Se connecter avec ADMIN_USER et ADMIN_PASS
- [ ] Changer le mot de passe admin immédiatement !

### 9️⃣ Ajouter des produits (5 min)
- [ ] Dashboard admin → Produits
- [ ] Ajouter un produit de test
- [ ] Vérifier qu'il apparaît sur la page d'accueil

### 🔟 Configurer Stripe Webhook (5 min)
- [ ] Aller sur https://dashboard.stripe.com/webhooks
- [ ] Cliquer "Add endpoint"
- [ ] URL : `https://votre-url.up.railway.app/api/stripe/webhook`
- [ ] Événements : `checkout.session.completed`
- [ ] Copier le "Signing secret" (commence par `whsec_`)
- [ ] Railway → Variables → Ajouter :
  ```
  STRIPE_WEBHOOK_SECRET=whsec_votre_secret
  ```

---

## ✅ DÉPLOIEMENT TERMINÉ !

Votre site est en ligne : `https://____________.up.railway.app`

---

## 🔄 MISES À JOUR FUTURES

Pour mettre à jour le site après modifications locales :

```powershell
git add -A
git commit -m "Description des changements"
git push origin main
```

Railway redéploie automatiquement en 2-3 minutes ! 🎉

---

## 🆘 PROBLÈMES COURANTS

### "Application failed to respond"
→ Vérifier variables DB_* (étape 5)
→ Vérifier logs (étape 7)

### "Cannot connect to database"
→ Utiliser `MYSQLHOST` (pas localhost)
→ Vérifier que MySQL et App sont dans le même projet

### "Stripe error"
→ Vérifier format des clés (`sk_test_...` et `pk_test_...`)
→ Pas d'espaces avant/après

### Page blanche
→ Vérifier `NODE_ENV=production`
→ Regarder les logs pour erreurs JavaScript

---

## 💰 COÛTS

**Plan gratuit** : 500h/mois (suffisant pour débuter)

Si dépassement : Plan Hobby ~5$/mois

---

**Bon déploiement ! 🚀**
