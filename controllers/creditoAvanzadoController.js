const pool = require('../config/db');

/**
 * Calculadora de Deuda Dinámica para Tarjeta de Crédito
 * Evalúa días en mora, interés corriente (2.5%) e interés de mora (3.5%).
 */
exports.calcularDeuda = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "SELECT c.id, c.numero_cuenta, c.cupo_total, c.cupo_disponible, c.fecha_corte, c.dia_pago, c.intereses_acumulados, c.mora_acumulada FROM cuenta c JOIN tipo_cuenta tc ON c.tipo_cuenta_id = tc.id WHERE c.id = $1 AND tc.id = 3",
            [id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Tarjeta no encontrada' });

        const tc = result.rows[0];
        const capital_usado = parseFloat(tc.cupo_total) - parseFloat(tc.cupo_disponible);
        let intereses = parseFloat(tc.intereses_acumulados) || 0;
        let mora = parseFloat(tc.mora_acumulada) || 0;

        const hoy = new Date();
        const diaActual = hoy.getDate();
        const mesActual = hoy.getMonth();
        const anioActual = hoy.getFullYear();
        const diaPago = tc.dia_pago || 15;
        const diaCorte = tc.fecha_corte || 30;

        // Build next cutoff and payment deadline dates for this billing cycle
        // Cutoff: the diaCorte of the current month (or next month if already passed)
        let fechaCorte = new Date(anioActual, mesActual, diaCorte);
        if (diaActual > diaCorte) {
            fechaCorte = new Date(anioActual, mesActual + 1, diaCorte);
        }

        // Payment deadline: diaPago of the month AFTER the cutoff
        let fechaLimitePago = new Date(fechaCorte.getFullYear(), fechaCorte.getMonth() + 1, diaPago);

        // Determine the most RECENT cutoff that has already passed (for interest calculation)
        let ultimoCorte = new Date(anioActual, mesActual, diaCorte);
        if (diaActual <= diaCorte) {
            // Corte hasn't happened this month yet — last corte was previous month
            ultimoCorte = new Date(anioActual, mesActual - 1, diaCorte);
        }

        // Limit payment deadline for the LAST cycle (when mora applies)
        let ultimaFechaLimite = new Date(ultimoCorte.getFullYear(), ultimoCorte.getMonth() + 1, diaPago);

        // INTEREST & MINIMUM PAYMENT based on installments (cuotas)
        let diasMora = 0;
        let pagoMinimoEsperado = 0;
        let sumInteresesDiferidos = 0;

        const comprasRes = await pool.query("SELECT id, monto_inicial, cuotas_totales, cuotas_pagadas, tasa_interes_mensual, saldo_restante FROM compra_tarjeta WHERE cuenta_id = $1 AND estado = 'ACTIVO'", [id]);
        
        for (let c of comprasRes.rows) {
            let cuotaCap = parseFloat(c.monto_inicial) / c.cuotas_totales;
            let saldoRest = parseFloat(c.saldo_restante);
            if (saldoRest < cuotaCap) cuotaCap = saldoRest;
            if (c.cuotas_totales === 1) cuotaCap = saldoRest;
            
            pagoMinimoEsperado += cuotaCap;
            sumInteresesDiferidos += (saldoRest * parseFloat(c.tasa_interes_mensual));
        }

        if (capital_usado > 0 && diaActual > diaCorte && intereses === 0) {
            intereses = sumInteresesDiferidos > 0 ? sumInteresesDiferidos : (capital_usado * 0.025);
        }

        // MORA: only applies if the payment deadline of the LAST billing cycle has passed
        // AND there was capital BEFORE that deadline (i.e., the debt is genuinely overdue)
        // We check: today > ultimaFechaLimite AND capital_usado > 0 AND mora_acumulada in DB is 0
        if (capital_usado > 0 && hoy > ultimaFechaLimite && mora === 0) {
            diasMora = Math.floor((hoy - ultimaFechaLimite) / (1000 * 60 * 60 * 24));
            // Daily mora rate: 3.5% monthly / 30 days
            mora = (capital_usado * (0.035 / 30)) * diasMora;
        } else if (mora > 0) {
            // If mora_acumulada is already stored in DB, calculate days from stored value
            diasMora = Math.round(mora / (capital_usado * (0.035 / 30)));
        }

        const deudaTotal = capital_usado + intereses + mora;
        
        // If there are detailed amortizations, use their sum. Otherwise fallback to global 5% rule.
        let pagoMinimo = pagoMinimoEsperado > 0 ? (pagoMinimoEsperado + intereses + mora) : (capital_usado > 0 ? (capital_usado * 0.05) + intereses + mora : 0);
        if (pagoMinimo > deudaTotal) pagoMinimo = deudaTotal;

        res.json({
            tarjeta_id: tc.id,
            numero_cuenta: tc.numero_cuenta,
            dias_mora: diasMora,
            capital: capital_usado,
            intereses_calculados: intereses,
            mora_calculada: mora,
            pago_minimo: pagoMinimo,
            pago_total: deudaTotal,
            dia_pago: diaPago,
            fecha_corte: diaCorte,
            // Date helpers for UI reminders
            fecha_proximo_corte: fechaCorte.toISOString().split('T')[0],
            fecha_limite_pago: fechaLimitePago.toISOString().split('T')[0]
        });
    } catch (err) {
        console.error('Error calculando deuda:', err);
        res.status(500).json({ error: 'Error al calcular deuda' });
    }
};


/**
 * Realizar un Avance de Tarjeta de Crédito (Retirar efectivo o enviar a cuenta)
 */
exports.realizarAvance = async (req, res) => {
    try {
        const { tarjeta_id, cuenta_destino_id, cuenta_destino_numero, monto, password_seguridad, cuotas } = req.body;
        console.log('--- START AVANCE ---', req.body);
        
        const cuotasInt = parseInt(cuotas) || 1;
        if (cuotasInt < 1 || cuotasInt > 36) return res.status(400).json({ error: 'Número de cuotas inválido (seleccione entre 1 y 36)' });
        if (!monto || monto <= 0) { console.log('Fail: monto invalido'); return res.status(400).json({ error: 'Monto inválido' }); }

        // Validar tarjeta y cupo
        console.log('Query tcRes for tarjeta_id:', tarjeta_id, 'usuario:', req.user.id);
        const tcRes = await pool.query("SELECT id, cupo_disponible, password_pagos_hash FROM cuenta WHERE id = $1 AND usuario_id = $2 AND tipo_cuenta_id = 3 AND activa = true", [tarjeta_id, req.user.id]);
        if (tcRes.rows.length === 0) { console.log('Fail: tarjeta no valida'); return res.status(404).json({ error: 'Tarjeta no válida o inactiva' }); }
        
        const tc = tcRes.rows[0];
        
        // Check if card has an active PIN
        if (!tc.password_pagos_hash) { console.log('Fail: sin clave asginada'); return res.status(400).json({ error: 'Debes activar tu tarjeta y asignar una contraseña antes de realizar avances' }); }
        
        // Verify PIN
        const bcrypt = require('bcryptjs');
        const validMatch = await bcrypt.compare(password_seguridad, tc.password_pagos_hash);
        if (!validMatch) { console.log('Fail: password mismatch'); return res.status(401).json({ error: 'Contraseña de la tarjeta incorrecta' }); }

        if (parseFloat(tc.cupo_disponible) < monto) { console.log('Fail: cupo. Disp:', tc.cupo_disponible, 'monto:', monto); return res.status(400).json({ error: 'Cupo insuficiente' }); }

        console.log('Starting Transaction for avance...');
        // Iniciar transacción DB
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            let destIdResolved = cuenta_destino_id || null;

            // Restar cupo
            await client.query("UPDATE cuenta SET cupo_disponible = cupo_disponible - $1 WHERE id = $2", [monto, tarjeta_id]);

            // Sumar a cuenta de ahorros/corriente propia
            if (cuenta_destino_id && !cuenta_destino_numero) {
                const destRes = await client.query("SELECT id FROM cuenta WHERE id = $1 AND usuario_id = $2 AND tipo_cuenta_id IN (1,2) AND activa = true", [cuenta_destino_id, req.user.id]);
                if (destRes.rows.length > 0) {
                    await client.query("UPDATE cuenta SET saldo = saldo + $1 WHERE id = $2", [monto, cuenta_destino_id]);
                } else {
                    throw new Error('Cuenta destino propia inválida');
                }
            } 
            // Sumar a cuenta de ahorros/corriente de terceros
            else if (cuenta_destino_numero) {
                const tercRes = await client.query("SELECT id FROM cuenta WHERE numero_cuenta = $1 AND tipo_cuenta_id IN (1,2) AND activa = true", [cuenta_destino_numero]);
                if (tercRes.rows.length > 0) {
                    destIdResolved = tercRes.rows[0].id;
                    await client.query("UPDATE cuenta SET saldo = saldo + $1 WHERE id = $2", [monto, destIdResolved]);
                } else {
                    throw new Error('La cuenta destino no existe o está inactiva');
                }
            }

            // Registrar movimiento 'AVANCE_CREDITO'
            await client.query(
                "INSERT INTO movimiento (cuenta_origen_id, cuenta_destino_id, tipo_movimiento_id, valor, fecha, punto_id) VALUES ($1, $2, 5, $3, NOW(), 1)",
                [tarjeta_id, destIdResolved, monto]
            );

            // Registrar avance en cuotas en la nueva tabla compra_tarjeta
            await client.query(
                `INSERT INTO compra_tarjeta (cuenta_id, descripcion, monto_inicial, cuotas_totales, cuotas_pagadas, tasa_interes_mensual, saldo_restante)
                 VALUES ($1, 'Avance en Efectivo', $2, $3, 0, 0.0250, $2)`,
                [tarjeta_id, monto, cuotasInt]
            );

            await client.query('COMMIT');

            res.json({ message: 'Avance exitoso. Difiere a ' + cuotasInt + ' cuotas', monto: monto });
        } catch (txnErr) {
            await client.query('ROLLBACK');
            throw txnErr;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('Error procesando avance:', err);
        res.status(500).json({ error: err.message || 'Error al procesar el avance' });
    }
};

/**
 * Modificador de Fecha de Pago (Admin logic)
 */
exports.cambiarFechaPago = async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevo_corte, nuevo_pago } = req.body;

        if (!nuevo_corte || !nuevo_pago || nuevo_corte < 1 || nuevo_corte > 31 || nuevo_pago < 1 || nuevo_pago > 31) {
            return res.status(400).json({ error: 'Fechas inválidas (1-31)' });
        }

        const tcRes = await pool.query("UPDATE cuenta SET fecha_corte = $1, dia_pago = $2 WHERE id = $3 AND tipo_cuenta_id = 3 RETURNING *", [nuevo_corte, nuevo_pago, id]);
        if (tcRes.rows.length === 0) return res.status(404).json({ error: 'Tarjeta no encontrada' });

        res.json({ message: 'Fechas de corte y pago actualizadas exitosamente.' });
    } catch(err) {
        console.error('Error actualizando fechas de pago:', err);
        res.status(500).json({ error: 'Error al cambiar fecha de pago' });
    }
};
