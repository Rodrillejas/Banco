const jwt = require('jsonwebtoken');

// Verify JWT token middleware
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
    }
    
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

// Verify super admin role
function adminOnly(req, res, next) {
    if (!req.user || req.user.rol !== 'superadmin') {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de super administrador.' });
    }
    next();
}

module.exports = { authMiddleware, adminOnly };
