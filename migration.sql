-- ============================================
-- BancoUM - Migración de Base de Datos
-- ============================================

-- 1. Tabla de usuarios (autenticación y roles)
CREATE TABLE IF NOT EXISTS usuario (
    id SERIAL PRIMARY KEY,
    cedula VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    direccion VARCHAR(200),
    fecha_nacimiento DATE,
    password_hash VARCHAR(255),
    password_seguridad_hash VARCHAR(255),
    rol VARCHAR(20) NOT NULL DEFAULT 'usuario' CHECK (rol IN ('usuario', 'superadmin')),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'activo', 'rechazado')),
    token_activacion VARCHAR(255),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT true
);

-- 2. Tabla de solicitudes de productos
CREATE TABLE IF NOT EXISTS producto_solicitud (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuario(id),
    tipo_producto VARCHAR(30) NOT NULL CHECK (tipo_producto IN ('cuenta_ahorros', 'cuenta_corriente', 'tarjeta_credito', 'cuenta_y_tarjeta')),
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado_ambos', 'aprobado_cuenta', 'aprobado_tarjeta', 'rechazado')),
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion TIMESTAMP,
    observaciones TEXT
);

-- 3. Tabla de cuentas (ahorros, corriente y tarjeta crédito)
CREATE TABLE IF NOT EXISTS cuenta (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuario(id),
    tipo_cuenta_id INTEGER NOT NULL REFERENCES tipo_cuenta(id),
    numero_cuenta VARCHAR(20) UNIQUE NOT NULL,
    saldo NUMERIC(15,2) DEFAULT 0.00,
    -- Campos específicos para tarjeta de crédito
    cupo_total NUMERIC(15,2) DEFAULT 0.00,
    cupo_disponible NUMERIC(15,2) DEFAULT 0.00,
    con_cuota_manejo BOOLEAN DEFAULT false,
    cuota_manejo_valor NUMERIC(10,2) DEFAULT 0.00,
    tasa_interes NUMERIC(5,4) DEFAULT 0.00,
    fecha_apertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    password_pagos_hash VARCHAR(255),
    activa BOOLEAN DEFAULT true
);

-- 4. Tabla de pagos de crédito
CREATE TABLE IF NOT EXISTS pago_credito (
    id SERIAL PRIMARY KEY,
    cuenta_credito_id INTEGER NOT NULL REFERENCES cuenta(id),
    cuenta_origen_id INTEGER REFERENCES cuenta(id),
    monto_total NUMERIC(15,2) NOT NULL,
    capital NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    intereses NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    mora NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    registrado_por VARCHAR(20) NOT NULL DEFAULT 'usuario' CHECK (registrado_por IN ('usuario', 'admin')),
    admin_id INTEGER REFERENCES usuario(id),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notificacion (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuario(id),
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN DEFAULT false,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Agregar tipos de movimiento si no existen
INSERT INTO tipo_movimiento (nombre) 
SELECT 'TRANSFERENCIA' WHERE NOT EXISTS (SELECT 1 FROM tipo_movimiento WHERE nombre = 'TRANSFERENCIA');
INSERT INTO tipo_movimiento (nombre) 
SELECT 'CONSIGNACION' WHERE NOT EXISTS (SELECT 1 FROM tipo_movimiento WHERE nombre = 'CONSIGNACION');
INSERT INTO tipo_movimiento (nombre) 
SELECT 'RETIRO' WHERE NOT EXISTS (SELECT 1 FROM tipo_movimiento WHERE nombre = 'RETIRO');
INSERT INTO tipo_movimiento (nombre) 
SELECT 'PAGO_CREDITO' WHERE NOT EXISTS (SELECT 1 FROM tipo_movimiento WHERE nombre = 'PAGO_CREDITO');
