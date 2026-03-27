const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { sendEmail, emailTemplates } = require('../config/email');

// Get user's credit cards
exports.getMisTarjetas = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.*, tc.nombre as tipo FROM cuenta c 
             JOIN tipo_cuenta tc ON tc.id = c.tipo_cuenta_id
             WHERE c.usuario_id = $1 AND c.tipo_cuenta_id = 3
             ORDER BY c.fecha_apertura DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener tarjetas' });
    }
};

// Activate credit card + set payment password
exports.activarTarjeta = async (req, res) => {
    try {
        const { id } = req.params;
        const { password_pagos } = req.body;

        const cuenta = await pool.query(
            'SELECT * FROM cuenta WHERE id = $1 AND usuario_id = $2 AND tipo_cuenta_id = 3',
            [id, req.user.id]
        );
        if (cuenta.rows.length === 0) {
            return res.status(404).json({ error: 'Tarjeta no encontrada' });
        }

        const hash = await bcrypt.hash(password_pagos, 10);
        await pool.query(
            'UPDATE cuenta SET activa = true, password_pagos_hash = $1 WHERE id = $2',
            [hash, id]
        );

        await pool.query(
            `INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje) VALUES ($1, $2, $3, $4)`,
            [req.user.id, 'activacion_tarjeta', 'Tarjeta activada', 'Tu tarjeta de crédito ha sido activada exitosamente.']
        );

        res.json({ message: 'Tarjeta activada exitosamente' });
    } catch (err) {
        console.error('Error activando tarjeta:', err);
        res.status(500).json({ error: 'Error al activar tarjeta' });
    }
};

// Pay credit card from savings account (user)
exports.pagarDesdeApp = async (req, res) => {
    const client = await pool.connect();
    try {
        const { tarjeta_id, cuenta_origen_id, monto, capital, intereses, mora, password_seguridad } = req.body;
        const userId = req.user.id;

        // Verify security password
        const userResult = await client.query('SELECT password_seguridad_hash FROM usuario WHERE id = $1', [userId]);
        const valid = await bcrypt.compare(password_seguridad, userResult.rows[0].password_seguridad_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Contraseña de seguridad incorrecta' });
        }

        await client.query('BEGIN');

        // Verify savings account belongs to user
        const cuentaOrigen = await client.query(
            'SELECT * FROM cuenta WHERE id = $1 AND usuario_id = $2 AND tipo_cuenta_id != 3 AND activa = true',
            [cuenta_origen_id, userId]
        );
        if (cuentaOrigen.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cuenta de origen no válida' });
        }

        if (Number(cuentaOrigen.rows[0].saldo) < monto) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Saldo insuficiente' });
        }

        // Verify credit card belongs to user
        const tarjeta = await client.query(
            'SELECT * FROM cuenta WHERE id = $1 AND usuario_id = $2 AND tipo_cuenta_id = 3',
            [tarjeta_id, userId]
        );
        if (tarjeta.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Tarjeta de crédito no encontrada' });
        }

        // Deduct from savings
        await client.query('UPDATE cuenta SET saldo = saldo - $1 WHERE id = $2', [monto, cuenta_origen_id]);

        // Add to credit available
        await client.query('UPDATE cuenta SET cupo_disponible = cupo_disponible + $1 WHERE id = $2', [monto, tarjeta_id]);

        // Record credit payment
        await client.query(
            `INSERT INTO pago_credito (cuenta_credito_id, cuenta_origen_id, monto_total, capital, intereses, mora, registrado_por)
             VALUES ($1, $2, $3, $4, $5, $6, 'usuario')`,
            [tarjeta_id, cuenta_origen_id, monto, capital || monto, intereses || 0, mora || 0]
        );

        // Record movement
        let tipoMov = await client.query("SELECT id FROM tipo_movimiento WHERE nombre = 'PAGO_CREDITO'");
        await client.query(
            `INSERT INTO movimiento (tipo_movimiento_id, cuenta_origen_id, cuenta_destino_id, valor, fecha, punto_id)
             VALUES ($1, $2, $3, $4, NOW(), 1)`,
            [tipoMov.rows[0].id, cuenta_origen_id, tarjeta_id, monto]
        );

        await client.query('COMMIT');

        // Notification
        await pool.query(
            `INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje) VALUES ($1, $2, $3, $4)`,
            [userId, 'pago_credito', 'Pago de tarjeta registrado',
             `Pago de $${Number(monto).toLocaleString('es-CO')} a tu tarjeta de crédito realizado exitosamente.`]
        );

        const userData = await pool.query('SELECT email, nombre FROM usuario WHERE id = $1', [userId]);
        const emailData = emailTemplates.notificacionPagoCredito(userData.rows[0].nombre, monto);
        sendEmail(userData.rows[0].email, emailData.subject, emailData.html);

        res.json({ message: 'Pago de tarjeta realizado exitosamente' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error en pago de crédito:', err);
        res.status(500).json({ error: 'Error al pagar tarjeta' });
    } finally {
        client.release();
    }
};

// Register credit card payment by admin (at branch)
exports.pagoAdmin = async (req, res) => {
    try {
        const { numero_cuenta_tarjeta, monto, capital, intereses, mora } = req.body;

        const tarjeta = await pool.query(
            `SELECT c.*, u.nombre, u.apellido, u.email, u.id as uid 
             FROM cuenta c JOIN usuario u ON u.id = c.usuario_id 
             WHERE c.numero_cuenta = $1 AND c.tipo_cuenta_id = 3`,
            [numero_cuenta_tarjeta]
        );

        if (tarjeta.rows.length === 0) {
            return res.status(404).json({ error: 'Tarjeta de crédito no encontrada' });
        }

        const t = tarjeta.rows[0];

        // Add to credit available
        await pool.query('UPDATE cuenta SET cupo_disponible = cupo_disponible + $1 WHERE id = $2', [monto, t.id]);

        // Record credit payment
        await pool.query(
            `INSERT INTO pago_credito (cuenta_credito_id, monto_total, capital, intereses, mora, registrado_por, admin_id)
             VALUES ($1, $2, $3, $4, $5, 'admin', $6)`,
            [t.id, monto, capital || monto, intereses || 0, mora || 0, req.user.id]
        );

        // Notification
        await pool.query(
            `INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje) VALUES ($1, $2, $3, $4)`,
            [t.uid, 'pago_credito', 'Pago de tarjeta registrado',
             `Se ha registrado un pago de $${Number(monto).toLocaleString('es-CO')} a tu tarjeta de crédito en sucursal.`]
        );

        const emailData = emailTemplates.notificacionPagoCredito(t.nombre, monto);
        sendEmail(t.email, emailData.subject, emailData.html);

        res.json({ message: 'Pago registrado exitosamente' });
    } catch (err) {
        console.error('Error registrando pago admin:', err);
        res.status(500).json({ error: 'Error al registrar pago' });
    }
};
