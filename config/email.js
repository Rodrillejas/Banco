// Using Resend API (HTTPS) to bypass Render's SMTP firewall
const RESEND_API_KEY = 're_76v4h15c_8UaN6W8phqKnQD7tWjxDzf5R';

async function sendEmail(to, subject, html) {
    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'BancoUM <onboarding@resend.dev>',
                to: [to],
                subject: subject,
                html: html
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log(`✅ [RESEND] Email enviado exitosamente a ${to}: ${data.id}`);
        } else {
            console.error('❌ [RESEND] Error de API:', data);
        }
    } catch (error) {
        console.error('❌ [RESEND] Error crítico de red enviando email:', error);
    }
}

// Email Templates
const emailTemplates = {
    bienvenidaAmbos: (nombre, activarUrl) => ({
        subject: '¡Bienvenido a BancoUM! Tus productos te esperan',
        html: `
        <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;border-radius:12px;overflow:hidden">
            <div style="background:#0E3635;padding:30px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:28px">BancoUM</h1>
            </div>
            <div style="padding:30px">
                <h2 style="color:#0E3635">¡Hola ${nombre}!</h2>
                <p>Bienvenido a BancoUM, nos complace informarte que tu solicitud ha sido <strong>aprobada para ambos productos</strong>.</p>
                <p>Puedes acceder a:</p>
                <ul>
                    <li>✅ Cuenta de Ahorros/Corriente</li>
                    <li>✅ Tarjeta de Crédito</li>
                </ul>
                <p>Para completar tu registro y activar tus productos, haz clic en el siguiente enlace:</p>
                <div style="text-align:center;margin:25px 0">
                    <a href="${activarUrl}" style="background:#0E3635;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Activar mi cuenta</a>
                </div>
                <p style="color:#666;font-size:13px">Si no solicitaste este servicio, ignora este correo.</p>
            </div>
            <div style="background:#0E3635;padding:15px;text-align:center">
                <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0">© 2026 BancoUM. Todos los derechos reservados.</p>
            </div>
        </div>`
    }),

    bienvenidaCuenta: (nombre, activarUrl, tipo) => ({
        subject: `BancoUM - Tu cuenta de ${tipo} ha sido aprobada`,
        html: `
        <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;border-radius:12px;overflow:hidden">
            <div style="background:#0E3635;padding:30px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:28px">BancoUM</h1>
            </div>
            <div style="padding:30px">
                <h2 style="color:#0E3635">¡Hola ${nombre}!</h2>
                <p>¡Felicidades! Nos complace informarte que tu <strong>Cuenta de ${tipo}</strong> ha sido aprobada exitosamente.</p>
                <p>Haz clic en el enlace a continuación para configurar tu contraseña de seguridad y activar tu cuenta:</p>
                <div style="text-align:center;margin:25px 0">
                    <a href="${activarUrl}" style="background:#0E3635;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Activar mi cuenta</a>
                </div>
            </div>
            <div style="background:#0E3635;padding:15px;text-align:center">
                <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0">© 2026 BancoUM. Todos los derechos reservados.</p>
            </div>
        </div>`
    }),

    bienvenidaCuentaRechazoTarjeta: (nombre, activarUrl, tipo) => ({
        subject: `BancoUM - Tu cuenta de ${tipo} ha sido aprobada`,
        html: `
        <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;border-radius:12px;overflow:hidden">
            <div style="background:#0E3635;padding:30px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:28px">BancoUM</h1>
            </div>
            <div style="padding:30px">
                <h2 style="color:#0E3635">Hola ${nombre},</h2>
                <p>Lamentamos informarte que en esta ocasión no hemos podido aprobar tu solicitud de Tarjeta de Crédito.</p>
                <p>Sin embargo, ¡tu <strong>Cuenta de ${tipo}</strong> ha sido aprobada!</p>
                <p>Haz clic en el enlace para activar tu cuenta y comenzar a disfrutar de los beneficios de BancoUM:</p>
                <div style="text-align:center;margin:25px 0">
                    <a href="${activarUrl}" style="background:#0E3635;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Activar mi cuenta</a>
                </div>
            </div>
            <div style="background:#0E3635;padding:15px;text-align:center">
                <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0">© 2026 BancoUM. Todos los derechos reservados.</p>
            </div>
        </div>`
    }),

    bienvenidaSoloTarjeta: (nombre, activarUrl) => ({
        subject: 'BancoUM - Tu tarjeta de crédito ha sido aprobada',
        html: `
        <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;border-radius:12px;overflow:hidden">
            <div style="background:#0E3635;padding:30px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:28px">BancoUM</h1>
            </div>
            <div style="padding:30px">
                <h2 style="color:#0E3635">Hola ${nombre},</h2>
                <p>Tu solicitud de <strong>Tarjeta de Crédito</strong> ha sido aprobada. Para completar tu registro, define tu usuario y contraseña haciendo clic aquí:</p>
                <div style="text-align:center;margin:25px 0">
                    <a href="${activarUrl}" style="background:#0E3635;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Completar registro</a>
                </div>
            </div>
            <div style="background:#0E3635;padding:15px;text-align:center">
                <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0">© 2026 BancoUM. Todos los derechos reservados.</p>
            </div>
        </div>`
    }),

    rechazado: (nombre) => ({
        subject: 'BancoUM - Resultado de tu solicitud',
        html: `
        <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;border-radius:12px;overflow:hidden">
            <div style="background:#0E3635;padding:30px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:28px">BancoUM</h1>
            </div>
            <div style="padding:30px">
                <h2 style="color:#0E3635">Hola ${nombre},</h2>
                <p>Lamentamos informarte que en esta ocasión no podemos ofrecerte nuestros productos financieros.</p>
                <p>Te invitamos a intentar de nuevo más adelante. Estamos comprometidos con brindarte el mejor servicio.</p>
                <p style="color:#666;font-size:13px">Si tienes preguntas, contáctanos a nuestro correo de soporte.</p>
            </div>
            <div style="background:#0E3635;padding:15px;text-align:center">
                <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0">© 2026 BancoUM. Todos los derechos reservados.</p>
            </div>
        </div>`
    }),

    notificacionTransferencia: (nombre, monto, tipo) => ({
        subject: `BancoUM - Transferencia ${tipo}`,
        html: `
        <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;border-radius:12px;overflow:hidden">
            <div style="background:#0E3635;padding:30px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:28px">BancoUM</h1>
            </div>
            <div style="padding:30px">
                <h2 style="color:#0E3635">Hola ${nombre},</h2>
                <p>Se ha ${tipo === 'enviada' ? 'realizado' : 'recibido'} una transferencia por valor de <strong>$${Number(monto).toLocaleString('es-CO')}</strong>.</p>
                <p>Revisa tu historial de movimientos para más detalles.</p>
            </div>
            <div style="background:#0E3635;padding:15px;text-align:center">
                <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0">© 2026 BancoUM. Todos los derechos reservados.</p>
            </div>
        </div>`
    }),

    notificacionConsignacion: (nombre, monto) => ({
        subject: 'BancoUM - Consignación recibida',
        html: `
        <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;border-radius:12px;overflow:hidden">
            <div style="background:#0E3635;padding:30px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:28px">BancoUM</h1>
            </div>
            <div style="padding:30px">
                <h2 style="color:#0E3635">Hola ${nombre},</h2>
                <p>Se ha realizado una consignación en tu cuenta por valor de <strong>$${Number(monto).toLocaleString('es-CO')}</strong>.</p>
            </div>
            <div style="background:#0E3635;padding:15px;text-align:center">
                <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0">© 2026 BancoUM. Todos los derechos reservados.</p>
            </div>
        </div>`
    }),

    notificacionPagoCredito: (nombre, monto) => ({
        subject: 'BancoUM - Pago de tarjeta de crédito registrado',
        html: `
        </div>`
    }),

    recuperarContrasena: (nombre, resetUrl) => ({
        subject: 'BancoUM - Recuperación de Contraseña',
        html: `
        <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;border-radius:12px;overflow:hidden">
            <div style="background:#0E3635;padding:30px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:28px">BancoUM</h1>
            </div>
            <div style="padding:30px">
                <h2 style="color:#0E3635">Hola ${nombre},</h2>
                <p>Has solicitado restablecer tu contraseña de acceso al sistema BancoUM.</p>
                <p>Haz clic en el enlace a continuación para crear una nueva contraseña y recuperar el acceso a tu cuenta:</p>
                <div style="text-align:center;margin:25px 0">
                    <a href="${resetUrl}" style="background:#0E3635;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Restablecer Contraseña</a>
                </div>
                <p style="color:#666;font-size:13px">Si tú no solicitaste este cambio, por favor ignora este correo o contacta a soporte.</p>
            </div>
            <div style="background:#0E3635;padding:15px;text-align:center">
                <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0">© 2026 BancoUM. Todos los derechos reservados.</p>
            </div>
        </div>`
    })
};

module.exports = { sendEmail, emailTemplates };
