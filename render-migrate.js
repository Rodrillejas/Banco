// Render Migration - Executes each statement individually
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const RENDER_DB_URL = 'postgresql://user_banco:ktKjcSTaHKXW6aD1KlldHVyGSAK6Ts3V@dpg-d73eog450q8c739j9e80-a.ohio-postgres.render.com/banco_db_5o7h';

const client = new Client({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
});

const STATEMENTS = [
    `CREATE TABLE IF NOT EXISTS tipo_cuenta (id SERIAL PRIMARY KEY, nombre VARCHAR(50) UNIQUE NOT NULL, descripcion TEXT)`,
    `INSERT INTO tipo_cuenta (nombre, descripcion) VALUES ('ahorros','Cuenta de ahorros'),('corriente','Cuenta corriente'),('credito','Tarjeta de crédito') ON CONFLICT (nombre) DO NOTHING`,
    `CREATE TABLE IF NOT EXISTS tipo_movimiento (id SERIAL PRIMARY KEY, nombre VARCHAR(50) UNIQUE NOT NULL)`,
    `INSERT INTO tipo_movimiento (nombre) VALUES ('DEPOSITO'),('RETIRO'),('TRANSFERENCIA'),('CONSIGNACION'),('PAGO_CREDITO'),('AVANCE') ON CONFLICT (nombre) DO NOTHING`,
    `CREATE TABLE IF NOT EXISTS sede (id SERIAL PRIMARY KEY, nombre VARCHAR(100) NOT NULL, ciudad VARCHAR(100), departamento VARCHAR(100), direccion TEXT, telefono VARCHAR(20), activa BOOLEAN DEFAULT true)`,
    `INSERT INTO sede (nombre, ciudad, departamento, direccion, telefono) VALUES ('Sede Principal','Bogotá','Cundinamarca','Calle 1 # 1-1','6011234567') ON CONFLICT DO NOTHING`,
    `CREATE TABLE IF NOT EXISTS punto_atencion (id SERIAL PRIMARY KEY, sede_id INTEGER REFERENCES sede(id), nombre VARCHAR(100) NOT NULL, codigo VARCHAR(20), activo BOOLEAN DEFAULT true)`,
    `INSERT INTO punto_atencion (sede_id, nombre, codigo) VALUES (1,'Punto 1','P001') ON CONFLICT DO NOTHING`,
    `CREATE TABLE IF NOT EXISTS usuario (id SERIAL PRIMARY KEY, cedula VARCHAR(20) UNIQUE NOT NULL, nombre VARCHAR(100) NOT NULL, apellido VARCHAR(100) NOT NULL, email VARCHAR(150) UNIQUE NOT NULL, telefono VARCHAR(20), direccion VARCHAR(200), fecha_nacimiento DATE, password_hash VARCHAR(255), password_seguridad_hash VARCHAR(255), rol VARCHAR(20) NOT NULL DEFAULT 'usuario', estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', token_activacion VARCHAR(255), fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP, activo BOOLEAN DEFAULT true)`,
    `CREATE TABLE IF NOT EXISTS cuenta (id SERIAL PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuario(id), tipo_cuenta_id INTEGER NOT NULL REFERENCES tipo_cuenta(id), numero_cuenta VARCHAR(20) UNIQUE NOT NULL, saldo NUMERIC(15,2) DEFAULT 0.00, cupo_total NUMERIC(15,2) DEFAULT 0.00, cupo_disponible NUMERIC(15,2) DEFAULT 0.00, con_cuota_manejo BOOLEAN DEFAULT false, cuota_manejo_valor NUMERIC(10,2) DEFAULT 0.00, tasa_interes NUMERIC(5,4) DEFAULT 0.00, fecha_apertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP, password_pagos_hash VARCHAR(255), activa BOOLEAN DEFAULT true)`,
    `CREATE TABLE IF NOT EXISTS tarjeta_credito (id SERIAL PRIMARY KEY, cuenta_id INTEGER NOT NULL REFERENCES cuenta(id), numero_tarjeta VARCHAR(20) UNIQUE, cupo_total NUMERIC(15,2) DEFAULT 0.00, cupo_disponible NUMERIC(15,2) DEFAULT 0.00, tasa_interes_mensual NUMERIC(5,4) DEFAULT 0.025, dia_corte INTEGER DEFAULT 15, dia_pago INTEGER DEFAULT 25, fecha_activacion TIMESTAMP, activa BOOLEAN DEFAULT false, pin_hash VARCHAR(255), capital_usado NUMERIC(15,2) DEFAULT 0.00, intereses_acumulados NUMERIC(15,2) DEFAULT 0.00)`,
    `CREATE TABLE IF NOT EXISTS movimiento (id SERIAL PRIMARY KEY, cuenta_id INTEGER NOT NULL REFERENCES cuenta(id), tipo_movimiento_id INTEGER NOT NULL REFERENCES tipo_movimiento(id), punto_id INTEGER REFERENCES punto_atencion(id), monto NUMERIC(15,2) NOT NULL, descripcion TEXT, fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP, saldo_despues NUMERIC(15,2))`,
    `CREATE TABLE IF NOT EXISTS producto_solicitud (id SERIAL PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuario(id), tipo_producto VARCHAR(30) NOT NULL, estado VARCHAR(30) NOT NULL DEFAULT 'pendiente', fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP, fecha_resolucion TIMESTAMP, observaciones TEXT)`,
    `CREATE TABLE IF NOT EXISTS pago_credito (id SERIAL PRIMARY KEY, cuenta_credito_id INTEGER NOT NULL REFERENCES cuenta(id), cuenta_origen_id INTEGER REFERENCES cuenta(id), monto_total NUMERIC(15,2) NOT NULL, capital NUMERIC(15,2) NOT NULL DEFAULT 0.00, intereses NUMERIC(15,2) NOT NULL DEFAULT 0.00, mora NUMERIC(15,2) NOT NULL DEFAULT 0.00, registrado_por VARCHAR(20) NOT NULL DEFAULT 'usuario', admin_id INTEGER REFERENCES usuario(id), fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS notificacion (id SERIAL PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuario(id), tipo VARCHAR(50) NOT NULL, titulo VARCHAR(200) NOT NULL, mensaje TEXT NOT NULL, leida BOOLEAN DEFAULT false, fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS empleado (id SERIAL PRIMARY KEY, usuario_id INTEGER REFERENCES usuario(id), sede_id INTEGER REFERENCES sede(id), cargo VARCHAR(100), activo BOOLEAN DEFAULT true)`,
    `CREATE TABLE IF NOT EXISTS turno (id SERIAL PRIMARY KEY, punto_id INTEGER REFERENCES punto_atencion(id), cliente_id INTEGER REFERENCES usuario(id), numero VARCHAR(20), estado VARCHAR(20) DEFAULT 'esperando', fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS ubicacion (id SERIAL PRIMARY KEY, sede_id INTEGER REFERENCES sede(id), latitud NUMERIC(10,7), longitud NUMERIC(10,7))`,
    `CREATE TABLE IF NOT EXISTS compra_tarjeta (id SERIAL PRIMARY KEY, cuenta_id INTEGER NOT NULL REFERENCES cuenta(id), descripcion TEXT, monto_inicial NUMERIC(15,2) NOT NULL, cuotas_totales INTEGER NOT NULL DEFAULT 1, cuotas_pagadas INTEGER NOT NULL DEFAULT 0, tasa_interes_mensual NUMERIC(5,4) NOT NULL DEFAULT 0.025, saldo_restante NUMERIC(15,2) NOT NULL, fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP, estado VARCHAR(20) DEFAULT 'ACTIVO')`
];

async function migrate() {
    try {
        await client.connect();
        console.log('✅ Connected to Render DB!');
        
        let success = 0;
        let skipped = 0;
        for (const stmt of STATEMENTS) {
            try {
                await client.query(stmt);
                success++;
            } catch (e) {
                console.warn('⚠️  Skipped:', e.message.substring(0, 80));
                skipped++;
            }
        }
        console.log(`\n✅ Schema: ${success} OK, ${skipped} skipped`);

        // Superadmin
        const passwordHash = await bcrypt.hash('admin123', 10);
        const secHash = await bcrypt.hash('admin123', 10);
        try {
            await client.query(
                `INSERT INTO usuario (cedula, nombre, apellido, email, telefono, password_hash, password_seguridad_hash, rol, estado, activo)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (cedula) DO NOTHING`,
                ['admin', 'Super', 'Administrador', 'admin@bancoum.com', '0000000000', passwordHash, secHash, 'superadmin', 'activo', true]
            );
            console.log('✅ Superadmin ensured!  LOGIN: admin / admin123');
        } catch(e) {
            console.warn('⚠️  Superadmin skip:', e.message);
        }

        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
        console.log('\n📋 Tables on Render:');
        res.rows.forEach(r => console.log('  ✔', r.table_name));

    } catch (err) {
        console.error('❌ Fatal:', err.message);
    } finally {
        await client.end();
    }
}

migrate();
