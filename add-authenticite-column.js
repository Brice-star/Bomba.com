const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function addAuthenticiteColumn() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'bomba'
        });

        console.log('🔧 Ajout de la colonne textile_disponibilite...');
        
        const sql = fs.readFileSync('./config/add_authenticite_column.sql', 'utf8');
        await connection.query(sql);
        
        console.log('✅ Colonne textile_disponibilite ajoutée avec succès !');
        
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️  La colonne textile_disponibilite existe déjà');
        } else {
            console.error('❌ Erreur:', error.message);
        }
    } finally {
        if (connection) await connection.end();
    }
}

addAuthenticiteColumn();
