const db = require('../config/db');

exports.getTiposCuenta = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM public.tipo_cuenta ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener tipos de cuenta' });
    }
};

exports.getTiposMovimiento = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM public.tipo_movimiento ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener tipos de movimiento' });
    }
};

exports.getTiposPuntoAtencion = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM public.tipo_punto_atencion ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener tipos de punto de atención' });
    }
};
