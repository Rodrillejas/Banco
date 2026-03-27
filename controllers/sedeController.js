const db = require('../config/db');

exports.getAllSedes = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT s.*, b.nombre as barrio_nombre 
            FROM public.sede s
            JOIN public.barrio b ON s.barrio_id = b.id
            WHERE s.activa = true 
            ORDER BY s.id ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener sedes' });
    }
};

exports.createSede = async (req, res) => {
    const { nombre, direccion, barrio_id, telefono } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO public.sede (nombre, direccion, barrio_id, telefono, activa) VALUES ($1, $2, $3, $4, true) RETURNING *',
            [nombre, direccion, barrio_id, telefono]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear sede' });
    }
};

exports.updateSede = async (req, res) => {
    const { id } = req.params;
    const { nombre, direccion, barrio_id, telefono } = req.body;
    try {
        const result = await db.query(
            'UPDATE public.sede SET nombre = $1, direccion = $2, barrio_id = $3, telefono = $4 WHERE id = $5 RETURNING *',
            [nombre, direccion, barrio_id, telefono, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Sede no encontrada' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar sede' });
    }
};

exports.deleteSede = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('UPDATE public.sede SET activa = false WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Sede no encontrada' });
        res.json({ message: 'Sede desactivada', sede: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar sede' });
    }
};
