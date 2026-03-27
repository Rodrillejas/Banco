const { Pool } = require('pg');
require('dotenv').config();

let dbUrl = process.env.DATABASE_URL;
if (dbUrl && dbUrl.includes('?')) {
    dbUrl = dbUrl.split('?')[0]; // Evitar conflictos de sslmode en el string con el objeto ssl
}

const connectionString = dbUrl || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_URL ? {
        require: true,
        rejectUnauthorized: false
    } : false
});

pool.on('error', (err, client) => {
    console.error('Error inesperado en el pool de conexiones de pg', err);
    process.exit(-1);
});

module.exports = pool;
