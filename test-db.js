require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.query('SELECT * FROM public.cliente LIMIT 2', (err, res) => {
  if (err) {
    console.error('Connection Error:', err.message);
  } else {
    console.log('Got Clientes:', res.rows);
  }
  pool.end();
});
