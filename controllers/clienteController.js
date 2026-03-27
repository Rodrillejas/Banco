const db = require('../config/db');

// Obtener todos los clientes
exports.getAllClientes = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM public.cliente WHERE activo = true ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener clientes' });
    }
};

// Obtener un cliente por ID
exports.getClienteById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT * FROM public.cliente WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener cliente' });
    }
};

// Crear nuevo cliente
exports.createCliente = async (req, res) => {
    const { tipo_documento, numero_documento, nombre, apellido, fecha_nacimiento, telefono, email, direccion, comuna } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO public.cliente (tipo_documento, numero_documento, nombre, apellido, fecha_nacimiento, telefono, email, direccion, comuna, activo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING *',
            [tipo_documento, numero_documento, nombre, apellido, fecha_nacimiento, telefono, email, direccion, comuna]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear cliente' });
    }
};

// Actualizar cliente
exports.updateCliente = async (req, res) => {
    const { id } = req.params;
    const { tipo_documento, numero_documento, nombre, apellido, fecha_nacimiento, telefono, email, direccion, comuna } = req.body;
    try {
        const result = await db.query(
            'UPDATE public.cliente SET tipo_documento = $1, numero_documento = $2, nombre = $3, apellido = $4, fecha_nacimiento = $5, telefono = $6, email = $7, direccion = $8, comuna = $9 WHERE id = $10 RETURNING *',
            [tipo_documento, numero_documento, nombre, apellido, fecha_nacimiento, telefono, email, direccion, comuna, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar cliente' });
    }
};

// "Eliminar" cliente (soft delete)
exports.deleteCliente = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('UPDATE public.cliente SET activo = false WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.json({ message: 'Cliente desactivado exitosamente', cliente: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar cliente' });
    }
};
