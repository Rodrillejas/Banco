const express = require('express');
const router = express.Router();
const puntoController = require('../controllers/puntoAtencionController');

router.get('/', puntoController.getAllPuntos);
router.post('/', puntoController.createPunto);
router.put('/:id', puntoController.updatePunto);
router.delete('/:id', puntoController.deletePunto);

module.exports = router;
