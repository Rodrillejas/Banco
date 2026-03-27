const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function fix() {
    // Find user by cedula
    const u = await pool.query("SELECT id FROM usuario WHERE cedula = '1021392943'");
    if(!u.rows.length) { 
        console.log('USER NOT FOUND - trying to find any user with a credit card...');
        const all = await pool.query("SELECT u.id, u.cedula, c.id as card_id, c.password_pagos_hash FROM usuario u JOIN cuenta c ON c.usuario_id = u.id WHERE c.tipo_cuenta_id = 3 LIMIT 5");
        console.log('Available:', JSON.stringify(all.rows));
        process.exit(0); 
    }
    const userId = u.rows[0].id;
    console.log('User ID:', userId);

    // Find their credit card
    const c = await pool.query('SELECT id, numero_cuenta, activa, password_pagos_hash FROM cuenta WHERE usuario_id = $1 AND tipo_cuenta_id = 3', [userId]);
    console.log('Cards found:', c.rows.length);
    c.rows.forEach(r => console.log(' -', r.id, r.numero_cuenta, 'activa:', r.activa, 'has_pin:', !!r.password_pagos_hash));

    if(!c.rows.length) { console.log('NO CC FOUND'); process.exit(0); }

    // Hash the PIN 9696
    const hash = await bcrypt.hash('9696', 10);
    console.log('Hashing PIN 9696...');

    // Update all their credit cards with the hash
    const upd = await pool.query(
        'UPDATE cuenta SET password_pagos_hash = $1 WHERE usuario_id = $2 AND tipo_cuenta_id = 3 RETURNING id, numero_cuenta', 
        [hash, userId]
    );
    console.log('Updated cards:', upd.rows.map(r => r.numero_cuenta).join(', '));
    console.log('SUCCESS - PIN 9696 is now set for all credit cards of this user');
    process.exit(0);
}

fix().catch(e => { 
    console.error('ERROR:', e.message);
    console.error(e.stack);
    process.exit(1); 
});
