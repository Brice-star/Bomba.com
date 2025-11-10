// ================================================
// BOMBA - Chargeur de configuration sécurisé
// ================================================

const path = require('path');
const fs = require('fs');

/**
 * Charge les variables d'environnement de manière sécurisée
 * - En développement : utilise .env
 * - En production : utilise les variables système
 */
function loadEnv() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
        console.log('🔐 Mode PRODUCTION : Utilisation des variables d\'environnement système');
        
        // Vérifier que toutes les variables requises sont présentes
        const requiredVars = [
            'DB_HOST',
            'DB_USER',
            'DB_PASSWORD',
            'DB_NAME',
            'STRIPE_SECRET_KEY',
            'STRIPE_PUBLIC_KEY',
            'SESSION_SECRET',
            'PORT'
        ];
        
        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            console.error('❌ Variables d\'environnement manquantes en production:');
            missingVars.forEach(varName => console.error(`   - ${varName}`));
            console.error('\n💡 Définissez-les avec:');
            console.error('   export NOM_VARIABLE="valeur"  (Linux/Mac)');
            console.error('   $env:NOM_VARIABLE="valeur"    (PowerShell)');
            process.exit(1);
        }
        
        console.log('✅ Toutes les variables d\'environnement sont présentes');
        
    } else {
        console.log('⚠️ Mode DÉVELOPPEMENT : Utilisation du fichier .env');
        
        // Charger le fichier .env
        const envPath = path.resolve(__dirname, '../.env');
        
        if (!fs.existsSync(envPath)) {
            console.error('❌ Fichier .env introuvable!');
            console.error('💡 Copiez .env.example vers .env et remplissez les valeurs');
            process.exit(1);
        }
        
        require('dotenv').config({ path: envPath });
        console.log('✅ Fichier .env chargé');
        
        // Vérifier les permissions du fichier .env (Windows)
        if (process.platform === 'win32') {
            console.log('⚠️ RAPPEL : En production, ne PAS uploader le fichier .env');
        }
    }
    
    return {
        db: {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        },
        stripe: {
            secretKey: process.env.STRIPE_SECRET_KEY,
            publicKey: process.env.STRIPE_PUBLIC_KEY
        },
        session: {
            secret: process.env.SESSION_SECRET
        },
        port: process.env.PORT || 3000,
        isProduction: isProduction
    };
}

/**
 * Valider que les clés Stripe sont correctes
 */
function validateStripeKeys(config) {
    const { secretKey, publicKey } = config.stripe;
    
    if (!secretKey || !publicKey) {
        console.error('❌ Clés Stripe manquantes dans la configuration');
        process.exit(1);
    }
    
    const isTestMode = secretKey.startsWith('sk_test_');
    const isLiveMode = secretKey.startsWith('sk_live_');
    
    if (!isTestMode && !isLiveMode) {
        console.error('❌ Clé Stripe invalide (doit commencer par sk_test_ ou sk_live_)');
        process.exit(1);
    }
    
    if (config.isProduction && isTestMode) {
        console.error('⚠️ ATTENTION : Clés Stripe TEST utilisées en PRODUCTION!');
        console.error('   Activez les clés LIVE pour accepter de vrais paiements');
    }
    
    if (!config.isProduction && isLiveMode) {
        console.warn('⚠️ ATTENTION : Clés Stripe LIVE utilisées en DÉVELOPPEMENT!');
        console.warn('   Utilisez les clés TEST pour éviter de vrais paiements');
    }
    
    return true;
}

/**
 * Valider le SESSION_SECRET
 */
function validateSessionSecret(config) {
    const { secret } = config.session;
    
    if (!secret) {
        console.error('❌ SESSION_SECRET manquant');
        process.exit(1);
    }
    
    if (secret.length < 32) {
        console.error('❌ SESSION_SECRET trop court (minimum 32 caractères)');
        process.exit(1);
    }
    
    if (config.isProduction && secret.includes('change-in-production')) {
        console.error('❌ SESSION_SECRET par défaut détecté en PRODUCTION!');
        console.error('   Générez un nouveau secret avec:');
        console.error('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
        process.exit(1);
    }
    
    return true;
}

/**
 * Initialiser la configuration
 */
function initConfig() {
    console.log('\n🔧 Initialisation de la configuration...\n');
    
    const config = loadEnv();
    
    // Validations
    validateStripeKeys(config);
    validateSessionSecret(config);
    
    console.log('\n✅ Configuration validée et chargée avec succès\n');
    
    return config;
}

module.exports = {
    initConfig,
    loadEnv,
    validateStripeKeys,
    validateSessionSecret
};
