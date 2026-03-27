const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { Sequelize } = require('sequelize');

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
    
    // Conexión solicitada para Render
    try {
        if (process.env.DATABASE_URL) {
            const sequelize = new Sequelize(process.env.DATABASE_URL, {
                dialect: 'postgres',
                protocol: 'postgres',
                dialectOptions: {
                    ssl: {
                        require: true,
                        rejectUnauthorized: false
                    }
                }
            });
            await sequelize.authenticate();
            console.log('Conexión a Render (Sequelize) establecida con éxito.');
        } else {
            console.log('Ejecutando en entorno local sin DATABASE_URL.');
        }
    } catch (error) {
        console.error('No se pudo conectar a la base de datos con Sequelize:', error);
    }
});
