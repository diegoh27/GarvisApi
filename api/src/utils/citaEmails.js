/**
 * Envía correos y crea notificaciones cuando se reserva una cita.
 * Paciente: recibe datos de cita + pago.
 * Especialista: recibe solo datos de cita (sin información de pagos).
 */
const { pool } = require("../db");
const { sendEmail } = require("./email");
const {
	getCitaReservadaPacienteEmailHtml,
	getCitaReservadaPacienteEmailText,
	getCitaReservadaEspecialistaEmailHtml,
	getCitaReservadaEspecialistaEmailText,
} = require("./htmlEmail");
const { createNotificacionController } = require("../controllers/notificacionesControllers");

const MOSTRADOR_CORREO = "mostrador@garvis.local";

const formatHora = (hora) => {
	if (!hora) return "—";
	const s = String(hora).trim();
	const match = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
	if (!match) return s;
	const h = parseInt(match[1], 10);
	const m = match[2];
	const meridiano = h < 12 ? "a. m." : "p. m.";
	const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
	return `${h12}:${m} ${meridiano}`;
};

const DIAS_ES = [
	"domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado",
];
const MESES_ES = [
	"enero", "febrero", "marzo", "abril", "mayo", "junio",
	"julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const formatFecha = (fecha) => {
	if (!fecha) return "—";
	const s = String(fecha).trim();
	const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
	let y, m, d;
	if (isoMatch) {
		[, y, m, d] = isoMatch;
		y = parseInt(y, 10);
		m = parseInt(m, 10) - 1;
		d = parseInt(d, 10);
	} else {
		const date = new Date(fecha);
		if (Number.isNaN(date.getTime())) return "—";
		y = date.getFullYear();
		m = date.getMonth();
		d = date.getDate();
	}
	const dateObj = new Date(y, m, d);
	const diaSemana = DIAS_ES[dateObj.getDay()];
	const mes = MESES_ES[m];
	const diaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
	return `${diaCapitalizado}, ${d} de ${mes} de ${y}`;
};

const truncarMensaje = (txt, max = 255) => {
	if (!txt || txt.length <= max) return txt || "";
	return `${txt.slice(0, max - 3)}...`;
};

/**
 * Envía correos y notificaciones al paciente y especialista tras reservar una cita.
 * @param {Object} opts
 * @param {string} opts.id_cita
 * @param {string} opts.id_paciente
 * @param {string} opts.id_especialista
 * @param {boolean} [opts.enviarAPaciente=true] - false para mostrador (paciente no tiene correo real)
 */
const sendCitaReservadaEmailsAndNotifications = async ({
	id_cita,
	id_paciente,
	id_especialista,
	enviarAPaciente = true,
}) => {
	try {
		const [rows] = await pool.execute(
			`SELECT
        c.id_cita, c.fecha_cita, c.hora_cita, c.orden, c.estado_pago,
        e.nombre AS eco_nombre,
        u_esp.nombre AS especialista_nombre, u_esp.apellido AS especialista_apellido, u_esp.correo AS especialista_correo,
        u_pac.nombre AS paciente_nombre, u_pac.apellido AS paciente_apellido, u_pac.correo AS paciente_correo,
        cm.nombre AS mostrador_nombre, cm.apellido AS mostrador_apellido,
        pag.metodo, pag.monto_usd, pag.monto_bs, pag.referencia, pag.banco_origen, pag.banco_destino, pag.estado_pago AS pago_estado
      FROM cita c
      INNER JOIN eco e ON e.id_eco = c.id_eco
      INNER JOIN usuario u_esp ON u_esp.id_usuario = c.id_especialista
      LEFT JOIN usuario u_pac ON u_pac.id_usuario = c.id_paciente
      LEFT JOIN cita_mostrador cm ON cm.id_cita = c.id_cita
      LEFT JOIN pagos pag ON pag.id_cita = c.id_cita
      WHERE c.id_cita = ?`,
			[id_cita],
		);

		if (!rows.length) return;

		const r = rows[0];
		const fechaCita = formatFecha(r.fecha_cita);
		const horaCita = formatHora(r.hora_cita);
		const ecoNombre = r.eco_nombre || "—";
		const especialistaNombre = [r.especialista_nombre, r.especialista_apellido]
			.filter(Boolean)
			.join(" ");

		const pacienteNombre = r.paciente_correo
			? [r.paciente_nombre, r.paciente_apellido].filter(Boolean).join(" ")
			: r.mostrador_nombre
				? [r.mostrador_nombre, r.mostrador_apellido].filter(Boolean).join(" ")
				: "Paciente";

		// Email y notificación al paciente (si no es mostrador)
		if (enviarAPaciente && r.paciente_correo && r.paciente_correo !== MOSTRADOR_CORREO) {
			const pacienteData = {
				nombrePaciente: pacienteNombre,
				fechaCita,
				horaCita,
				ecoNombre,
				especialistaNombre,
				orden: !!r.orden,
				metodo: r.metodo,
				montoUsd: r.monto_usd,
				montoBs: r.monto_bs,
				referencia: r.referencia,
				bancoOrigen: r.banco_origen,
				bancoDestino: r.banco_destino,
				estadoPago: r.pago_estado ?? r.estado_pago,
			};

			const html = getCitaReservadaPacienteEmailHtml(pacienteData);
			const text = getCitaReservadaPacienteEmailText(pacienteData);

			try {
				await sendEmail({
					to: r.paciente_correo,
					subject: "Tu cita ha sido reservada - Garbis Online",
					html,
					text,
				});
			} catch (emailErr) {
				console.error("Error enviando correo de cita al paciente:", emailErr);
			}

			try {
				await createNotificacionController({
					id_usuario: id_paciente,
					titulo: "Cita reservada",
					mensaje: truncarMensaje(`Tu cita con ${especialistaNombre} para ${ecoNombre} el ${fechaCita} a las ${horaCita} ha sido reservada.`),
					tipo: "cita",
				});
			} catch (notifErr) {
				console.error("Error creando notificación para paciente:", notifErr);
			}
		}

		// Email y notificación al especialista
		if (r.especialista_correo) {
			const especialistaData = {
				nombreEspecialista: especialistaNombre,
				fechaCita,
				horaCita,
				ecoNombre,
				pacienteNombre,
				orden: !!r.orden,
			};

			const html = getCitaReservadaEspecialistaEmailHtml(especialistaData);
			const text = getCitaReservadaEspecialistaEmailText(especialistaData);

			try {
				await sendEmail({
					to: r.especialista_correo,
					subject: "Nueva cita asignada - Garbis Online",
					html,
					text,
				});
			} catch (emailErr) {
				console.error("Error enviando correo de cita al especialista:", emailErr);
			}

			try {
				await createNotificacionController({
					id_usuario: id_especialista,
					titulo: "Nueva cita asignada",
					mensaje: truncarMensaje(`Paciente: ${pacienteNombre} · Eco: ${ecoNombre} · ${fechaCita} ${horaCita}`),
					tipo: "cita",
				});
			} catch (notifErr) {
				console.error("Error creando notificación para especialista:", notifErr);
			}
		}

		// Notificar a admin y moderador: nueva cita creada
		try {
			const [adminModRows] = await pool.execute(
				`SELECT u.id_usuario FROM usuario u
         INNER JOIN roles r ON r.id_rol = u.id_rol
         WHERE r.nombre IN ('admin', 'moderador') AND u.activo = 1`,
			);
			const mensaje = truncarMensaje(`Paciente: ${pacienteNombre} · Especialista: ${especialistaNombre} · ${ecoNombre} · ${fechaCita} ${horaCita}. Revisa pagos pendientes.`);
			for (const row of adminModRows) {
				try {
					await createNotificacionController({
						id_usuario: row.id_usuario,
						titulo: "Nueva cita reservada",
						mensaje,
						tipo: "cita_nueva",
					});
				} catch (e) {
					console.error("Error notificando admin/moderador:", e);
				}
			}
		} catch (err) {
			console.error("Error notificando admin/moderador de nueva cita:", err);
		}
	} catch (err) {
		console.error("Error en sendCitaReservadaEmailsAndNotifications:", err);
	}
};

module.exports = {
	sendCitaReservadaEmailsAndNotifications,
	formatFechaCita: formatFecha,
	formatHoraCita: formatHora,
};
