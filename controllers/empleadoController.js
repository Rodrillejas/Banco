const db = require('../config/db');

exports.getAllEmpleados = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT e.*, s.nombre as sede_nombre 
            FROM public.empleado e
            JOIN public.sede s ON e.sede_id = s.id
            WHERE e.activo = true 
            ORDER BY e.id ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener empleados' });
    }
};

exports.createEmpleado = async (req, res) => {
    const { tipo_documento, numero_documento, nombre, apellido, sede_id } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO public.empleado (tipo_documento, numero_documento, nombre, apellido, sede_id, activo) VALUES ($1, $2, $3, $4, $5, true) RETURNING *',
            [tipo_documento, numero_documento, nombre, apellido, sede_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear empleado' });
    }
};

exports.updateEmpleado = async (req, res) => {
    const { id } = req.params;
    const { tipo_documento, numero_documento, nombre, apellido, sede_id } = req.body;
    try {
        const result = await db.query(
            'UPDATE public.empleado SET tipo_documento = $1, numero_documento = $2, nombre = $3, apellido = $4, sede_id = $5 WHERE id = $6 RETURNING *',
            [tipo_documento, numero_documento, nombre, apellido, sede_id, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Empleado no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar empleado' });
    }
};

exports.deleteEmpleado = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('UPDATE public.empleado SET activo = false WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Empleado no encontrado' });
        res.json({ message: 'Empleado desactivado', empleado: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar empleado' });
    }
};
