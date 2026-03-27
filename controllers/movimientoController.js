const db = require('../config/db');

// Obtener todos los movimientos (historial general o por cuenta)
exports.getAllMovimientos = async (req, res) => {
    const { cuenta_id, fecha_inicio, fecha_fin } = req.query;
    try {
        let query = `
            SELECT m.*, tm.nombre as tipo_movimiento_nombre 
            FROM public.movimiento m
            JOIN public.tipo_movimiento tm ON m.tipo_movimiento_id = tm.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (cuenta_id) {
            query += ` AND (m.cuenta_origen_id = $${paramCount} OR m.cuenta_destino_id = $${paramCount})`;
            params.push(cuenta_id);
            paramCount++;
        }

        if (fecha_inicio) {
            query += ` AND m.fecha >= $${paramCount}`;
            params.push(fecha_inicio);
            paramCount++;
        }

        if (fecha_fin) {
            query += ` AND m.fecha <= $${paramCount}`;
            params.push(fecha_fin + ' 23:59:59'); // Para incluir todo el día
            paramCount++;
        }

        query += ' ORDER BY m.fecha DESC LIMIT 100'; // Limitar por defecto para no cargar demasiados datos

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener movimientos' });
    }
};

// Depósito
exports.deposito = async (req, res) => {
    const { cuenta_destino_id, punto_id, valor } = req.body;
    try {
        // En la BD hay un trigger public.actualizar_saldo() que ya maneja 
        // la cuenta destino (tipo_movimiento_id = 1 para DEPOSITO)
        const result = await db.query(
            'INSERT INTO public.movimiento (tipo_movimiento_id, cuenta_destino_id, punto_id, valor) VALUES (1, $1, $2, $3) RETURNING *',
            [cuenta_destino_id, punto_id, valor]
        );
        res.status(201).json({ message: 'Depósito realizado con éxito', movimiento: result.rows[0] });
    } catch (err) {
        console.error(err);
        // Si el trigger falla (ej. cuenta inactiva), se capturará aquí
        res.status(400).json({ error: err.message || 'Error al realizar depósito' });
    }
};

// Retiro
exports.retiro = async (req, res) => {
    const { cuenta_origen_id, punto_id, valor } = req.body;
    try {
        // El trigger public.actualizar_saldo() maneja saldo insuficiente
        // (tipo_movimiento_id = 2 para RETIRO)
        const result = await db.query(
            'INSERT INTO public.movimiento (tipo_movimiento_id, cuenta_origen_id, punto_id, valor) VALUES (2, $1, $2, $3) RETURNING *',
            [cuenta_origen_id, punto_id, valor]
        );
        res.status(201).json({ message: 'Retiro realizado con éxito', movimiento: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message || 'Error al realizar retiro' });
    }
};

// Transferencia
exports.transferencia = async (req, res) => {
    const { cuenta_origen_id, cuenta_destino_id, punto_id, valor } = req.body;
    try {
        // El trigger public.actualizar_saldo() maneja la resta/suma de saldos y verificaciones
        // (tipo_movimiento_id = 3 para TRANSFERENCIA)
        const result = await db.query(
            'INSERT INTO public.movimiento (tipo_movimiento_id, cuenta_origen_id, cuenta_destino_id, punto_id, valor) VALUES (3, $1, $2, $3, $4) RETURNING *',
            [cuenta_origen_id, cuenta_destino_id, punto_id, valor]
        );
        res.status(201).json({ message: 'Transferencia realizada con éxito', movimiento: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message || 'Error al realizar transferencia' });
    }
};
