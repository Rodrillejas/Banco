const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/transferenciaController');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, ctrl.transferir);
router.get('/historial', authMiddleware, ctrl.getHistorial);

module.exports = router;
