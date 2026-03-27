const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { sendEmail, emailTemplates } = require('../config/email');

// Transfer between accounts
exports.transferir = async (req, res) => {
    const client = await pool.connect();
    try {
        const { cuenta_origen_id, cuenta_destino_num, monto, password_seguridad } = req.body;
        const userId = req.user.id;

        if (!monto || monto <= 0) {
            return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
        }

        // Verify security password
        const userResult = await client.query('SELECT password_seguridad_hash FROM usuario WHERE id = $1', [userId]);
        const valid = await bcrypt.compare(password_seguridad, userResult.rows[0].password_seguridad_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Contraseña de seguridad incorrecta' });
        }

        await client.query('BEGIN');

        // Get origin account (must belong to user and not be credit card)
        const origen = await client.query(
            `SELECT c.*, tc.nombre as tipo FROM cuenta c JOIN tipo_cuenta tc ON tc.id = c.tipo_cuenta_id 
             WHERE c.id = $1 AND c.usuario_id = $2 AND c.activa = true AND c.tipo_cuenta_id != 3`,
            [cuenta_origen_id, userId]
        );
        if (origen.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cuenta de origen no válida' });
        }

        if (Number(origen.rows[0].saldo) < monto) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Saldo insuficiente' });
        }

        // Get destination account
        const destino = await client.query(
            `SELECT c.*, u.nombre, u.apellido, u.email, u.id as uid FROM cuenta c JOIN usuario u ON u.id = c.usuario_id 
             WHERE c.numero_cuenta = $1 AND c.activa = true AND c.tipo_cuenta_id != 3`,
            [cuenta_destino_num]
        );
        if (destino.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cuenta destino no encontrada' });
        }

        // Update balances
        await client.query('UPDATE cuenta SET saldo = saldo - $1 WHERE id = $2', [monto, cuenta_origen_id]);
        await client.query('UPDATE cuenta SET saldo = saldo + $1 WHERE id = $2', [monto, destino.rows[0].id]);

        // Get or create transfer movement type
        let tipoMov = await client.query("SELECT id FROM tipo_movimiento WHERE nombre = 'TRANSFERENCIA'");
        const tipoMovId = tipoMov.rows[0].id;

        // Record movement
        await client.query(
            `INSERT INTO movimiento (tipo_movimiento_id, cuenta_origen_id, cuenta_destino_id, valor, fecha, punto_id)
             VALUES ($1, $2, $3, $4, NOW(), 1)`,
            [tipoMovId, cuenta_origen_id, destino.rows[0].id, monto]
        );

        await client.query('COMMIT');

        // Notifications
        const senderName = `${req.user.nombre} ${req.user.apellido}`;
        const receiverName = `${destino.rows[0].nombre} ${destino.rows[0].apellido}`;

        // Notify sender
        await pool.query(
            `INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje) VALUES ($1, $2, $3, $4)`,
            [userId, 'transferencia_enviada', 'Transferencia enviada',
             `Has transferido $${Number(monto).toLocaleString('es-CO')} a ${receiverName} (${cuenta_destino_num})`]
        );

        // Notify receiver
        await pool.query(
            `INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje) VALUES ($1, $2, $3, $4)`,
            [destino.rows[0].uid, 'transferencia_recibida', 'Transferencia recibida',
             `Has recibido $${Number(monto).toLocaleString('es-CO')} de ${senderName}`]
        );

        // Send emails
        const senderUserData = await pool.query('SELECT email, nombre FROM usuario WHERE id = $1', [userId]);
        const emailSender = emailTemplates.notificacionTransferencia(senderUserData.rows[0].nombre, monto, 'enviada');
        sendEmail(senderUserData.rows[0].email, emailSender.subject, emailSender.html);

        const emailReceiver = emailTemplates.notificacionTransferencia(destino.rows[0].nombre, monto, 'recibida');
        sendEmail(destino.rows[0].email, emailReceiver.subject, emailReceiver.html);

        res.json({ message: 'Transferencia realizada exitosamente' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error en transferencia:', err);
        res.status(500).json({ error: 'Error al realizar transferencia' });
    } finally {
        client.release();
    }
};

// Get user's movements
exports.getHistorial = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            `SELECT m.id, m.valor, m.fecha, tm.nombre as tipo,
                    co.numero_cuenta as cuenta_origen, cd.numero_cuenta as cuenta_destino,
                    uo.nombre || ' ' || uo.apellido as nombre_origen,
                    ud.nombre || ' ' || ud.apellido as nombre_destino
             FROM movimiento m
             JOIN tipo_movimiento tm ON tm.id = m.tipo_movimiento_id
             LEFT JOIN cuenta co ON co.id = m.cuenta_origen_id
             LEFT JOIN cuenta cd ON cd.id = m.cuenta_destino_id
             LEFT JOIN usuario uo ON uo.id = co.usuario_id
             LEFT JOIN usuario ud ON ud.id = cd.usuario_id
             WHERE co.usuario_id = $1 OR cd.usuario_id = $1
             ORDER BY m.fecha DESC
             LIMIT 100`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error obteniendo historial:', err);
        res.status(500).json({ error: 'Error al obtener historial' });
    }
};
