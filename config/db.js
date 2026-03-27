const { Pool } = require('pg');
require('dotenv').config();

// Priority: DATABASE_URL env var (set in Render) -> local .env vars -> hardcoded Render URL fallback
const RENDER_FALLBACK_URL = 'postgresql://user_banco:ktKjcSTaHKXW6aD1KlldHVyGSAK6Ts3V@dpg-d73eog450q8c739j9e80-a.ohio-postgres.render.com/banco_db_5o7h';

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && process.env.DB_HOST) {
    dbUrl = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
}
if (!dbUrl) {
    dbUrl = RENDER_FALLBACK_URL;
    console.log('⚠️ Using hardcoded Render DB fallback!');
}
// Remove ?sslmode query param to avoid pg driver conflicts
if (dbUrl.includes('?')) dbUrl = dbUrl.split('?')[0];

console.log('🖧 Connecting to DB host:', dbUrl.split('@')[1]?.split('/')[0] || 'unknown');

const isRender = dbUrl.includes('render.com') || !!process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: dbUrl,
    ssl: isRender ? { require: true, rejectUnauthorized: false } : false
});

pool.on('error', (err, client) => {
    console.error('Error inesperado en el pool de conexiones de pg', err);
    process.exit(-1);
});

module.exports = pool;
