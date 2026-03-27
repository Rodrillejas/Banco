const express = require('express');
const router = express.Router();
const movimientoController = require('../controllers/movimientoController');

router.get('/', movimientoController.getAllMovimientos);
router.post('/deposito', movimientoController.deposito);
router.post('/retiro', movimientoController.retiro);
router.post('/transferencia', movimientoController.transferencia);

module.exports = router;
