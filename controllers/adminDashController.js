const pool = require('../config/db');

// Admin dashboard stats
exports.getStats = async (req, res) => {
    try {
        const totalUsuarios = await pool.query("SELECT COUNT(*) FROM usuario WHERE rol = 'usuario'");
        const usuariosActivos = await pool.query("SELECT COUNT(*) FROM usuario WHERE rol = 'usuario' AND estado = 'activo'");
        const solicitudesPendientes = await pool.query("SELECT COUNT(*) FROM producto_solicitud WHERE estado = 'pendiente'");
        const totalCuentas = await pool.query("SELECT COUNT(*) FROM cuenta WHERE tipo_cuenta_id != 3");
        const totalTarjetas = await pool.query("SELECT COUNT(*) FROM cuenta WHERE tipo_cuenta_id = 3");
        const totalSaldo = await pool.query("SELECT COALESCE(SUM(saldo), 0) as total FROM cuenta WHERE tipo_cuenta_id != 3");
        const movHoy = await pool.query("SELECT COUNT(*) FROM movimiento WHERE fecha::date = CURRENT_DATE");

        res.json({
            totalUsuarios: parseInt(totalUsuarios.rows[0].count),
            usuariosActivos: parseInt(usuariosActivos.rows[0].count),
            solicitudesPendientes: parseInt(solicitudesPendientes.rows[0].count),
            totalCuentas: parseInt(totalCuentas.rows[0].count),
            totalTarjetas: parseInt(totalTarjetas.rows[0].count),
            totalSaldo: Number(totalSaldo.rows[0].total),
            movimientosHoy: parseInt(movHoy.rows[0].count)
        });
    } catch (err) {
        console.error('Error stats admin:', err);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};

// Get all users
exports.getUsuarios = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.cedula, u.nombre, u.apellido, u.email, u.telefono, u.estado, u.rol, u.fecha_registro,
                    COALESCE(json_agg(json_build_object(
                        'id', c.id, 'numero_cuenta', c.numero_cuenta, 'tipo', tc.nombre,
                        'saldo', c.saldo, 'cupo_total', c.cupo_total, 'cupo_disponible', c.cupo_disponible,
                        'activa', c.activa
                    )) FILTER (WHERE c.id IS NOT NULL), '[]') as cuentas
             FROM usuario u
             LEFT JOIN cuenta c ON c.usuario_id = u.id
             LEFT JOIN tipo_cuenta tc ON tc.id = c.tipo_cuenta_id
             WHERE u.rol = 'usuario'
             GROUP BY u.id
             ORDER BY u.fecha_registro DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error getting usuarios:', err);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
};

// Get all accounts (for admin search in consignation/payment flows)
exports.buscarCuenta = async (req, res) => {
    try {
        const { q } = req.query;
        const result = await pool.query(
            `SELECT c.id, c.numero_cuenta, c.saldo, c.cupo_disponible, tc.nombre as tipo,
                    u.nombre || ' ' || u.apellido as titular, u.cedula
             FROM cuenta c
             JOIN tipo_cuenta tc ON tc.id = c.tipo_cuenta_id
             JOIN usuario u ON u.id = c.usuario_id
             WHERE c.numero_cuenta LIKE $1 OR u.cedula LIKE $1 OR u.nombre ILIKE $1
             ORDER BY c.numero_cuenta
             LIMIT 20`,
            [`%${q || ''}%`]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al buscar cuenta' });
    }
};

// New Enhanced Admin Endpoints
exports.getDashboardMaestro = async (req, res) => {
    try {
        const totalClientes = await pool.query("SELECT COUNT(*) FROM public.cliente WHERE activo = true");
        const totalCuentas = await pool.query("SELECT COUNT(*) FROM core.cuenta WHERE activa = true AND tipo_cuenta_id IN (1,2)");
        const totalTarjetas = await pool.query("SELECT COUNT(*) FROM core.cuenta WHERE activa = true AND tipo_cuenta_id = 3");
        const totalDinero = await pool.query("SELECT COALESCE(SUM(saldo), 0) as total FROM core.cuenta WHERE activa = true AND tipo_cuenta_id IN (1,2)");
        const totalTransacciones = await pool.query("SELECT COUNT(*) FROM public.movimiento");

        const saldosTipo = await pool.query(`
            SELECT tc.nombre, COALESCE(SUM(cl.saldo), 0) as total
            FROM core.cuenta cl
            JOIN public.tipo_cuenta tc ON cl.tipo_cuenta_id = tc.id
            WHERE cl.activa = true AND cl.tipo_cuenta_id IN (1,2)
            GROUP BY tc.nombre
        `);

        // Entradas vs Salidas. En nuestro sistema: Transferencias(3), Consignaciones/Depositos(1), Retiros(2), Pago_Cred(4).
        const flujos = await pool.query(`
            SELECT tm.nombre as tipo, COALESCE(SUM(m.valor), 0) as total, COUNT(m.id) as cantidad
            FROM public.movimiento m
            JOIN public.tipo_movimiento tm ON m.tipo_movimiento_id = tm.id
            GROUP BY tm.nombre
        `);

        // Historial meses / dias: last 30 days
        const actividadDias = await pool.query(`
            SELECT TO_CHAR(fecha, 'MM-DD') as dia, COUNT(*) as cantidad, COALESCE(SUM(valor), 0) as volumen
            FROM public.movimiento 
            WHERE fecha >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY TO_CHAR(fecha, 'MM-DD')
            ORDER BY dia ASC
        `);

        res.json({
            kpis: {
                clientes: parseInt(totalClientes.rows[0].count),
                cuentas_activas: parseInt(totalCuentas.rows[0].count),
                tarjetas_activas: parseInt(totalTarjetas.rows[0].count),
                dinero_total: parseFloat(totalDinero.rows[0].total),
                transacciones: parseInt(totalTransacciones.rows[0].count)
            },
            saldos_tipo: saldosTipo.rows.map(r => ({ nombre: r.nombre, total: parseFloat(r.total) })),
            flujos: flujos.rows.map(r => ({ tipo: r.tipo, total: parseFloat(r.total), cantidad: parseInt(r.cantidad) })),
            actividad_dias: actividadDias.rows.map(r => ({ dia: r.dia, cantidad: parseInt(r.cantidad), volumen: parseFloat(r.volumen) }))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener dashboard maestro' });
    }
};

exports.getClientesMaestro = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                c.id, c.numero_documento, c.nombre, c.apellido, c.email, c.activo,
                u.id as usuario_id,
                COUNT(cta.id) as total_productos,
                COALESCE(SUM(CASE WHEN cta.tipo_cuenta_id IN (1,2) THEN cta.saldo ELSE 0 END), 0) as saldo_total,
                bool_or(cta.tipo_cuenta_id = 3) as tiene_tarjeta,
                string_agg(DISTINCT tc.nombre, ', ') as tipos_cuenta
            FROM public.cliente c
            LEFT JOIN public.usuario u ON u.cedula = c.numero_documento
            LEFT JOIN core.cuenta cta ON c.id = cta.cliente_id AND cta.activa = true
            LEFT JOIN public.tipo_cuenta tc ON cta.tipo_cuenta_id = tc.id
            GROUP BY c.id, u.id
            ORDER BY c.id DESC LIMIT 200
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener detalle de clientes' });
    }
};

exports.getUsuarioDetalleAvanzado = async (req, res) => {
    try {
        const { id } = req.params; // Esto ahora representará la cédula/documento

        // 1. User Info (moderno)
        const userRes = await pool.query("SELECT id, cedula, nombre, apellido, email, telefono, direccion, estado, rol, fecha_registro FROM usuario WHERE cedula = $1", [id]);
        
        if (userRes.rows.length > 0) {
            const user = userRes.rows[0];
            const userId = user.id;

            // 2. Cuentas (Ahorros/Corriente)
            const cuentasRes = await pool.query(
                "SELECT c.id, c.numero_cuenta, c.saldo, tc.nombre as tipo, c.activa FROM cuenta c JOIN tipo_cuenta tc ON c.tipo_cuenta_id = tc.id WHERE c.usuario_id = $1 AND tc.id IN (1,2)", 
                [userId]
            );

            // 3. Tarjetas de crédito
            const tarjetasQuery = await pool.query(
                "SELECT c.id, c.numero_cuenta, c.cupo_total, c.cupo_disponible, (c.cupo_total - c.cupo_disponible) as deuda_capital, c.fecha_corte, c.dia_pago, c.intereses_acumulados, c.mora_acumulada, c.activa FROM cuenta c JOIN tipo_cuenta tc ON c.tipo_cuenta_id = tc.id WHERE c.usuario_id = $1 AND tc.id = 3",
                [userId]
            );

            const tarjetasRes = await Promise.all(tarjetasQuery.rows.map(async (t) => {
                const pagos = await pool.query("SELECT COUNT(*) FROM pago_credito WHERE cuenta_credito_id = $1", [t.id]);
                const totalDeuda = Number(t.deuda_capital) + Number(t.intereses_acumulados) + Number(t.mora_acumulada);
                return {
                    ...t,
                    pagos_realizados: parseInt(pagos.rows[0].count),
                    estado_credito: Number(t.mora_acumulada) > 0 ? 'En Mora' : (totalDeuda > 0 ? 'Activo (Con Deuda)' : 'Al Día')
                };
            }));

            // 4. Historial transacciones
            const allAccounts = [...cuentasRes.rows, ...tarjetasRes].map(c => c.id);
            let movimientos = [];
            if (allAccounts.length > 0) {
                const movs = await pool.query(`
                    SELECT m.id, m.valor, m.fecha, m.cuenta_origen_id, m.cuenta_destino_id, tm.nombre as tipo, 
                           c_orig.numero_cuenta as numero_origen, c_dest.numero_cuenta as numero_destino
                    FROM movimiento m
                    JOIN tipo_movimiento tm ON m.tipo_movimiento_id = tm.id
                    LEFT JOIN cuenta c_orig ON m.cuenta_origen_id = c_orig.id
                    LEFT JOIN public.cuenta p_orig ON m.cuenta_origen_id = p_orig.id
                    LEFT JOIN cuenta c_dest ON m.cuenta_destino_id = c_dest.id
                    LEFT JOIN public.cuenta p_dest ON m.cuenta_destino_id = p_dest.id
                    WHERE m.cuenta_origen_id = ANY($1) OR m.cuenta_destino_id = ANY($1)
                    ORDER BY m.fecha DESC LIMIT 50`, [allAccounts]
                );
                const movSet = new Set();
                movs.rows.forEach(m => {
                    if(!movSet.has(m.id)) {
                        movSet.add(m.id);
                        movimientos.push(m);
                    }
                });
            }

            return res.json({ usuario: user, cuentas: cuentasRes.rows, tarjetas: tarjetasRes, historial: movimientos });
        }

        // ====== FLUJO LEGACY (BD2 ORIGINAL CORE) ======
        const clientRes = await pool.query(
            "SELECT id, numero_documento as cedula, nombre, apellido, email, 'No registrado (Core)' as telefono, 'No registrada' as direccion, CASE WHEN activo THEN 'activo' ELSE 'inactivo' END as estado, 'cliente_legado' as rol, CURRENT_TIMESTAMP as fecha_registro FROM public.cliente WHERE numero_documento = $1", 
            [id]
        );
        
        if (clientRes.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado en ninguna base de datos.' });
        
        const user = clientRes.rows[0];
        const clientId = user.id;

        const cuentasRes = await pool.query(
            "SELECT c.id, c.numero_cuenta, c.saldo, tc.nombre as tipo, c.activa FROM core.cuenta c JOIN public.tipo_cuenta tc ON c.tipo_cuenta_id = tc.id WHERE c.cliente_id = $1 AND tc.id IN (1,2)", 
            [clientId]
        );

        const tarjetasQuery = await pool.query(
            "SELECT c.id, c.numero_cuenta, 0 as cupo_total, 0 as cupo_disponible, 0 as deuda_capital, 30 as fecha_corte, 15 as dia_pago, 0 as intereses_acumulados, 0 as mora_acumulada, c.activa FROM core.cuenta c JOIN public.tipo_cuenta tc ON c.tipo_cuenta_id = tc.id WHERE c.cliente_id = $1 AND tc.id = 3",
            [clientId]
        );
        
        const tarjetasRes = tarjetasQuery.rows.map(t => ({
            ...t,
            pagos_realizados: 0,
            estado_credito: 'Sin Datos (Legado)'
        }));

        const allAccounts = [...cuentasRes.rows, ...tarjetasRes].map(c => c.id);
        let movimientos = [];
        
        if (allAccounts.length > 0) {
            const movs = await pool.query(`
                SELECT m.id, m.valor, m.fecha, m.cuenta_origen_id, m.cuenta_destino_id, tm.nombre as tipo, 
                       c_orig.numero_cuenta as numero_origen, c_dest.numero_cuenta as numero_destino
                FROM public.movimiento m
                JOIN public.tipo_movimiento tm ON m.tipo_movimiento_id = tm.id
                LEFT JOIN core.cuenta c_orig ON m.cuenta_origen_id = c_orig.id
                LEFT JOIN core.cuenta c_dest ON m.cuenta_destino_id = c_dest.id
                WHERE m.cuenta_origen_id = ANY($1) OR m.cuenta_destino_id = ANY($1)
                ORDER BY m.fecha DESC LIMIT 50`, [allAccounts]
            );
            
            const movSet = new Set();
            movs.rows.forEach(m => {
                if(!movSet.has(m.id)) {
                    movSet.add(m.id);
                    movimientos.push(m);
                }
            });
        }

        return res.json({ usuario: user, cuentas: cuentasRes.rows, tarjetas: tarjetasRes, historial: movimientos });
    } catch (err) {
        console.error('Error detallado usuario:', err);
        res.status(500).json({ error: 'Error al obtener vista avanzada' });
    }
};
