const pool = require('../config/db');
const { sendEmail, emailTemplates } = require('../config/email');

// Create consignation (admin only)
exports.consignar = async (req, res) => {
    try {
        const { numero_cuenta, monto } = req.body;

        if (!monto || monto <= 0) {
            return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
        }

        const cuenta = await pool.query(
            `SELECT c.*, u.nombre, u.apellido, u.email, u.id as uid 
             FROM cuenta c JOIN usuario u ON u.id = c.usuario_id 
             WHERE c.numero_cuenta = $1 AND c.activa = true AND c.tipo_cuenta_id != 3`,
            [numero_cuenta]
        );

        if (cuenta.rows.length === 0) {
            return res.status(404).json({ error: 'Cuenta no encontrada o inactiva' });
        }

        const c = cuenta.rows[0];

        // Update balance
        await pool.query('UPDATE cuenta SET saldo = saldo + $1 WHERE id = $2', [monto, c.id]);

        // Get consignation movement type
        let tipoMov = await pool.query("SELECT id FROM tipo_movimiento WHERE nombre = 'CONSIGNACION'");
        const tipoMovId = tipoMov.rows[0].id;

        // Record movement
        await pool.query(
            `INSERT INTO movimiento (tipo_movimiento_id, cuenta_destino_id, valor, fecha, punto_id)
             VALUES ($1, $2, $3, NOW(), 1)`,
            [tipoMovId, c.id, monto]
        );

        // Notify user
        await pool.query(
            `INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje) VALUES ($1, $2, $3, $4)`,
            [c.uid, 'consignacion', 'Consignación recibida',
             `Se ha realizado una consignación de $${Number(monto).toLocaleString('es-CO')} en tu cuenta ${numero_cuenta}`]
        );

        // Send email
        const emailData = emailTemplates.notificacionConsignacion(c.nombre, monto);
        sendEmail(c.email, emailData.subject, emailData.html);

        res.json({ message: 'Consignación realizada exitosamente' });
    } catch (err) {
        console.error('Error en consignación:', err);
        res.status(500).json({ error: 'Error al realizar consignación' });
    }
};
