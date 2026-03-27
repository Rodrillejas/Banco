require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'banco',
    password: process.env.DB_PASSWORD || '1234',
    port: process.env.DB_PORT || 5432,
});

async function migrate() {
    try {
        console.log("Adding new columns to core.cuenta...");
        await pool.query("ALTER TABLE core.cuenta ADD COLUMN IF NOT EXISTS fecha_corte INTEGER DEFAULT 30;");
        await pool.query("ALTER TABLE core.cuenta ADD COLUMN IF NOT EXISTS dia_pago INTEGER DEFAULT 15;");
        await pool.query("ALTER TABLE core.cuenta ADD COLUMN IF NOT EXISTS intereses_acumulados NUMERIC(15,2) DEFAULT 0;");
        await pool.query("ALTER TABLE core.cuenta ADD COLUMN IF NOT EXISTS mora_acumulada NUMERIC(15,2) DEFAULT 0;");
        
        console.log("Checking constraint for tipo_movimiento id 5...");
        const res = await pool.query("SELECT * FROM public.tipo_movimiento WHERE id = 5;");
        if (res.rows.length === 0) {
            console.log("Inserting AVANCE_CREDITO type...");
            await pool.query("INSERT INTO public.tipo_movimiento (id, nombre) VALUES (5, 'AVANCE_CREDITO');");
        } else {
            console.log("AVANCE_CREDITO type already exists!");
        }

        console.log("Migration successful!");
    } catch(e) {
        console.error("Migration failed:", e);
    } finally {
        pool.end();
        process.exit(0);
    }
}
migrate();
