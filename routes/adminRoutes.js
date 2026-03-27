const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminDashController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/stats', authMiddleware, adminOnly, ctrl.getStats);
router.get('/usuarios', authMiddleware, adminOnly, ctrl.getUsuarios);
router.get('/buscar-cuenta', authMiddleware, adminOnly, ctrl.buscarCuenta);
router.get('/dashboard-maestro', authMiddleware, adminOnly, ctrl.getDashboardMaestro);
router.get('/clientes-maestro', authMiddleware, adminOnly, ctrl.getClientesMaestro);
router.get('/usuario/:id/vista-avanzada', authMiddleware, adminOnly, ctrl.getUsuarioDetalleAvanzado);

module.exports = router;
