const express = require('express');
const router = express.Router();
const tiposController = require('../controllers/tiposController');

router.get('/cuenta', tiposController.getTiposCuenta);
router.get('/movimiento', tiposController.getTiposMovimiento);
router.get('/punto-atencion', tiposController.getTiposPuntoAtencion);

module.exports = router;
