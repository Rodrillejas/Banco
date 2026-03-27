const db = require('../config/db');

exports.getAllPuntos = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.*, s.nombre as sede_nombre, tp.nombre as tipo_nombre 
            FROM public.punto_atencion p
            JOIN public.sede s ON p.sede_id = s.id
            JOIN public.tipo_punto_atencion tp ON p.tipo_id = tp.id
            WHERE p.activo = true 
            ORDER BY p.id ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener puntos de atención' });
    }
};

exports.createPunto = async (req, res) => {
    const { codigo, sede_id, tipo_id } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO public.punto_atencion (codigo, sede_id, tipo_id, activo) VALUES ($1, $2, $3, true) RETURNING *',
            [codigo, sede_id, tipo_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear punto de atención' });
    }
};

exports.updatePunto = async (req, res) => {
    const { id } = req.params;
    const { codigo, sede_id, tipo_id } = req.body;
    try {
        const result = await db.query(
            'UPDATE public.punto_atencion SET codigo = $1, sede_id = $2, tipo_id = $3 WHERE id = $4 RETURNING *',
            [codigo, sede_id, tipo_id, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Punto de atención no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar punto de atención' });
    }
};

exports.deletePunto = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('UPDATE public.punto_atencion SET activo = false WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Punto no encontrado' });
        res.json({ message: 'Punto desactivado', punto: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar punto' });
    }
};
