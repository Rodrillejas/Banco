const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificacionController');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, ctrl.getAll);
router.get('/no-leidas', authMiddleware, ctrl.noLeidas);
router.put('/leer-todas', authMiddleware, ctrl.marcarTodasLeidas);
router.delete('/:id', authMiddleware, ctrl.eliminar);
router.delete('/', authMiddleware, ctrl.eliminarTodas);
router.put('/:id/leer', authMiddleware, ctrl.marcarLeida);

module.exports = router;
