const { pool } = require("../db");
const crypto = require("crypto");
const { getDolarOficialController } = require("./dolarControllers");

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

		const [rows] = await conn.execute(
			`SELECT id_especialista, fecha, hora_inicio, hora_fin, estado
       FROM disponibilidad
       WHERE id_disponibilidad = ?
       FOR UPDATE`,
			[id_disponibilidad]
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
			[id_disponibilidad]
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
			]
		);

		await conn.commit();
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

// Obtener todas las citas del paciente con información completa (pago, informe, resultado, orden, representado)
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
      u_especialista.nombre AS especialista_nombre,
      u_especialista.apellido AS especialista_apellido,
      u_paciente.nombre AS paciente_nombre,
      u_paciente.apellido AS paciente_apellido,
      e.nombre AS eco_nombre,
      -- Datos del representado
      rep.nombre AS representado_nombre,
      rep.apellido AS representado_apellido,
      rep.cedula AS representado_cedula,
      rep.fecha_nacimiento AS representado_fecha_nacimiento,
      rep.genero AS representado_genero,
      rep.parentesco AS representado_parentesco,
      -- Datos del resultado
      r.archivo AS resultado_archivo,
      r.estado_resultado AS resultado_estado,
      r.fecha_publicacion AS resultado_publicado,
      -- Datos del informe
      inf.id_informe,
      inf.informe_pdf_url AS informe_pdf_url,
      -- Datos del pago
      pag.id_pago,
      pag.metodo AS pago_metodo,
      pag.imagen AS pago_imagen,
      pag.monto AS pago_monto,
      pag.referencia AS pago_referencia,
      pag.estado_pago AS pago_estado_pago
    FROM cita c
    INNER JOIN usuario u_especialista ON u_especialista.id_usuario = c.id_especialista
    INNER JOIN usuario u_paciente ON u_paciente.id_usuario = c.id_paciente
    INNER JOIN eco e ON e.id_eco = c.id_eco
    LEFT JOIN representado rep ON rep.id_representado = c.id_representado
    LEFT JOIN resultado r ON r.id_cita = c.id_cita
    LEFT JOIN informe inf ON inf.id_cita = c.id_cita
    LEFT JOIN pagos pag ON pag.id_cita = c.id_cita
    WHERE c.id_paciente = ?
    ORDER BY c.fecha_cita DESC, c.hora_cita DESC
  `;
	const [rows] = await pool.execute(sql, [id_paciente]);
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
      c.fecha_cita,
      c.hora_cita,
      c.estado_cita,
      c.estado_pago,
      c.id_disponibilidad,
      c.orden,
      u.nombre AS paciente_nombre,
      u.apellido AS paciente_apellido,
      u.telefono AS paciente_telefono,
      u.cedula AS paciente_cedula,
      u.correo AS paciente_correo,
      p.tipo_sangre AS paciente_tipo_sangre,
      p.contacto_emergencia_nombre AS paciente_contacto_nombre,
      p.contacto_emergencia_telefono AS paciente_contacto_telefono,
      e.nombre AS eco_nombre,
      r.archivo AS resultado_archivo,
      r.estado_resultado AS resultado_estado,
      r.fecha_publicacion AS resultado_publicado
    FROM cita c
    INNER JOIN usuario u ON u.id_usuario = c.id_paciente
    INNER JOIN paciente p ON p.id_paciente = c.id_paciente
    INNER JOIN eco e ON e.id_eco = c.id_eco
    LEFT JOIN resultado r ON r.id_cita = c.id_cita
    WHERE c.id_especialista = ?
    ORDER BY c.fecha_cita DESC, c.hora_cita DESC
  `;
	const [rows] = await pool.execute(sql, [id_especialista]);
	return rows;
};

const cancelCitaController = async ({ id_cita }) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();
		const [rows] = await conn.execute(
			`SELECT id_disponibilidad, fecha_cita
       FROM cita
       WHERE id_cita = ?
       FOR UPDATE`,
			[id_cita]
		);
		if (!rows.length) {
			const err = new Error("Cita no encontrada");
			err.code = "NOT_FOUND";
			throw err;
		}

		await conn.execute(
			"UPDATE cita SET estado_cita = 2, estado_pago = 2 WHERE id_cita = ?",
			[id_cita]
		);

		// Sincronizar tabla pagos: marcar como rechazado (2) al cancelar la cita
		await conn.execute("UPDATE pagos SET estado_pago = 2 WHERE id_cita = ?", [
			id_cita,
		]);

		const { id_disponibilidad, fecha_cita } = rows[0];
		if (
			id_disponibilidad &&
			fecha_cita >= new Date().toISOString().slice(0, 10)
		) {
			await conn.execute(
				"UPDATE disponibilidad SET estado = 1 WHERE id_disponibilidad = ? AND estado = 4",
				[id_disponibilidad]
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
			`SELECT id_especialista, id_paciente, fecha_cita, estado_cita
       FROM cita
       WHERE id_cita = ?
       FOR UPDATE`,
			[id_cita]
		);
		if (!rows.length) {
			const err = new Error("Cita no encontrada");
			err.code = "NOT_FOUND";
			throw err;
		}
		const cita = rows[0];
		const autorizado =
			role === "paciente"
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
		const today = new Date().toISOString().slice(0, 10);
		if (cita.fecha_cita > today) {
			const err = new Error("No se puede atender una cita futura");
			err.code = "FUTURE_DATE";
			throw err;
		}

		await conn.execute("UPDATE cita SET estado_cita = 3 WHERE id_cita = ?", [
			id_cita,
		]);

		await conn.commit();
		return { id_cita, estado_cita: 3 };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
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
      c.fecha_cita,
      c.hora_cita,
      c.estado_cita,
      c.estado_pago,
      c.id_disponibilidad,
      c.orden,
      u_paciente.nombre AS paciente_nombre,
      u_paciente.apellido AS paciente_apellido,
      u_paciente.cedula AS paciente_cedula,
      u_paciente.telefono AS paciente_telefono,
      u_especialista.nombre AS especialista_nombre,
      u_especialista.apellido AS especialista_apellido,
      e.nombre AS eco_nombre
    FROM cita c
    INNER JOIN usuario u_paciente ON u_paciente.id_usuario = c.id_paciente
    INNER JOIN usuario u_especialista ON u_especialista.id_usuario = c.id_especialista
    INNER JOIN eco e ON e.id_eco = c.id_eco
    WHERE c.estado_pago = 0
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
      c.fecha_cita,
      c.hora_cita,
      c.estado_cita,
      c.estado_pago,
      c.id_disponibilidad,
      c.orden,
      u_paciente.nombre AS paciente_nombre,
      u_paciente.apellido AS paciente_apellido,
      u_paciente.cedula AS paciente_cedula,
      u_paciente.telefono AS paciente_telefono,
      u_especialista.nombre AS especialista_nombre,
      u_especialista.apellido AS especialista_apellido,
      e.nombre AS eco_nombre
    FROM cita c
    INNER JOIN usuario u_paciente ON u_paciente.id_usuario = c.id_paciente
    INNER JOIN usuario u_especialista ON u_especialista.id_usuario = c.id_especialista
    INNER JOIN eco e ON e.id_eco = c.id_eco
    WHERE EXISTS (
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
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		const [rows] = await conn.execute(
			`SELECT estado_cita, estado_pago
       FROM cita
       WHERE id_cita = ?
       FOR UPDATE`,
			[id_cita]
		);
		if (!rows.length) {
			const err = new Error("Cita no encontrada");
			err.code = "NOT_FOUND";
			throw err;
		}
		const cita = rows[0];
		if (cita.estado_cita === 2) {
			const err = new Error(
				"No se puede actualizar el pago de una cita cancelada"
			);
			err.code = "INVALID_STATE";
			throw err;
		}

		// Si se aprueba el pago (estado_pago = 1) y la cita está pendiente (estado_cita = 0), aprobarla también
		let nuevoEstadoCita = cita.estado_cita;
		if (estado_pago === 1 && cita.estado_cita === 0) {
			nuevoEstadoCita = 1; // Aprobar la cita
		}

		await conn.execute(
			"UPDATE cita SET estado_pago = ?, estado_cita = ? WHERE id_cita = ?",
			[estado_pago, nuevoEstadoCita, id_cita]
		);

		// Sincronizar estado en la tabla pagos para que "Detalles del pago" muestre el estado correcto
		if (estado_pago === 1 && aprobado_por) {
			await conn.execute(
				`UPDATE pagos SET estado_pago = ?, fecha_validacion = CURRENT_TIMESTAMP, validado_por = ? WHERE id_cita = ?`,
				[estado_pago, aprobado_por, id_cita]
			);
		} else {
			await conn.execute("UPDATE pagos SET estado_pago = ? WHERE id_cita = ?", [
				estado_pago,
				id_cita,
			]);
		}

		await conn.commit();
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
      c.fecha_cita,
      c.hora_cita,
      c.estado_cita,
      c.estado_pago,
      c.id_disponibilidad,
      c.orden,
      u_paciente.nombre AS paciente_nombre,
      u_paciente.apellido AS paciente_apellido,
      u_paciente.cedula AS paciente_cedula,
      u_paciente.telefono AS paciente_telefono,
      u_especialista.nombre AS especialista_nombre,
      u_especialista.apellido AS especialista_apellido,
      e.nombre AS eco_nombre
    FROM cita c
    INNER JOIN usuario u_paciente ON u_paciente.id_usuario = c.id_paciente
    INNER JOIN usuario u_especialista ON u_especialista.id_usuario = c.id_especialista
    INNER JOIN eco e ON e.id_eco = c.id_eco
    WHERE c.fecha_cita = ?
    ORDER BY c.hora_cita ASC
  `;
	const [rows] = await pool.execute(sql, [fecha]);
	return rows;
};

// Posponer cita (actualizar fecha y hora)
const posponerCitaController = async ({ id_cita, fecha_cita, hora_cita }) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// Verificar que la cita existe y no está cancelada o atendida
		const [rows] = await conn.execute(
			`SELECT estado_cita, estado_pago, fecha_cita, hora_cita
       FROM cita
       WHERE id_cita = ?
       FOR UPDATE`,
			[id_cita]
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

		// Validar que la nueva fecha no sea en el pasado
		const today = new Date().toISOString().slice(0, 10);
		const nowTime = new Date().toTimeString().slice(0, 8);
		if (fecha_cita < today) {
			const err = new Error("No se puede posponer una cita a una fecha pasada");
			err.code = "PAST_DATE";
			throw err;
		}
		if (fecha_cita === today && hora_cita <= nowTime) {
			const err = new Error("No se puede posponer una cita a una hora pasada");
			err.code = "PAST_DATE";
			throw err;
		}

		// Actualizar fecha y hora de la cita
		await conn.execute(
			"UPDATE cita SET fecha_cita = ?, hora_cita = ? WHERE id_cita = ?",
			[fecha_cita, hora_cita, id_cita]
		);

		await conn.commit();
		return { id_cita, fecha_cita, hora_cita };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
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
      c.fecha_cita,
      c.hora_cita,
      c.estado_cita,
      c.estado_pago,
      c.id_disponibilidad,
      c.orden,
      c.creada_en,
      -- Datos del paciente
      u_paciente.nombre AS paciente_nombre,
      u_paciente.apellido AS paciente_apellido,
      u_paciente.cedula AS paciente_cedula,
      u_paciente.telefono AS paciente_telefono,
      u_paciente.correo AS paciente_correo,
      u_paciente.fecha_nacimiento AS paciente_fecha_nacimiento,
      p.tipo_sangre AS paciente_tipo_sangre,
      p.rif AS paciente_rif,
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
      c.fecha_cita,
      c.hora_cita,
      c.estado_cita,
      c.estado_pago,
      c.id_disponibilidad,
      c.orden,
      c.creada_en,
      -- Datos del paciente
      u_paciente.nombre AS paciente_nombre,
      u_paciente.apellido AS paciente_apellido,
      u_paciente.cedula AS paciente_cedula,
      u_paciente.telefono AS paciente_telefono,
      u_paciente.correo AS paciente_correo,
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
    INNER JOIN usuario u_especialista ON u_especialista.id_usuario = c.id_especialista
    INNER JOIN especialista esp ON esp.id_especialista = c.id_especialista
    INNER JOIN especialidad es ON es.id_especialidad = esp.id_especialidad
    INNER JOIN eco e ON e.id_eco = c.id_eco
    LEFT JOIN representado r_rep ON r_rep.id_representado = c.id_representado
    LEFT JOIN resultado res ON res.id_cita = c.id_cita
    LEFT JOIN informe inf ON inf.id_cita = c.id_cita
    LEFT JOIN pagos pag ON pag.id_cita = c.id_cita
    LEFT JOIN usuario u_validador ON u_validador.id_usuario = pag.validado_por
    ORDER BY c.fecha_cita DESC, c.hora_cita DESC
  `;
	const [rows] = await pool.execute(sql);
	return rows;
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
	// Datos del pago
	metodo,
	imagen,
	banco_origen,
	banco_destino,
	monto,
	cedula_pagador,
	telefono_pagador,
	referencia,
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// 1. Verificar y obtener disponibilidad
		const [dispRows] = await conn.execute(
			`SELECT id_especialista, fecha, hora_inicio, estado, id_eco
       FROM disponibilidad
       WHERE id_disponibilidad = ?
       FOR UPDATE`,
			[id_disponibilidad]
		);
		if (!dispRows.length) {
			const err = new Error("Disponibilidad no encontrada");
			err.code = "NOT_FOUND";
			throw err;
		}
		const disponibilidad = dispRows[0];

		// Si la disponibilidad está pendiente (estado 0), aprobarla
		if (disponibilidad.estado === 0) {
			await conn.execute(
				"UPDATE disponibilidad SET estado = 1, aprobado_por = ? WHERE id_disponibilidad = ?",
				[aprobado_por, id_disponibilidad]
			);
		} else if (disponibilidad.estado !== 1) {
			const err = new Error("Disponibilidad no disponible");
			err.code = "INVALID_STATE";
			throw err;
		}

		// Verificar que el especialista tenga este eco
		const [ecoEspecialistaRows] = await conn.execute(
			"SELECT id_especialista FROM especialista_eco WHERE id_especialista = ? AND id_eco = ?",
			[id_especialista, id_eco]
		);
		if (!ecoEspecialistaRows.length) {
			const err = new Error("El especialista no tiene este eco disponible");
			err.code = "ECO_NOT_AVAILABLE";
			throw err;
		}

		// Obtener precio del eco
		const [ecoRows] = await conn.execute(
			"SELECT precio FROM eco WHERE id_eco = ?",
			[id_eco]
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
			disponibilidad.fecha,
			disponibilidad.hora_inicio,
			orden || "", // orden no puede ser null, usar string vacío si no se proporciona
			id_disponibilidad,
		]);

		// 3. Actualizar disponibilidad a ocupada
		await conn.execute(
			"UPDATE disponibilidad SET estado = 4 WHERE id_disponibilidad = ?",
			[id_disponibilidad]
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
        (id_pago, id_cita, id_paciente, metodo, imagen, banco_origen, banco_destino, monto, cedula_pagador, telefono_pagador, referencia, estado_pago, tasa_dia_bcv)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `;
		await conn.execute(sqlPago, [
			id_pago,
			id_cita,
			id_paciente,
			metodo,
			imagen || "",
			banco_origen,
			banco_destino,
			monto,
			cedula_pagador,
			telefono_pagador,
			referencia,
			tasaDiaBcv,
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
		return {
			id_cita,
			id_pago,
			id_resultado,
			id_paciente,
			id_especialista,
			id_eco,
			fecha_cita: disponibilidad.fecha,
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

module.exports = {
	createCitaFromDisponibilidadController,
	asignarCitaCompletaController,
	listCitasByPacienteController,
	listCitasCompletasByPacienteController,
	listCitasByEspecialistaController,
	cancelCitaController,
	markCitaAtendidaController,
	listCitasPendientesPagoController,
	listCitasConPagosController,
	updateEstadoPagoController,
	listCitasByFechaController,
	getCitaByIdController,
	posponerCitaController,
	getAllCitasController,
};
