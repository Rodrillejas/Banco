const { Client } = require('pg');
const client = new Client({
    connectionString: 'postgresql://user_banco:ktKjcSTaHKXW6aD1KlldHVyGSAK6Ts3V@dpg-d73eog450q8c739j9e80-a.ohio-postgres.render.com/banco_db_5o7h',
    ssl: { rejectUnauthorized: false }
});

async function safeQ(sql, params) {
    try { return await client.query(sql, params); } catch(e) {}
}

client.connect().then(async () => {
    const TARGET_EMAIL = 'leidyjohanaarango231@gmail.com';
    const r = await client.query('SELECT id, cedula, nombre, apellido, email, estado FROM usuario WHERE email = $1', [TARGET_EMAIL]);
    
    if (r.rows.length === 0) {
        console.log(`✅ No user found with email ${TARGET_EMAIL}`);
        return client.end();
    }

    const u = r.rows[0];
    console.log(`Found: ID:${u.id} | ${u.cedula} | ${u.nombre} ${u.apellido} | ${u.email}`);

    const accs = await client.query('SELECT id FROM cuenta WHERE usuario_id = $1', [u.id]);
    for (const a of accs.rows) {
        await safeQ('DELETE FROM movimiento WHERE cuenta_id = $1', [a.id]);
        await safeQ('DELETE FROM pago_credito WHERE cuenta_credito_id = $1', [a.id]);
        await safeQ('DELETE FROM pago_credito WHERE cuenta_origen_id = $1', [a.id]);
        await safeQ('DELETE FROM compra_tarjeta WHERE cuenta_id = $1', [a.id]);
        await safeQ('DELETE FROM tarjeta_credito WHERE cuenta_id = $1', [a.id]);
    }
    await safeQ('DELETE FROM notificacion WHERE usuario_id = $1', [u.id]);
    await safeQ('DELETE FROM producto_solicitud WHERE usuario_id = $1', [u.id]);
    await safeQ('DELETE FROM cuenta WHERE usuario_id = $1', [u.id]);
    const del = await client.query('DELETE FROM usuario WHERE id = $1 RETURNING id', [u.id]);
    console.log(del.rows.length > 0 ? '✅ DELETED - can now register with this email' : '❌ Not deleted');

    client.end();
}).catch(console.error);
