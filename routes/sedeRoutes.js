const express = require('express');
const router = express.Router();
const sedeController = require('../controllers/sedeController');

router.get('/', sedeController.getAllSedes);
router.post('/', sedeController.createSede);
router.put('/:id', sedeController.updateSede);
router.delete('/:id', sedeController.deleteSede);

module.exports = router;
