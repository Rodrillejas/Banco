const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { sendEmail, emailTemplates } = require('../config/email');

// Get all pending solicitudes (admin)
exports.getAll = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ps.*, u.nombre, u.apellido, u.cedula, u.email, u.telefono
             FROM producto_solicitud ps
             JOIN usuario u ON u.id = ps.usuario_id
             ORDER BY ps.fecha_solicitud DESC`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener solicitudes' });
    }
};

// Approve solicitud
exports.aprobar = async (req, res) => {
    try {
        const { id } = req.params;
        const { decision, cupo_tarjeta } = req.body; // 'aprobado_ambos', 'aprobado_cuenta', 'aprobado_tarjeta'

        const solicitud = await pool.query(
            `SELECT ps.*, u.nombre, u.apellido, u.email, u.estado as user_estado, u.id as uid
             FROM producto_solicitud ps JOIN usuario u ON u.id = ps.usuario_id WHERE ps.id = $1`, [id]
        );
        if (solicitud.rows.length === 0) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        const sol = solicitud.rows[0];
        const token = uuidv4();
        // Use FRONTEND_URL env var if set, otherwise infer from request origin
        const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
        const activarUrl = `${baseUrl}/activar.html?token=${token}`;
        const loginUrl = `${baseUrl}/login.html`;

        // Update solicitud
        await pool.query(
            `UPDATE producto_solicitud SET estado = $1, fecha_resolucion = NOW() WHERE id = $2`,
            [decision, id]
        );

        // If user is pending, set activation token so they enter the activation flow
        if (sol.user_estado === 'pendiente') {
            await pool.query(`UPDATE usuario SET token_activacion = $1 WHERE id = $2`, [token, sol.uid]);
        }

        // Generate account number
        const genAccountNum = () => {
            return '2026' + String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
        };

        const esCuentaCorriente = sol.tipo_producto.includes('corriente');
        const tipoCtaStr = esCuentaCorriente ? 'Corriente' : 'Ahorros';
        const tipoCuentaId = esCuentaCorriente ? 2 : 1; 

        // Create products based on decision
        if (decision === 'aprobado_ambos' || decision === 'aprobado_cuenta') {
            await pool.query(
                `INSERT INTO cuenta (usuario_id, tipo_cuenta_id, numero_cuenta, saldo, activa) VALUES ($1, $2, $3, 0, $4)`,
                [sol.uid, tipoCuentaId, genAccountNum(), sol.user_estado === 'activo']
            );
        }

        if (decision === 'aprobado_ambos' || decision === 'aprobado_tarjeta') {
            const cupo = cupo_tarjeta || 5000000;
            await pool.query(
                `INSERT INTO cuenta (usuario_id, tipo_cuenta_id, numero_cuenta, cupo_total, cupo_disponible, con_cuota_manejo, tasa_interes, activa) 
                 VALUES ($1, 3, $2, $3, $3, false, 0.025, $4)`,
                [sol.uid, genAccountNum(), cupo, sol.user_estado === 'activo']
            );
        }

        // Send email based on decision
        let emailData;
        const solicitoAmbos = sol.tipo_producto.includes('y_tarjeta');
        const urlDestino = sol.user_estado === 'activo' ? loginUrl : activarUrl;

        if (decision === 'aprobado_ambos') {
            emailData = emailTemplates.bienvenidaAmbos(sol.nombre, urlDestino);
        } else if (decision === 'aprobado_cuenta') {
            if (solicitoAmbos) {
                emailData = emailTemplates.bienvenidaCuentaRechazoTarjeta(sol.nombre, urlDestino, tipoCtaStr);
            } else {
                emailData = emailTemplates.bienvenidaCuenta(sol.nombre, urlDestino, tipoCtaStr);
            }
        } else if (decision === 'aprobado_tarjeta') {
            emailData = emailTemplates.bienvenidaSoloTarjeta(sol.nombre, urlDestino);
        }

        // Send email based on decision (non-blocking - don't let email failure break the approval)
        if (emailData) {
            sendEmail(sol.email, emailData.subject, emailData.html)
                .catch(e => console.error('Email send failed (non-fatal):', e.message));
        }

        // Notify user
        await pool.query(
            `INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje) VALUES ($1, $2, $3, $4)`,
            [sol.uid, 'aprobacion', 'Solicitud aprobada', `Tu solicitud de ${sol.tipo_producto.replace(/_/g, ' ')} ha sido aprobada.`]
        );

        res.json({ message: 'Solicitud aprobada y correo enviado.' });
    } catch (err) {
        console.error('Error aprobando solicitud:', err);
        res.status(500).json({ error: 'Error al aprobar solicitud' });
    }
};

// Reject solicitud
exports.rechazar = async (req, res) => {
    try {
        const { id } = req.params;
        const { observaciones } = req.body;

        const solicitud = await pool.query(
            `SELECT ps.*, u.nombre, u.email, u.estado as user_estado, u.id as uid
             FROM producto_solicitud ps JOIN usuario u ON u.id = ps.usuario_id WHERE ps.id = $1`, [id]
        );
        if (solicitud.rows.length === 0) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        const sol = solicitud.rows[0];

        await pool.query(
            `UPDATE producto_solicitud SET estado = 'rechazado', fecha_resolucion = NOW(), observaciones = $1 WHERE id = $2`,
            [observaciones || 'Solicitud rechazada', id]
        );

        if (sol.user_estado === 'pendiente') {
            await pool.query(`UPDATE usuario SET estado = 'rechazado' WHERE id = $1`, [sol.uid]);
        }

        // Send rejection email - non-blocking
        const emailData = emailTemplates.rechazado(sol.nombre);
        sendEmail(sol.email, emailData.subject, emailData.html)
            .catch(e => console.error('Rejection email failed (non-fatal):', e.message));

        // Notify user
        await pool.query(
            `INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje) VALUES ($1, $2, $3, $4)`,
            [sol.uid, 'rechazo', 'Solicitud rechazada', 'Lamentamos informarte que tu solicitud ha sido rechazada.']
        );

        res.json({ message: 'Solicitud rechazada y correo enviado.' });
    } catch (err) {
        console.error('Error rechazando solicitud:', err);
        res.status(500).json({ error: 'Error al rechazar solicitud' });
    }
};

// Solicitar producto siendo usuario activo
exports.solicitarExistente = async (req, res) => {
    try {
        const { tipo_producto } = req.body;
        const usuario_id = req.user.id;

        const pending = await pool.query(
            "SELECT id FROM producto_solicitud WHERE usuario_id = $1 AND estado = 'pendiente' AND tipo_producto = $2",
            [usuario_id, tipo_producto]
        );
        if (pending.rows.length > 0) {
            return res.status(400).json({ error: 'Ya tienes una solicitud pendiente para este producto.' });
        }

        const cuentas = await pool.query("SELECT tc.nombre as tipo FROM cuenta c JOIN tipo_cuenta tc ON c.tipo_cuenta_id = tc.id WHERE c.usuario_id = $1 AND c.activa = true", [usuario_id]);
        
        let tieneAhorros = false;
        let tieneCorriente = false;
        let tieneTarjeta = false;

        cuentas.rows.forEach(c => {
            if (c.tipo.toLowerCase().includes('ahorro')) tieneAhorros = true;
            if (c.tipo.toLowerCase().includes('corriente')) tieneCorriente = true;
            if (c.tipo.toLowerCase().includes('credito') || c.tipo.toLowerCase().includes('crédito')) tieneTarjeta = true;
        });

        if (tipo_producto === 'cuenta_ahorros' && tieneAhorros) return res.status(400).json({ error: 'Ya posees una cuenta de ahorros activa.' });
        if (tipo_producto === 'cuenta_corriente' && tieneCorriente) return res.status(400).json({ error: 'Ya posees una cuenta corriente activa.' });
        if (tipo_producto === 'tarjeta_credito' && tieneTarjeta) return res.status(400).json({ error: 'Ya posees una tarjeta de crédito activa.' });

        await pool.query(
            `INSERT INTO producto_solicitud (usuario_id, tipo_producto) VALUES ($1, $2)`,
            [usuario_id, tipo_producto]
        );

        const admin = await pool.query("SELECT id FROM usuario WHERE rol = 'superadmin' LIMIT 1");
        if (admin.rows.length > 0) {
            await pool.query(
                `INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje) VALUES ($1, $2, $3, $4)`,
                [admin.rows[0].id, 'solicitud_nueva', 'Usuario Activo solicita nuevo producto',
                 `El usuario ${req.user.nombre} ${req.user.apellido} (${req.user.cedula}) ha solicitado su adición: ${tipo_producto.replace(/_/g, ' ')}`]
            );
        }

        res.json({ message: 'Solicitud enviada exitosamente al administrador.' });
    } catch (err) {
        console.error('Error solicitando producto extra:', err);
        res.status(500).json({ error: 'Error al enviar la solicitud extra' });
    }
};
