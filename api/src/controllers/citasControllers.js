const { pool } = require("../db");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { getDolarOficialController } = require("./dolarControllers");
const { normalizeCitaAmounts, round2 } = require("../utils/currency");
const { getRolIdByName } = require("../utils/roles");
const { sendEmail } = require("../utils/email");
const {
	sendCitaReservadaEmailsAndNotifications,
	formatFechaCita,
	formatHoraCita,
} = require("../utils/citaEmails");
const { createNotificacionController } = require("./notificacionesControllers");
const { normalizeFechaForDb } = require("../utils/dateUtils");
const { validarStockParaCitaController } = require("./ecoInsumosControllers");

const MOSTRADOR_PACIENTE_ID = "00000000-0000-0000-0000-000000000900";
const MOSTRADOR_CORREO = "mostrador@garbis.local";
const MOSTRADOR_CEDULA = "MOSTRADOR-SYS";
const MOSTRADOR_RIF = "J0000000000";

const isCashPaymentMethodCita = (m) => {
	const x = String(m || "");
	return x === "EfectivoBs" || x === "EfectivoUSD" || x === "Efectivo";
};

const ensurePacienteVerificado = async (conn, id_paciente) => {
	const [rows] = await conn.execute(
		"SELECT email_verificado FROM paciente WHERE id_paciente = ? LIMIT 1",
		[id_paciente],
	);
	if (!rows.length) {
		const err = new Error("Paciente no encontrado");
		err.code = "NOT_FOUND";
		throw err;
	}
	if (!Number(rows[0].email_verificado)) {
		const err = new Error("Debe verificar su correo antes de agendar una cita");
		err.code = "EMAIL_NOT_VERIFIED";
		throw err;
	}
};

const resolveExistingUsuarioId = async (conn, candidateId) => {
	if (!candidateId) return null;
	const [rows] = await conn.execute(
		"SELECT id_usuario FROM usuario WHERE id_usuario = ? LIMIT 1",
		[candidateId],
	);
	return rows.length ? candidateId : null;
};

const ensureMostradorPacienteBase = async (conn) => {
	const [pacienteRows] = await conn.execute(
		"SELECT id_paciente FROM paciente WHERE id_paciente = ? LIMIT 1",
		[MOSTRADOR_PACIENTE_ID],
	);
	if (pacienteRows.length) {
		return MOSTRADOR_PACIENTE_ID;
	}

	const [userRows] = await conn.execute(
		"SELECT id_usuario FROM usuario WHERE id_usuario = ? LIMIT 1",
		[MOSTRADOR_PACIENTE_ID],
	);

	if (!userRows.length) {
		const [rolRows] = await conn.execute(
			"SELECT id_rol FROM roles WHERE nombre = 'paciente' LIMIT 1",
		);
		if (!rolRows.length) {
			const err = new Error("Rol paciente no encontrado");
			err.code = "ROL_NOT_FOUND";
			throw err;
		}

		await conn.execute(
			`INSERT INTO usuario
				(id_usuario, nombre, apellido, genero, cedula, correo, telefono, contrasena, activo, fecha_nacimiento, id_rol)
			VALUES
				(?, 'Paciente', 'Mostrador', 'Otro', ?, ?, '0000000000', 'MOSTRADOR_NO_LOGIN', 1, '1990-01-01', ?)`,
			[
				MOSTRADOR_PACIENTE_ID,
				MOSTRADOR_CEDULA,
				MOSTRADOR_CORREO,
				rolRows[0].id_rol,
			],
		);
	}

	await conn.execute(
		`INSERT INTO paciente
			(id_paciente, tipo_sangre, descripcion, direccion, rif, contacto_emergencia_nombre, contacto_emergencia_telefono)
		VALUES
			(?, 'N/A', 'Paciente de mostrador', NULL, ?, NULL, NULL)`,
		[MOSTRADOR_PACIENTE_ID, MOSTRADOR_RIF],
	);

	return MOSTRADOR_PACIENTE_ID;
};

const createCitaFromDisponibilidadController = async ({
	id_paciente,
	id_representado,
	id_eco,
	orden,
	id_disponibilidad,
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		await ensurePacienteVerificado(conn, id_paciente);

		// Validar stock de insumos antes de agendar
		const stockCheck = await validarStockParaCitaController(id_eco);
		if (!stockCheck.ok) {
			const faltantesMsg = stockCheck.faltantes
				.map(f => `${f.producto}: necesita ${f.requerido}, disponible ${f.disponible}`)
				.join("; ");
			const err = new Error(`Stock insuficiente para agendar: ${faltantesMsg}`);
			err.code = "STOCK_INSUFICIENTE";
			err.data = stockCheck.faltantes;
			throw err;
		}

		const [rows] = await conn.execute(
			`SELECT id_especialista, fecha, hora_inicio, hora_fin, estado
       FROM disponibilidad
       WHERE id_disponibilidad = ?
       FOR UPDATE`,
			[id_disponibilidad],
		);
		if (!rows.length) {
			const err = new Error("Disponibilidad no encontrada");
			err.code = "NOT_FOUND";
			throw err;
		}
		const bloque = rows[0];
		if (bloque.estado !== 1) {
			const err = new Error("Disponibilidad no aprobada");
			err.code = "INVALID_STATE";
			throw err;
		}

		const today = new Date().toISOString().slice(0, 10);
		const nowTime = new Date().toTimeString().slice(0, 8);
		if (bloque.fecha < today) {
			const err = new Error("No se puede reservar una cita en el pasado");
			err.code = "PAST_DATE";
			throw err;
		}
		if (bloque.fecha === today) {
			if (nowTime >= "17:00:00" || bloque.hora_inicio <= nowTime) {
				const err = new Error("No se puede reservar una cita en el pasado");
				err.code = "PAST_DATE";
				throw err;
			}
		}

		const id_cita = crypto.randomUUID();
		const sqlCita = `
      INSERT INTO cita
        (id_cita, id_paciente, id_representado, id_especialista, id_eco, fecha_cita, hora_cita, orden, id_disponibilidad, estado_cita, estado_pago)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
    `;
		await conn.execute(sqlCita, [
			id_cita,
			id_paciente,
			id_representado ?? null,
			bloque.id_especialista,
			id_eco,
			bloque.fecha,
			bloque.hora_inicio,
			orden,
			id_disponibilidad,
		]);

		// Marcar la disponibilidad usada como "cita"
		await conn.execute(
			"UPDATE disponibilidad SET estado = 4 WHERE id_disponibilidad = ?",
			[id_disponibilidad],
		);

		// Bloquear (cancelar) otros bloques del mismo especialista en la misma franja horaria
		// para evitar que se reserven ecos distintos en el mismo horario.
		await conn.execute(
			`UPDATE disponibilidad
       SET estado = 3
       WHERE id_especialista = ?
         AND fecha = ?
         AND estado IN (0, 1)
         AND NOT (hora_fin <= ? OR hora_inicio >= ?)
         AND id_disponibilidad <> ?`,
			[
				bloque.id_especialista,
				bloque.fecha,
				bloque.hora_inicio,
				bloque.hora_fin,
				id_disponibilidad,
			],
		);

		await conn.commit();

		sendCitaReservadaEmailsAndNotifications({
			id_cita,
			id_paciente,
			id_especialista: bloque.id_especialista,
			enviarAPaciente: true,
		}).catch((e) => console.error("Error enviando correos cita reservada:", e));

		return {
			id_cita,
			id_paciente,
			id_representado: id_representado ?? null,
			id_especialista: bloque.id_especialista,
			id_eco,
			fecha_cita: bloque.fecha,
			hora_cita: bloque.hora_inicio,
			id_disponibilidad,
		};
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

const listCitasByPacienteController = async (id_paciente) => {
	const sql = `
    SELECT
      c.id_cita,
      c.id_paciente,
      c.id_representado,
      c.id_especialista,
      c.id_eco,
      c.fecha_cita,
      c.hora_cita,
      c.estado_cita,
      c.estado_pago,
      c.id_disponibilidad,
      c.orden,
      u.nombre AS especialista_nombre,
      u.apellido AS especialista_apellido,
      e.nombre AS eco_nombre,
      r.archivo AS resultado_archivo,
      r.study_uid AS resultado_study_uid,
      r.estado_resultado AS resultado_estado,
      r.fecha_publicacion AS resultado_publicado
    FROM cita c
    INNER JOIN usuario u ON u.id_usuario = c.id_especialista
    INNER JOIN eco e ON e.id_eco = c.id_eco
    LEFT JOIN resultado r ON r.id_cita = c.id_cita
    WHERE c.id_paciente = ?
    ORDER BY c.fecha_cita DESC, c.hora_cita DESC
  `;
	const [rows] = await pool.execute(sql, [id_paciente]);
	return rows;
};

// Obtener todas las citas del paciente con información completa (propias + citas de mostrador vinculadas)
const listCitasCompletasByPacienteController = async (id_paciente) => {
	const sql = `
    SELECT
      c.id_cita,
      c.id_paciente,
      c.id_representado,
      c.id_especialista,
      c.id_eco,
      c.fecha_cita,
      c.hora_cita,
      c.estado_cita,
      c.estado_pago,
      c.id_disponibilidad,
      c.orden,
      c.origen_cita,
      (v.id_cita IS NOT NULL) AS es_vinculada_mostrador,
      u_especialista.nombre AS especialista_nombre,
      u_especialista.apellido AS especialista_apellido,
      COALESCE(cm.nombre, u_paciente.nombre) AS paciente_nombre,
      COALESCE(cm.apellido, u_paciente.apellido) AS paciente_apellido,
      e.nombre AS eco_nombre,
      rep.nombre AS representado_nombre,
      rep.apellido AS representado_apellido,
      rep.cedula AS representado_cedula,
      rep.fecha_nacimiento AS representado_fecha_nacimiento,
      rep.genero AS representado_genero,
      rep.parentesco AS representado_parentesco,
      r.archivo AS resultado_archivo,
      r.study_uid AS resultado_study_uid,
      r.estado_resultado AS resultado_estado,
      r.fecha_publicacion AS resultado_publicado,
      inf.id_informe,
      inf.informe_pdf_url AS informe_pdf_url,
      pag.id_pago,
      pag.metodo AS pago_metodo,
      pag.imagen AS pago_imagen,
      pag.monto AS pago_monto,
      pag.monto_usd AS pago_monto_usd,
      pag.monto_bs AS pago_monto_bs,
      pag.tasa_dia_bcv AS pago_tasa_dia_bcv,
      pag.referencia AS pago_referencia,
      pag.estado_pago AS pago_estado_pago
    FROM cita c
    INNER JOIN usuario u_especialista ON u_especialista.id_usuario = c.id_especialista
    INNER JOIN usuario u_paciente ON u_paciente.id_usuario = c.id_paciente
    INNER JOIN eco e ON e.id_eco = c.id_eco
    LEFT JOIN cita_mostrador_vinculacion v ON v.id_cita = c.id_cita AND v.id_paciente = ?
    LEFT JOIN cita_mostrador cm ON cm.id_cita = c.id_cita
    LEFT JOIN representado rep ON rep.id_representado = c.id_representado
    LEFT JOIN resultado r ON r.id_cita = c.id_cita
    LEFT JOIN informe inf ON inf.id_cita = c.id_cita
    LEFT JOIN pagos pag ON pag.id_cita = c.id_cita
    WHERE c.id_paciente = ? OR v.id_cita IS NOT NULL
    ORDER BY c.fecha_cita DESC, c.hora_cita DESC
  `;
	const [rows] = await pool.execute(sql, [id_paciente, id_paciente]);
	return rows;
};

const listCitasByEspecialistaController = async (id_especialista) => {
	const sql = `
    SELECT
      c.id_cita,
      c.id_paciente,
      c.id_representado,
      c.id_especialista,
      c.id_eco,
			c.origen_cita,
      c.fecha_cita,
      c.hora_cita,
      c.estado_cita,
      c.estado_pago,
      c.id_disponibilidad,
      c.orden,
			COALESCE(cm.nombre, u.nombre) AS paciente_nombre,
			COALESCE(cm.apellido, u.apellido) AS paciente_apellido,
      u.telefono AS paciente_telefono,
			COALESCE(cm.cedula, u.cedula) AS paciente_cedula,
      u.correo AS paciente_correo,
      p.tipo_sangre AS paciente_tipo_sangre,
      p.contacto_emergencia_nombre AS paciente_contacto_nombre,
      p.contacto_emergencia_telefono AS paciente_contacto_telefono,
      e.nombre AS eco_nombre,
      r.archivo AS resultado_archivo,
      r.study_uid AS resultado_study_uid,
      r.estado_resultado AS resultado_estado,
      r.fecha_publicacion AS resultado_publicado
    FROM cita c
    INNER JOIN usuario u ON u.id_usuario = c.id_paciente
    INNER JOIN paciente p ON p.id_paciente = c.id_paciente
		LEFT JOIN cita_mostrador cm ON cm.id_cita = c.id_cita
    INNER JOIN eco e ON e.id_eco = c.id_eco
    LEFT JOIN resultado r ON r.id_cita = c.id_cita
    WHERE c.id_especialista = ?
    ORDER BY c.fecha_cita DESC, c.hora_cita DESC
  `;
	const [rows] = await pool.execute(sql, [id_especialista]);
	return rows;
};

const cancelCitaController = async ({ id_cita, cancelado_por = null }) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();
		const [rows] = await conn.execute(
			`SELECT id_disponibilidad, fecha_cita
       FROM cita
       WHERE id_cita = ?
       FOR UPDATE`,
			[id_cita],
		);
		if (!rows.length) {
			const err = new Error("Cita no encontrada");
			err.code = "NOT_FOUND";
			throw err;
		}

		const validadorCancel = await resolveExistingUsuarioId(conn, cancelado_por);

		await conn.execute(
			"UPDATE cita SET estado_cita = 2, estado_pago = 2 WHERE id_cita = ?",
			[id_cita],
		);

		// Sincronizar tabla pagos: marcar como rechazado (2) al cancelar la cita; fecha para KPI "gestionados hoy"
		await conn.execute(
			`UPDATE pagos SET estado_pago = 2, fecha_validacion = CURRENT_TIMESTAMP, validado_por = COALESCE(?, validado_por) WHERE id_cita = ?`,
			[validadorCancel, id_cita],
		);
		// Eliminar el ingreso en facturación asociado al pago de esta cita
		await conn.execute(
			`DELETE f FROM fac_movimiento f
			 INNER JOIN pagos p ON p.id_pago = f.origen_id AND f.origen_modulo = 'CITA_PAGO'
			 WHERE p.id_cita = ?`,
			[id_cita],
		);

		const { id_disponibilidad, fecha_cita } = rows[0];
		if (
			id_disponibilidad &&
			fecha_cita >= new Date().toISOString().slice(0, 10)
		) {
			await conn.execute(
				"UPDATE disponibilidad SET estado = 1 WHERE id_disponibilidad = ? AND estado = 4",
				[id_disponibilidad],
			);
		}

		await conn.commit();
		return { id_cita, estado_cita: 2 };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

const markCitaAtendidaController = async ({ id_cita, userId, role }) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();
		const [rows] = await conn.execute(
			`SELECT id_especialista, id_paciente, fecha_cita, estado_cita, id_eco
       FROM cita
       WHERE id_cita = ?
       FOR UPDATE`,
			[id_cita],
		);
		if (!rows.length) {
			const err = new Error("Cita no encontrada");
			err.code = "NOT_FOUND";
			throw err;
		}
		const cita = rows[0];
		const autorizado =
			role === "admin" || role === "moderador"
				? true
				: role === "paciente"
					? cita.id_paciente === userId
					: cita.id_especialista === userId;
		if (!autorizado) {
			const err = new Error("No autorizado");
			err.code = "FORBIDDEN";
			throw err;
		}
		if (cita.estado_cita === 2) {
			const err = new Error("Cita cancelada");
			err.code = "INVALID_STATE";
			throw err;
		}
		if (cita.estado_cita === 3) {
			const err = new Error("Cita ya fue atendida");
			err.code = "INVALID_STATE";
			throw err;
		}
		const today = new Date().toISOString().slice(0, 10);
		if (cita.fecha_cita > today) {
			const err = new Error("No se puede atender una cita futura");
			err.code = "FUTURE_DATE";
			throw err;
		}

		await conn.execute("UPDATE cita SET estado_cita = 3 WHERE id_cita = ?", [
			id_cita,
		]);

		const [insumos] = await conn.execute(
			`SELECT ei.id_producto, ei.cantidad, p.stock_base_total, p.consumo_actual, p.factor_conversion
			 FROM inv_eco_insumo ei
			 INNER JOIN inv_producto p ON p.id_producto = ei.id_producto
			 WHERE ei.id_eco = ?
			 FOR UPDATE`,
			[cita.id_eco]
		);

		for (const ins of insumos) {
			const cantidadDescontar = Number(ins.cantidad);
			const stockBase = Number(ins.stock_base_total);
			const consumoActual = Number(ins.consumo_actual || 0);
			const factorConversion = Number(ins.factor_conversion > 0 ? ins.factor_conversion : 1);

			// New logic: directly subtract from stock_base_total
			let nuevoConsumo = consumoActual + cantidadDescontar;
			let nuevoStock = stockBase - cantidadDescontar;

			// 1) Actualizar stock base y consumo
			await conn.execute(
				"UPDATE inv_producto SET stock_base_total = ?, consumo_actual = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id_producto = ?",
				[nuevoStock, nuevoConsumo, ins.id_producto]
			);

			// 2) Registrar consumo global
			const id_consumo = crypto.randomUUID();
			await conn.execute(
				"INSERT INTO inv_cita_consumo (id_consumo, id_cita, id_producto, cantidad) VALUES (?, ?, ?, ?)",
				[id_consumo, id_cita, ins.id_producto, cantidadDescontar]
			);

			// 3) Registrar en Kardex
			const id_kardex = crypto.randomUUID();
			await conn.execute(
				`INSERT INTO inv_kardex 
				(id_kardex, id_producto, tipo_movimiento, cantidad, stock_anterior, stock_posterior, referencia_tipo, referencia_id, id_usuario, observaciones)
				VALUES (?, ?, 'SALIDA', ?, ?, ?, 'CITA', ?, ?, ?)`,
				[
					id_kardex,
					ins.id_producto,
					cantidadDescontar,
					stockBase,
					nuevoStock,
					id_cita,
					userId,
					`Consumo cita: ${cantidadDescontar} unidades base`
				]
			);
		}

		await conn.commit();
		return { id_cita, estado_cita: 3 };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

// Verificar si el paciente (o sus representados) tiene alguna cita con pago pendiente de verificación
const tienePagoPendienteController = async (id_paciente) => {
	const [rows] = await pool.execute(
		`SELECT 1 FROM cita
     WHERE id_paciente = ? AND estado_pago = 0 AND estado_cita IN (0, 1)
     LIMIT 1`,
		[id_paciente],
	);
	return rows.length > 0;
};

// Listar citas pendientes de pago para moderador
const listCitasPendientesPagoController = async () => {
	const sql = `
    SELECT
      c.id_cita,
      c.id_paciente,
      c.id_representado,
      c.id_especialista,
      c.id_eco,
			c.origen_cita,
      c.fecha_cita,
      c.hora_cita,
      c.estado_cita,
      c.estado_pago,
      c.id_disponibilidad,
      c.orden,
			COALESCE(cm.nombre, u_paciente.nombre) AS paciente_nombre,
			COALESCE(cm.apellido, u_paciente.apellido) AS paciente_apellido,
			COALESCE(cm.cedula, u_paciente.cedula) AS paciente_cedula,
      u_paciente.telefono AS paciente_telefono,
      u_especialista.nombre AS especialista_nombre,
      u_especialista.apellido AS especialista_apellido,
      e.nombre AS eco_nombre,
      p.monto AS pago_monto,
      p.monto_usd AS pago_monto_usd,
      p.monto_bs AS pago_monto_bs,
      p.tasa_dia_bcv AS pago_tasa_dia_bcv,
      p.metodo AS pago_metodo
    FROM cita c
    INNER JOIN usuario u_paciente ON u_paciente.id_usuario = c.id_paciente
		LEFT JOIN cita_mostrador cm ON cm.id_cita = c.id_cita
    INNER JOIN usuario u_especialista ON u_especialista.id_usuario = c.id_especialista
    INNER JOIN eco e ON e.id_eco = c.id_eco
    LEFT JOIN pagos p ON p.id_cita = c.id_cita
    WHERE c.origen_cita = 'web'
      AND c.estado_pago = 0
      AND c.estado_cita IN (0, 1)
    ORDER BY c.fecha_cita ASC, c.hora_cita ASC
  `;
	const [rows] = await pool.execute(sql);
	return rows;
};

// Listar todas las citas con pagos para moderador (para verificación de pagos)
const listCitasConPagosController = async () => {
	const sql = `
    SELECT
      c.id_cita,
      c.id_paciente,
      c.id_representado,
      c.id_especialista,
      c.id_eco,
			c.origen_cita,
      c.fecha_cita,
      c.hora_cita,
      c.estado_cita,
      c.estado_pago,
      c.id_disponibilidad,
      c.orden,
			COALESCE(cm.nombre, u_paciente.nombre) AS paciente_nombre,
			COALESCE(cm.apellido, u_paciente.apellido) AS paciente_apellido,
			COALESCE(cm.cedula, u_paciente.cedula) AS paciente_cedula,
      u_paciente.telefono AS paciente_telefono,
      u_especialista.nombre AS especialista_nombre,
      u_especialista.apellido AS especialista_apellido,
      e.nombre AS eco_nombre
    FROM cita c
    INNER JOIN usuario u_paciente ON u_paciente.id_usuario = c.id_paciente
		LEFT JOIN cita_mostrador cm ON cm.id_cita = c.id_cita
    INNER JOIN usuario u_especialista ON u_especialista.id_usuario = c.id_especialista
    INNER JOIN eco e ON e.id_eco = c.id_eco
    WHERE c.origen_cita = 'web'
      AND EXISTS (
      SELECT 1 FROM pagos p WHERE p.id_cita = c.id_cita
    )
    ORDER BY c.fecha_cita DESC, c.hora_cita DESC
  `;
	const [rows] = await pool.execute(sql);
	return rows;
};

// Aprobar o rechazar pago de una cita
const updateEstadoPagoController = async ({
	id_cita,
	estado_pago,
	aprobado_por,
	motivo_rechazo = null,
}) => {
	const conn = await pool.getConnection();
	let emailPayload = null;
	try {
		await conn.beginTransaction();

		const [rows] = await conn.execute(
			`SELECT c.estado_cita, c.estado_pago, c.id_paciente, c.id_representado,
		c.fecha_cita, c.hora_cita, e.nombre AS eco_nombre,
		u_paciente.correo AS paciente_correo,
		u_paciente.nombre AS paciente_nombre,
		u_paciente.apellido AS paciente_apellido,
		u_esp.nombre AS especialista_nombre, u_esp.apellido AS especialista_apellido
	FROM cita c
	LEFT JOIN eco e ON e.id_eco = c.id_eco
	INNER JOIN usuario u_paciente ON u_paciente.id_usuario = c.id_paciente
	INNER JOIN usuario u_esp ON u_esp.id_usuario = c.id_especialista
	WHERE c.id_cita = ?
	FOR UPDATE`,
			[id_cita],
		);
		if (!rows.length) {
			const err = new Error("Cita no encontrada");
			err.code = "NOT_FOUND";
			throw err;
		}
		const cita = rows[0];
		if (cita.estado_cita === 2) {
			const err = new Error(
				"No se puede actualizar el pago de una cita cancelada",
			);
			err.code = "INVALID_STATE";
			throw err;
		}

		// Si se aprueba el pago (estado_pago = 1) y la cita está pendiente (estado_cita = 0), aprobarla también
		let nuevoEstadoCita = cita.estado_cita;
		if (estado_pago === 1 && cita.estado_cita === 0) {
			nuevoEstadoCita = 1; // Aprobar la cita
		}

		const estadoPagoAnterior = Number(cita.estado_pago);
		const aprobadorValido = await resolveExistingUsuarioId(conn, aprobado_por);

		await conn.execute(
			"UPDATE cita SET estado_pago = ?, estado_cita = ? WHERE id_cita = ?",
			[estado_pago, nuevoEstadoCita, id_cita],
		);

		// Sincronizar estado en la tabla pagos para que "Detalles del pago" muestre el estado correcto
		if (estado_pago === 1) {
			await conn.execute(
				`UPDATE pagos SET estado_pago = ?, fecha_validacion = CURRENT_TIMESTAMP, validado_por = ? WHERE id_cita = ?`,
				[estado_pago, aprobadorValido, id_cita],
			);
		} else if (estado_pago === 2) {
			await conn.execute(
				`UPDATE pagos SET estado_pago = ?, fecha_validacion = CURRENT_TIMESTAMP, validado_por = ? WHERE id_cita = ?`,
				[estado_pago, aprobadorValido, id_cita],
			);
			await conn.execute(
				`DELETE f FROM fac_movimiento f
				 INNER JOIN pagos p ON p.id_pago = f.origen_id AND f.origen_modulo = 'CITA_PAGO'
				 WHERE p.id_cita = ?`,
				[id_cita],
			);
		} else {
			await conn.execute("UPDATE pagos SET estado_pago = ? WHERE id_cita = ?", [
				estado_pago,
				id_cita,
			]);
			await conn.execute(
				`DELETE f FROM fac_movimiento f
				 INNER JOIN pagos p ON p.id_pago = f.origen_id AND f.origen_modulo = 'CITA_PAGO'
				 WHERE p.id_cita = ?`,
				[id_cita],
			);
		}

		if (estado_pago === 1 && estadoPagoAnterior !== 1) {
			const [comRows] = await conn.execute(
				`SELECT id_comision FROM esp_comision WHERE id_cita = ? LIMIT 1`,
				[id_cita],
			);

			if (!comRows.length) {
				await conn.execute(
					`INSERT INTO esp_comision
						(id_comision, id_cita, id_especialista, porcentaje, monto, estado, fecha_creacion, fecha_pago, id_usuario)
					 SELECT
						UUID(),
						c.id_cita,
						c.id_especialista,
						esp.porcentaje,
						ROUND((eco.precio * esp.porcentaje) / 100, 2) AS monto,
						'Pendiente',
						NOW(),
						NULL,
						?
					 FROM cita c
					 INNER JOIN especialista esp ON esp.id_especialista = c.id_especialista
					 INNER JOIN eco eco ON eco.id_eco = c.id_eco
					 WHERE c.id_cita = ?`,
					[aprobado_por || cita.id_paciente, id_cita],
				);
			}

			const [pagoRows] = await conn.execute(
				`SELECT id_pago, monto, monto_usd, monto_bs, tasa_dia_bcv, referencia, metodo FROM pagos WHERE id_cita = ? LIMIT 1`,
				[id_cita]
			);
			if (pagoRows.length) {
				const pago = pagoRows[0];
				const [facRows] = await conn.execute(`SELECT id_movimiento FROM fac_movimiento WHERE origen_id = ? AND origen_modulo = 'CITA_PAGO'`, [pago.id_pago]);
				if (!facRows.length) {
					await conn.execute(
						`INSERT INTO fac_movimiento
							(id_movimiento, tipo, fecha, monto, monto_usd, monto_bs, tasa_dia_bcv, descripcion, referencia, origen_modulo, origen_id, id_usuario, creado_en)
						VALUES
							(UUID(), 'Ingreso', CURRENT_DATE(), ?, ?, ?, ?, ?, ?, 'CITA_PAGO', ?, ?, NOW())`,
						[
							pago.monto,
							pago.monto_usd,
							pago.monto_bs,
							pago.tasa_dia_bcv,
							`Pago de cita web - ${cita.paciente_nombre || ''}`,
							pago.referencia || pago.id_pago,
							pago.id_pago,
							aprobadorValido || cita.id_paciente,
						]
					);
				}
			}

			if (cita.paciente_correo) {
				const fecha = formatFechaCita(cita.fecha_cita);
				const hora = formatHoraCita(cita.hora_cita);
				const ecoNombre = cita.eco_nombre ? ` (${cita.eco_nombre})` : "";
				const subject = "Pago aprobado - Garbis";
				const html = `
          <p>Hola ${cita.paciente_nombre || ""},</p>
          <p>Tu pago para la cita ${fecha} ${hora}${ecoNombre} fue aprobado.</p>
          <p>Gracias por tu confianza.</p>
        `;
				const text = `Hola ${cita.paciente_nombre || ""},\n\nTu pago para la cita ${fecha} ${hora}${ecoNombre} fue aprobado.\n\nGracias por tu confianza.`;
				emailPayload = {
					to: cita.paciente_correo,
					subject,
					html,
					text,
				};
			}

			// Notificación al paciente: pago aprobado
			if (cita.id_paciente) {
				const fecha = formatFechaCita(cita.fecha_cita);
				const hora = formatHoraCita(cita.hora_cita);
				const ecoNombre = cita.eco_nombre ? ` (${cita.eco_nombre})` : "";
				const espNombre = [cita.especialista_nombre, cita.especialista_apellido].filter(Boolean).join(" ") || "Especialista";
				let mensaje = `Tu pago para la cita con ${espNombre}${ecoNombre} el ${fecha} a las ${hora} fue aprobado. Cita confirmada.`;
				if (mensaje.length > 255) mensaje = `${mensaje.slice(0, 252)}...`;
				await conn.execute(
					`INSERT INTO notificacion (id_notificacion, id_usuario, titulo, mensaje, tipo, leida)
           VALUES (?, ?, ?, ?, ?, 0)`,
					[
						crypto.randomUUID(),
						cita.id_paciente,
						"Pago aprobado",
						mensaje,
						"pago_aprobado",
					],
				);
			}
		}

		// Crear notificación si el pago fue rechazado
		if (estado_pago === 2 && cita.id_paciente) {
			const titulo = "Pago rechazado";
			const fecha = formatFechaCita(cita.fecha_cita);
			const hora = formatHoraCita(cita.hora_cita);
			const ecoNombre = cita.eco_nombre ? ` (${cita.eco_nombre})` : "";
			const espNombre = [cita.especialista_nombre, cita.especialista_apellido].filter(Boolean).join(" ") || "Especialista";
			const motivo = motivo_rechazo ? motivo_rechazo.trim() : "";
			let mensaje = `Tu pago para la cita con ${espNombre}${ecoNombre} el ${fecha} a las ${hora} fue rechazado. Motivo: ${motivo}.`;
			if (mensaje.length > 255) {
				mensaje = `${mensaje.slice(0, 252)}...`;
			}
			await conn.execute(
				`INSERT INTO notificacion (id_notificacion, id_usuario, titulo, mensaje, tipo, leida)
         VALUES (?, ?, ?, ?, ?, 0)`,
				[
					crypto.randomUUID(),
					cita.id_paciente,
					titulo,
					mensaje,
					"pago_rechazado",
				],
			);

			if (cita.paciente_correo) {
				const subject = "Pago rechazado - Garbis";
				const html = `
          <p>Hola ${cita.paciente_nombre || ""},</p>
          <p>Tu pago para la cita ${fecha} ${hora}${ecoNombre} fue rechazado.</p>
          <p>Motivo: ${motivo || "No especificado"}</p>
        `;
				const text = `Hola ${cita.paciente_nombre || ""},\n\nTu pago para la cita ${fecha} ${hora}${ecoNombre} fue rechazado.\nMotivo: ${motivo || "No especificado"}`;
				emailPayload = {
					to: cita.paciente_correo,
					subject,
					html,
					text,
				};
			}
		}

		// Si se rechaza el pago, crear notificación para el paciente/representado
		if (estado_pago === 2 && motivo_rechazo) {
			const id_usuario = cita.representado_usuario || cita.paciente_usuario;
			if (id_usuario) {
				const id_notificacion = crypto.randomUUID();
				await conn.execute(
					`INSERT INTO notificacion (id_notificacion, id_usuario, titulo, mensaje, tipo, leida)
           VALUES (?, ?, ?, ?, ?, ?)`,
					[
						id_notificacion,
						id_usuario,
						"Pago rechazado",
						motivo_rechazo,
						"rechazo_pago",
						0,
					],
				);
			}
		}

		await conn.commit();

		if (emailPayload) {
			try {
				await sendEmail(emailPayload);
			} catch (emailErr) {
				console.error("Error enviando correo de pago:", emailErr);
			}
		}
		return { id_cita, estado_pago, estado_cita: nuevoEstadoCita };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

// Obtener todas las citas de un día específico (para moderador)
const listCitasByFechaController = async (fecha) => {
	const sql = `
    SELECT
      c.id_cita,
      c.id_paciente,
      c.id_representado,
      c.id_especialista,
      c.id_eco,
			c.origen_cita,
      c.fecha_cita,
      c.hora_cita,
      c.estado_cita,
      c.estado_pago,
      c.id_disponibilidad,
      c.orden,
			COALESCE(cm.nombre, u_paciente.nombre) AS paciente_nombre,
			COALESCE(cm.apellido, u_paciente.apellido) AS paciente_apellido,
			COALESCE(cm.cedula, u_paciente.cedula) AS paciente_cedula,
      u_paciente.telefono AS paciente_telefono,
      u_especialista.nombre AS especialista_nombre,
      u_especialista.apellido AS especialista_apellido,
      e.nombre AS eco_nombre
    FROM cita c
    INNER JOIN usuario u_paciente ON u_paciente.id_usuario = c.id_paciente
		LEFT JOIN cita_mostrador cm ON cm.id_cita = c.id_cita
    INNER JOIN usuario u_especialista ON u_especialista.id_usuario = c.id_especialista
    INNER JOIN eco e ON e.id_eco = c.id_eco
    WHERE c.fecha_cita = ?
    ORDER BY c.hora_cita ASC
  `;
	const [rows] = await pool.execute(sql, [fecha]);
	return rows;
};

// Posponer cita (actualizar fecha/hora y opcionalmente especialista/disponibilidad)
const posponerCitaController = async ({
	id_cita,
	fecha_cita,
	hora_cita,
	id_especialista,
	id_disponibilidad,
	gestionado_por = null,
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// Verificar que la cita existe y no está cancelada o atendida
		const [rows] = await conn.execute(
			`SELECT estado_cita, estado_pago, fecha_cita, hora_cita, id_disponibilidad, id_eco
       FROM cita
       WHERE id_cita = ?
       FOR UPDATE`,
			[id_cita],
		);
		if (!rows.length) {
			const err = new Error("Cita no encontrada");
			err.code = "NOT_FOUND";
			throw err;
		}

		const cita = rows[0];
		if (cita.estado_cita === 2) {
			const err = new Error("No se puede posponer una cita cancelada");
			err.code = "INVALID_STATE";
			throw err;
		}
		if (cita.estado_cita === 3) {
			const err = new Error("No se puede posponer una cita ya atendida");
			err.code = "INVALID_STATE";
			throw err;
		}

		let targetFecha = fecha_cita;
		let targetHora = hora_cita;
		let targetEspecialista = id_especialista || null;
		let targetDisponibilidad = id_disponibilidad || null;

		if (id_disponibilidad) {
			const [dispRows] = await conn.execute(
				`SELECT id_disponibilidad, id_especialista, id_eco, fecha, hora_inicio, estado
         FROM disponibilidad
         WHERE id_disponibilidad = ?
         FOR UPDATE`,
				[id_disponibilidad],
			);

			if (!dispRows.length) {
				const err = new Error("Disponibilidad seleccionada no encontrada");
				err.code = "NOT_FOUND";
				throw err;
			}

			const disponibilidad = dispRows[0];
			if (![0, 1, 4].includes(Number(disponibilidad.estado))) {
				const err = new Error(
					"La disponibilidad seleccionada no puede usarse para posponer",
				);
				err.code = "INVALID_STATE";
				throw err;
			}

			if (
				Number(disponibilidad.estado) === 4 &&
				cita.id_disponibilidad !== disponibilidad.id_disponibilidad
			) {
				const err = new Error(
					"La disponibilidad seleccionada ya está reservada",
				);
				err.code = "INVALID_STATE";
				throw err;
			}

			if (
				cita.id_eco &&
				disponibilidad.id_eco &&
				cita.id_eco !== disponibilidad.id_eco
			) {
				const err = new Error(
					"La disponibilidad seleccionada no corresponde al eco de la cita",
				);
				err.code = "INVALID_STATE";
				throw err;
			}

			if (
				id_especialista &&
				disponibilidad.id_especialista !== id_especialista
			) {
				const err = new Error(
					"La disponibilidad no pertenece al especialista seleccionado",
				);
				err.code = "INVALID_STATE";
				throw err;
			}

			targetFecha = disponibilidad.fecha;
			targetHora = disponibilidad.hora_inicio;
			targetEspecialista = disponibilidad.id_especialista;
			targetDisponibilidad = disponibilidad.id_disponibilidad;
		}

		// Validar que la nueva fecha no sea en el pasado
		const today = new Date().toISOString().slice(0, 10);
		const nowTime = new Date().toTimeString().slice(0, 8);
		if (targetFecha < today) {
			const err = new Error("No se puede posponer una cita a una fecha pasada");
			err.code = "PAST_DATE";
			throw err;
		}
		if (targetFecha === today && targetHora <= nowTime) {
			const err = new Error("No se puede posponer una cita a una hora pasada");
			err.code = "PAST_DATE";
			throw err;
		}

		if (
			targetDisponibilidad &&
			cita.id_disponibilidad &&
			cita.id_disponibilidad !== targetDisponibilidad
		) {
			await conn.execute(
				"UPDATE disponibilidad SET estado = 1 WHERE id_disponibilidad = ? AND estado = 4",
				[cita.id_disponibilidad],
			);
		}

		if (targetDisponibilidad) {
			await conn.execute(
				"UPDATE disponibilidad SET estado = 4 WHERE id_disponibilidad = ? AND estado IN (0, 1)",
				[targetDisponibilidad],
			);
		}

		// Actualizar fecha, hora y opcionalmente especialista/disponibilidad
		await conn.execute(
			`UPDATE cita
       SET fecha_cita = ?,
           hora_cita = ?,
           id_especialista = COALESCE(?, id_especialista),
           id_disponibilidad = COALESCE(?, id_disponibilidad)
       WHERE id_cita = ?`,
			[
				targetFecha,
				targetHora,
				targetEspecialista,
				targetDisponibilidad,
				id_cita,
			],
		);

		const validadorPosponer = await resolveExistingUsuarioId(conn, gestionado_por);
		await conn.execute(
			`UPDATE pagos SET fecha_validacion = CURRENT_TIMESTAMP, validado_por = COALESCE(?, validado_por) WHERE id_cita = ?`,
			[validadorPosponer, id_cita],
		);

		await conn.commit();
		return {
			id_cita,
			fecha_cita: targetFecha,
			hora_cita: targetHora,
			id_especialista: targetEspecialista,
			id_disponibilidad: targetDisponibilidad,
		};
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

// Conteo de pagos web con marca de gestión el día calendario actual (aprobación, rechazo, cancelación, posponer, etc.)
const countPagosGestionadosHoyController = async () => {
	const sql = `
    SELECT COUNT(*) AS total
    FROM pagos p
    INNER JOIN cita c ON c.id_cita = p.id_cita
    WHERE c.origen_cita = 'web'
      AND p.fecha_validacion IS NOT NULL
      AND DATE(p.fecha_validacion) = CURDATE()
  `;
	const [rows] = await pool.execute(sql);
	return Number(rows[0]?.total ?? 0);
};

// Obtener una cita por ID con todos los datos relacionados
const getCitaByIdController = async (id_cita) => {
	const sql = `
    SELECT
      c.id_cita,
      c.id_paciente,
      c.id_representado,
      c.id_especialista,
      c.id_eco,
	c.origen_cita,
      c.fecha_cita,
      c.hora_cita,
      c.estado_cita,
      c.estado_pago,
      c.id_disponibilidad,
      c.orden,
      c.creada_en,
      -- Datos del paciente
	COALESCE(cm.nombre, u_paciente.nombre) AS paciente_nombre,
	COALESCE(cm.apellido, u_paciente.apellido) AS paciente_apellido,
	COALESCE(cm.cedula, u_paciente.cedula) AS paciente_cedula,
      u_paciente.telefono AS paciente_telefono,
	CASE WHEN c.origen_cita = 'mostrador' THEN NULL ELSE u_paciente.correo END AS paciente_correo,
      u_paciente.fecha_nacimiento AS paciente_fecha_nacimiento,
      p.tipo_sangre AS paciente_tipo_sangre,
	COALESCE(cm.rif, p.rif) AS paciente_rif,
      p.contacto_emergencia_nombre AS paciente_contacto_nombre,
      p.contacto_emergencia_telefono AS paciente_contacto_telefono,
      -- Datos del especialista
      u_especialista.nombre AS especialista_nombre,
      u_especialista.apellido AS especialista_apellido,
      u_especialista.cedula AS especialista_cedula,
      u_especialista.telefono AS especialista_telefono,
      u_especialista.correo AS especialista_correo,
      esp.codigo_colegiatura AS especialista_codigo_colegiatura,
      es.nombre AS especialidad_nombre,
      -- Datos del eco
      e.nombre AS eco_nombre,
      e.precio AS eco_precio,
      e.duracion_min AS eco_duracion_min,
      -- Datos del representado (si existe)
      r.nombre AS representado_nombre,
      r.apellido AS representado_apellido,
      r.cedula AS representado_cedula,
      r.fecha_nacimiento AS representado_fecha_nacimiento,
      r.parentesco AS representado_parentesco,
      -- Datos del pago (si existe)
      pag.id_pago,
      pag.metodo AS pago_metodo,
      pag.imagen AS pago_imagen,
      pag.banco_origen AS pago_banco_origen,
      pag.banco_destino AS pago_banco_destino,
      pag.monto AS pago_monto,
      pag.monto_usd AS pago_monto_usd,
      pag.monto_bs AS pago_monto_bs,
      pag.tasa_dia_bcv AS pago_tasa_dia_bcv,
      pag.cedula_pagador AS pago_cedula_pagador,
      pag.telefono_pagador AS pago_telefono_pagador,
      pag.referencia AS pago_referencia,
      pag.estado_pago AS pago_estado_pago,
      pag.fecha_pago AS pago_fecha_pago,
      pag.fecha_validacion AS pago_fecha_validacion,
      pag.validado_por AS pago_validado_por,
      u_validador.nombre AS pago_validado_por_nombre,
      u_validador.apellido AS pago_validado_por_apellido
    FROM cita c
    INNER JOIN usuario u_paciente ON u_paciente.id_usuario = c.id_paciente
    INNER JOIN paciente p ON p.id_paciente = c.id_paciente
	LEFT JOIN cita_mostrador cm ON cm.id_cita = c.id_cita
    INNER JOIN usuario u_especialista ON u_especialista.id_usuario = c.id_especialista
    INNER JOIN especialista esp ON esp.id_especialista = c.id_especialista
    INNER JOIN especialidad es ON es.id_especialidad = esp.id_especialidad
    INNER JOIN eco e ON e.id_eco = c.id_eco
    LEFT JOIN representado r ON r.id_representado = c.id_representado
    LEFT JOIN pagos pag ON pag.id_cita = c.id_cita
    LEFT JOIN usuario u_validador ON u_validador.id_usuario = pag.validado_por
    WHERE c.id_cita = ?
    LIMIT 1
  `;
	const [rows] = await pool.execute(sql, [id_cita]);
	return rows.length > 0 ? rows[0] : null;
};

// Obtener todas las citas con toda la información (para vista general)
const getAllCitasController = async () => {
	const sql = `
    SELECT
      c.id_cita,
      c.id_paciente,
      c.id_representado,
      c.id_especialista,
      c.id_eco,
	c.origen_cita,
      c.fecha_cita,
      c.hora_cita,
      c.estado_cita,
      c.estado_pago,
      c.id_disponibilidad,
      c.orden,
      c.creada_en,
      -- Datos del paciente
	COALESCE(cm.nombre, u_paciente.nombre) AS paciente_nombre,
	COALESCE(cm.apellido, u_paciente.apellido) AS paciente_apellido,
	COALESCE(cm.cedula, u_paciente.cedula) AS paciente_cedula,
      u_paciente.telefono AS paciente_telefono,
	CASE WHEN c.origen_cita = 'mostrador' THEN NULL ELSE u_paciente.correo END AS paciente_correo,
      -- Datos del especialista
      u_especialista.nombre AS especialista_nombre,
      u_especialista.apellido AS especialista_apellido,
      u_especialista.cedula AS especialista_cedula,
      u_especialista.telefono AS especialista_telefono,
      esp.codigo_colegiatura AS especialista_codigo_colegiatura,
      es.nombre AS especialidad_nombre,
      -- Datos del eco
      e.nombre AS eco_nombre,
      e.precio AS eco_precio,
      e.duracion_min AS eco_duracion_min,
      -- Datos del representado (si existe)
      r_rep.nombre AS representado_nombre,
      r_rep.apellido AS representado_apellido,
      r_rep.cedula AS representado_cedula,
      r_rep.fecha_nacimiento AS representado_fecha_nacimiento,
      r_rep.parentesco AS representado_parentesco,
      -- Datos del resultado (si existe)
      res.archivo AS resultado_archivo,
      res.study_uid AS resultado_study_uid,
      res.estado_resultado AS resultado_estado,
      res.fecha_publicacion AS resultado_fecha_publicacion,
      -- Datos del informe (si existe)
      inf.id_informe,
      inf.reseña AS informe_reseña,
      inf.recomendaciones AS informe_recomendaciones,
      inf.informe_pdf_url AS informe_pdf_url,
      inf.fecha_creacion AS informe_fecha_creacion,
      -- Datos del pago (si existe)
      pag.id_pago,
      pag.metodo AS pago_metodo,
      pag.imagen AS pago_imagen,
      pag.banco_origen AS pago_banco_origen,
      pag.banco_destino AS pago_banco_destino,
      pag.monto AS pago_monto,
      pag.monto_usd AS pago_monto_usd,
      pag.monto_bs AS pago_monto_bs,
      pag.tasa_dia_bcv AS pago_tasa_dia_bcv,
      pag.cedula_pagador AS pago_cedula_pagador,
      pag.telefono_pagador AS pago_telefono_pagador,
      pag.referencia AS pago_referencia,
      pag.fecha_pago AS pago_fecha_pago,
      pag.fecha_validacion AS pago_fecha_validacion,
      pag.validado_por AS pago_validado_por,
      u_validador.nombre AS pago_validado_por_nombre,
      u_validador.apellido AS pago_validado_por_apellido
    FROM cita c
    INNER JOIN usuario u_paciente ON u_paciente.id_usuario = c.id_paciente
    INNER JOIN paciente p ON p.id_paciente = c.id_paciente
	LEFT JOIN cita_mostrador cm ON cm.id_cita = c.id_cita
    INNER JOIN usuario u_especialista ON u_especialista.id_usuario = c.id_especialista
    INNER JOIN especialista esp ON esp.id_especialista = c.id_especialista
    INNER JOIN especialidad es ON es.id_especialidad = esp.id_especialidad
    INNER JOIN eco e ON e.id_eco = c.id_eco
    LEFT JOIN representado r_rep ON r_rep.id_representado = c.id_representado
    LEFT JOIN resultado res ON res.id_cita = c.id_cita
    LEFT JOIN informe inf ON inf.id_cita = c.id_cita
    LEFT JOIN pagos pag ON pag.id_cita = c.id_cita
    LEFT JOIN usuario u_validador ON u_validador.id_usuario = pag.validado_por
    WHERE (c.origen_cita = 'web' OR c.origen_cita = 'mostrador')
    ORDER BY c.fecha_cita DESC, c.hora_cita DESC
  `;
	const [rows] = await pool.execute(sql);
	return rows;
};

const createCitaMostradorController = async ({
	id_especialista,
	id_eco,
	fecha_cita,
	hora_cita,
	metodo,
	monto,
	tasa_dia_bcv,
	nombre,
	apellido,
	cedula,
	rif,
	id_usuario,
	referencia,
	id_paciente: id_paciente_titular,
	id_representado,
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// ── REGLA 1: Validación de fechas y horas pasadas
		if (!fecha_cita) {
			const err = new Error("La fecha de la cita es requerida.");
			err.code = "INVALID_DATE";
			throw err;
		}
		
		const rawHora = String(hora_cita || "").trim() || new Date().toTimeString().slice(0, 8);
		const horaFinal = /^\d{1,2}:\d{2}(:\d{2})?$/.test(rawHora)
			? String(rawHora).trim().padEnd(8, ":00").slice(0, 8)
			: rawHora;

		const hoy = new Date();
		// Ajustar a medianoche local para comparar solo fechas
		const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
		
		if (fecha_cita < hoyStr) {
			const err = new Error("No se pueden agendar citas en fechas pasadas.");
			err.code = "PAST_DATE";
			throw err;
		}

		if (fecha_cita === hoyStr) {
			const currentHoraStr = hoy.toTimeString().slice(0, 8);
			if (horaFinal <= currentHoraStr) {
				const err = new Error("No se pueden agendar citas en horas que ya han transcurrido hoy.");
				err.code = "PAST_TIME";
				throw err;
			}
		}

		const montoValue = Number(monto);
		const tasaValue = Number(tasa_dia_bcv);
		if (!Number.isFinite(montoValue) || montoValue <= 0) {
			const err = new Error("Monto inválido");
			err.code = "INVALID_AMOUNT";
			throw err;
		}
		if (!Number.isFinite(tasaValue) || tasaValue <= 0) {
			const err = new Error("Tasa BCV inválida");
			err.code = "INVALID_RATE";
			throw err;
		}

		const [espRows] = await conn.execute(
			"SELECT id_especialista, porcentaje FROM especialista WHERE id_especialista = ? LIMIT 1",
			[id_especialista],
		);
		if (!espRows.length) {
			const err = new Error("Especialista no encontrado");
			err.code = "NOT_FOUND";
			throw err;
		}

		const [ecoRows] = await conn.execute(
			"SELECT id_eco, precio FROM eco WHERE id_eco = ? AND activo = 1 LIMIT 1",
			[id_eco],
		);
		if (!ecoRows.length) {
			const err = new Error("Eco no encontrado o inactivo");
			err.code = "NOT_FOUND";
			throw err;
		}

		const [espEcoRows] = await conn.execute(
			"SELECT id_especialista FROM especialista_eco WHERE id_especialista = ? AND id_eco = ? LIMIT 1",
			[id_especialista, id_eco],
		);
		if (!espEcoRows.length) {
			const err = new Error("El especialista no tiene asignado este eco");
			err.code = "ECO_NOT_AVAILABLE";
			throw err;
		}

		// Validar stock de insumos antes de agendar
		const stockCheck = await validarStockParaCitaController(id_eco);
		if (!stockCheck.ok) {
			const faltantesMsg = stockCheck.faltantes
				.map(f => `${f.producto}: necesita ${f.requerido}, disponible ${f.disponible}`)
				.join("; ");
			const err = new Error(`Stock insuficiente para agendar: ${faltantesMsg}`);
			err.code = "STOCK_INSUFICIENTE";
			err.data = stockCheck.faltantes;
			throw err;
		}

		// Normalizar hora (bloques de 20 min): HH:MM o HH:MM:SS -> HH:MM:00 (hora_cita es obligatorio desde el handler)

		// ── REGLA 2: Bloquear si el paciente web ya tiene una cita activa pendiente de pago
		// Solo aplica cuando el moderador cargó un paciente ya registrado en el sistema.
		if (id_paciente_titular) {
			const [citaActivaRows] = await conn.execute(
				`SELECT 1 FROM cita
				 WHERE id_paciente = ?
				   AND estado_cita NOT IN (2, 3)
				   AND estado_pago = 0
				 LIMIT 1`,
				[id_paciente_titular],
			);
			if (citaActivaRows.length > 0) {
				const err = new Error("Este paciente ya tiene una cita en proceso pendiente de validación de pago.");
				err.code = "CITA_ACTIVA";
				throw err;
			}
		}

		// Verificar que no choque con otra cita del mismo especialista ese día (bloques de 20 min)
		const [conflictRows] = await conn.execute(
			`SELECT 1 FROM cita
       WHERE id_especialista = ? AND fecha_cita = ? AND estado_cita != 2
         AND hora_cita < ADDTIME(?, '00:20:00')
         AND ADDTIME(hora_cita, '00:20:00') > ?
       LIMIT 1`,
			[id_especialista, fecha_cita, horaFinal, horaFinal],
		);
		if (conflictRows.length > 0) {
			const err = new Error(
				"El horario elegido coincide con otra cita del especialista. Elige otro slot (bloques de 20 min).",
			);
			err.code = "CONFLICT_HORARIO";
			throw err;
		}

		// Mostrador: no crear usuario real. Si hay representado "fantasma" (id_paciente = mostrador) o de un titular ya registrado, usarlo.
		let id_paciente = null;
		let id_representado_final = null;
		if (id_paciente_titular) {
			if (id_representado) {
				const [repRows] = await conn.execute(
					`SELECT id_representado, id_paciente FROM representado WHERE id_representado = ? LIMIT 1`,
					[id_representado],
				);
				if (repRows.length) {
					const repPaciente = repRows[0].id_paciente;
					// Representado del paciente mostrador (fantasma): cita queda bajo mostrador
					if (repPaciente === MOSTRADOR_PACIENTE_ID) {
						await ensureMostradorPacienteBase(conn);
						id_paciente = MOSTRADOR_PACIENTE_ID;
						id_representado_final = id_representado;
					} else if (repPaciente === id_paciente_titular) {
						// Representado de un titular ya registrado: cita bajo ese paciente
						id_paciente = id_paciente_titular;
						id_representado_final = id_representado;
					}
				}
			} else {
				// Cita directa para un paciente/titular ya registrado en el sistema
				id_paciente = id_paciente_titular;
			}
		}
		if (id_paciente == null) {
			id_paciente = await ensureMostradorPacienteBase(conn);
		}
		let cedulaParaPago = cedula ? String(cedula).trim() : "";
		let rifParaMostrador = rif != null ? String(rif).trim() || null : null;
		if (id_representado_final && id_paciente && id_paciente !== MOSTRADOR_PACIENTE_ID && (!cedulaParaPago || !cedulaParaPago.replace(/\D/g, ""))) {
			const [titularRows] = await conn.execute(
				"SELECT cedula FROM usuario WHERE id_usuario = ? LIMIT 1",
				[id_paciente],
			);
			if (titularRows.length && titularRows[0].cedula) {
				cedulaParaPago = String(titularRows[0].cedula).trim();
			}
		}
		if (!cedulaParaPago) {
			const err = new Error("Se requiere la cédula del paciente o del titular (representado sin cédula).");
			err.code = "MISSING_CEDULA";
			throw err;
		}
		const usuarioValido =
			(await resolveExistingUsuarioId(conn, id_usuario)) || id_paciente;
		const id_cita = crypto.randomUUID();
		const id_pago = crypto.randomUUID();
		const id_comision = crypto.randomUUID();
		const metodoReal = String(metodo || "").trim() || "Transferencia";
		const referenciaPago =
			referencia || `MOST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
		const normalizedPago = normalizeCitaAmounts({
			montoInput: montoValue,
			metodo: metodoReal,
			tasaBcv: tasaValue,
		});

		await conn.execute(
			`INSERT INTO cita
				(id_cita, id_paciente, id_representado, id_especialista, id_eco, fecha_cita, hora_cita, orden, id_disponibilidad, origen_cita, estado_cita, estado_pago)
			VALUES
				(?, ?, ?, ?, ?, ?, ?, '', NULL, 'mostrador', 3, 1)`,
			[id_cita, id_paciente, id_representado_final, id_especialista, id_eco, fecha_cita, horaFinal],
		);

		await conn.execute(
			`INSERT INTO cita_mostrador
				(id_cita, nombre, apellido, cedula, rif)
			VALUES
				(?, ?, ?, ?, ?)`,
			[id_cita, nombre, apellido, cedulaParaPago, rifParaMostrador],
		);

		await conn.execute(
			`INSERT INTO pagos
				(id_pago, id_cita, id_paciente, metodo, imagen, banco_origen, banco_destino, monto, monto_usd, monto_bs, cedula_pagador, telefono_pagador, referencia, estado_pago, fecha_validacion, validado_por, tasa_dia_bcv)
			VALUES
				(?, ?, ?, ?, '', ?, 'Mostrador', ?, ?, ?, ?, '0000000000', ?, 1, CURRENT_TIMESTAMP, ?, ?)`,
			[
				id_pago,
				id_cita,
				id_paciente,
				metodoReal,
				`Mostrador-${metodoReal}`,
				montoValue,
				normalizedPago.monto_usd,
				normalizedPago.monto_bs,
				cedulaParaPago,
				referenciaPago,
				usuarioValido,
				normalizedPago.tasa_dia_bcv,
			],
		);

		const porcentaje = Number(espRows[0].porcentaje || 0);
		const ecoPrecio = Number(ecoRows[0].precio || 0);
		const montoComision = Number(((ecoPrecio * porcentaje) / 100).toFixed(2));

		await conn.execute(
			`INSERT INTO esp_comision
				(id_comision, id_cita, id_especialista, porcentaje, monto, estado, fecha_creacion, fecha_pago, id_usuario)
			VALUES
				(?, ?, ?, ?, ?, 'Pendiente', NOW(), NULL, ?)`,
			[
				id_comision,
				id_cita,
				id_especialista,
				porcentaje,
				montoComision,
				usuarioValido,
			],
		);

		// ── CONSUMO DE INVENTARIO ──
		// Como la cita de mostrador se registra como atendida (estado_cita = 3) inmediatamente,
		// debemos generar el consumo de inventario de sus insumos correspondientes.
		const [insumos] = await conn.execute(
			`SELECT ei.id_producto, ei.cantidad, p.stock_base_total, p.consumo_actual, p.factor_conversion
			 FROM inv_eco_insumo ei
			 INNER JOIN inv_producto p ON p.id_producto = ei.id_producto
			 WHERE ei.id_eco = ?
			 FOR UPDATE`,
			[id_eco]
		);

		for (const ins of insumos) {
			const cantidadDescontar = Number(ins.cantidad);
			const stockBase = Number(ins.stock_base_total);
			const consumoActual = Number(ins.consumo_actual || 0);

			let nuevoConsumo = consumoActual + cantidadDescontar;
			let nuevoStock = stockBase - cantidadDescontar;

			// 1) Actualizar stock base y consumo en el producto
			await conn.execute(
				"UPDATE inv_producto SET stock_base_total = ?, consumo_actual = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id_producto = ?",
				[nuevoStock, nuevoConsumo, ins.id_producto]
			);

			// 2) Registrar consumo global de la cita
			const id_consumo = crypto.randomUUID();
			await conn.execute(
				"INSERT INTO inv_cita_consumo (id_consumo, id_cita, id_producto, cantidad) VALUES (?, ?, ?, ?)",
				[id_consumo, id_cita, ins.id_producto, cantidadDescontar]
			);

			// 3) Registrar movimiento en el Kardex
			const id_kardex = crypto.randomUUID();
			await conn.execute(
				`INSERT INTO inv_kardex 
				(id_kardex, id_producto, tipo_movimiento, cantidad, stock_anterior, stock_posterior, referencia_tipo, referencia_id, id_usuario, observaciones)
				VALUES (?, ?, 'SALIDA', ?, ?, ?, 'CITA', ?, ?, ?)`,
				[
					id_kardex,
					ins.id_producto,
					cantidadDescontar,
					stockBase,
					nuevoStock,
					id_cita,
					usuarioValido,
					`Consumo cita mostrador: ${cantidadDescontar} unidades base`
				]
			);
		}

		await conn.commit();

		sendCitaReservadaEmailsAndNotifications({
			id_cita,
			id_paciente,
			id_especialista,
			enviarAPaciente: false,
		}).catch((e) => console.error("Error enviando correos cita mostrador:", e));

		return {
			id_cita,
			id_pago,
			id_comision,
			referencia: referenciaPago,
			origen_cita: "mostrador",
		};
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

/** Horas ya ocupadas por citas del especialista en una fecha (para mostrador: evitar choques; bloques de 20 min).
 * Retorna:
 *   - `ocupados`: slots HH:MM:SS que tienen cita activa (no cancelada).
 *   - `libres`:   slots disponibles del rango 06:00-18:40 (SOLO los que NO están ocupados).
 *     Si no se especifica especialista/fecha, `libres` es null (mostrar todos).
 */
const getOcupacionEspecialistaPorFechaController = async (id_especialista, fecha) => {
	const [rows] = await pool.execute(
		`SELECT hora_cita FROM cita
     WHERE id_especialista = ? AND fecha_cita = ? AND estado_cita != 2
     ORDER BY hora_cita ASC`,
		[id_especialista, fecha],
	);
	const ocupados = rows.map((r) => {
		const h = r.hora_cita;
		if (!h) return "";
		if (h instanceof Date) return h.toTimeString().slice(0, 8);
		const s = String(h).trim();
		return s.padEnd(8, ":00").slice(0, 8);
	}).filter(Boolean);

	// Generar todos los slots de 20 min entre 06:00 y 19:40 (mismo rango que el frontend)
	const todosSlots = [];
	for (let h = 6; h < 20; h++) {
		for (const m of [0, 20, 40]) {
			const slot = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
			todosSlots.push(slot);
		}
	}

	// Filtrar: libre = no tiene cita activa en ese slot
	const libres = todosSlots.filter((slot) => !ocupados.some((o) => o === slot));

	return { ocupados, libres };
};

/** Obtiene el último paciente de mostrador registrado con esa cédula (para reutilizar nombre/apellido/rif en otra cita). */
const getUltimoPacienteMostradorPorCedulaController = async (cedula) => {
	const [rows] = await pool.execute(
		`SELECT cm.nombre, cm.apellido, cm.cedula, cm.rif
		 FROM cita_mostrador cm
		 INNER JOIN cita c ON c.id_cita = cm.id_cita
		 WHERE cm.cedula = ?
		 ORDER BY c.fecha_cita DESC, c.id_cita DESC
		 LIMIT 1`,
		[cedula],
	);
	if (!rows.length) return null;
	const r = rows[0];
	return {
		nombre: r.nombre || "",
		apellido: r.apellido || "",
		cedula: r.cedula || "",
		rif: r.rif ?? "",
	};
};

/** Datos por cédula: paciente registrado, representado y/o última cita de mostrador. */
const getDatosPorCedulaController = async (cedula) => {
	const [pacienteRows] = await pool.execute(
		`SELECT u.nombre, u.apellido, u.cedula, u.telefono, p.rif, p.id_paciente
		 FROM usuario u
		 INNER JOIN paciente p ON p.id_paciente = u.id_usuario
		 WHERE u.cedula = ?
		 LIMIT 1`,
		[cedula],
	);
	const [representadoRows] = await pool.execute(
		`SELECT r.id_representado, r.id_paciente, r.nombre, r.apellido, r.cedula
		 FROM representado r
		 WHERE r.cedula = ?
		 LIMIT 1`,
		[cedula],
	);
	const [mostradorRows] = await pool.execute(
		`SELECT cm.nombre, cm.apellido, cm.cedula, cm.rif
		 FROM cita_mostrador cm
		 INNER JOIN cita c ON c.id_cita = cm.id_cita
		 WHERE cm.cedula = ?
		 ORDER BY c.fecha_cita DESC, c.id_cita DESC
		 LIMIT 1`,
		[cedula],
	);
	const paciente = pacienteRows.length
		? {
			id_paciente: pacienteRows[0].id_paciente || null,
			nombre: pacienteRows[0].nombre || "",
			apellido: pacienteRows[0].apellido || "",
			cedula: pacienteRows[0].cedula || "",
			telefono: pacienteRows[0].telefono || "",
			rif: pacienteRows[0].rif ?? "",
		}
		: null;
	const representado = representadoRows.length
		? {
			id_representado: representadoRows[0].id_representado,
			id_paciente: representadoRows[0].id_paciente,
			nombre: representadoRows[0].nombre || "",
			apellido: representadoRows[0].apellido || "",
			cedula: representadoRows[0].cedula || "",
		}
		: null;
	const mostrador = mostradorRows.length
		? {
			nombre: mostradorRows[0].nombre || "",
			apellido: mostradorRows[0].apellido || "",
			cedula: mostradorRows[0].cedula || "",
			rif: mostradorRows[0].rif ?? "",
		}
		: null;

	// Verificar si el paciente (o la cédula mostrador) tiene una cita activa pendiente de pago
	let citaActiva = false;
	if (paciente?.id_paciente) {
		const [citaRows] = await pool.execute(
			`SELECT id_cita FROM cita
			 WHERE id_paciente = ?
			   AND estado_cita NOT IN (2, 3)
			   AND estado_pago = 0
			 LIMIT 1`,
			[paciente.id_paciente],
		);
		citaActiva = citaRows.length > 0;
	} else {
		// Verificar por cédula en cita_mostrador con cita activa pendiente de pago
		const [citaMostradorRows] = await pool.execute(
			`SELECT cm.id_cita FROM cita_mostrador cm
			 INNER JOIN cita c ON c.id_cita = cm.id_cita
			 WHERE cm.cedula = ?
			   AND c.estado_cita NOT IN (2, 3)
			   AND c.estado_pago = 0
			 LIMIT 1`,
			[cedula],
		);
		citaActiva = citaMostradorRows.length > 0;
	}

	return { paciente, representado, mostrador, citaActiva };
};

/** Buscar representados por nombre y/o apellido (para menores sin cédula). Devuelve titular_cedula para usar en pago. */
const buscarRepresentadoPorNombreController = async (nombre, apellido) => {
	const nombreTrim = String(nombre || "").trim();
	const apellidoTrim = String(apellido || "").trim();
	if (!nombreTrim && !apellidoTrim) return [];
	const conditions = [];
	const params = [];
	if (nombreTrim) {
		conditions.push("r.nombre LIKE ?");
		params.push(`%${nombreTrim}%`);
	}
	if (apellidoTrim) {
		conditions.push("r.apellido LIKE ?");
		params.push(`%${apellidoTrim}%`);
	}
	const sql = `
		SELECT r.id_representado, r.id_paciente, r.nombre, r.apellido, r.cedula AS representado_cedula,
		       u.cedula AS titular_cedula, u.nombre AS titular_nombre, u.apellido AS titular_apellido
		FROM representado r
		INNER JOIN usuario u ON u.id_usuario = r.id_paciente
		WHERE ${conditions.join(" AND ")}
		ORDER BY r.apellido ASC, r.nombre ASC
		LIMIT 20
	`;
	const [rows] = await pool.execute(sql, params);
	return rows.map((row) => ({
		id_representado: row.id_representado,
		id_paciente: row.id_paciente,
		nombre: row.nombre || "",
		apellido: row.apellido || "",
		representado_cedula: row.representado_cedula || null,
		titular_cedula: row.titular_cedula || "",
		titular_nombre: row.titular_nombre || "",
		titular_apellido: row.titular_apellido || "",
	}));
};

/** Lista citas de mostrador con la cédula indicada que aún no están vinculadas a ningún paciente (para que el usuario las reclame). */
const listCitasMostradorDisponiblesParaVincularController = async (
	cedulaNormalizada,
) => {
	const [rows] = await pool.execute(
		`SELECT
			c.id_cita,
			c.fecha_cita,
			c.hora_cita,
			c.estado_cita,
			c.estado_pago,
			eco.nombre AS eco_nombre,
			cm.nombre AS paciente_nombre,
			cm.apellido AS paciente_apellido,
			cm.cedula AS paciente_cedula,
			u_esp.nombre AS especialista_nombre,
			u_esp.apellido AS especialista_apellido
		FROM cita_mostrador cm
		INNER JOIN cita c ON c.id_cita = cm.id_cita
		INNER JOIN eco eco ON eco.id_eco = c.id_eco
		INNER JOIN usuario u_esp ON u_esp.id_usuario = c.id_especialista
		LEFT JOIN cita_mostrador_vinculacion v ON v.id_cita = c.id_cita
		WHERE cm.cedula = ? AND v.id_cita IS NULL
		ORDER BY c.fecha_cita DESC, c.hora_cita DESC`,
		[cedulaNormalizada],
	);
	return rows;
};

/** Vincula citas de mostrador al paciente; solo permite si la cédula de cada cita coincide con la del paciente. */
const vincularCitasMostradorController = async (id_paciente, id_citas) => {
	if (!Array.isArray(id_citas) || id_citas.length === 0) {
		return { vinculadas: 0, rechazadas: 0 };
	}
	const [userRows] = await pool.execute(
		"SELECT cedula FROM usuario WHERE id_usuario = ? AND id_usuario IN (SELECT id_paciente FROM paciente) LIMIT 1",
		[id_paciente],
	);
	if (!userRows.length) {
		const err = new Error("Paciente no encontrado");
		err.code = "NOT_FOUND";
		throw err;
	}
	const cedulaPaciente = (userRows[0].cedula || "").trim();
	if (!cedulaPaciente) {
		const err = new Error("Tu cuenta no tiene cédula registrada; actualízala en tu perfil para poder asociar citas de mostrador.");
		err.code = "NO_CEDULA";
		throw err;
	}

	const placeholders = id_citas.map(() => "?").join(",");
	const [citasRows] = await pool.execute(
		`SELECT cm.id_cita
		 FROM cita_mostrador cm
		 LEFT JOIN cita_mostrador_vinculacion v ON v.id_cita = cm.id_cita
		 WHERE cm.id_cita IN (${placeholders})
		   AND cm.cedula = ?
		   AND v.id_cita IS NULL`,
		[...id_citas, cedulaPaciente],
	);
	const idCitasValidas = citasRows.map((r) => r.id_cita);
	if (idCitasValidas.length === 0) {
		return {
			vinculadas: 0,
			rechazadas: id_citas.length,
			message:
				id_citas.length === 1
					? "La cita no existe, ya está asociada a otra cuenta o la cédula no coincide con la de tu perfil."
					: "Ninguna cita pudo asociarse (no existen, ya están vinculadas o la cédula no coincide).",
		};
	}
	const conn = await pool.getConnection();
	try {
		for (const id_cita of idCitasValidas) {
			await conn.execute(
				"INSERT INTO cita_mostrador_vinculacion (id_cita, id_paciente) VALUES (?, ?)",
				[id_cita, id_paciente],
			);
		}
		// Adoptar representados "fantasma" de mostrador: los que tienen cedula_titular_mostrador = cédula del usuario pasan a ser suyos
		await conn.execute(
			`UPDATE representado SET id_paciente = ?, cedula_titular_mostrador = NULL
			 WHERE cedula_titular_mostrador = ? AND id_paciente = ?`,
			[id_paciente, cedulaPaciente, MOSTRADOR_PACIENTE_ID],
		);
		// Notificar a admin, moderadores y especialistas de esas citas: el paciente se registró y hay que subir resultados/informes
		if (idCitasValidas.length > 0) {
			const [pacienteRows] = await pool.execute(
				"SELECT nombre, apellido FROM usuario WHERE id_usuario = ? LIMIT 1",
				[id_paciente],
			);
			const nombrePaciente = pacienteRows.length
				? `${pacienteRows[0].nombre || ""} ${pacienteRows[0].apellido || ""}`.trim() || "Un paciente"
				: "Un paciente";
			const n = idCitasValidas.length;
			const citasTexto = n === 1 ? "1 cita de mostrador" : `${n} citas de mostrador`;
			let mensaje = `${nombrePaciente} asoció ${citasTexto} a su cuenta. Sube los resultados e informes desde Todas las citas o Subir resultados.`;
			if (mensaje.length > 255) mensaje = `${mensaje.slice(0, 252)}...`;

			const idsParaNotificar = new Set();

			const [adminModRows] = await pool.execute(
				`SELECT u.id_usuario
				 FROM usuario u
				 INNER JOIN roles r ON r.id_rol = u.id_rol
				 WHERE r.nombre IN ('admin', 'moderador') AND u.activo = 1`,
			);
			adminModRows.forEach((row) => idsParaNotificar.add(row.id_usuario));

			const placeholders = idCitasValidas.map(() => "?").join(",");
			const [espRows] = await pool.execute(
				`SELECT DISTINCT id_especialista FROM cita WHERE id_cita IN (${placeholders})`,
				idCitasValidas,
			);
			espRows.forEach((row) => idsParaNotificar.add(row.id_especialista));

			const titulo = "Citas de mostrador asociadas por paciente";
			for (const id_usuario of idsParaNotificar) {
				createNotificacionController({
					id_usuario,
					titulo,
					mensaje,
					tipo: "citas_mostrador_vinculadas",
				}).catch((e) =>
					console.error("Error notificando vinculación mostrador:", e),
				);
			}
		}

		return {
			vinculadas: idCitasValidas.length,
			rechazadas: id_citas.length - idCitasValidas.length,
		};
	} finally {
		conn.release();
	}
};

// Asignar cita completa: crear cita + pago + resultado en una transacción
const asignarCitaCompletaController = async ({
	id_paciente,
	id_representado,
	id_eco,
	id_especialista,
	id_disponibilidad,
	orden,
	aprobado_por, // ID del admin/moderador que está asignando
	role,
	// Datos del pago
	metodo,
	imagen,
	banco_origen,
	banco_destino,
	monto,
	cedula_pagador,
	telefono_pagador,
	referencia,
	fecha_pago, // ← NUEVO: Fecha de la transferencia (YYYY-MM-DD)
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		if (role === "paciente") {
			await ensurePacienteVerificado(conn, id_paciente);

			// No permitir otra cita con pago si ya hay una pendiente de verificación (paciente o representado)
			const [pendientes] = await conn.execute(
				`SELECT id_cita FROM cita
         WHERE id_paciente = ? AND estado_pago = 0 AND estado_cita IN (0, 1)
         LIMIT 1`,
				[id_paciente],
			);
			if (pendientes.length > 0) {
				const err = new Error(
					"Ya tiene una cita con pago pendiente de verificación. Espere a que un moderador apruebe o rechace el pago antes de solicitar otra cita.",
				);
				err.code = "PAGO_PENDIENTE";
				throw err;
			}
		}

		// 1. Verificar y obtener disponibilidad
		const [dispRows] = await conn.execute(
			`SELECT id_especialista, fecha, hora_inicio, hora_fin, estado, id_eco
       FROM disponibilidad
       WHERE id_disponibilidad = ?
       FOR UPDATE`,
			[id_disponibilidad],
		);
		if (!dispRows.length) {
			const err = new Error("Disponibilidad no encontrada");
			err.code = "NOT_FOUND";
			throw err;
		}
		const disponibilidad = dispRows[0];
		const fechaCita = normalizeFechaForDb(disponibilidad.fecha);

		// Si la disponibilidad está pendiente (estado 0), aprobarla
		if (disponibilidad.estado === 0) {
			await conn.execute(
				"UPDATE disponibilidad SET estado = 1, aprobado_por = ? WHERE id_disponibilidad = ?",
				[aprobado_por, id_disponibilidad],
			);
		} else if (disponibilidad.estado !== 1) {
			const err = new Error("Disponibilidad no disponible");
			err.code = "INVALID_STATE";
			throw err;
		}

		// Verificar que el especialista tenga este eco
		const [ecoEspecialistaRows] = await conn.execute(
			"SELECT id_especialista FROM especialista_eco WHERE id_especialista = ? AND id_eco = ?",
			[id_especialista, id_eco],
		);
		if (!ecoEspecialistaRows.length) {
			const err = new Error("El especialista no tiene este eco disponible");
			err.code = "ECO_NOT_AVAILABLE";
			throw err;
		}

		// Obtener precio del eco
		const [ecoRows] = await conn.execute(
			"SELECT precio FROM eco WHERE id_eco = ?",
			[id_eco],
		);
		if (!ecoRows.length) {
			const err = new Error("Eco no encontrado");
			err.code = "NOT_FOUND";
			throw err;
		}
		const ecoPrecio = ecoRows[0].precio;

		// 2. Crear la cita
		const id_cita = crypto.randomUUID();
		const sqlCita = `
      INSERT INTO cita
        (id_cita, id_paciente, id_representado, id_especialista, id_eco, fecha_cita, hora_cita, orden, id_disponibilidad, estado_cita, estado_pago)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
    `;
		await conn.execute(sqlCita, [
			id_cita,
			id_paciente,
			id_representado ?? null,
			id_especialista,
			id_eco,
			fechaCita,
			disponibilidad.hora_inicio,
			orden || "", // orden no puede ser null, usar string vacío si no se proporciona
			id_disponibilidad,
		]);

		// 3. Actualizar disponibilidad a ocupada
		await conn.execute(
			"UPDATE disponibilidad SET estado = 4 WHERE id_disponibilidad = ?",
			[id_disponibilidad],
		);

		// 3b. Bloquear otros bloques del mismo especialista en la misma franja horaria
		// para evitar que se reserven ecos distintos en el mismo horario.
		await conn.execute(
			`UPDATE disponibilidad
       SET estado = 3
       WHERE id_especialista = ?
         AND fecha = ?
         AND estado IN (0, 1)
         AND NOT (hora_fin <= ? OR hora_inicio >= ?)
         AND id_disponibilidad <> ?`,
			[
				disponibilidad.id_especialista,
				fechaCita,
				disponibilidad.hora_inicio,
				disponibilidad.hora_fin,
				id_disponibilidad,
			],
		);

		// 4. Obtener tasa BCV del día para guardarla en el pago (no puede ser null en BD)
		let tasaDiaBcv = 0;
		try {
			const dolarData = await getDolarOficialController();
			if (dolarData && typeof dolarData.promedio === "number") {
				tasaDiaBcv = dolarData.promedio;
			}
		} catch (err) {
			// Si falla la API del dólar, se guarda 0
		}

		// 5. Crear el pago
		const id_pago = crypto.randomUUID();
		const sqlPago = `
      INSERT INTO pagos
        (id_pago, id_cita, id_paciente, metodo, imagen, banco_origen, banco_destino, monto, monto_usd, monto_bs, cedula_pagador, telefono_pagador, referencia, estado_pago, fecha_pago, tasa_dia_bcv)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, COALESCE(?, CURRENT_TIMESTAMP), ?)
    `;
		const bancoOrigenVal = String(banco_origen ?? "").trim();
		const bancoDestinoVal = String(banco_destino ?? "").trim();
		let referenciaVal = String(referencia ?? "").trim();
		if (isCashPaymentMethodCita(metodo) && !referenciaVal) {
			referenciaVal = `WEB-${id_cita}`;
		}
		const normalizedPago = normalizeCitaAmounts({
			montoInput: Number(monto),
			metodo,
			tasaBcv: tasaDiaBcv,
		});
		await conn.execute(sqlPago, [
			id_pago,
			id_cita,
			id_paciente,
			metodo,
			imagen || "",
			bancoOrigenVal,
			bancoDestinoVal,
			monto,
			normalizedPago.monto_usd,
			normalizedPago.monto_bs,
			cedula_pagador,
			telefono_pagador,
			referenciaVal,
			fecha_pago || null, // ← NUEVO: fecha de la transferencia del usuario
			normalizedPago.tasa_dia_bcv,
		]);

		// 6. Crear resultado vacío (estado 0: Pendiente)
		const id_resultado = crypto.randomUUID();
		const sqlResultado = `
      INSERT INTO resultado
        (id_resultado, id_cita, id_especialista, nombre, archivo, estado_resultado)
      VALUES
        (?, ?, ?, NULL, NULL, 0)
    `;
		await conn.execute(sqlResultado, [id_resultado, id_cita, id_especialista]);

		await conn.commit();

		sendCitaReservadaEmailsAndNotifications({
			id_cita,
			id_paciente,
			id_especialista,
			enviarAPaciente: true,
		}).catch((e) => console.error("Error enviando correos cita asignada:", e));

		return {
			id_cita,
			id_pago,
			id_resultado,
			id_paciente,
			id_especialista,
			id_eco,
			fecha_cita: fechaCita,
			hora_cita: disponibilidad.hora_inicio,
			monto,
			eco_precio: ecoPrecio,
		};
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

// ====================================================
// Crear paciente real desde mostrador (admin/moderador)
// ====================================================
const MOSTRADOR_PASSWORD_HASH = "$2a$10$MOSTRADOR_NO_LOGIN_000000000000000000000000000000"; // inusable

const crearPacienteMostradorController = async ({
	cedula,
	nombre,
	apellido,
	telefono,
	tipo_cedula = "V",
}) => {
	if (!cedula || !nombre || !apellido) {
		const err = new Error("Cédula, nombre y apellido son obligatorios");
		err.code = "VALIDATION_ERROR";
		throw err;
	}

	const cedulaFull = `${tipo_cedula}${cedula}`.trim();
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// 1) ¿Ya existe un usuario con esta cédula?
		const [existing] = await conn.execute(
			"SELECT id_usuario FROM usuario WHERE cedula = ? LIMIT 1",
			[cedulaFull],
		);

		if (existing.length > 0) {
			const idPaciente = existing[0].id_usuario;

			// Verificar cita activa (R2)
			const [citasActivas] = await conn.execute(
				`SELECT id_cita FROM cita
				 WHERE id_paciente = ?
				   AND estado NOT IN ('Cancelada', 'Completada', 'Atendida')
				 LIMIT 1`,
				[idPaciente],
			);

			await conn.commit();
			return {
				id_paciente: idPaciente,
				existente: true,
				citaActiva: citasActivas.length > 0,
			};
		}

		// 2) No existe → crear usuario + paciente
		const id_usuario = crypto.randomUUID();

		// Generar un email ficticio único usando la cédula para evitar colisiones
		const correo = `paciente.mostrador.${cedulaFull}@mostrador.com`;

		// Hashear password fijo (el paciente no puede iniciar sesión con esto)
		const hashedPassword = await bcrypt.hash(crypto.randomUUID(), 10);
		const id_rol = await getRolIdByName(conn, "paciente");

		// Calcular RIF desde cédula
		const rif = `${tipo_cedula}${cedula}${String(Number(cedula) % 10)}`.trim();

		await conn.execute(
			`INSERT INTO usuario
				(id_usuario, nombre, apellido, genero, cedula, correo, telefono, contrasena, activo, fecha_nacimiento, id_rol)
			 VALUES (?, ?, ?, 'Otro', ?, ?, ?, ?, 1, '2000-01-01', ?)`,
			[
				id_usuario,
				nombre.trim(),
				apellido.trim(),
				cedulaFull,
				correo,
				telefono?.trim() || "0000000000",
				hashedPassword,
				id_rol,
			],
		);

		await conn.execute(
			`INSERT INTO paciente
				(id_paciente, tipo_sangre, descripcion, direccion, rif, email_verificado)
			 VALUES (?, 'N/A', 'Paciente registrado por mostrador', NULL, ?, 0)`,
			[id_usuario, rif],
		);

		await conn.commit();
		return {
			id_paciente: id_usuario,
			existente: false,
			citaActiva: false,
			correo,
		};
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

const updatePacientePhoneMostradorController = async (id_paciente, telefono) => {
	const telefonoTrim = String(telefono || "").trim();
	if (!telefonoTrim) {
		const err = new Error("El teléfono no puede estar vacío");
		err.code = "INVALID_PHONE";
		throw err;
	}
	const [result] = await pool.execute(
		"UPDATE usuario SET telefono = ? WHERE id_usuario = ?",
		[telefonoTrim, id_paciente]
	);
	return { updated: result.affectedRows > 0 };
};

module.exports = {
	updatePacientePhoneMostradorController,
	createCitaFromDisponibilidadController,
	asignarCitaCompletaController,
	tienePagoPendienteController,
	listCitasByPacienteController,
	listCitasCompletasByPacienteController,
	listCitasByEspecialistaController,
	cancelCitaController,
	markCitaAtendidaController,
	listCitasPendientesPagoController,
	listCitasConPagosController,
	countPagosGestionadosHoyController,
	updateEstadoPagoController,
	listCitasByFechaController,
	getCitaByIdController,
	posponerCitaController,
	getAllCitasController,
	createCitaMostradorController,
	getOcupacionEspecialistaPorFechaController,
	getDatosPorCedulaController,
	buscarRepresentadoPorNombreController,
	getUltimoPacienteMostradorPorCedulaController,
	listCitasMostradorDisponiblesParaVincularController,
	vincularCitasMostradorController,
	ensureMostradorPacienteBase,
	MOSTRADOR_PACIENTE_ID,
	crearPacienteMostradorController,
};
