// ================================================
// BOMBA - Détection Anti-Bot (Sans inscription externe)
// ================================================

// Middleware de détection de bot basé sur le comportement
const botDetection = (req, res, next) => {
    // Skip pour localhost en développement
    if (process.env.NODE_ENV !== 'production') {
        const ip = req.ip || req.connection.remoteAddress;
        if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
            return next();
        }
    }
    
    const userAgent = req.get('user-agent') || '';
    const suspicious = [];

    // 1. Vérifier les User-Agents de bots connus
    const botPatterns = [
        'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 
        'python-requests', 'scrapy', 'selenium', 'phantomjs',
        'headless', 'mechanize', 'perl', 'java/', 'go-http-client'
    ];

    if (botPatterns.some(pattern => userAgent.toLowerCase().includes(pattern))) {
        suspicious.push('Bot User-Agent detected');
    }

    // 2. Vérifier si pas de User-Agent (suspect)
    if (!userAgent || userAgent.length < 10) {
        suspicious.push('No or short User-Agent');
    }

    // 3. Vérifier l'absence de headers normaux
    if (!req.get('accept-language')) {
        suspicious.push('No Accept-Language header');
    }

    if (!req.get('accept')) {
        suspicious.push('No Accept header');
    }

    // 4. Vérifier vitesse de requêtes (timestamp)
    if (req.session) {
        const now = Date.now();
        const lastRequestTime = req.session.lastRequestTime || 0;
        const timeDiff = now - lastRequestTime;

        if (timeDiff < 100 && lastRequestTime !== 0) {
            // Moins de 100ms entre deux requêtes = bot
            suspicious.push('Too fast requests (< 100ms)');
        }

        req.session.lastRequestTime = now;
    }

    // 5. Vérifier si JavaScript est activé (check côté client)
    // Le frontend enverra un token pour prouver que JS fonctionne

    // Si trop de signaux suspects, bloquer
    // En développement, être plus permissif (4 signaux) ; en production, plus strict (2 signaux)
    const threshold = process.env.NODE_ENV === 'production' ? 2 : 4;
    
    if (suspicious.length >= threshold) {
        console.warn('🤖 BOT DÉTECTÉ:', {
            ip: req.ip,
            userAgent: userAgent,
            issues: suspicious,
            threshold: threshold,
            timestamp: new Date().toISOString()
        });

        return res.status(403).json({ 
            error: 'Accès refusé. Si vous êtes humain, activez JavaScript et réessayez.' 
        });
    }

    next();
};

// Middleware Honeypot - Piège invisible pour bots
const honeypotCheck = (req, res, next) => {
    // Le champ honeypot doit être vide (les bots le remplissent automatiquement)
    if (req.body && req.body.website) {
        console.warn('🍯 HONEYPOT DÉCLENCHÉ:', {
            ip: req.ip,
            honeypotValue: req.body.website,
            timestamp: new Date().toISOString()
        });

        return res.status(403).json({ 
            error: 'Spam détecté' 
        });
    }

    next();
};

// Vérification du token JavaScript (preuve que le navigateur exécute JS)
const jsTokenCheck = (req, res, next) => {
    // Pour les formulaires critiques (paiement, commande)
    const jsToken = req.body.jsToken || req.headers['x-js-token'];
    
    // Générer un token attendu basé sur l'heure
    const expectedToken = generateJsToken(req.session.id);

    if (req.body && !jsToken) {
        return res.status(403).json({ 
            error: 'JavaScript requis' 
        });
    }

    if (jsToken && jsToken !== expectedToken) {
        console.warn('⚠️ Token JS invalide:', {
            ip: req.ip,
            received: jsToken,
            expected: expectedToken,
            timestamp: new Date().toISOString()
        });

        return res.status(403).json({ 
            error: 'Token invalide' 
        });
    }

    next();
};

// Générer un token basé sur la session
function generateJsToken(sessionId) {
    const crypto = require('crypto');
    const secret = process.env.SESSION_SECRET || 'bomba-secret';
    const timestamp = Math.floor(Date.now() / 60000); // Change toutes les minutes
    
    return crypto
        .createHmac('sha256', secret)
        .update(sessionId + timestamp)
        .digest('hex')
        .substring(0, 16);
}

// Middleware pour générer et envoyer le token
const generateToken = (req, res, next) => {
    const token = generateJsToken(req.session.id || 'default');
    res.locals.jsToken = token;
    next();
};

// Détection de comportement suspect (patterns d'attaque)
const behaviorAnalysis = (req, res, next) => {
    const suspicious = [];

    // Vérifier les patterns SQL dans les URLs
    if (req.url.match(/(\bunion\b|\bselect\b|\binsert\b|\bdelete\b|\bdrop\b)/gi)) {
        suspicious.push('SQL injection attempt in URL');
    }

    // Vérifier les tentatives de Path Traversal
    if (req.url.includes('..') || req.url.includes('//')) {
        suspicious.push('Path traversal attempt');
    }

    // Vérifier les scans de ports/fichiers communs
    const scanPatterns = [
        '/wp-admin', '/admin', '/.env', '/config', '/backup',
        '/phpmyadmin', '/.git', '/api/v1', '/api/v2'
    ];

    if (scanPatterns.some(pattern => req.url.includes(pattern) && !req.url.startsWith('/admin'))) {
        suspicious.push('Common path scanning');
    }

    if (suspicious.length > 0) {
        console.warn('🚨 COMPORTEMENT SUSPECT:', {
            ip: req.ip,
            url: req.url,
            method: req.method,
            userAgent: req.get('user-agent'),
            issues: suspicious,
            timestamp: new Date().toISOString()
        });

        // Ne pas bloquer immédiatement, juste logger
        // Bloquer après 3 tentatives suspectes
        if (req.session) {
            req.session.suspiciousCount = (req.session.suspiciousCount || 0) + 1;

            if (req.session.suspiciousCount >= 3) {
                return res.status(403).json({ 
                    error: 'Activité suspecte détectée' 
                });
            }
        }
    }

    next();
};

// IP Blacklist simple (en mémoire, peut être étendue avec Redis)
const blacklistedIPs = new Set();

const ipBlacklist = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;

    if (blacklistedIPs.has(ip)) {
        console.warn('🚫 IP BLACKLISTÉE:', {
            ip: ip,
            timestamp: new Date().toISOString()
        });

        return res.status(403).send('Accès refusé');
    }

    next();
};

// Fonction pour ajouter une IP à la blacklist
function addToBlacklist(ip, duration = 3600000) { // 1 heure par défaut
    blacklistedIPs.add(ip);
    console.log(`🚫 IP ajoutée à la blacklist: ${ip}`);

    // Retirer automatiquement après la durée
    setTimeout(() => {
        blacklistedIPs.delete(ip);
        console.log(`✅ IP retirée de la blacklist: ${ip}`);
    }, duration);
}

module.exports = {
    botDetection,
    honeypotCheck,
    jsTokenCheck,
    generateToken,
    generateJsToken,
    behaviorAnalysis,
    ipBlacklist,
    addToBlacklist
};
