#!/usr/bin/env node

/**
 * Script d'initialisation de la base de données pour Railway
 * Exécute automatiquement le SQL d'initialisation
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
    let connection;
    
    try {
        // Configuration de connexion
        const config = {
            host: process.env.DB_HOST || process.env.MYSQLHOST,
            port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
            user: process.env.DB_USER || process.env.MYSQLUSER,
            password: process.env.DB_PASS || process.env.MYSQLPASSWORD,
            database: process.env.DB_NAME || process.env.MYSQLDATABASE,
            multipleStatements: true
        };

        console.log('🔧 Connexion à MySQL Railway...');
        connection = await mysql.createConnection(config);
        console.log('✅ Connecté !');

        // Lire le fichier SQL
        const sqlFile = path.join(__dirname, 'config', 'init_database.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        console.log('📝 Exécution du script SQL...');
        await connection.query(sql);
        console.log('✅ Base de données initialisée avec succès !');

        // Lire et exécuter le script de mise à jour Stripe
        const stripeSqlFile = path.join(__dirname, 'config', 'update_stripe.sql');
        if (fs.existsSync(stripeSqlFile)) {
            const stripeSql = fs.readFileSync(stripeSqlFile, 'utf8');
            await connection.query(stripeSql);
            console.log('✅ Colonnes Stripe ajoutées !');
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Exécuter si appelé directement
if (require.main === module) {
    initDatabase();
}

module.exports = initDatabase;
