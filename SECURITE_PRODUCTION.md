# 🔐 GUIDE SÉCURITÉ & DÉPLOIEMENT PRODUCTION

Guide complet pour déployer BOMBA en toute sécurité.

---

## 📋 TABLE DES MATIÈRES

1. [Audit Sécurité](#audit-sécurité)
2. [Protection .env](#protection-env)
3. [Déploiement Production](#déploiement-production)
4. [Checklist Finale](#checklist-finale)

---

## 🔐 AUDIT SÉCURITÉ

### ✅ RÉSUMÉ EXÉCUTIF

**Statut** : Production-ready (même avec clés Stripe test)  
**Aucune donnée critique stockée en clair**

### 📊 DONNÉES PAR CATÉGORIE

#### 1. **Mots de passe** : ✅ SÉCURISÉ
- **Admin** : Hashés avec `bcrypt` (10 rounds) dans MySQL
- **Première connexion** : "temp_password" → hashé automatiquement
- **Récupération impossible** : Algorithme à sens unique

#### 2. **Données bancaires** : ✅ JAMAIS STOCKÉES
- **Numéros de carte** : ❌ Jamais dans votre base
- **CVV** : ❌ Jamais transmis au serveur
- **Traitement** : 100% par Stripe (iframe sécurisée)
- **Vous stockez** : Uniquement `stripe_session_id` (anonyme)

#### 3. **Données clients** : ✅ NON SENSIBLES
Stockées en clair (nécessaires livraison) :
- Nom, email, téléphone, adresse
- **Pas de** : mots de passe, cartes, CVV

#### 4. **Sessions** : ✅ SÉCURISÉ
- `httpOnly: true` → Protection XSS
- `sameSite: 'strict'` → Protection CSRF
- `secure: production` → HTTPS obligatoire en prod

#### 5. **Fichier .env** : ⚠️ LOCAL UNIQUEMENT
- ✅ `.gitignore` empêche commit GitHub
- ✅ Variables système en production (auto)

---

## 🔒 PROTECTION .env

### Sur GitHub : ✅ PROTÉGÉ

**`.gitignore` contient** :
```
.env
```

**Vérification** :
```bash
git status
# .env ne doit PAS apparaître
```

**Si .env déjà commité par erreur** :
```bash
git rm --cached .env
git commit -m "Remove .env"
git push

# Régénérer tous les secrets (DB, Stripe, Session)
```

---

### Sur Serveur : Variables Système

#### ❌ **NE PAS FAIRE** :
```bash
# Uploader tout avec .env
scp -r "Bomba website" user@serveur:/var/www/
```

#### ✅ **MÉTHODE CORRECTE** :

**Linux/Mac** :
```bash
export NODE_ENV="production"
export DB_HOST="localhost"
export DB_USER="bomba_user"
export DB_PASS="VotreMotDePasseFort123!"
export DB_NAME="bomba"
export STRIPE_SECRET_KEY="sk_live_..." # ou sk_test_ temporairement
export STRIPE_PUBLIC_KEY="pk_live_..." # ou pk_test_
export SESSION_SECRET="6f31bec4b46714f558d38cbc09496ae074f67f1815b793d0623360f2cf27737f"
export PORT="3000"

# Ajouter dans ~/.bashrc pour persistance
nano ~/.bashrc
# Copier les exports ci-dessus
source ~/.bashrc
```

**Windows Server (PowerShell Admin)** :
```powershell
[System.Environment]::SetEnvironmentVariable('NODE_ENV', 'production', 'Machine')
[System.Environment]::SetEnvironmentVariable('DB_PASS', 'VotreMotDePasse', 'Machine')
[System.Environment]::SetEnvironmentVariable('STRIPE_SECRET_KEY', 'sk_live_...', 'Machine')
[System.Environment]::SetEnvironmentVariable('SESSION_SECRET', '6f31bec4...', 'Machine')
# etc.

# Redémarrer PowerShell
```

---

## 🚀 DÉPLOIEMENT PRODUCTION

### ÉTAPE 1 : Base de Données

```sql
-- Créer utilisateur dédié
CREATE USER 'bomba_user'@'localhost' IDENTIFIED BY 'MOT_DE_PASSE_FORT';
GRANT ALL PRIVILEGES ON bomba.* TO 'bomba_user'@'localhost';
FLUSH PRIVILEGES;

-- Créer base de données
CREATE DATABASE bomba CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bomba;

-- Importer schéma
SOURCE /chemin/vers/config/init_database.sql;
```

---

### ÉTAPE 2 : Variables Système

```bash
# Sur le serveur production (Linux)
export NODE_ENV="production"
export DB_HOST="localhost"
export DB_USER="bomba_user"
export DB_PASS="MOT_DE_PASSE_FORT"
export DB_NAME="bomba"
export STRIPE_SECRET_KEY="sk_test_..." # ou sk_live_ quand prêt
export STRIPE_PUBLIC_KEY="pk_test_..." # ou pk_live_
export SESSION_SECRET="$(openssl rand -hex 32)"
export PORT="3000"

# Rendre permanent
echo 'export NODE_ENV="production"' >> ~/.bashrc
echo 'export DB_PASS="..."' >> ~/.bashrc
# etc.
source ~/.bashrc
```

---

### ÉTAPE 3 : Upload Code

**Via Git (recommandé)** :
```bash
# Sur votre PC
git init
git add .
git commit -m "Initial commit"
git push origin main

# Sur le serveur
git clone https://github.com/votre-repo/bomba.git
cd bomba
npm install --production
```

**Via FTP/SCP (sans .env)** :
```bash
# Créer archive SANS .env
tar -czf bomba.tar.gz --exclude='.env' --exclude='node_modules' --exclude='.git' .

# Uploader
scp bomba.tar.gz user@serveur:/var/www/
ssh user@serveur
cd /var/www
tar -xzf bomba.tar.gz
npm install --production
```

---

### ÉTAPE 4 : HTTPS (SSL/TLS)

```bash
# Certbot (Let's Encrypt - gratuit)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
sudo certbot renew --dry-run  # Test renouvellement auto
```

**Configuration Nginx** :
```nginx
server {
    listen 80;
    server_name votre-domaine.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name votre-domaine.com;

    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

### ÉTAPE 5 : Process Manager (PM2)

```bash
# Installation
npm install -g pm2

# Démarrage
pm2 start server.js --name bomba

# Redémarrage auto au boot
pm2 startup
pm2 save

# Monitoring
pm2 status
pm2 logs bomba --lines 100
pm2 monit
```

---

### ÉTAPE 6 : Firewall

```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
sudo ufw status
```

---

### ÉTAPE 7 : Stripe Production

**Activer clés LIVE** :
1. [dashboard.stripe.com](https://dashboard.stripe.com)
2. Compléter informations commerciales
3. Ajouter coordonnées bancaires
4. **Developers > API keys** → Mode **Live**
5. Copier `sk_live_...` et `pk_live_...`
6. Mettre à jour variables système :
   ```bash
   export STRIPE_SECRET_KEY="sk_live_..."
   export STRIPE_PUBLIC_KEY="pk_live_..."
   pm2 restart bomba
   ```

**Webhooks (optionnel)** :
- Endpoint : `https://votre-domaine.com/webhook/stripe`
- Événements : `checkout.session.completed`, `payment_intent.succeeded`

---

### ÉTAPE 8 : Backup Automatique

```bash
# Script backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u bomba_user -p bomba > /backups/bomba_$DATE.sql
find /backups -name "bomba_*.sql" -mtime +7 -delete

# Cron (tous les jours à 3h)
chmod +x backup.sh
crontab -e
# Ajouter :
0 3 * * * /chemin/vers/backup.sh
```

---

## ✅ CHECKLIST FINALE

### Avant déploiement :
- [ ] `.env` bien dans `.gitignore`
- [ ] `git status` ne liste pas `.env`
- [ ] Variables système définies sur serveur
- [ ] `NODE_ENV=production` configuré
- [ ] SESSION_SECRET régénéré (64 caractères)
- [ ] DB_PASS fort (16+ caractères)
- [ ] Utilisateur MySQL dédié créé

### Après déploiement :
- [ ] Vérifier : `node -e "console.log(process.env.NODE_ENV)"` → "production"
- [ ] Logs montrent : "🔐 Mode PRODUCTION : Utilisation des variables système"
- [ ] Logs montrent : "🛡️ Anti-bot activé (Production)"
- [ ] HTTPS fonctionne (certificat valide)
- [ ] Paiement test réussi (carte 4242... si mode test)
- [ ] Admin dashboard accessible
- [ ] Pas de fichier .env sur serveur : `ls -la .env` → "No such file"

### Sécurité :
- [ ] Firewall activé (ports 22, 80, 443)
- [ ] PM2 redémarre automatiquement
- [ ] Backup automatique configuré
- [ ] Rate limiting strict (100 req/15min)
- [ ] Sessions HTTPS uniquement

---

## 🆘 DÉPANNAGE

### Variables manquantes
```bash
# Vérifier
printenv | grep STRIPE

# Si vide, redéfinir
export STRIPE_SECRET_KEY="sk_..."
```

### .env exposé sur GitHub
```bash
# 1. Supprimer immédiatement
git rm --cached .env
git commit -m "Remove exposed .env"
git push

# 2. Régénérer TOUS les secrets
# - Nouveau SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# - Changer mot de passe MySQL
mysql -u root -p
ALTER USER 'bomba_user'@'localhost' IDENTIFIED BY 'NOUVEAU_MDP';

# - Roll Stripe keys (dashboard.stripe.com > API keys)
```

### Paiements bloqués
- ✅ Vérifier clés Stripe (test vs live)
- ✅ Vérifier compte Stripe activé
- ✅ Vérifier webhooks configurés (optionnel)

### Anti-bot bloque clients légitimes
```javascript
// Dans middleware/antibot.js, ajouter IP à whitelist
const whitelist = ['IP_CLIENT', '203.0.113.45'];
if (whitelist.includes(req.ip)) return next();
```

---

## 📊 MONITORING

```bash
# Logs temps réel
pm2 logs bomba

# Utilisation ressources
pm2 monit

# Redémarrer si problème
pm2 restart bomba

# Logs détaillés
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🎯 WORKFLOW COMPLET

### Développement (local) :
```bash
# Utiliser .env normalement
npm start
# → Charge .env automatiquement
```

### GitHub :
```bash
git add .
git commit -m "Update"
git push
# → .env automatiquement exclu
```

### Production :
```bash
# 1. Définir variables (une fois)
export NODE_ENV="production"
export DB_PASS="..."
# etc.

# 2. Cloner
git clone https://github.com/votre-repo/bomba.git
cd bomba

# 3. Installer
npm install --production

# 4. Démarrer
pm2 start server.js --name bomba
pm2 save

# → Charge variables système automatiquement
# → Aucun fichier .env sur le serveur
```

---

## 🔑 SECRETS À RÉGÉNÉRER

### SESSION_SECRET
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### DB_PASS
```sql
ALTER USER 'bomba_user'@'localhost' IDENTIFIED BY 'NouveauMotDePasse';
FLUSH PRIVILEGES;
```

### Stripe Keys
- Dashboard Stripe > Developers > API keys
- Cliquer **Roll secret key**
- Mettre à jour variables système

---

## 📞 SUPPORT

- **Stripe** : [support.stripe.com](https://support.stripe.com)
- **Node.js** : [nodejs.org/docs](https://nodejs.org/docs)
- **MySQL** : [dev.mysql.com/doc](https://dev.mysql.com/doc)
- **PM2** : [pm2.keymetrics.io/docs](https://pm2.keymetrics.io/docs)
- **Let's Encrypt** : [letsencrypt.org/docs](https://letsencrypt.org/docs)

---

## ✅ RÉSUMÉ

**Ce système garantit** :
- ✅ Aucune donnée critique en clair
- ✅ `.env` jamais sur GitHub
- ✅ `.env` jamais sur serveur production
- ✅ Variables système chiffrées par l'OS
- ✅ Mots de passe hashés (bcrypt)
- ✅ Cartes bancaires jamais stockées
- ✅ Sessions sécurisées (HTTPS + httpOnly)

**Vous pouvez déployer en toute confiance** 🚀
