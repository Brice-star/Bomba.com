## Vérifications post-déploiement rapides

Ces instructions aident à valider que le service BOMBA fonctionne correctement après un déploiement.

1) Smoke tests (Node)

```bash
node scripts/smoke_tests.js --url=https://your-domain.com
```

2) PowerShell quick-check

```powershell
.\scripts\check_endpoints.ps1 -BaseUrl 'https://your-domain.com'
```

3) Vérifier la base de données

Se connecter à MySQL (Railway) et vérifier la présence des colonnes :

```sql
DESCRIBE commandes;
DESCRIBE produits;
```

4) Clés Stripe

- Si tu veux accepter de vrais paiements, configure les variables d'environnement `STRIPE_SECRET_KEY` et `STRIPE_PUBLIC_KEY` avec les clés LIVE.
- Rappel : ne commit jamais de clés secrètes dans le dépôt.

5) Sessions en production

- Le projet supporte Redis si tu fournis `REDIS_URL`. Il utilise `ioredis` + `connect-redis`.
- Pour basculer : définis `REDIS_URL` dans Railway et redémarre l'instance.

6) Si tu veux que je prenne en charge d'autres corrections

- Je peux implémenter des tests plus larges, ajouter une job de migration séparée, ou convertir la migration de démarrage en job one-off selon ta préférence.

7) Endpoint interne de vérification (optionnel)

- Le déploiement contient désormais un endpoint interne en lecture seule disponible uniquement si tu définis `INTERNAL_HEALTH_TOKEN` en variable d'environnement. Il s'appelle `/_internal/checks` et nécessite le token via `?token=...` ou l'en-tête `x-internal-token`.
- Exemple d'appel sécurisé :

```bash
curl "https://your-domain.com/_internal/checks?token=$INTERNAL_HEALTH_TOKEN"
```

Cet endpoint retourne l'état de la connexion DB, la présence des colonnes (`devise`, `vue`, `textile_disponibilite`), la présence du placeholder d'image, si Redis est configuré et si Stripe est en mode test ou live. Aucune écriture n'est faite.
