const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { sendEmail, emailTemplates } = require('../config/email');

// Register new user
exports.register = async (req, res) => {
    const client = await pool.connect();
    try {
        const { cedula, nombre, apellido, email, telefono, direccion, fecha_nacimiento, password, tipo_producto } = req.body;

        // Check if user already exists
        const existingUser = await client.query('SELECT id FROM usuario WHERE cedula = $1 OR email = $2', [cedula, email]);
        if (existingUser.rows.length > 0) {
            client.release();
            return res.status(400).json({ error: 'Ya existe un usuario con esa cédula o email' });
        }

        // System password is ALWAYS required now
        if (!password) {
            client.release();
            return res.status(400).json({ error: 'La contraseña de acceso al sistema es obligatoria' });
        }
        
        const passwordHash = await bcrypt.hash(password, 10);
        let segHash = null;
        if (tipo_producto.includes('tarjeta')) {
            if (!req.body.pin_tarjeta || req.body.pin_tarjeta.length !== 4) {
                client.release();
                return res.status(400).json({ error: 'El PIN de la tarjeta (4 dígitos) es obligatorio' });
            }
            segHash = await bcrypt.hash(req.body.pin_tarjeta, 10);
        }

        await client.query('BEGIN'); // Start transaction

        // Create user
        const result = await client.query(
            `INSERT INTO usuario (cedula, nombre, apellido, email, telefono, direccion, fecha_nacimiento, password_hash, password_seguridad_hash, estado)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pendiente') RETURNING id`,
            [cedula, nombre, apellido, email, telefono, direccion, fecha_nacimiento, passwordHash, segHash]
        );
        const userId = result.rows[0].id;

        // Create product request
        await client.query(
            `INSERT INTO producto_solicitud (usuario_id, tipo_producto) VALUES ($1, $2)`,
            [userId, tipo_producto]
        );

        // Create notification for admin
        const adminUser = await client.query("SELECT id FROM usuario WHERE rol = 'superadmin' LIMIT 1");
        if (adminUser.rows.length > 0) {
            await client.query(
                `INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje) VALUES ($1, $2, $3, $4)`,
                [adminUser.rows[0].id, 'solicitud_nueva', 'Nueva solicitud de producto',
                 `${nombre} ${apellido} (${cedula}) ha solicitado: ${tipo_producto.replace(/_/g, ' ')}`]
            );
        }

        await client.query('COMMIT'); // Finish transaction
        client.release();

        res.status(201).json({ message: 'Registro exitoso. Tu solicitud será revisada por el administrador.' });
    } catch (err) {
        await client.query('ROLLBACK'); // Rollback if ANY query fails
        client.release();
        console.error('Error en registro:', err);
        res.status(500).json({ error: 'Error al registrar usuario. Inténtalo de nuevo.' });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { cedula, password } = req.body;

        const result = await pool.query('SELECT * FROM usuario WHERE cedula = $1', [cedula]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const user = result.rows[0];

        if (user.estado === 'rechazado') {
            return res.status(403).json({ error: 'Tu solicitud ha sido rechazada. No puedes acceder al sistema.' });
        }

        if (user.estado === 'pendiente') {
            return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación por el administrador.' });
        }

        if (!user.password_hash) {
            return res.status(403).json({ error: 'Debes completar tu registro primero. Revisa tu correo electrónico.' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const token = jwt.sign(
            { id: user.id, cedula: user.cedula, rol: user.rol, nombre: user.nombre, apellido: user.apellido },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                cedula: user.cedula,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                rol: user.rol,
                estado: user.estado
            }
        });
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
};

// Activate account (GET - render activation page)
exports.getActivar = async (req, res) => {
    try {
        const { token } = req.params;
        const result = await pool.query('SELECT id, nombre, estado FROM usuario WHERE token_activacion = $1', [token]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Token de activación inválido' });
        }
        res.json({ valid: true, nombre: result.rows[0].nombre, estado: result.rows[0].estado });
    } catch (err) {
        res.status(500).json({ error: 'Error al verificar token' });
    }
};

// Activate account (POST - set security password and activate)
exports.postActivar = async (req, res) => {
    try {
        const { token } = req.params;
        const { password_seguridad, password } = req.body;

        const result = await pool.query('SELECT * FROM usuario WHERE token_activacion = $1', [token]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Token de activación inválido' });
        }

        const user = result.rows[0];
        // If they already provided it during registration, don't overwrite it unless they provide a new one here
        if (password_seguridad) {
            const segHash = await bcrypt.hash(password_seguridad, 10);
            await pool.query('UPDATE usuario SET password_seguridad_hash = $1 WHERE id = $2', [segHash, user.id]);
        }

        // If user has no password yet (legacy compatibility), set it
        let passwordHash = user.password_hash;
        if (!passwordHash && password) {
            passwordHash = await bcrypt.hash(password, 10);
            await pool.query('UPDATE usuario SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);
        }

        await pool.query(
            `UPDATE usuario SET estado = 'activo', token_activacion = NULL WHERE id = $1`,
            [user.id]
        );

        // Activate user's accounts
        await pool.query(`UPDATE cuenta SET activa = true WHERE usuario_id = $1`, [user.id]);

        // Create notification
        await pool.query(
            `INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje) VALUES ($1, $2, $3, $4)`,
            [user.id, 'activacion', '¡Cuenta activada!', 'Tu cuenta ha sido activada exitosamente. ¡Bienvenido a BancoUM!']
        );

        res.json({ message: 'Cuenta activada exitosamente. Ya puedes iniciar sesión.' });
    } catch (err) {
        console.error('Error activando cuenta:', err);
        res.status(500).json({ error: 'Error al activar cuenta' });
    }
};

// Get current user profile
exports.getMe = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.cedula, u.nombre, u.apellido, u.email, u.telefono, u.direccion, u.rol, u.estado, u.fecha_registro,
                    COALESCE(json_agg(json_build_object(
                        'id', c.id, 'numero_cuenta', c.numero_cuenta, 'tipo', tc.nombre, 
                        'saldo', c.saldo, 'cupo_total', c.cupo_total, 'cupo_disponible', c.cupo_disponible,
                        'activa', c.activa
                    )) FILTER (WHERE c.id IS NOT NULL), '[]') as cuentas
             FROM usuario u
             LEFT JOIN cuenta c ON c.usuario_id = u.id
             LEFT JOIN tipo_cuenta tc ON tc.id = c.tipo_cuenta_id
             WHERE u.id = $1
             GROUP BY u.id`,
            [req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error obteniendo perfil:', err);
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const result = await pool.query('SELECT id, nombre, estado FROM usuario WHERE email = $1', [email]);
        
        // Return success even if not found to prevent email scanning
        if (result.rows.length === 0) {
            return res.json({ message: 'Si el correo está registrado, recibirás un enlace de recuperación.' });
        }
        
        const user = result.rows[0];
        if (user.estado !== 'activo') {
            return res.status(403).json({ error: 'La cuenta debe estar activa para recuperar contraseñas' });
        }

        const resetToken = uuidv4();
        await pool.query('UPDATE usuario SET token_activacion = $1 WHERE id = $2', [resetToken, user.id]);

        const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
        const resetUrl = `${baseUrl}/reset-password.html?token=${resetToken}`;
        const template = emailTemplates.recuperarContrasena(user.nombre, resetUrl);
        // Fallback: Dump link to console just in case Render gets blocked by Gmail
        console.log(`\n🔑 [RECUPERACIÓN] Enlace generado para ${email}:\n${resetUrl}\n`);
        
        // Non-blocking: respond immediately, email sends in background
        sendEmail(email, template.subject, template.html)
            .catch(e => console.error('Forgot-password email failed (non-fatal):', e.message));

        res.json({ message: 'Si el correo está registrado, recibirás un enlace de recuperación.' });
    } catch (err) {
        console.error('Error en forgot password:', err);
        res.status(500).json({ error: 'Error al procesar la solicitud de recuperación' });
    }
};

// Reset Password
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }

        const result = await pool.query('SELECT id FROM usuario WHERE token_activacion = $1 AND estado = $2', [token, 'activo']);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'El enlace de recuperación es inválido o ha expirado.' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE usuario SET password_hash = $1, token_activacion = NULL WHERE id = $2', [passwordHash, result.rows[0].id]);

        res.json({ message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.' });
    } catch (err) {
        console.error('Error en reset password:', err);
        res.status(500).json({ error: 'Error al restablecer la contraseña' });
    }
};
