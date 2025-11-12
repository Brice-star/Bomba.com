// Serveur principal BOMBA E-commerce
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('fs');
const compression = require('compression');

// Chargement sécurisé de la configuration
const { initConfig } = require('./config/env-loader');
const config = initConfig();

const db = require('./config/database');
const checkAuth = require('./middleware/auth');
const stripeConfig = require('./config/stripe');
const security = require('./middleware/security');
const antibot = require('./middleware/antibot');
const { trackVisiteur, nettoyerAnciennesSessions } = require('./middleware/visitor-tracking');
const { envoyerEmailConfirmation, envoyerEmailStatut, envoyerEmailNotificationAdmin } = require('./config/email');

const app = express();
const PORT = config.port;

// ==================== PERFORMANCE: COMPRESSION GZIP ====================
// Compresser toutes les réponses HTTP pour réduire la taille et améliorer la vitesse
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6 // Niveau de compression (0-9, 6 est optimal)
}));

// ==================== SÉCURITÉ ====================
// Protection des headers HTTP (XSS, clickjacking, etc.)
app.use(security.helmetConfig);

// CORS - Protection contre les requêtes cross-origin non autorisées
if (process.env.NODE_ENV === 'production') {
    app.use(require('cors')(security.corsOptions));
}

// Rate limiting général - Protection DDoS
app.use(security.generalLimiter);

// Logger de sécurité - Détection des tentatives suspectes
app.use(security.securityLogger);

// Sanitization des données NoSQL/MongoDB (même si on utilise MySQL)
app.use(security.mongoSanitize());

// Protection contre HTTP Parameter Pollution
app.use(security.hpp());

// Validation et nettoyage des entrées utilisateur
app.use(security.validateInput);
app.use(security.sanitizeData);

// ==================== MIDDLEWARES ====================
// Configuration des middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json({ limit: '10mb' })); // Limiter la taille des requêtes
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Configuration des sessions pour l'admin
app.use(session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: config.isProduction,
        httpOnly: true, // Protection XSS
        sameSite: 'strict', // Protection CSRF
        maxAge: 24 * 60 * 60 * 1000 // 24 heures
    }
}));

// ==================== ANTI-BOT (Sans inscription externe) ====================
// IMPORTANT: Ces middlewares doivent être après la session car ils utilisent req.session
// Activé uniquement en production pour éviter les faux positifs en développement
if (config.isProduction) {
    // Blacklist IP
    app.use(antibot.ipBlacklist);

    // Détection de bots par User-Agent et comportement
    app.use(antibot.botDetection);

    // Analyse comportementale (détection patterns d'attaque)
    app.use(antibot.behaviorAnalysis);
    
    console.log('🛡️ Anti-bot activé (Production)');
} else {
    console.log('⚠️ Anti-bot désactivé (Développement)');
}

// ==================== TRACKING VISITEURS ====================
// Middleware pour compter les visiteurs (après anti-bot)
app.locals.db = db; // Rendre la DB accessible au middleware
app.use(trackVisiteur);

// Nettoyage des anciennes sessions (1x par jour au démarrage)
setTimeout(async () => {
    try {
        await nettoyerAnciennesSessions(db);
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage des sessions:', error);
    }
}, 5000); // 5 secondes après le démarrage

// ==================== CONFIGURATION UPLOAD D'IMAGES ====================
// Créer le dossier uploads s'il n'existe pas
const uploadDir = path.join(__dirname, 'public', 'images', 'products');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration de multer pour l'upload d'images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Générer un nom unique pour éviter les conflits
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = file.originalname.replace(ext, '').replace(/[^a-z0-9]/gi, '-').toLowerCase();
        cb(null, name + '-' + uniqueSuffix + ext);
    }
});

// Filtrer uniquement les images
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Type de fichier non autorisé. Seules les images (JPEG, PNG, WebP, GIF) sont acceptées.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // Limite de 10MB par image
    }
});

// ==================== ROUTES PUBLIQUES ====================

// ===== PERFORMANCE: CACHING DES FICHIERS STATIQUES =====
// Configurer le cache pour les fichiers statiques (CSS, JS, images)
app.use(express.static('public', {
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : '0', // Cache 7 jours en prod
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            // Pas de cache pour les fichiers HTML (pour avoir toujours la dernière version)
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        } else if (path.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
            // Cache long pour les images (1 mois)
            res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
        } else if (path.match(/\.(css|js)$/i)) {
            // Cache moyen pour CSS et JS (1 semaine)
            res.setHeader('Cache-Control', 'public, max-age=604800');
        }
    }
}));

// Page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// ==================== PROTECTION API ====================
// Rate limiting sur toutes les routes API (sauf webhook et admin)
app.use('/api', (req, res, next) => {
    // Pas de rate limit sur le webhook Stripe
    if (req.path === '/stripe/webhook') {
        return next();
    }
    
    // Rate limiting plus souple pour les admins authentifiés
    if (req.path.startsWith('/admin/') && req.session?.adminLoggedIn) {
        return next(); // Pas de rate limit pour les admins connectés
    }
    
    // Appliquer le rate limiting pour le reste
    security.apiLimiter(req, res, next);
});

// API: Récupérer tous les produits avec filtres
app.get('/api/produits', async (req, res) => {
    try {
        const { categorie, prix_min, prix_max, taille, recherche } = req.query;
        
        let query = 'SELECT * FROM produits WHERE 1=1';
        let params = [];

        if (categorie) {
            query += ' AND categorie = ?';
            params.push(categorie);
        }
        if (prix_min) {
            query += ' AND prix >= ?';
            params.push(prix_min);
        }
        if (prix_max) {
            query += ' AND prix <= ?';
            params.push(prix_max);
        }
        if (taille) {
            query += ' AND tailles_disponibles LIKE ?';
            params.push(`%${taille}%`);
        }
        if (recherche) {
            query += ' AND (nom LIKE ? OR description LIKE ?)';
            params.push(`%${recherche}%`, `%${recherche}%`);
        }

        query += ' ORDER BY date_ajout DESC';

        const [produits] = await db.query(query, params);
        res.json(produits);
    } catch (error) {
        console.error('Erreur récupération produits:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// API: Récupérer un produit par ID
app.get('/api/produits/:id', async (req, res) => {
    try {
        const [produits] = await db.query('SELECT * FROM produits WHERE id = ?', [req.params.id]);
        
        if (produits.length === 0) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }
        
        res.json(produits[0]);
    } catch (error) {
        console.error('Erreur récupération produit:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Page produit détaillée
app.get('/produit/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'produit.html'));
});

// Page panier
app.get('/panier', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'panier.html'));
});

// Page paiement
app.get('/paiement', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'paiement.html'));
});

// Page confirmation
app.get('/confirmation', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'confirmation.html'));
});

// Page suivi de commande
app.get('/suivi', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'suivi.html'));
});

// Page CGV (alias pour conditions-vente)
app.get('/cgv', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'cgv.html'));
});

// ==================== PAGES LÉGALES ====================
// Page Mentions Légales
app.get('/mentions-legales', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'mentions-legales.html'));
});

// Page Politique de Confidentialité
app.get('/confidentialite', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'confidentialite.html'));
});

// Page Conditions Générales de Vente
app.get('/conditions-vente', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'cgv.html')); // Utilise le même fichier que /cgv
});

// Page Conditions d'Utilisation
app.get('/conditions-utilisation', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'conditions-utilisation.html'));
});

// API: Créer une commande (avec protection honeypot)
app.post('/api/commandes', antibot.honeypotCheck, async (req, res) => {
    try {
        const { nom_client, email_client, telephone_client, adresse_livraison, pays, produits_commandes, montant_total, devise } = req.body;
        
        // Générer un numéro de commande UNIQUE garanti
        // Format: BOMBA-YYYYMMDD-UUID (ex: BOMBA-20251110-a3f5d8c2)
        const date = new Date();
        const dateStr = date.getFullYear() + 
                       String(date.getMonth() + 1).padStart(2, '0') + 
                       String(date.getDate()).padStart(2, '0');
        const uniqueId = uuidv4().split('-')[0]; // Premiers 8 caractères du UUID
        const numero_commande = `BOMBA-${dateStr}-${uniqueId.toUpperCase()}`;
        
        // Calculer la date de livraison estimée (3 semaines pour Afrique, 1 mois pour autres)
        const aujourdhui = new Date();
        const joursLivraison = (pays && (pays.toLowerCase().includes('afrique') || 
                                         pays.toLowerCase().includes('bénin') || 
                                         pays.toLowerCase().includes('benin'))) ? 21 : 30;
        const date_livraison_estimee = new Date(aujourdhui.setDate(aujourdhui.getDate() + joursLivraison))
            .toISOString().split('T')[0];
        
        // Insérer la commande dans la base de données
        const [result] = await db.query(
            `INSERT INTO commandes (numero_commande, nom_client, email_client, telephone_client, 
             adresse_livraison, pays, produits_commandes, montant_total, devise, date_livraison_estimee) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [numero_commande, nom_client, email_client, telephone_client, adresse_livraison, 
             pays, JSON.stringify(produits_commandes), montant_total, devise || 'XAF', date_livraison_estimee]
        );
        
        // NOTE: L'email admin sera envoyé APRÈS le paiement confirmé (dans le webhook Stripe)
        // Cela évite d'envoyer des notifications pour des commandes non payées
        
        res.json({ 
            success: true, 
            numero_commande,
            date_livraison_estimee,
            commande_id: result.insertId 
        });
    } catch (error) {
        console.error('Erreur création commande:', error);
        res.status(500).json({ error: 'Erreur lors de la création de la commande' });
    }
});

// ==================== PAIEMENT STRIPE ====================

// API: Obtenir la clé publique Stripe
app.get('/api/stripe/config', (req, res) => {
    res.json({
        publishableKey: process.env.STRIPE_PUBLIC_KEY
    });
});

// API: Créer une session de paiement Stripe (avec rate limiting)
app.post('/api/stripe/create-checkout-session', security.paymentLimiter, async (req, res) => {
    try {
        const { numero_commande, montant_total, devise, commande_id } = req.body;
        
        console.log('📥 Données reçues:', { numero_commande, montant_total, devise, commande_id });
        
        if (!numero_commande || !montant_total) {
            console.log('❌ Données manquantes:', { numero_commande, montant_total });
            return res.status(400).json({ error: 'Données manquantes' });
        }

        // Créer la session Stripe Checkout
        const orderData = {
            id: commande_id,
            numero_commande: numero_commande,
            montant_total: montant_total,
            devise: devise || 'XAF'
        };

        const result = await stripeConfig.createCheckoutSession(orderData);

        if (!result.success) {
            return res.status(500).json({ error: result.error });
        }

        res.json({
            success: true,
            sessionId: result.sessionId,
            url: result.url
        });
    } catch (error) {
        console.error('❌ Erreur création session Stripe:', error);
        res.status(500).json({ error: 'Erreur lors de la création du paiement' });
    }
});

// API: Vérifier le statut d'un paiement
app.get('/api/stripe/verify-payment/:sessionId', async (req, res) => {
    try {
        const result = await stripeConfig.verifyPayment(req.params.sessionId);
        
        if (!result.success) {
            return res.status(500).json({ error: result.error });
        }

        // Si le paiement est confirmé, mettre à jour la commande et envoyer les emails
        // Cette logique fonctionne en local ET en production (doublons protégés par flags BDD)
        if (result.paid && result.metadata.order_id) {
            // Vérifier si la commande existe et récupérer son état
            const [commandes] = await db.query(
                'SELECT * FROM commandes WHERE id = ?',
                [result.metadata.order_id]
            );
            
            if (commandes.length > 0) {
                const commande = commandes[0];
                
                // Mettre à jour uniquement si ce n'est pas déjà fait
                if (!commande.paiement_confirme) {
                    await db.query(
                        'UPDATE commandes SET statut = ?, paiement_confirme = 1 WHERE id = ?',
                        ['Préparation', result.metadata.order_id]
                    );
                    console.log('✅ Commande mise à jour:', commande.numero_commande);
                }
                
                // Vérifier si l'email client a déjà été envoyé
                if (!commande.email_envoye) {
                    console.log('📧 Envoi de l\'email de confirmation au client...');
                    
                    // Adapter les données pour l'email (la fonction attend des noms de champs spécifiques)
                    const dataEmail = {
                        numero_commande: commande.numero_commande,
                        email: commande.email_client,
                        nom: commande.nom_client,
                        prenom: '', // Pas de prénom séparé dans notre BDD
                        montant_total: commande.montant_total,
                        devise: commande.devise || 'XAF',
                        produits: commande.produits_commandes,
                        adresse: commande.adresse_livraison,
                        ville: commande.ville || '',
                        pays: commande.pays,
                        telephone: commande.telephone_client,
                        date_commande: commande.date_commande
                    };
                    
                    const emailResult = await envoyerEmailConfirmation(dataEmail);
                    
                    if (emailResult.success) {
                        await db.query(
                            'UPDATE commandes SET email_envoye = 1 WHERE id = ?',
                            [result.metadata.order_id]
                        );
                        console.log('✅ Email client envoyé à:', commande.email_client);
                    } else {
                        console.error('❌ Erreur envoi email client:', emailResult.error);
                    }
                }
                
                // Vérifier si l'email admin a déjà été envoyé
                if (!commande.email_admin_envoye) {
                    console.log('📧 Envoi de l\'email de notification à l\'admin...');
                    const produits = JSON.parse(commande.produits_commandes);
                    const emailAdminResult = await envoyerEmailNotificationAdmin({
                        numero_commande: commande.numero_commande,
                        nom_client: commande.nom_client,
                        email_client: commande.email_client,
                        telephone_client: commande.telephone_client,
                        pays: commande.pays,
                        montant_total: commande.montant_total,
                        devise: commande.devise || 'XAF',
                        produits: produits
                    });
                    
                    if (emailAdminResult.success) {
                        await db.query(
                            'UPDATE commandes SET email_admin_envoye = 1 WHERE id = ?',
                            [result.metadata.order_id]
                        );
                        console.log('✅ Email admin envoyé pour commande:', commande.numero_commande);
                    } else {
                        console.error('❌ Erreur envoi email admin:', emailAdminResult.error);
                    }
                }
            }
        }

        res.json(result);
    } catch (error) {
        console.error('❌ Erreur vérification paiement:', error);
        res.status(500).json({ error: 'Erreur lors de la vérification du paiement' });
    }
});

// Webhook Stripe (pour recevoir les confirmations de paiement)
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['stripe-signature'];
    
    const validation = stripeConfig.validateWebhook(req.body, signature);
    
    if (!validation.success) {
        console.error('❌ Webhook non valide:', validation.error);
        return res.status(400).send(`Webhook Error: ${validation.error}`);
    }

    const event = validation.event;

    // Gérer les différents types d'événements
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log('✅ Paiement confirmé:', session.id);
            
            // Mettre à jour la commande
            if (session.metadata.order_id) {
                // Récupérer les détails de la commande
                const [commandes] = await db.query(
                    'SELECT * FROM commandes WHERE id = ?',
                    [session.metadata.order_id]
                );
                
                if (commandes.length > 0) {
                    const commande = commandes[0];
                    
                    // Mettre à jour la commande avec paiement confirmé
                    await db.query(
                        'UPDATE commandes SET statut = ?, paiement_confirme = 1, stripe_session_id = ? WHERE id = ?',
                        ['Préparation', session.id, session.metadata.order_id]
                    );
                    
                    // Vérifier si l'email client a déjà été envoyé pour éviter les doublons
                    if (commande.email_envoye) {
                        console.log('ℹ️ Email client déjà envoyé pour la commande:', commande.numero_commande);
                    } else {
                        // Envoyer l'email de confirmation au client
                        console.log('📧 Envoi de l\'email de confirmation au client...');
                        
                        // Adapter les données pour l'email (la fonction attend des noms de champs spécifiques)
                        const dataEmail = {
                            numero_commande: commande.numero_commande,
                            email: commande.email_client,
                            nom: commande.nom_client,
                            prenom: '', // Pas de prénom séparé dans notre BDD
                            montant_total: commande.montant_total,
                            devise: commande.devise || 'XAF',
                            produits: commande.produits_commandes,
                            adresse: commande.adresse_livraison,
                            ville: commande.ville || '',
                            pays: commande.pays,
                            telephone: commande.telephone_client,
                            date_commande: commande.date_commande
                        };
                        
                        const emailResult = await envoyerEmailConfirmation(dataEmail);
                        
                        if (emailResult.success) {
                            // Marquer l'email client comme envoyé dans la base de données
                            await db.query(
                                'UPDATE commandes SET email_envoye = 1 WHERE id = ?',
                                [session.metadata.order_id]
                            );
                            console.log('✅ Email de confirmation envoyé à:', commande.email_client);
                        } else {
                            console.error('❌ Erreur envoi email client:', emailResult.error);
                        }
                    }
                    
                    // Vérifier si l'email admin a déjà été envoyé pour éviter les doublons
                    if (commande.email_admin_envoye) {
                        console.log('ℹ️ Email admin déjà envoyé pour la commande:', commande.numero_commande);
                    } else {
                        // Envoyer l'email de notification à l'admin
                        console.log('📧 Envoi de l\'email de notification à l\'admin...');
                        const produits = JSON.parse(commande.produits_commandes);
                        const emailAdminResult = await envoyerEmailNotificationAdmin({
                            numero_commande: commande.numero_commande,
                            nom_client: commande.nom_client,
                            email_client: commande.email_client,
                            telephone_client: commande.telephone_client,
                            pays: commande.pays,
                            montant_total: commande.montant_total,
                            devise: commande.devise || 'XAF',
                            produits: produits
                        });
                        
                        if (emailAdminResult.success) {
                            // Marquer l'email admin comme envoyé dans la base de données
                            await db.query(
                                'UPDATE commandes SET email_admin_envoye = 1 WHERE id = ?',
                                [session.metadata.order_id]
                            );
                            console.log('✅ Email admin envoyé pour commande:', commande.numero_commande);
                        } else {
                            console.error('❌ Erreur envoi email admin:', emailAdminResult.error);
                        }
                    }
                }
            }
            break;
            
        case 'payment_intent.payment_failed':
            const paymentIntent = event.data.object;
            console.log('❌ Paiement échoué:', paymentIntent.id);
            break;
    }

    res.json({ received: true });
});

// API: Suivre une commande
app.get('/api/commandes/:numero', async (req, res) => {
    try {
        const [commandes] = await db.query(
            'SELECT * FROM commandes WHERE numero_commande = ?', 
            [req.params.numero]
        );
        
        if (commandes.length === 0) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }
        
        res.json(commandes[0]);
    } catch (error) {
        console.error('Erreur suivi commande:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==================== ROUTES ADMIN ====================

// Page de connexion admin
app.get('/admin/login', (req, res) => {
    if (req.session.adminLoggedIn) {
        return res.redirect('/admin/dashboard');
    }
    res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

// API: Connexion admin (avec rate limiting strict)
app.post('/api/admin/login', security.authLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const [admins] = await db.query('SELECT * FROM admin WHERE username = ?', [username]);
        
        if (admins.length === 0) {
            return res.status(401).json({ error: 'Identifiants incorrects' });
        }
        
        const admin = admins[0];
        
        // Si le mot de passe est "temp_password", c'est la première connexion
        if (admin.mot_de_passe === 'temp_password') {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.query('UPDATE admin SET mot_de_passe = ? WHERE id = ?', [hashedPassword, admin.id]);
            req.session.adminLoggedIn = true;
            req.session.adminId = admin.id;
            return res.json({ success: true });
        }
        
        // Vérifier le mot de passe hashé
        const passwordMatch = await bcrypt.compare(password, admin.mot_de_passe);
        
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Identifiants incorrects' });
        }
        
        req.session.adminLoggedIn = true;
        req.session.adminId = admin.id;
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur connexion admin:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// API: Déconnexion admin
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Dashboard admin
app.get('/admin/dashboard', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

// API: Récupérer toutes les commandes (admin)
app.get('/api/admin/commandes', checkAuth, async (req, res) => {
    try {
        const [commandes] = await db.query('SELECT * FROM commandes ORDER BY date_commande DESC');
        res.json(commandes);
    } catch (error) {
        console.error('Erreur récupération commandes:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// API: Récupérer les statistiques de visites (admin)
app.get('/api/admin/statistiques', checkAuth, async (req, res) => {
    try {
        // Statistiques du jour
        const dateAujourdhui = new Date().toISOString().split('T')[0];
        const [statsAujourdhui] = await db.query(
            'SELECT nombre_visites, visiteurs_uniques FROM statistiques_visites WHERE date_visite = ?',
            [dateAujourdhui]
        );
        
        // Statistiques des 7 derniers jours
        const [stats7jours] = await db.query(
            `SELECT date_visite, nombre_visites, visiteurs_uniques 
             FROM statistiques_visites 
             WHERE date_visite >= DATE_SUB(?, INTERVAL 7 DAY)
             ORDER BY date_visite DESC`,
            [dateAujourdhui]
        );
        
        // VISITEURS UNIQUES sur 7 jours (compte chaque IP 1 seule fois)
        const [visiteursUniques7jours] = await db.query(
            `SELECT COUNT(DISTINCT session_id) as total
             FROM sessions_visiteurs 
             WHERE DATE(derniere_visite) >= DATE_SUB(?, INTERVAL 7 DAY)`,
            [dateAujourdhui]
        );
        
        // Statistiques des 30 derniers jours
        const [stats30jours] = await db.query(
            `SELECT date_visite, nombre_visites, visiteurs_uniques 
             FROM statistiques_visites 
             WHERE date_visite >= DATE_SUB(?, INTERVAL 30 DAY)
             ORDER BY date_visite DESC`,
            [dateAujourdhui]
        );
        
        // TOUTES les statistiques (pour le calendrier)
        const [statsHistorique] = await db.query(
            `SELECT date_visite, nombre_visites, visiteurs_uniques 
             FROM statistiques_visites 
             ORDER BY date_visite DESC`
        );
        
        // Total toutes périodes
        const [statsTotal] = await db.query(
            `SELECT 
                SUM(nombre_visites) as total_visites,
                SUM(visiteurs_uniques) as total_visiteurs,
                COUNT(DISTINCT date_visite) as jours_actifs
             FROM statistiques_visites`
        );
        
        // VISITEURS UNIQUES GLOBAUX (compte chaque IP 1 seule fois sur toute la période)
        const [visiteursUniquesGlobal] = await db.query(
            `SELECT COUNT(DISTINCT session_id) as total
             FROM sessions_visiteurs`
        );
        
        // Sessions actives (dernières 24h)
        const [sessionsActives] = await db.query(
            `SELECT COUNT(*) as count 
             FROM sessions_visiteurs 
             WHERE derniere_visite >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
        );
        
        // ========== STATISTIQUES COMMANDES ET PRODUITS ==========
        
        // Total des commandes
        const [totalCommandes] = await db.query(
            'SELECT COUNT(*) as total FROM commandes'
        );
        
        // Commandes en attente
        const [commandesEnAttente] = await db.query(
            `SELECT COUNT(*) as total FROM commandes 
             WHERE statut IN ('En cours', 'Préparation')`
        );
        
        // Revenus total (par devise)
        const [revenusParDevise] = await db.query(
            'SELECT devise, SUM(montant_total) as total FROM commandes GROUP BY devise'
        );
        
        // Créer un objet pour les revenus par devise
        const revenusMap = {};
        let revenusTotal = 0;
        revenusParDevise.forEach(r => {
            revenusMap[r.devise] = r.total;
            revenusTotal += r.total; // Somme simple (attention: devises différentes!)
        });
        
        // Total des produits
        const [totalProduits] = await db.query(
            'SELECT COUNT(*) as total FROM produits'
        );
        
        res.json({
            // Statistiques visites
            aujourdhui: statsAujourdhui[0] || { nombre_visites: 0, visiteurs_uniques: 0 },
            derniers7jours: stats7jours,
            visiteurs7joursUniques: visiteursUniques7jours[0].total || 0, // NOUVEAU: Visiteurs uniques réels
            derniers30jours: stats30jours,
            historique: statsHistorique,
            total: statsTotal[0] || { total_visites: 0, total_visiteurs: 0, jours_actifs: 0 },
            visiteursUniquesGlobal: visiteursUniquesGlobal[0].total || 0, // NOUVEAU: Total visiteurs uniques réels
            sessionsActives24h: sessionsActives[0].count,
            // Statistiques commandes/produits
            totalVentes: totalCommandes[0].total || 0,
            commandesEnAttente: commandesEnAttente[0].total || 0,
            revenusTotal: revenusTotal,
            revenusParDevise: revenusMap,
            produitsTotal: totalProduits[0].total || 0
        });
    } catch (error) {
        console.error('Erreur récupération statistiques:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// API: Mettre à jour le statut d'une commande
app.put('/api/admin/commandes/:id', checkAuth, async (req, res) => {
    try {
        const { statut } = req.body;
        
        // Récupérer les infos de la commande avant mise à jour
        const [commandes] = await db.query('SELECT * FROM commandes WHERE id = ?', [req.params.id]);
        
        if (commandes.length === 0) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }
        
        const commande = commandes[0];
        const ancienStatut = commande.statut;
        
        // Mettre à jour le statut
        await db.query('UPDATE commandes SET statut = ? WHERE id = ?', [statut, req.params.id]);
        
        // Envoyer un email si le statut est "Expédiée" ou "Livrée"
        if (statut === 'Expédiée' || statut === 'Livrée') {
            console.log(`📧 Changement de statut: ${ancienStatut} → ${statut} pour commande #${commande.numero_commande}`);
            
            const emailResult = await envoyerEmailStatut(commande, statut);
            
            if (emailResult.success) {
                console.log(`✅ Email de notification envoyé à: ${commande.email_client}`);
            } else {
                console.error(`❌ Erreur envoi email: ${emailResult.error}`);
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur mise à jour commande:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// API: Marquer une commande comme vue (Admin)
app.post('/api/admin/commandes/:id/marquer-vue', checkAuth, async (req, res) => {
    try {
        await db.query('UPDATE commandes SET vue = TRUE WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur marquage commande vue:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// API: Obtenir le nombre de commandes non vues (Admin)
app.get('/api/admin/commandes/non-vues/count', checkAuth, async (req, res) => {
    try {
        const [result] = await db.query('SELECT COUNT(*) as count FROM commandes WHERE vue = FALSE');
        res.json({ count: result[0].count });
    } catch (error) {
        console.error('Erreur comptage commandes non vues:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==================== ROUTES UPLOAD D'IMAGES (ADMIN) ====================
// API: Upload d'une image principale (admin)
app.post('/api/admin/upload-image', checkAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucune image fournie' });
        }
        
        // Retourner le chemin relatif de l'image
        const imagePath = `/images/products/${req.file.filename}`;
        res.json({ 
            success: true, 
            imagePath: imagePath,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Erreur upload image:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload de l\'image' });
    }
});

// API: Upload de plusieurs images secondaires (admin)
app.post('/api/admin/upload-images', checkAuth, upload.array('images', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Aucune image fournie' });
        }
        
        // Retourner les chemins relatifs des images
        const imagePaths = req.files.map(file => `/images/products/${file.filename}`);
        res.json({ 
            success: true, 
            imagePaths: imagePaths,
            filenames: req.files.map(f => f.filename)
        });
    } catch (error) {
        console.error('Erreur upload images:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload des images' });
    }
});

// API: Supprimer une image (admin)
app.delete('/api/admin/delete-image', checkAuth, async (req, res) => {
    try {
        const { imagePath } = req.body;
        
        if (!imagePath) {
            return res.status(400).json({ error: 'Chemin d\'image manquant' });
        }
        
        // Construire le chemin complet du fichier
        const filename = path.basename(imagePath);
        const filePath = path.join(__dirname, 'public', 'images', 'products', filename);
        
        // Vérifier si le fichier existe
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ success: true, message: 'Image supprimée' });
        } else {
            res.status(404).json({ error: 'Image non trouvée' });
        }
    } catch (error) {
        console.error('Erreur suppression image:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression de l\'image' });
    }
});

// API: Ajouter un produit (admin)
app.post('/api/admin/produits', checkAuth, async (req, res) => {
    try {
        const { nom, description, textile_disponibilite, prix, devise, categorie, image_principale, images_secondaires, tailles_disponibles } = req.body;
        
        const [result] = await db.query(
            `INSERT INTO produits (nom, description, textile_disponibilite, prix, devise, categorie, image_principale, images_secondaires, tailles_disponibles) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nom, description, textile_disponibilite, prix, devise || 'XAF', categorie, image_principale, images_secondaires, tailles_disponibles]
        );
        
        res.json({ success: true, produit_id: result.insertId });
    } catch (error) {
        console.error('Erreur ajout produit:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// API: Modifier un produit (admin)
app.put('/api/admin/produits/:id', checkAuth, async (req, res) => {
    try {
        const { nom, description, textile_disponibilite, prix, devise, categorie, image_principale, images_secondaires, tailles_disponibles } = req.body;
        
        await db.query(
            `UPDATE produits SET nom = ?, description = ?, textile_disponibilite = ?, prix = ?, devise = ?, categorie = ?, 
             image_principale = ?, images_secondaires = ?, tailles_disponibles = ? WHERE id = ?`,
            [nom, description, textile_disponibilite, prix, devise || 'XAF', categorie, image_principale, images_secondaires, tailles_disponibles, req.params.id]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur modification produit:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// API: Supprimer un produit (admin)
app.delete('/api/admin/produits/:id', checkAuth, async (req, res) => {
    try {
        await db.query('DELETE FROM produits WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur suppression produit:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// API: Statistiques (admin)
app.get('/api/admin/statistiques', checkAuth, async (req, res) => {
    try {
        const [totalVentes] = await db.query('SELECT COUNT(*) as total FROM commandes');
        const [commandesEnAttente] = await db.query('SELECT COUNT(*) as total FROM commandes WHERE statut != "Livrée"');
        const [revenusTotal] = await db.query('SELECT SUM(montant_total) as total FROM commandes WHERE statut = "Livrée"');
        const [produitsTotal] = await db.query('SELECT COUNT(*) as total FROM produits');
        
        // Statistiques des revenus par devise
        const [revenusParDevise] = await db.query(`
            SELECT devise, SUM(montant_total) as total 
            FROM commandes 
            WHERE statut = 'Livrée' 
            GROUP BY devise
        `);
        
        // Statistiques des cookies/consentement
        const [totalSessions] = await db.query('SELECT COUNT(*) as total FROM sessions_visiteurs');
        const [statsVisites] = await db.query(`
            SELECT 
                SUM(nombre_visites) as total_visites,
                SUM(visiteurs_uniques) as total_visiteurs_uniques
            FROM statistiques_visites
        `);
        
        res.json({
            totalVentes: totalVentes[0].total,
            commandesEnAttente: commandesEnAttente[0].total,
            revenusTotal: revenusTotal[0].total || 0,
            produitsTotal: produitsTotal[0].total,
            revenusParDevise: revenusParDevise,
            // Nouvelles stats cookies
            totalSessions: totalSessions[0].total,
            totalVisites: statsVisites[0].total_visites || 0,
            totalVisiteursUniques: statsVisites[0].total_visiteurs_uniques || 0
        });
    } catch (error) {
        console.error('Erreur statistiques:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// API: Statistiques détaillées des visiteurs (admin)
app.get('/api/admin/statistiques/visiteurs', checkAuth, async (req, res) => {
    try {
        // Stats par jour (30 derniers jours)
        const [statsParJour] = await db.query(`
            SELECT 
                date_visite,
                nombre_visites,
                visiteurs_uniques
            FROM statistiques_visites
            ORDER BY date_visite DESC
            LIMIT 30
        `);
        
        // Sessions actives (visiteurs des 30 derniers jours)
        const [sessionsActives] = await db.query(`
            SELECT 
                COUNT(*) as total,
                AVG(nombre_pages_vues) as moyenne_pages_vues
            FROM sessions_visiteurs
            WHERE derniere_visite >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        
        res.json({
            statsParJour: statsParJour.reverse(), // Ordre chronologique
            sessionsActives: sessionsActives[0]
        });
    } catch (error) {
        console.error('Erreur statistiques visiteurs:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==================== SEO: SITEMAP.XML ====================

// Générer le sitemap.xml dynamique
app.get('/sitemap.xml', async (req, res) => {
    try {
        const baseUrl = process.env.SITE_URL || 'https://bombaclothing.com';
        
        // Récupérer tous les produits
        const [produits] = await db.query('SELECT id, date_ajout FROM produits ORDER BY date_ajout DESC');
        
        // Pages statiques du site
        const staticPages = [
            { url: '/', changefreq: 'daily', priority: '1.0' },
            { url: '/panier.html', changefreq: 'weekly', priority: '0.8' },
            { url: '/suivi.html', changefreq: 'weekly', priority: '0.7' },
            { url: '/cgv.html', changefreq: 'monthly', priority: '0.5' },
            { url: '/mentions-legales.html', changefreq: 'monthly', priority: '0.5' },
            { url: '/confidentialite.html', changefreq: 'monthly', priority: '0.5' },
            { url: '/conditions-utilisation.html', changefreq: 'monthly', priority: '0.5' }
        ];
        
        // Construire le XML
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        
        // Ajouter les pages statiques
        staticPages.forEach(page => {
            xml += '  <url>\n';
            xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
            xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
            xml += `    <priority>${page.priority}</priority>\n`;
            xml += '  </url>\n';
        });
        
        // Ajouter chaque produit
        produits.forEach(produit => {
            const lastmod = produit.date_ajout ? new Date(produit.date_ajout).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            xml += '  <url>\n';
            xml += `    <loc>${baseUrl}/produit.html?id=${produit.id}</loc>\n`;
            xml += `    <lastmod>${lastmod}</lastmod>\n`;
            xml += '    <changefreq>weekly</changefreq>\n';
            xml += '    <priority>0.9</priority>\n';
            xml += '  </url>\n';
        });
        
        xml += '</urlset>';
        
        // Définir le content-type XML
        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        console.error('Erreur génération sitemap:', error);
        res.status(500).send('Erreur lors de la génération du sitemap');
    }
});

// ==================== ERROR HANDLER GLOBAL ====================
// Middleware de gestion d'erreurs - DOIT être après toutes les routes
app.use((err, req, res, next) => {
    console.error('❌ Erreur interceptée par le handler:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: 'Erreur serveur interne', details: err.message });
});

// ==================== GESTION DES ERREURS ====================
process.on('uncaughtException', (error) => {
    console.error('❌ ERREUR NON CATCHÉE:', error);
    console.error('Stack:', error.stack);
    // Ne pas quitter pour debug
    // process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ PROMESSE REJETÉE:', reason);
    console.error('Promise:', promise);
    // Ne pas quitter pour debug
    // process.exit(1);
});

// ==================== DÉMARRAGE DU SERVEUR ====================

const server = app.listen(PORT, () => {
    console.log(`🚀 Serveur BOMBA démarré sur http://localhost:${PORT}`);
    console.log(`📊 Interface admin: http://localhost:${PORT}/admin/login`);
});

// Empêcher le serveur de se fermer automatiquement
server.on('close', () => {
    console.log('⚠️ Serveur fermé');
});

server.on('error', (error) => {
    console.error('❌ Erreur serveur:', error);
});
