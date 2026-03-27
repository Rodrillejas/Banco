const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { Sequelize } = require('sequelize');

// Fallback JWT_SECRET if not set (needed for Render deploy)
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'BancoUM_S3cr3t_K3y_2026_SuperSegura!';
    console.log('⚠️  JWT_SECRET not set in env, using default');
}

// Startup diagnostics
console.log('--- Startup ENV Check ---');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('PORT:', process.env.PORT || 3000);
console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);
console.log('JWT_SECRET set:', !!process.env.JWT_SECRET);
console.log('-------------------------');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ====== API Routes ======
// Auth
app.use('/api/auth', require('./routes/authRoutes'));

// Admin
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/solicitudes', require('./routes/solicitudRoutes'));
app.use('/api/consignaciones', require('./routes/consignacionRoutes'));

// User operations
app.use('/api/transferencias', require('./routes/transferenciaRoutes'));
app.use('/api/credito', require('./routes/creditoRoutes'));
app.use('/api/notificaciones', require('./routes/notificacionRoutes'));

// Existing routes
app.use('/api/clientes', require('./routes/clienteRoutes'));
app.use('/api/cuentas', require('./routes/cuentaRoutes'));
app.use('/api/movimientos', require('./routes/movimientoRoutes'));
app.use('/api/empleados', require('./routes/empleadoRoutes'));
app.use('/api/sedes', require('./routes/sedeRoutes'));
app.use('/api/puntos-atencion', require('./routes/puntoAtencionRoutes'));
app.use('/api/turnos', require('./routes/turnoRoutes'));
app.use('/api/ubicaciones', require('./routes/ubicacionRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/tipos', require('./routes/tiposRoutes'));

// Fallback to index.html for SPA
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'), err => {
        if (err) next(err);
    });
});

app.listen(PORT, async () => {
    console.log(`BancoUM servidor corriendo en http://localhost:${PORT}`);
    
    // Debug: Verificar la variable de entorno para Render
    console.log("DB URL:", process.env.DATABASE_URL);

    // Conexión solicitada para Render
    try {
        if (process.env.DATABASE_URL) {
            const sequelize = new Sequelize(process.env.DATABASE_URL, {
                dialect: 'postgres',
                protocol: 'postgres',
                logging: console.log,
                dialectOptions: {
                    ssl: {
                        require: true,
                        rejectUnauthorized: false
                    }
                }
            });
            await sequelize.authenticate();
            console.log('✅ Conexión a Render (Sequelize) establecida con éxito.');
        } else {
            console.log('⚠️ Ejecutando en entorno local sin DATABASE_URL.');
        }
    } catch (error) {
        console.error('💥 No se pudo conectar a la base de datos con Sequelize:', error);
    }
});
