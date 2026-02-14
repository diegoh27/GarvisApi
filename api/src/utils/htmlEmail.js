/**
 * Plantilla HTML para correos de verificación de cuenta.
 * @param {Object} options
 * @param {'welcome'|'reminder'} options.tipo - 'welcome' = registro nuevo, 'reminder' = reenvío desde banner
 * @param {string} options.nombre - Nombre del usuario
 * @param {string} options.verifyLink - URL del enlace de verificación
 * @param {number} options.ttlHours - Horas de validez del enlace
 * @returns {string} HTML del correo
 */
const getVerificationEmailHtml = ({ tipo, nombre, verifyLink, ttlHours }) => {
	const saludo = `Hola ${nombre || "paciente"},`;
	const isWelcome = tipo === "welcome";

	const parrafo1 = isWelcome
		? "Estamos muy felices de que te hayas unido a nuestra comunidad. Para comenzar a disfrutar de todos nuestros servicios digitales, como agendar citas y ver tus resultados en línea, necesitamos un último paso."
		: "Hemos notado que aún no has verificado tu cuenta de correo electrónico. Para poder reservar citas y desbloquear todas las funcionalidades de tu cuenta, por favor verifica tu correo.";

	const parrafo2 =
		"Por favor, confirma tu correo electrónico haciendo clic en el botón de abajo:";

	const textoExpiracion =
		ttlHours > 0
			? `Este enlace expira en ${ttlHours} hora${ttlHours !== 1 ? "s" : ""}.`
			: "";

	return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifica tu correo - Garbis</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FDFDFD; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FDFDFD; padding: 20px 0 40px 0;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td bgcolor="#3EAEB0" style="padding: 30px 0; text-align: center;">
              <a href="https://garbis.online/" target="_blank" style="text-decoration: none;">
                <div style="font-size: 28px; font-weight: 800; color: #FFFFFF; letter-spacing: -1px;">
                  GARBIS<span style="font-weight: 300; opacity: 0.9;">ONLINE</span>
                </div>
              </a>
              <div style="color: #FDFDFD; font-size: 18px; font-weight: 600; margin-top: 15px;">
                Dr. Garbis
              </div>
              <div style="color: #DDEFF1; font-size: 14px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px;">
                Unidad de Ecografía Integral
              </div>
            </td>
          </tr>

          <!-- Barra decorativa -->
          <tr>
            <td bgcolor="#054542" style="padding: 0; height: 8px;"></td>
          </tr>

          <!-- Contenido principal -->
          <tr>
            <td style="padding: 45px 40px; text-align: left; background-color: #FFFFFF;">
              <h2 style="font-size: 26px; color: #054542; margin: 0 0 24px 0; font-weight: 700;">
                ${saludo}
              </h2>
              <p style="font-size: 16px; margin: 0 0 20px 0; color: #1D1D1D; line-height: 1.8;">
                ${parrafo1}
              </p>
              <p style="font-size: 16px; margin: 0 0 30px 0; color: #1D1D1D; line-height: 1.8;">
                ${parrafo2}
              </p>

              <!-- Botón CTA -->
              <div style="text-align: center; padding: 10px 0 30px 0;">
                <a href="${verifyLink}" target="_blank" style="background-color: #054542; color: #FDFDFD; text-decoration: none; padding: 18px 36px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; font-family: 'Segoe UI', sans-serif; box-shadow: 0 4px 15px rgba(5, 69, 66, 0.2);">
                  Confirmar Correo Electrónico
                </a>
              </div>

              ${textoExpiracion ? `<p style="font-size: 14px; color: #666666; margin: 0 0 20px 0;">${textoExpiracion}</p>` : ""}

              <div style="border-top: 1px solid #EFEFEF; padding-top: 30px; margin-top: 20px;">
                <p style="font-size: 14px; color: #666666; font-style: italic; margin: 0;">
                  Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos.
                </p>
                <p style="font-size: 15px; color: #054542; font-weight: 600; margin: 15px 0 0 0;">
                  Atentamente,<br>
                  <span style="color: #3EAEB0;">El equipo de Garbis Online</span>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#DDEFF1" style="padding: 40px; text-align: center; color: #1D1D1D;">
              <p style="font-size: 13px; margin: 0 0 15px 0; opacity: 0.8;">
                © 2026 Garbis Online. Todos los derechos reservados.
              </p>
              <div style="font-size: 14px; font-weight: 600;">
                <a href="tel:04127061888" style="color: #054542; text-decoration: none;">0412 706 1888</a>
                <span style="margin: 0 10px; color: #3EAEB0;">|</span>
                <a href="https://garbis.online/" target="_blank" style="color: #054542; text-decoration: none;">garbis.online</a>
              </div>
              <div style="margin-top: 20px;">
                <p style="font-size: 11px; color: #054542; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px; margin: 0;">
                  Unidad de Ecografía Integral • Vanguardia Médica
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
};

/**
 * Genera la versión texto plano del correo de verificación.
 */
const getVerificationEmailText = ({ tipo, nombre, verifyLink, ttlHours }) => {
	const isWelcome = tipo === "welcome";
	const saludo = `Hola ${nombre || "paciente"},`;
	const intro = isWelcome
		? "Gracias por registrarte en Garbis. Para activar tu cuenta, verifica tu correo electrónico."
		: "Hemos notado que aún no has verificado tu cuenta. Para desbloquear todas las funcionalidades, verifica tu correo electrónico.";
	const expiracion =
		ttlHours > 0 ? `\n\nEste enlace expira en ${ttlHours} horas.` : "";
	return `${saludo}\n\n${intro}\n\nVerifica tu correo aquí: ${verifyLink}${expiracion}\n\nAtentamente,\nEl equipo de Garbis Online`;
};

/**
 * Plantilla HTML para correo de recuperación/restablecimiento de contraseña.
 * @param {Object} options
 * @param {string} options.nombre - Nombre del usuario
 * @param {string} options.resetLink - URL del enlace para restablecer contraseña
 * @param {number} options.ttlMinutes - Minutos de validez del enlace
 * @returns {string} HTML del correo
 */
const getPasswordResetEmailHtml = ({ nombre, resetLink, ttlMinutes }) => {
	const saludo = `Hola ${nombre || "usuario"},`;

	return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer contraseña - Garbis</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FDFDFD; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FDFDFD; padding: 20px 0 40px 0;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td bgcolor="#3EAEB0" style="padding: 30px 0; text-align: center;">
              <a href="https://garbis.online/" target="_blank" style="text-decoration: none;">
                <div style="font-size: 28px; font-weight: 800; color: #FFFFFF; letter-spacing: -1px;">
                  GARBIS<span style="font-weight: 300; opacity: 0.9;">ONLINE</span>
                </div>
              </a>
              <div style="color: #FDFDFD; font-size: 18px; font-weight: 600; margin-top: 15px;">
                Dr. Garbis
              </div>
              <div style="color: #DDEFF1; font-size: 14px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px;">
                Unidad de Ecografía Integral
              </div>
            </td>
          </tr>

          <!-- Barra decorativa -->
          <tr>
            <td bgcolor="#054542" style="padding: 0; height: 8px;"></td>
          </tr>

          <!-- Contenido principal -->
          <tr>
            <td style="padding: 45px 40px; text-align: left; background-color: #FFFFFF;">
              <h2 style="font-size: 26px; color: #054542; margin: 0 0 24px 0; font-weight: 700;">
                ${saludo}
              </h2>
              <p style="font-size: 16px; margin: 0 0 20px 0; color: #1D1D1D; line-height: 1.8;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta en Garbis Online.
              </p>
              <p style="font-size: 16px; margin: 0 0 30px 0; color: #1D1D1D; line-height: 1.8;">
                Si fuiste tú quien la solicitó, haz clic en el botón de abajo para elegir una nueva contraseña:
              </p>

              <!-- Botón CTA -->
              <div style="text-align: center; padding: 10px 0 30px 0;">
                <a href="${resetLink}" target="_blank" style="background-color: #054542; color: #FDFDFD; text-decoration: none; padding: 18px 36px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; font-family: 'Segoe UI', sans-serif; box-shadow: 0 4px 15px rgba(5, 69, 66, 0.2);">
                  Restablecer contraseña
                </a>
              </div>

              ${ttlMinutes > 0 ? `<p style="font-size: 14px; color: #666666; margin: 0 0 20px 0;">Este enlace expira en ${ttlMinutes} minutos.</p>` : ""}

              <p style="font-size: 14px; color: #666666; margin: 0 0 20px 0; line-height: 1.6;">
                Si no solicitaste restablecer tu contraseña, puedes ignorar este correo. Tu cuenta permanecerá segura.
              </p>

              <div style="border-top: 1px solid #EFEFEF; padding-top: 30px; margin-top: 20px;">
                <p style="font-size: 14px; color: #666666; font-style: italic; margin: 0;">
                  Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos.
                </p>
                <p style="font-size: 15px; color: #054542; font-weight: 600; margin: 15px 0 0 0;">
                  Atentamente,<br>
                  <span style="color: #3EAEB0;">El equipo de Garbis Online</span>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#DDEFF1" style="padding: 40px; text-align: center; color: #1D1D1D;">
              <p style="font-size: 13px; margin: 0 0 15px 0; opacity: 0.8;">
                © 2026 Garbis Online. Todos los derechos reservados.
              </p>
              <div style="font-size: 14px; font-weight: 600;">
                <a href="tel:04127061888" style="color: #054542; text-decoration: none;">0412 706 1888</a>
                <span style="margin: 0 10px; color: #3EAEB0;">|</span>
                <a href="https://garbis.online/" target="_blank" style="color: #054542; text-decoration: none;">garbis.online</a>
              </div>
              <div style="margin-top: 20px;">
                <p style="font-size: 11px; color: #054542; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px; margin: 0;">
                  Unidad de Ecografía Integral • Vanguardia Médica
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
};

/**
 * Genera la versión texto plano del correo de recuperación de contraseña.
 */
const getPasswordResetEmailText = ({ nombre, resetLink, ttlMinutes }) => {
	const saludo = `Hola ${nombre || "usuario"},`;
	const intro =
		"Recibimos una solicitud para restablecer la contraseña de tu cuenta. Si fuiste tú, haz clic en el enlace de abajo.";
	const expiracion =
		ttlMinutes > 0 ? `\n\nEste enlace expira en ${ttlMinutes} minutos.` : "";
	return `${saludo}\n\n${intro}\n\nRestablecer contraseña: ${resetLink}${expiracion}\n\nSi no lo solicitaste, ignora este correo.\n\nAtentamente,\nEl equipo de Garbis Online`;
};

const EMAIL_LAYOUT_HEADER = `
          <tr>
            <td bgcolor="#3EAEB0" style="padding: 30px 0; text-align: center;">
              <a href="https://garbis.online/" target="_blank" style="text-decoration: none;">
                <div style="font-size: 28px; font-weight: 800; color: #FFFFFF; letter-spacing: -1px;">
                  GARBIS<span style="font-weight: 300; opacity: 0.9;">ONLINE</span>
                </div>
              </a>
              <div style="color: #FDFDFD; font-size: 18px; font-weight: 600; margin-top: 15px;">
                Dr. Garbis
              </div>
              <div style="color: #DDEFF1; font-size: 14px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px;">
                Unidad de Ecografía Integral
              </div>
            </td>
          </tr>
          <tr>
            <td bgcolor="#054542" style="padding: 0; height: 8px;"></td>
          </tr>`;

const EMAIL_LAYOUT_FOOTER = `
          <tr>
            <td bgcolor="#DDEFF1" style="padding: 40px; text-align: center; color: #1D1D1D;">
              <p style="font-size: 13px; margin: 0 0 15px 0; opacity: 0.8;">
                © 2026 Garbis Online. Todos los derechos reservados.
              </p>
              <div style="font-size: 14px; font-weight: 600;">
                <a href="tel:04127061888" style="color: #054542; text-decoration: none;">0412 706 1888</a>
                <span style="margin: 0 10px; color: #3EAEB0;">|</span>
                <a href="https://garbis.online/" target="_blank" style="color: #054542; text-decoration: none;">garbis.online</a>
              </div>
              <div style="margin-top: 20px;">
                <p style="font-size: 11px; color: #054542; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px; margin: 0;">
                  Unidad de Ecografía Integral • Vanguardia Médica
                </p>
              </div>
            </td>
          </tr>`;

const formatMonto = (val) =>
	val != null && Number(val) !== 0
		? Number(Number(val).toFixed(2)).toLocaleString("es-VE")
		: "—";

/**
 * Plantilla HTML para correo de cita reservada al PACIENTE (incluye datos de pago).
 */
const getCitaReservadaPacienteEmailHtml = ({
	nombrePaciente,
	fechaCita,
	horaCita,
	ecoNombre,
	especialistaNombre,
	orden,
	// Datos de pago
	metodo,
	montoUsd,
	montoBs,
	referencia,
	bancoOrigen,
	bancoDestino,
	estadoPago,
}) => {
	const saludo = `Hola ${nombrePaciente || "paciente"},`;
	const estadoPagoTexto =
		Number(estadoPago) === 0
			? "Pendiente de verificación"
			: Number(estadoPago) === 1
				? "Aprobado"
				: "Rechazado";

	const pagoSection =
		metodo != null
			? `
              <h3 style="font-size: 18px; color: #054542; margin: 24px 0 12px 0;">Datos del pago</h3>
              <table width="100%" cellspacing="0" cellpadding="8" style="border: 1px solid #E5E7EB; border-radius: 8px; margin-bottom: 20px;">
                <tr style="background: #F9FAFB;"><td style="font-weight: 600; color: #374151;">Método</td><td>${metodo || "—"}</td></tr>
                <tr><td style="font-weight: 600; color: #374151;">Monto USD</td><td>$${formatMonto(montoUsd)}</td></tr>
                <tr style="background: #F9FAFB;"><td style="font-weight: 600; color: #374151;">Monto Bs</td><td>Bs. ${formatMonto(montoBs)}</td></tr>
                <tr><td style="font-weight: 600; color: #374151;">Referencia</td><td>${referencia || "—"}</td></tr>
                <tr style="background: #F9FAFB;"><td style="font-weight: 600; color: #374151;">Banco origen</td><td>${bancoOrigen || "—"}</td></tr>
                <tr><td style="font-weight: 600; color: #374151;">Banco destino</td><td>${bancoDestino || "—"}</td></tr>
                <tr style="background: #F9FAFB;"><td style="font-weight: 600; color: #374151;">Estado</td><td>${estadoPagoTexto}</td></tr>
              </table>`
			: `
              <p style="font-size: 14px; color: #666666; margin: 20px 0 0 0;">
                Tu pago está pendiente. Completa el pago para confirmar tu cita.
              </p>`;

	return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cita reservada - Garbis</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FDFDFD; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FDFDFD; padding: 20px 0 40px 0;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          ${EMAIL_LAYOUT_HEADER}
          <tr>
            <td style="padding: 45px 40px; text-align: left; background-color: #FFFFFF;">
              <h2 style="font-size: 26px; color: #054542; margin: 0 0 24px 0; font-weight: 700;">${saludo}</h2>
              <p style="font-size: 16px; margin: 0 0 20px 0; color: #1D1D1D; line-height: 1.8;">
                Tu cita ha sido reservada exitosamente. A continuación los detalles:
              </p>
              <h3 style="font-size: 18px; color: #054542; margin: 0 0 12px 0;">Detalles de la cita</h3>
              <table width="100%" cellspacing="0" cellpadding="8" style="border: 1px solid #E5E7EB; border-radius: 8px;">
                <tr style="background: #F9FAFB;"><td style="font-weight: 600; color: #374151;">Fecha</td><td>${fechaCita || "—"}</td></tr>
                <tr><td style="font-weight: 600; color: #374151;">Hora</td><td>${horaCita || "—"}</td></tr>
                <tr style="background: #F9FAFB;"><td style="font-weight: 600; color: #374151;">Tipo de eco</td><td>${ecoNombre || "—"}</td></tr>
                <tr><td style="font-weight: 600; color: #374151;">Especialista</td><td>${especialistaNombre || "—"}</td></tr>
                ${orden ? `<tr style="background: #F9FAFB;"><td style="font-weight: 600; color: #374151;">Orden médica</td><td>Registrada</td></tr>` : ""}
              </table>
              ${pagoSection}
              <div style="border-top: 1px solid #EFEFEF; padding-top: 30px; margin-top: 20px;">
                <p style="font-size: 14px; color: #666666; font-style: italic; margin: 0;">
                  Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos.
                </p>
                <p style="font-size: 15px; color: #054542; font-weight: 600; margin: 15px 0 0 0;">
                  Atentamente,<br>
                  <span style="color: #3EAEB0;">El equipo de Garbis Online</span>
                </p>
              </div>
            </td>
          </tr>
          ${EMAIL_LAYOUT_FOOTER}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
};

/**
 * Plantilla HTML para correo de cita reservada al ESPECIALISTA (sin datos de pago).
 */
const getCitaReservadaEspecialistaEmailHtml = ({
	nombreEspecialista,
	fechaCita,
	horaCita,
	ecoNombre,
	pacienteNombre,
	orden,
}) => {
	const saludo = `Hola Dr./Dra. ${nombreEspecialista || "especialista"},`;

	return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva cita asignada - Garbis</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FDFDFD; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FDFDFD; padding: 20px 0 40px 0;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          ${EMAIL_LAYOUT_HEADER}
          <tr>
            <td style="padding: 45px 40px; text-align: left; background-color: #FFFFFF;">
              <h2 style="font-size: 26px; color: #054542; margin: 0 0 24px 0; font-weight: 700;">${saludo}</h2>
              <p style="font-size: 16px; margin: 0 0 20px 0; color: #1D1D1D; line-height: 1.8;">
                Se ha asignado una nueva cita a tu agenda. Detalles:
              </p>
              <table width="100%" cellspacing="0" cellpadding="8" style="border: 1px solid #E5E7EB; border-radius: 8px;">
                <tr style="background: #F9FAFB;"><td style="font-weight: 600; color: #374151;">Fecha</td><td>${fechaCita || "—"}</td></tr>
                <tr><td style="font-weight: 600; color: #374151;">Hora</td><td>${horaCita || "—"}</td></tr>
                <tr style="background: #F9FAFB;"><td style="font-weight: 600; color: #374151;">Tipo de eco</td><td>${ecoNombre || "—"}</td></tr>
                <tr><td style="font-weight: 600; color: #374151;">Paciente</td><td>${pacienteNombre || "—"}</td></tr>
                ${orden ? `<tr style="background: #F9FAFB;"><td style="font-weight: 600; color: #374151;">Orden médica</td><td>Registrada</td></tr>` : ""}
              </table>
              <div style="border-top: 1px solid #EFEFEF; padding-top: 30px; margin-top: 20px;">
                <p style="font-size: 14px; color: #666666; font-style: italic; margin: 0;">
                  Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos.
                </p>
                <p style="font-size: 15px; color: #054542; font-weight: 600; margin: 15px 0 0 0;">
                  Atentamente,<br>
                  <span style="color: #3EAEB0;">El equipo de Garbis Online</span>
                </p>
              </div>
            </td>
          </tr>
          ${EMAIL_LAYOUT_FOOTER}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
};

const getCitaReservadaPacienteEmailText = (data) => {
	const { nombrePaciente, fechaCita, horaCita, ecoNombre, especialistaNombre } =
		data;
	const pago = data.metodo
		? `\nPago: ${data.metodo} - Ref: ${data.referencia || "—"} - $${formatMonto(data.montoUsd)} USD`
		: "\nPago pendiente.";
	return `Hola ${nombrePaciente || "paciente"},\n\nTu cita ha sido reservada.\nFecha: ${fechaCita || "—"}\nHora: ${horaCita || "—"}\nEco: ${ecoNombre || "—"}\nEspecialista: ${especialistaNombre || "—"}${pago}\n\nAtentamente,\nEl equipo de Garbis Online`;
};

const getCitaReservadaEspecialistaEmailText = (data) => {
	const { nombreEspecialista, fechaCita, horaCita, ecoNombre, pacienteNombre } =
		data;
	return `Hola Dr./Dra. ${nombreEspecialista || "especialista"},\n\nNueva cita asignada.\nFecha: ${fechaCita || "—"}\nHora: ${horaCita || "—"}\nEco: ${ecoNombre || "—"}\nPaciente: ${pacienteNombre || "—"}\n\nAtentamente,\nEl equipo de Garbis Online`;
};

module.exports = {
	getVerificationEmailHtml,
	getVerificationEmailText,
	getPasswordResetEmailHtml,
	getPasswordResetEmailText,
	getCitaReservadaPacienteEmailHtml,
	getCitaReservadaPacienteEmailText,
	getCitaReservadaEspecialistaEmailHtml,
	getCitaReservadaEspecialistaEmailText,
};
