// Serveur principal BOMBA E-commerce
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Chargement sécurisé de la configuration
const { initConfig } = require('./config/env-loader');
const config = initConfig();

const db = require('./config/database');
const checkAuth = require('./middleware/auth');
const stripeConfig = require('./config/stripe');
const security = require('./middleware/security');
const antibot = require('./middleware/antibot');

const app = express();
const PORT = config.port;

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

// ==================== ROUTES PUBLIQUES ====================

// Page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// ==================== PROTECTION API ====================
// Rate limiting sur toutes les routes API (sauf webhook)
app.use('/api', (req, res, next) => {
    if (req.path === '/stripe/webhook') {
        return next(); // Pas de rate limit sur le webhook Stripe
    }
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

// Page CGV
app.get('/cgv', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'cgv.html'));
});

// API: Créer une commande (avec protection honeypot)
app.post('/api/commandes', antibot.honeypotCheck, async (req, res) => {
    try {
        const { nom_client, email_client, telephone_client, adresse_livraison, pays, produits_commandes, montant_total } = req.body;
        
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
             adresse_livraison, pays, produits_commandes, montant_total, date_livraison_estimee) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [numero_commande, nom_client, email_client, telephone_client, adresse_livraison, 
             pays, JSON.stringify(produits_commandes), montant_total, date_livraison_estimee]
        );
        
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
        const { numero_commande, montant_total, commande_id } = req.body;
        
        console.log('📥 Données reçues:', { numero_commande, montant_total, commande_id });
        
        if (!numero_commande || !montant_total) {
            console.log('❌ Données manquantes:', { numero_commande, montant_total });
            return res.status(400).json({ error: 'Données manquantes' });
        }

        // Créer la session Stripe Checkout
        const orderData = {
            id: commande_id,
            numero_commande: numero_commande,
            montant_total: montant_total
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

        // Si le paiement est confirmé, mettre à jour la commande
        if (result.paid && result.metadata.order_id) {
            await db.query(
                'UPDATE commandes SET statut = ?, paiement_confirme = 1 WHERE id = ?',
                ['En préparation', result.metadata.order_id]
            );
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
                await db.query(
                    'UPDATE commandes SET statut = ?, paiement_confirme = 1, stripe_session_id = ? WHERE id = ?',
                    ['En préparation', session.id, session.metadata.order_id]
                );
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

// API: Mettre à jour le statut d'une commande
app.put('/api/admin/commandes/:id', checkAuth, async (req, res) => {
    try {
        const { statut } = req.body;
        await db.query('UPDATE commandes SET statut = ? WHERE id = ?', [statut, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur mise à jour commande:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// API: Ajouter un produit (admin)
app.post('/api/admin/produits', checkAuth, async (req, res) => {
    try {
        const { nom, description, textile_disponibilite, prix, categorie, image_principale, images_secondaires, tailles_disponibles } = req.body;
        
        const [result] = await db.query(
            `INSERT INTO produits (nom, description, textile_disponibilite, prix, categorie, image_principale, images_secondaires, tailles_disponibles) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [nom, description, textile_disponibilite, prix, categorie, image_principale, images_secondaires, tailles_disponibles]
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
        const { nom, description, textile_disponibilite, prix, categorie, image_principale, images_secondaires, tailles_disponibles } = req.body;
        
        await db.query(
            `UPDATE produits SET nom = ?, description = ?, textile_disponibilite = ?, prix = ?, categorie = ?, 
             image_principale = ?, images_secondaires = ?, tailles_disponibles = ? WHERE id = ?`,
            [nom, description, textile_disponibilite, prix, categorie, image_principale, images_secondaires, tailles_disponibles, req.params.id]
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
        
        res.json({
            totalVentes: totalVentes[0].total,
            commandesEnAttente: commandesEnAttente[0].total,
            revenusTotal: revenusTotal[0].total || 0,
            produitsTotal: produitsTotal[0].total
        });
    } catch (error) {
        console.error('Erreur statistiques:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ==================== DÉMARRAGE DU SERVEUR ====================

app.listen(PORT, () => {
    console.log(`🚀 Serveur BOMBA démarré sur http://localhost:${PORT}`);
    console.log(`📊 Interface admin: http://localhost:${PORT}/admin/login`);
});
