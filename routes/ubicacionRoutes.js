const express = require('express');
const router = express.Router();
const ubicacionController = require('../controllers/ubicacionController');

router.get('/departamentos', ubicacionController.getDepartamentos);
router.get('/municipios', ubicacionController.getMunicipios);
router.get('/comunas', ubicacionController.getComunas);
router.get('/barrios', ubicacionController.getBarrios);

module.exports = router;
