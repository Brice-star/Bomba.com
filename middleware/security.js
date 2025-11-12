// ================================================
// BOMBA - Middleware de sécurité centralisé
// ================================================

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const cors = require('cors');

// Configuration Helmet - Protection des headers HTTP
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://fonts.googleapis.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            connectSrc: ["'self'", "https://api.stripe.com"],
            frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    frameguard: {
        action: 'deny'
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    }
});

// Helper to identify static asset requests we want to exempt from rate limiting
const isStaticAsset = (req) => {
    try {
        const p = (req.path || req.url || '').toLowerCase();
        // Common public static prefixes
        const staticPrefixes = ['/images', '/img', '/css', '/js', '/public', '/fonts', '/favicon.ico', '/sitemap.xml'];
        if (staticPrefixes.some(pref => p.startsWith(pref))) return true;
        // Allow health check to bypass limits
        if (p === '/health' || p.startsWith('/health')) return true;
        return false;
    } catch (e) {
        return false;
    }
};

// Rate Limiting - Protection contre les attaques par force brute
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 en dev, 100 en prod
    message: { error: 'Trop de requêtes depuis cette adresse IP, veuillez réessayer dans 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting pour localhost en développement
        if (process.env.NODE_ENV !== 'production') {
            const ip = req.ip || req.connection.remoteAddress;
            if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return true;
        }

        // Exempt static assets and health checks from general rate limiting so public assets don't get blocked
        if (isStaticAsset(req)) return true;

        return false;
    }
});

// Rate Limiting strict pour l'authentification
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives max
    message: { error: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.' },
    skipSuccessfulRequests: true,
});

// Rate Limiting pour l'API
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    // Allow a higher default in production but keep it configurable via API_RATE_LIMIT
    max: process.env.NODE_ENV === 'production' ? (process.env.API_RATE_LIMIT ? parseInt(process.env.API_RATE_LIMIT, 10) : 100) : 1000,
    message: { error: 'Trop de requêtes API, veuillez ralentir.' },
    // Skip rate limiting for safe static GET requests and health check
    skip: (req) => {
        if (isStaticAsset(req) && req.method === 'GET') return true;
        if ((req.path || req.url || '').startsWith('/images')) return true;
        return false;
    }
});

// Rate Limiting pour les paiements
const paymentLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3, // 3 paiements max toutes les 5 minutes
    message: { error: 'Trop de tentatives de paiement, veuillez réessayer dans quelques minutes.' },
});

// CORS Configuration - Protection contre les requêtes cross-origin non autorisées
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000',
            process.env.FRONTEND_URL,
            process.env.BASE_URL
        ].filter(Boolean);
        
        // Autoriser les requêtes sans origine (Postman, apps mobiles, etc.)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Non autorisé par CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

// Sanitization des données
const sanitizeData = (req, res, next) => {
    if (req.body) {
        // Supprimer les caractères dangereux
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                // Supprimer les balises HTML potentiellement dangereuses
                req.body[key] = req.body[key]
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+\s*=/gi, '')
                    .trim();
            }
        });
    }
    next();
};

// Validation des entrées critiques
const validateInput = (req, res, next) => {
    // Vérifier qu'il n'y a pas de commandes SQL dans les inputs
    const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi;
    
    const checkValue = (value) => {
        if (typeof value === 'string' && sqlPattern.test(value)) {
            return true;
        }
        return false;
    };

    // Vérifier le body
    if (req.body) {
        for (const key in req.body) {
            if (checkValue(req.body[key])) {
                return res.status(400).json({ error: 'Entrée invalide détectée' });
            }
        }
    }

    // Vérifier les query params
    if (req.query) {
        for (const key in req.query) {
            if (checkValue(req.query[key])) {
                return res.status(400).json({ error: 'Paramètre invalide détecté' });
            }
        }
    }

    next();
};

// Logger les tentatives suspectes
const securityLogger = (req, res, next) => {
    const suspicious = [];

    // Détecter les patterns suspects dans l'URL
    if (req.path.includes('..') || req.path.includes('//')) {
        suspicious.push('Path traversal attempt');
    }

    // Détecter les user-agents suspects
    const userAgent = req.get('user-agent') || '';
    if (userAgent.toLowerCase().includes('sqlmap') || 
        userAgent.toLowerCase().includes('nikto') ||
        userAgent.toLowerCase().includes('nmap')) {
        suspicious.push('Suspicious user-agent');
    }

    if (suspicious.length > 0) {
        console.warn('⚠️ ALERTE SÉCURITÉ:', {
            ip: req.ip,
            path: req.path,
            method: req.method,
            userAgent: userAgent,
            issues: suspicious,
            timestamp: new Date().toISOString()
        });
    }

    next();
};

module.exports = {
    helmetConfig,
    generalLimiter,
    authLimiter,
    apiLimiter,
    paymentLimiter,
    corsOptions,
    mongoSanitize,
    hpp,
    sanitizeData,
    validateInput,
    securityLogger
    ,
    // Export helper so other modules (server) can decide to skip security checks for static assets
    isStaticAsset
};
