const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/solicitudController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/', authMiddleware, adminOnly, ctrl.getAll);
router.post('/existente', authMiddleware, ctrl.solicitarExistente);
router.put('/:id/aprobar', authMiddleware, adminOnly, ctrl.aprobar);
router.put('/:id/rechazar', authMiddleware, adminOnly, ctrl.rechazar);

module.exports = router;
