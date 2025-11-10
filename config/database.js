// Configuration de la connexion MySQL
const mysql = require('mysql2');
require('dotenv').config();

// Créer un pool de connexions pour optimiser les performances
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'bomba',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Utiliser les promesses pour des requêtes plus propres
const promisePool = pool.promise();

// Tester la connexion
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Erreur de connexion à la base de données:', err.message);
        return;
    }
    console.log('✅ Connexion à la base de données MySQL réussie');
    connection.release();
});

module.exports = promisePool;
