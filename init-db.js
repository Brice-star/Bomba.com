// Script pour initialiser automatiquement la base de données
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDatabase() {
    console.log('🚀 Initialisation de la base de données BOMBA...\n');
    
    try {
        // Connexion à MySQL sans spécifier de base de données
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            multipleStatements: true
        });
        
        console.log('✅ Connexion à MySQL réussie');
        
        // Lire le fichier SQL
        const sqlFile = path.join(__dirname, 'config', 'init_database.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        
        console.log('📝 Exécution du script SQL...');
        
        // Exécuter le script SQL
        await connection.query(sql);
        
        console.log('✅ Base de données créée avec succès');
        console.log('✅ Tables créées');
        console.log('✅ Produits initiaux ajoutés');
        console.log('✅ Compte admin créé');
        
        await connection.end();
        
        console.log('\n🎉 Initialisation terminée avec succès !');
        console.log('\n📋 Identifiants admin par défaut :');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('\n🚀 Vous pouvez maintenant démarrer le serveur avec : npm start');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.log('\n📝 Vérifiez :');
        console.log('   1. MySQL est démarré');
        console.log('   2. Les identifiants dans .env sont corrects');
        console.log('   3. L\'utilisateur MySQL a les permissions nécessaires');
    }
}

initDatabase();
