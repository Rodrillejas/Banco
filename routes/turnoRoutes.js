const express = require('express');
const router = express.Router();
const turnoController = require('../controllers/turnoController');

router.get('/', turnoController.getAllTurnos);
router.post('/', turnoController.createTurno);
router.delete('/:id', turnoController.deleteTurno);

module.exports = router;
