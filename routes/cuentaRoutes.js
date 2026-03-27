const express = require('express');
const router = express.Router();
const cuentaController = require('../controllers/cuentaController');

router.get('/', cuentaController.getAllCuentas);
router.get('/:id', cuentaController.getCuentaById);
router.post('/', cuentaController.createCuenta);
router.put('/:id/close', cuentaController.closeCuenta);

module.exports = router;
