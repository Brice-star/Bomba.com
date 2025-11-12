-- Script d'initialisation de la base de données BOMBA
-- Exécutez ce script dans MySQL pour créer la structure de la base de données



CREATE TABLE IF NOT EXISTS sessions_visiteurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL UNIQUE,
    ip_hash VARCHAR(64) NOT NULL,
    user_agent_hash VARCHAR(64) NOT NULL,
    premiere_visite TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_visite TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    nombre_pages_vues INT DEFAULT 1,
    INDEX idx_session (session_id),
    INDEX idx_derniere_visite (derniere_visite)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sessions_visiteurs (upsert to avoid duplicate primary/key errors)
INSERT INTO sessions_visiteurs (session_id, ip_hash, user_agent_hash, premiere_visite, derniere_visite, nombre_pages_vues) VALUES
('aaa3dbec05c86b6550921134b067bee1025109f2749715d4f8cff581a4fcf5db', 'eff8e7ca506627fe15dda5e0e512fcaad70b6d520f37cc76597fdb4f2d83a1a3', 'd713dadbf3d0ca255287b277ab4d36ce7d711d34f197e05966270e2160e6da6c', '2025-11-10 16:00:47', '2025-11-12 02:54:48', 292),
('fe584ffd803e34ef621ddf897ddf1a99c277a855da357f2948aae624d19a4f82', 'eff8e7ca506627fe15dda5e0e512fcaad70b6d520f37cc76597fdb4f2d83a1a3', 'd8f0d1da573e87298d19f48d579543b55bd2c985d4ad7bbf300e1540180aac90', '2025-11-10 16:55:59', '2025-11-10 16:55:59', 1),
('df49a7607326ef276933b2a1dc083a2d7b9efcc7a5f1f2643760bbc875069bb0', 'eff8e7ca506627fe15dda5e0e512fcaad70b6d520f37cc76597fdb4f2d83a1a3', 'd8f0d1da573e87298d19f48d579543b55bd2c985d4ad7bbf300e1540180aac90', '2025-11-10 16:59:40', '2025-11-10 16:59:40', 1)
ON DUPLICATE KEY UPDATE
    ip_hash = VALUES(ip_hash),
    user_agent_hash = VALUES(user_agent_hash),
    derniere_visite = VALUES(derniere_visite),
    nombre_pages_vues = VALUES(nombre_pages_vues);

-- Table statistiques_visites
CREATE TABLE IF NOT EXISTS statistiques_visites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date_visite DATE NOT NULL UNIQUE,
    nombre_visites INT DEFAULT 0,
    visiteurs_uniques INT DEFAULT 0,
    INDEX idx_date (date_visite)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert statistiques_visites (upsert on date_visite)
INSERT INTO statistiques_visites (date_visite, nombre_visites, visiteurs_uniques) VALUES
('2025-11-10', 148, 148),
('2025-11-11', 40, 40),
('2025-11-12', 106, 106)
ON DUPLICATE KEY UPDATE
    nombre_visites = VALUES(nombre_visites),
    visiteurs_uniques = VALUES(visiteurs_uniques);

-- Mettre à jour les auto_increment
ALTER TABLE admin MODIFY id INT NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
ALTER TABLE commandes MODIFY id INT NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=92;
ALTER TABLE produits MODIFY id INT NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;
ALTER TABLE sessions_visiteurs MODIFY id INT NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
ALTER TABLE statistiques_visites MODIFY id INT NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=389;



-- Afficher les tables créées

