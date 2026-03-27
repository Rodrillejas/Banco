const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function seed() {
    try {
        // Check if superadmin already exists
        const existing = await pool.query("SELECT id FROM usuario WHERE rol = 'superadmin' LIMIT 1");
        if (existing.rows.length > 0) {
            console.log('Super admin ya existe (id:', existing.rows[0].id, ')');
            await pool.end();
            return;
        }

        const passwordHash = await bcrypt.hash('admin123', 10);
        const result = await pool.query(
            `INSERT INTO usuario (cedula, nombre, apellido, email, telefono, password_hash, rol, estado, activo)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            ['admin', 'Super', 'Administrador', 'admin@bancoum.com', '0000000000', passwordHash, 'superadmin', 'activo', true]
        );

        console.log('Super Admin creado exitosamente!');
        console.log('  Cédula/Usuario: admin');
        console.log('  Contraseña: admin123');
        console.log('  ID:', result.rows[0].id);
        
        await pool.end();
    } catch (err) {
        console.error('Error en seed:', err.message);
        process.exit(1);
    }
}

seed();
