const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/creditoController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const advancedCtrl = require('../controllers/creditoAvanzadoController');

router.get('/mis-tarjetas', authMiddleware, ctrl.getMisTarjetas);
router.post('/activar/:id', authMiddleware, ctrl.activarTarjeta);
router.post('/pagar', authMiddleware, ctrl.pagarDesdeApp);
router.post('/pago-admin', authMiddleware, adminOnly, ctrl.pagoAdmin);

// Advanced features
router.get('/:id/deuda', authMiddleware, advancedCtrl.calcularDeuda);
router.post('/avance', authMiddleware, advancedCtrl.realizarAvance);
router.put('/:id/fecha-pago', authMiddleware, adminOnly, advancedCtrl.cambiarFechaPago);

module.exports = router;
