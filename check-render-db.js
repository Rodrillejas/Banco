// Full diagnostic - verifies the admin user on Render
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
    connectionString: 'postgresql://user_banco:ktKjcSTaHKXW6aD1KlldHVyGSAK6Ts3V@dpg-d73eog450q8c739j9e80-a.ohio-postgres.render.com/banco_db_5o7h',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();
    
    // Check admin user
    const res = await client.query("SELECT id, cedula, email, rol, estado, activo, password_hash FROM usuario WHERE rol = 'superadmin'");
    console.log('\n👤 Superadmin in Render DB:');
    for (let u of res.rows) {
        console.log('  ID:', u.id);
        console.log('  Cedula:', u.cedula);
        console.log('  Email:', u.email);
        console.log('  Rol:', u.rol);
        console.log('  Estado:', u.estado);
        console.log('  Activo:', u.activo);
        
        // Verify password works
        const match = await bcrypt.compare('admin123', u.password_hash);
        console.log('  Password "admin123" matches:', match ? '✅ YES' : '❌ NO');
    }

    if (res.rows.length === 0) {
        console.log('❌ No superadmin found! Creating one now...');
        const hash = await bcrypt.hash('admin123', 10);
        await client.query(
            `INSERT INTO usuario (cedula, nombre, apellido, email, telefono, password_hash, password_seguridad_hash, rol, estado, activo)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            ['admin', 'Super', 'Administrador', 'admin@bancoum.com', '0000000000', hash, hash, 'superadmin', 'activo', true]
        );
        console.log('✅ Created superadmin: cedula=admin password=admin123');
    }

    await client.end();
}
run().catch(console.error);
