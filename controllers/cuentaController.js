const db = require('../config/db');

// Obtener todas las cuentas (opcionalmente filtradas por cliente)
exports.getAllCuentas = async (req, res) => {
    const { cliente_id } = req.query;
    try {
        let query = `
            SELECT c.*, cl.nombre AS cliente_nombre, cl.apellido AS cliente_apellido, tc.nombre AS tipo_cuenta_nombre 
            FROM core.cuenta c
            JOIN public.cliente cl ON c.cliente_id = cl.id
            JOIN public.tipo_cuenta tc ON c.tipo_cuenta_id = tc.id
        `;
        const params = [];
        
        if (cliente_id) {
            query += ' WHERE c.cliente_id = $1';
            params.push(cliente_id);
        }
        
        query += ' ORDER BY c.id ASC';
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener cuentas' });
    }
};

// Obtener una cuenta por ID
exports.getCuentaById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(`
            SELECT c.*, cl.nombre AS cliente_nombre, cl.apellido AS cliente_apellido, tc.nombre AS tipo_cuenta_nombre 
            FROM core.cuenta c
            JOIN public.cliente cl ON c.cliente_id = cl.id
            JOIN public.tipo_cuenta tc ON c.tipo_cuenta_id = tc.id
            WHERE c.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cuenta no encontrada' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener cuenta' });
    }
};

// Crear nueva cuenta
exports.createCuenta = async (req, res) => {
    const { cliente_id, tipo_cuenta_id, saldo_inicial } = req.body;
    try {
        // Generar un número de cuenta aleatorio o basado en lógica de negocio
        const min = 1000000000;
        const max = 9999999999;
        const numero_cuenta = Math.floor(Math.random() * (max - min + 1) + min).toString();
        
        const result = await db.query(
            'INSERT INTO core.cuenta (numero_cuenta, cliente_id, tipo_cuenta_id, saldo, fecha_apertura, activa) VALUES ($1, $2, $3, $4, CURRENT_DATE, true) RETURNING *',
            [numero_cuenta, cliente_id, tipo_cuenta_id, saldo_inicial || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear cuenta' });
    }
};

// Cerrar/desactivar cuenta
exports.closeCuenta = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('UPDATE core.cuenta SET activa = false WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cuenta no encontrada' });
        }
        res.json({ message: 'Cuenta cerrada exitosamente', cuenta: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al cerrar cuenta' });
    }
};
