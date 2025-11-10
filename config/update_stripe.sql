-- ================================================
-- BOMBA - Mise à jour base de données pour Stripe
-- ================================================

USE bomba;

-- Ajouter les colonnes pour Stripe dans la table commandes
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS paiement_confirme BOOLEAN DEFAULT FALSE AFTER statut,
ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255) AFTER paiement_confirme,
ADD COLUMN IF NOT EXISTS stripe_payment_intent VARCHAR(255) AFTER stripe_session_id;

-- Index pour recherche rapide par session Stripe
CREATE INDEX IF NOT EXISTS idx_stripe_session ON commandes(stripe_session_id);

SELECT '✅ Base de données mise à jour pour Stripe' AS status;
