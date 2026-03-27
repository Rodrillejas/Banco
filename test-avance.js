const pool = require('./config/db');
const { realizarAvance } = require('./controllers/creditoAvanzadoController');

async function test() {
    try {
        const uRes = await pool.query("SELECT id, password_seguridad_hash FROM usuario WHERE password_seguridad_hash IS NOT NULL LIMIT 1");
        if (uRes.rows.length === 0) { console.log('NO USER WITH SECURITY PASSWORD'); process.exit(0); }
        const userId = uRes.rows[0].id;
        
        const bcrypt = require('bcryptjs');
        const origCompare = bcrypt.compare;
        bcrypt.compare = async () => true;

        const cRes = await pool.query("SELECT id FROM cuenta WHERE usuario_id = $1 AND tipo_cuenta_id = 3 LIMIT 1", [userId]);
        if (cRes.rows.length === 0) { console.log('USER HAS NO CC'); process.exit(0); }
        const cardId = cRes.rows[0].id;

        const req = {
            user: { id: userId },
            body: {
                tarjeta_id: cardId,
                cuenta_destino_id: null,
                cuenta_destino_numero: null,
                monto: 5000,
                password_seguridad: 'mock'
            }
        };

        const res = {
            status: (c) => ({ json: (d) => { console.log('STATUS', c, d); return d; } }),
            json: (d) => { console.log('SUCCESS JSON', d); return d; }
        };

        await realizarAvance(req, res);
        console.log('DONE');
        process.exit(0);
    } catch(e) { 
        console.error('CRASH', e); 
        process.exit(1); 
    }
}
test();
