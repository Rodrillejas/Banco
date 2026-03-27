const db = require('../config/db');

exports.getDepartamentos = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM public.departamento ORDER BY nombre');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener departamentos' });
    }
};

exports.getMunicipios = async (req, res) => {
    const { departamento_id } = req.query;
    try {
        let query = 'SELECT * FROM public.municipio';
        let params = [];
        if (departamento_id) {
            query += ' WHERE departamento_id = $1';
            params.push(departamento_id);
        }
        query += ' ORDER BY nombre';
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener municipios' });
    }
};

exports.getComunas = async (req, res) => {
    const { municipio_id } = req.query;
    try {
        let query = 'SELECT * FROM public.comuna';
        let params = [];
        if (municipio_id) {
            query += ' WHERE municipio_id = $1';
            params.push(municipio_id);
        }
        query += ' ORDER BY nombre';
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener comunas' });
    }
};

exports.getBarrios = async (req, res) => {
    const { comuna_id } = req.query;
    try {
        let query = 'SELECT * FROM public.barrio';
        let params = [];
        if (comuna_id) {
            query += ' WHERE comuna_id = $1';
            params.push(comuna_id);
        }
        query += ' ORDER BY nombre';
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener barrios' });
    }
};
