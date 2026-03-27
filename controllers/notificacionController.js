const pool = require('../config/db');

// Get user notifications
exports.getAll = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM notificacion WHERE usuario_id = $1 ORDER BY fecha DESC LIMIT 50',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
};

// Mark as read
exports.marcarLeida = async (req, res) => {
    try {
        await pool.query(
            'UPDATE notificacion SET leida = true WHERE id = $1 AND usuario_id = $2',
            [req.params.id, req.user.id]
        );
        res.json({ message: 'Notificación marcada como leída' });
    } catch (err) {
        res.status(500).json({ error: 'Error al marcar notificación' });
    }
};

// Count unread
exports.noLeidas = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT COUNT(*) as count FROM notificacion WHERE usuario_id = $1 AND leida = false',
            [req.user.id]
        );
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (err) {
        res.status(500).json({ error: 'Error al contar notificaciones' });
    }
};

// Mark all as read
exports.marcarTodasLeidas = async (req, res) => {
    try {
        await pool.query('UPDATE notificacion SET leida = true WHERE usuario_id = $1', [req.user.id]);
        res.json({ message: 'Todas las notificaciones marcadas como leídas' });
    } catch (err) {
        res.status(500).json({ error: 'Error' });
    }
};

// Delete notification
exports.eliminar = async (req, res) => {
    try {
        await pool.query('DELETE FROM notificacion WHERE id = $1 AND usuario_id = $2', [req.params.id, req.user.id]);
        res.json({ message: 'Notificación eliminada' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar notificación' });
    }
};

// Delete all
exports.eliminarTodas = async (req, res) => {
    try {
        await pool.query('DELETE FROM notificacion WHERE usuario_id = $1', [req.user.id]);
        res.json({ message: 'Todas las notificaciones eliminadas' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar notificaciones' });
    }
};
