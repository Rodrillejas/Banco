const pool = require('./config/db');

async function test() {
    try {
        console.log("Testing Clientes...");
        await pool.query("SELECT COUNT(*) FROM public.cliente WHERE activo = true");
        
        console.log("Testing Cuentas...");
        await pool.query("SELECT COUNT(*) FROM core.cuenta WHERE activa = true AND tipo_cuenta_id IN (1,2)");
        
        console.log("Testing Movimientos...");
        await pool.query(`
            SELECT tm.nombre as tipo, COALESCE(SUM(m.valor), 0) as total, COUNT(m.id) as cantidad
            FROM public.movimiento m
            JOIN public.tipo_movimiento tm ON m.tipo_movimiento_id = tm.id
            GROUP BY tm.nombre
        `);
        
        console.log("Testing Clientes Maestro...");
        await pool.query(`
            SELECT 
                c.id, c.numero_documento, c.nombre, c.apellido, c.email, c.activo,
                COUNT(cta.id) as total_productos,
                COALESCE(SUM(CASE WHEN cta.tipo_cuenta_id IN (1,2) THEN cta.saldo ELSE 0 END), 0) as saldo_total,
                bool_or(cta.tipo_cuenta_id = 3) as tiene_tarjeta,
                string_agg(DISTINCT tc.nombre, ', ') as tipos_cuenta
            FROM public.cliente c
            LEFT JOIN core.cuenta cta ON c.id = cta.cliente_id AND cta.activa = true
            LEFT JOIN public.tipo_cuenta tc ON cta.tipo_cuenta_id = tc.id
            GROUP BY c.id
            ORDER BY c.fecha_registro DESC NULLS LAST, c.id DESC LIMIT 200
        `);

        console.log("All queries successful!");
    } catch(e) {
        console.error("SQL Error:", e.message);
    }
    process.exit(0);
}
test();
