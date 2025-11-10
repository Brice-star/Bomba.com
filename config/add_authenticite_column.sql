-- Ajouter la colonne textile_disponibilite à la table produits
ALTER TABLE produits 
ADD COLUMN textile_disponibilite TEXT 
AFTER description;
