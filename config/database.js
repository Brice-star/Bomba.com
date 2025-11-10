// Configuration de la connexion MySQL
const mysql = require('mysql2');
require('dotenv').config();

// Créer un pool de connexions pour optimiser les performances
const pool = mysql.createPool({
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASS || process.env.MYSQLPASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'bomba',
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
