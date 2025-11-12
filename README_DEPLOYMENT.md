BOMBA - Déploiement rapide et vérifications

But: fournir une checklist minimale pour déployer sur Railway (ou autre PaaS) et vérifier que tout fonctionne.

Prérequis
- Node.js 18+ (Railway fournit Nixpacks)
- Base de données MySQL accessible
- Variables d'environnement définies en production

Variables d'environnement importantes
- DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
- SESSION_SECRET (minimum 32 caractères)
- STRIPE_SECRET_KEY, STRIPE_PUBLIC_KEY
- EMAIL_USER, EMAIL_PASSWORD (ou configuration alternative)
- PORT (optionnel)
- REDIS_URL (optionnel) — si défini, l'app utilisera Redis pour stocker les sessions

Étapes de déploiement (Railway)
1) Pousser le code sur la branche de production puis déployer.
2) Dans Railway > Variables d'environnement, définir les variables listées ci-dessus.
   - Si vous venez d'ajouter `DB_PASSWORD` mais l'app continue d'indiquer "using password: NO", ajoutez temporairement `DB_PASS` = même valeur que `DB_PASSWORD` pour compatibilité.
3) (Optionnel mais recommandé) Définir `REDIS_URL` si vous voulez que les sessions utilisent Redis en production.

Vérifications post-déploiement
1) Vérifier les logs de déploiement: l'application doit indiquer:
   - "✅ Connexion à la base de données MySQL réussie"
   - "🚀 Serveur BOMBA démarré"
2) Appeler l'endpoint de santé:
   - GET /health
   - Doit retourner HTTP 200 et JSON indiquant db.ok=true, stripe.ok=true, email.ok=true
3) Tester l'API produits:
   - GET /api/produits
   - Doit retourner HTTP 200 et une liste JSON (ou [] si vide)

Recommandations
- Remplacer MemoryStore par Redis en production pour permettre le scaling et éviter les fuites mémoire.
- Ne pas laisser de clés Stripe de test en production.
- Faire des sauvegardes régulières de la base avant opérations destructrices (import --force).

Comment exécuter les checks localement
- Lancer le serveur localement:
  node server.js
- Vérifier la santé:
  node health_check.js

Notes de sécurité
- Ne jamais commit le fichier .env contenant des secrets.
- SESSION_SECRET doit être long et aléatoire.

Si tu veux, je peux:
- Ajouter un script npm pour démarrer avec Redis si présent.
- Remplacer MemoryStore par Redis de façon permanente (installer dépendances et tests).
- Commit + push les changements (si tu me donnes l'accès Git ou tu veux que je crée un patch prêt à push).