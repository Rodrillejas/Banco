const db = require('../config/db');

exports.getDashboardStats = async (req, res) => {
    try {
        // Ejecutar consultas en paralelo
        const [clientesResult, cuentasResult, saldoResult, transaccionesResult] = await Promise.all([
            db.query('SELECT COUNT(*) as total FROM public.cliente WHERE activo = true'),
            db.query('SELECT COUNT(*) as total FROM core.cuenta WHERE activa = true'),
            db.query('SELECT SUM(saldo) as total FROM core.cuenta WHERE activa = true'),
            db.query('SELECT COUNT(*) as total, SUM(valor) as monto FROM public.movimiento')
        ]);

        res.json({
            clientes_activos: parseInt(clientesResult.rows[0].total),
            cuentas_activas: parseInt(cuentasResult.rows[0].total),
            saldo_total: parseFloat(saldoResult.rows[0].total || 0),
            transacciones_total: parseInt(transaccionesResult.rows[0].total),
            transacciones_monto: parseFloat(transaccionesResult.rows[0].monto || 0)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener estadísticas del dashboard' });
    }
};

exports.getRecentActivity = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT m.*, tm.nombre as tipo_movimiento_nombre 
            FROM public.movimiento m
            JOIN public.tipo_movimiento tm ON m.tipo_movimiento_id = tm.id
            ORDER BY m.fecha DESC
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener actividad reciente' });
    }
};
