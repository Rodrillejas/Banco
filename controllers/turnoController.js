const db = require('../config/db');

exports.getAllTurnos = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT t.*, e.nombre as empleado_nombre, e.apellido as empleado_apellido 
            FROM public.turno t
            JOIN public.empleado e ON t.empleado_id = e.id
            ORDER BY t.fecha DESC, t.hora_inicio DESC
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener turnos' });
    }
};

exports.createTurno = async (req, res) => {
    const { empleado_id, fecha, hora_inicio, hora_fin } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO public.turno (empleado_id, fecha, hora_inicio, hora_fin) VALUES ($1, $2, $3, $4) RETURNING *',
            [empleado_id, fecha, hora_inicio, hora_fin]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear turno' });
    }
};

exports.deleteTurno = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM public.turno WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Turno no encontrado' });
        res.json({ message: 'Turno eliminado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar turno' });
    }
};
