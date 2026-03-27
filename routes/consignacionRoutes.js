const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/consignacionController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.post('/', authMiddleware, adminOnly, ctrl.consignar);

module.exports = router;
