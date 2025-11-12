const crypto = require('crypto');

// Fonction pour hasher de manière sécurisée (sans stocker d'infos personnelles)
function hashData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

// Middleware pour tracker les visiteurs
async function trackVisiteur(req, res, next) {
    try {
        const db = req.app.locals.db;
        
        // Ignorer les requêtes admin et API
        if (req.path.startsWith('/admin') || req.path.startsWith('/api')) {
            return next();
        }
        
        // Ignorer les fichiers statiques
        if (req.path.match(/\.(css|js|jpg|jpeg|png|gif|svg|ico|webp|woff|woff2|ttf|eot)$/)) {
            return next();
        }
        
        // ===== VÉRIFICATION DU CONSENTEMENT DES COOKIES =====
        // Vérifier si l'utilisateur a accepté les cookies analytiques
        const consentCookie = req.cookies.bomba_cookie_consent;
        let hasAnalyticsConsent = false;
        
        if (consentCookie) {
            try {
                const consent = JSON.parse(consentCookie);
                hasAnalyticsConsent = consent.analytics === true;
            } catch (e) {
                // Cookie malformé, ignorer
            }
        }
        
        // Si l'utilisateur n'a pas consenti aux cookies analytiques, ne pas tracker
        if (!hasAnalyticsConsent) {
            return next();
        }
        // ===== FIN VÉRIFICATION CONSENTEMENT =====
        
        // Récupérer ou créer un session ID depuis les cookies
        let sessionId = req.cookies.bomba_visitor_id;
        
        if (!sessionId) {
            // Créer un nouveau session ID unique
            sessionId = crypto.randomBytes(32).toString('hex');
            
            // Définir le cookie (expire dans 30 jours)
            res.cookie('bomba_visitor_id', sessionId, {
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax'
            });
        }
        
        // Hasher l'IP et le User-Agent pour la sécurité (RGPD compliant)
        const ipHash = hashData(req.ip || req.connection.remoteAddress || 'unknown');
        const userAgentHash = hashData(req.headers['user-agent'] || 'unknown');
        
        // Date du jour
        const dateAujourdhui = new Date().toISOString().split('T')[0];
        
        // Vérifier si c'est un nouveau visiteur ou un visiteur existant
        const [existingSession] = await db.query(
            'SELECT id, DATE(derniere_visite) as derniere_visite_date FROM sessions_visiteurs WHERE session_id = ?',
            [sessionId]
        );
        
        let estNouveauVisiteur = false;
        
        if (existingSession.length === 0) {
            // Nouveau visiteur - insérer dans sessions_visiteurs
            await db.query(
                `INSERT INTO sessions_visiteurs (session_id, ip_hash, user_agent_hash, nombre_pages_vues) 
                 VALUES (?, ?, ?, 1)`,
                [sessionId, ipHash, userAgentHash]
            );
            estNouveauVisiteur = true;
        } else {
            // Visiteur existant - mettre à jour le nombre de pages vues
            await db.query(
                `UPDATE sessions_visiteurs 
                 SET nombre_pages_vues = nombre_pages_vues + 1, 
                     derniere_visite = CURRENT_TIMESTAMP 
                 WHERE session_id = ?`,
                [sessionId]
            );
            
            // Si la dernière visite était un jour différent, compter comme nouveau visiteur unique pour aujourd'hui
            if (existingSession[0].derniere_visite_date !== dateAujourdhui) {
                estNouveauVisiteur = true;
            }
        }
        
        // Mettre à jour les statistiques du jour
        if (estNouveauVisiteur) {
            // Incrémenter à la fois le nombre de visites et les visiteurs uniques
            await db.query(
                `INSERT INTO statistiques_visites (date_visite, nombre_visites, visiteurs_uniques) 
                 VALUES (?, 1, 1)
                 ON DUPLICATE KEY UPDATE 
                 nombre_visites = nombre_visites + 1,
                 visiteurs_uniques = visiteurs_uniques + 1`,
                [dateAujourdhui]
            );
        } else {
            // Incrémenter uniquement le nombre de visites (pages vues)
            await db.query(
                `INSERT INTO statistiques_visites (date_visite, nombre_visites, visiteurs_uniques) 
                 VALUES (?, 1, 0)
                 ON DUPLICATE KEY UPDATE 
                 nombre_visites = nombre_visites + 1`,
                [dateAujourdhui]
            );
        }
        
    } catch (error) {
        console.error('❌ Erreur tracking visiteur:', error);
        // Ne pas bloquer la requête si le tracking échoue
    }
    
    next();
}

// Fonction pour nettoyer les anciennes sessions (+ de 90 jours)
async function nettoyerAnciennesSessions(db) {
    try {
        const [result] = await db.query(
            `DELETE FROM sessions_visiteurs 
             WHERE derniere_visite < DATE_SUB(NOW(), INTERVAL 90 DAY)`
        );
        
        if (result.affectedRows > 0) {
            console.log(`🧹 ${result.affectedRows} anciennes sessions supprimées`);
        }
    } catch (error) {
        console.error('❌ Erreur nettoyage sessions:', error);
    }
}

module.exports = {
    trackVisiteur,
    nettoyerAnciennesSessions
};
