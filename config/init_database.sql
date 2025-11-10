-- Script d'initialisation de la base de données BOMBA
-- Exécutez ce script dans MySQL pour créer la structure de la base de données

CREATE DATABASE IF NOT EXISTS bomba CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE bomba;

-- Table des produits
CREATE TABLE IF NOT EXISTS produits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    prix DECIMAL(10,2) NOT NULL,
    categorie VARCHAR(100),
    image_principale VARCHAR(255),
    images_secondaires TEXT,
    tailles_disponibles VARCHAR(100),
    date_ajout TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_categorie (categorie),
    INDEX idx_prix (prix)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des commandes
CREATE TABLE IF NOT EXISTS commandes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_commande VARCHAR(50) UNIQUE NOT NULL,
    nom_client VARCHAR(255) NOT NULL,
    email_client VARCHAR(255),
    telephone_client VARCHAR(50),
    adresse_livraison TEXT NOT NULL,
    pays VARCHAR(100),
    produits_commandes TEXT, -- JSON (id_produit, taille, quantité, prix)
    montant_total DECIMAL(10,2),
    statut ENUM('En cours', 'Préparation', 'Expédiée', 'Livrée') DEFAULT 'En cours',
    date_commande TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_livraison_estimee DATE,
    INDEX idx_numero (numero_commande),
    INDEX idx_statut (statut),
    INDEX idx_date (date_commande)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table administrateur
CREATE TABLE IF NOT EXISTS admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insérer un administrateur par défaut (mot de passe: admin123 - À CHANGER EN PRODUCTION)
-- Le mot de passe sera hashé par bcrypt dans l'application
INSERT INTO admin (username, mot_de_passe) VALUES ('admin', 'temp_password')
ON DUPLICATE KEY UPDATE username=username;

-- Insérer 5 produits initiaux pour tester
INSERT INTO produits (nom, description, prix, categorie, image_principale, images_secondaires, tailles_disponibles) VALUES
('Ensemble Traditionnel Homme Beige', 'Magnifique ensemble traditionnel béninois pour homme, confectionné avec des tissus de qualité supérieure. Idéal pour les cérémonies et événements spéciaux.', 45000, 'Hommes', '/images/products/homme-beige.jpg', '/images/products/homme-beige-2.jpg,/images/products/homme-beige-3.jpg', 'S,M,L,XL'),
('Robe Africaine Moderne Femme', 'Robe élégante au style africain moderne, mêlant tradition et contemporanéité. Parfaite pour toutes les occasions.', 35000, 'Femmes', '/images/products/femme-moderne.jpg', '/images/products/femme-moderne-2.jpg,/images/products/femme-moderne-3.jpg', 'S,M,L,XL'),
('Chemise Africaine Homme Vert', 'Chemise en tissu wax authentique avec motifs africains. Coupe moderne et confortable pour un style unique.', 25000, 'Hommes', '/images/products/chemise-verte.jpg', '/images/products/chemise-verte-2.jpg', 'S,M,L,XL'),
('Ensemble Enfant Traditionnel', 'Adorable ensemble traditionnel pour enfant, disponible en plusieurs couleurs. Confort et élégance garantis.', 20000, 'Enfants', '/images/products/enfant-trad.jpg', '/images/products/enfant-trad-2.jpg', 'S,M,L'),
('Boubou Femme Premium', 'Boubou de luxe pour femme avec broderies fines. Tissu léger et respirant, idéal pour le climat africain.', 55000, 'Femmes', '/images/products/boubou-femme.jpg', '/images/products/boubou-femme-2.jpg,/images/products/boubou-femme-3.jpg', 'M,L,XL')
ON DUPLICATE KEY UPDATE nom=nom;

-- Afficher les tables créées
SHOW TABLES;

SELECT 'Base de données BOMBA créée avec succès ✅' AS Status;
