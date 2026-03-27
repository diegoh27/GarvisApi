const { pool } = require("../db");
const crypto = require("crypto");
const { createNotificacionController } = require("./notificacionesControllers");
const { normalizeFechaForDb } = require("../utils/dateUtils");
const {
	eachCalendarDay,
	slots20EnRangoDiario,
	validateMacroHoraRange,
} = require("../utils/disponibilidadSolicitudUtils");

/** Mismo eco + fecha: cualquier especialista con bloque pendiente/aprobado/cita que solape. */
const hasSlotEcoOccupied = async (
	conn,
	{ fecha, hora_inicio, hora_fin, id_eco },
) => {
	const sql = `
    SELECT id_disponibilidad
    FROM disponibilidad
    WHERE fecha = ?
      AND (id_eco <=> ?)
      AND estado IN (0, 1, 4)
      AND NOT (hora_fin <= ? OR hora_inicio >= ?)
    LIMIT 1
  `;
	const [rows] = await conn.execute(sql, [
		fecha,
		id_eco,
		hora_inicio,
		hora_fin,
	]);
	return rows.length > 0;
};

const MAX_SOLICITUD_RANGE_DAYS = 31;

/** Normaliza DATE (mysql2 puede devolver Date o string) a YYYY-MM-DD para JSON estable. */
const fechaRowToYmd = (val) => {
	if (val == null) return val;
	if (typeof val === "string") {
		return val.length >= 10 ? val.slice(0, 10) : val;
	}
	if (val instanceof Date) {
		const y = val.getFullYear();
		const m = String(val.getMonth() + 1).padStart(2, "0");
		const d = String(val.getDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	}
	return String(val).slice(0, 10);
};

const mapSolicitudRowDates = (row) => ({
	...row,
	fecha_desde: fechaRowToYmd(row.fecha_desde),
	fecha_hasta: fechaRowToYmd(row.fecha_hasta),
});

/** Nombres de eco cuando la solicitud agrupa varios (id_ecos_json). */
const enrichSolicitudesEcoNombres = async (rows) => {
	const out = [];
	for (const row of rows) {
		const r = mapSolicitudRowDates(row);
		if (r.id_ecos_json) {
			let ids = [];
			try {
				const raw = r.id_ecos_json;
				ids =
					typeof raw === "string"
						? JSON.parse(raw)
						: Array.isArray(raw)
							? raw
							: [];
			} catch (_) {
				ids = [];
			}
			if (Array.isArray(ids) && ids.length) {
				const placeholders = ids.map(() => "?").join(",");
				const [ecos] = await pool.execute(
					`SELECT nombre FROM eco WHERE id_eco IN (${placeholders}) AND activo = 1 ORDER BY nombre ASC`,
					ids,
				);
				if (ecos.length) {
					r.eco_nombre = ecos.map((e) => e.nombre).join(" · ");
				}
			}
		}
		out.push(r);
	}
	return out;
};

const hasOverlap = async (
	conn,
	{ id_especialista, fecha, hora_inicio, hora_fin, estados },
) => {
	const placeholders = estados.map(() => "?").join(", ");
	const sql = `
    SELECT id_disponibilidad
    FROM disponibilidad
    WHERE id_especialista = ?
      AND fecha = ?
      AND estado IN (${placeholders})
      AND NOT (hora_fin <= ? OR hora_inicio >= ?)
    LIMIT 1
  `;
	const params = [id_especialista, fecha, ...estados, hora_inicio, hora_fin];
	const [rows] = await conn.execute(sql, params);
	return rows.length > 0;
};

/**
 * Paso 3 (recurso único): otro especialista ya tiene ese tramo en el mismo eco
 * (o ambos sin eco) aprobado (1) o con cita (4).
 */
const hasOverlapOtherSpecialistOccupied = async (
	conn,
	{ id_especialista, fecha, hora_inicio, hora_fin, id_eco },
) => {
	const sql = `
    SELECT d.id_disponibilidad
    FROM disponibilidad d
    WHERE d.fecha = ?
      AND (d.id_eco <=> ?)
      AND d.id_especialista <> ?
      AND d.estado IN (1, 4)
      AND NOT (d.hora_fin <= ? OR d.hora_inicio >= ?)
    LIMIT 1
  `;
	const [rows] = await conn.execute(sql, [
		fecha,
		id_eco,
		id_especialista,
		hora_inicio,
		hora_fin,
	]);
	return rows.length > 0;
};

const createDisponibilidadController = async ({
	id_especialista,
	fecha,
	hora_inicio,
	hora_fin,
	creado_por,
	id_eco,
}) => {
	const fechaNorm = normalizeFechaForDb(fecha);
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// Validar que el eco existe si se proporciona
		if (id_eco) {
			const [ecoRows] = await conn.execute(
				"SELECT id_eco FROM eco WHERE id_eco = ? AND activo = 1",
				[id_eco],
			);
			if (!ecoRows.length) {
				const err = new Error("Eco no encontrado o inactivo");
				err.code = "ECO_NOT_FOUND";
				throw err;
			}
		}

		// Validar solapamiento:
		// - No permitir duplicados del mismo eco en el mismo horario (estado 0 o 1)
		// - No permitir crear si ya existe una cita en ese horario (estado 4)
		const [overlapRows] = await conn.execute(
			`SELECT id_disponibilidad, estado, id_eco
       FROM disponibilidad
       WHERE id_especialista = ?
         AND fecha = ?
         AND NOT (hora_fin <= ? OR hora_inicio >= ?)
         AND estado IN (0, 1, 4)
       LIMIT 1`,
			[id_especialista, fechaNorm, hora_inicio, hora_fin],
		);
		if (overlapRows.length) {
			const existing = overlapRows[0];
			const sameEco = (existing.id_eco ?? null) === (id_eco ?? null);
			if (existing.estado === 4 || sameEco) {
				const err = new Error("Bloque se solapa con otro existente");
				err.code = "OVERLAP";
				throw err;
			}
		}

		const id_disponibilidad = crypto.randomUUID();
		const sql = `
      INSERT INTO disponibilidad
        (id_disponibilidad, id_especialista, fecha, hora_inicio, hora_fin, id_eco, estado, creado_por)
      VALUES
        (?, ?, ?, ?, ?, ?, 0, ?)
    `;
		await conn.execute(sql, [
			id_disponibilidad,
			id_especialista,
			fechaNorm,
			hora_inicio,
			hora_fin,
			id_eco || null,
			creado_por,
		]);

		await conn.commit();

		notificarAdminModeradorDisponibilidadPendiente({
			cantidad: 1,
			id_especialista,
		}).catch((e) => console.error("Error notificando disponibilidad:", e));

		return {
			id_disponibilidad,
			id_especialista,
			fecha: fechaNorm,
			hora_inicio,
			hora_fin,
			id_eco: id_eco || null,
			estado: 0,
		};
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

const notificarAdminModeradorDisponibilidadPendiente = async ({
	cantidad,
	id_especialista,
}) => {
	try {
		let especialistaNombre = "";
		if (id_especialista) {
			const [espRows] = await pool.execute(
				`SELECT nombre, apellido FROM usuario WHERE id_usuario = ?`,
				[id_especialista],
			);
			if (espRows.length) {
				especialistaNombre = [espRows[0].nombre, espRows[0].apellido].filter(Boolean).join(" ") || "";
			}
		}
		const [adminModRows] = await pool.execute(
			`SELECT u.id_usuario FROM usuario u
       INNER JOIN roles r ON r.id_rol = u.id_rol
       WHERE r.nombre IN ('admin', 'moderador') AND u.activo = 1`,
		);
		const bloqueTexto = cantidad === 1 ? "1 bloque" : `${cantidad} bloques`;
		const mensaje = especialistaNombre
			? `Dr./Dra. ${especialistaNombre} solicitó ${bloqueTexto} de disponibilidad pendientes de aprobación.`
			: cantidad === 1
				? "Hay 1 nueva solicitud de disponibilidad pendiente de aprobación."
				: `Hay ${cantidad} nuevas solicitudes de disponibilidad pendientes de aprobación.`;
		for (const row of adminModRows) {
			try {
				await createNotificacionController({
					id_usuario: row.id_usuario,
					titulo: "Disponibilidad pendiente",
					mensaje,
					tipo: "disponibilidad",
				});
			} catch (e) {
				console.error("Error notificando admin/moderador disponibilidad:", e);
			}
		}
	} catch (err) {
		console.error("Error en notificarAdminModeradorDisponibilidadPendiente:", err);
	}
};

/**
 * Crear múltiples bloques de disponibilidad en una sola transacción.
 * @param {Object} params
 * @param {string} params.id_especialista
 * @param {string} params.creado_por
 * @param {Array<{fecha: string, hora_inicio: string, hora_fin: string, id_eco?: string}>} params.bloques
 * @returns {{ creados: number, ids: string[] }}
 */
const createDisponibilidadBatchController = async ({
	id_especialista,
	creado_por,
	bloques,
}) => {
	if (!Array.isArray(bloques) || bloques.length === 0) {
		const err = new Error("Se requiere al menos un bloque");
		err.code = "INVALID_INPUT";
		throw err;
	}
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();
		const creados = [];
		for (const bloque of bloques) {
			const { fecha, hora_inicio, hora_fin, id_eco } = bloque;
			if (!fecha || !hora_inicio || !hora_fin) {
				const err = new Error(
					"Cada bloque debe tener fecha, hora_inicio y hora_fin",
				);
				err.code = "INVALID_INPUT";
				throw err;
			}
			const fechaNorm = normalizeFechaForDb(fecha);
			if (id_eco) {
				const [ecoRows] = await conn.execute(
					"SELECT id_eco FROM eco WHERE id_eco = ? AND activo = 1",
					[id_eco],
				);
				if (!ecoRows.length) {
					const err = new Error(`Eco no encontrado o inactivo: ${id_eco}`);
					err.code = "ECO_NOT_FOUND";
					throw err;
				}
			}
			const [overlapRows] = await conn.execute(
				`SELECT id_disponibilidad, estado, id_eco
         FROM disponibilidad
         WHERE id_especialista = ?
           AND fecha = ?
           AND NOT (hora_fin <= ? OR hora_inicio >= ?)
           AND estado IN (0, 1, 4)
         LIMIT 1`,
				[id_especialista, fechaNorm, hora_inicio, hora_fin],
			);
			if (overlapRows.length) {
				const existing = overlapRows[0];
				const sameEco = (existing.id_eco ?? null) === (id_eco ?? null);
				if (existing.estado === 4 || sameEco) {
					const err = new Error(
						`Bloque se solapa con otro existente: ${fechaNorm} ${hora_inicio}`,
					);
					err.code = "OVERLAP";
					throw err;
				}
			}
			const id_disponibilidad = crypto.randomUUID();
			await conn.execute(
				`INSERT INTO disponibilidad
          (id_disponibilidad, id_especialista, fecha, hora_inicio, hora_fin, id_eco, estado, creado_por)
          VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
				[
					id_disponibilidad,
					id_especialista,
					fechaNorm,
					hora_inicio,
					hora_fin,
					id_eco || null,
					creado_por,
				],
			);
			creados.push(id_disponibilidad);
		}
		await conn.commit();

		notificarAdminModeradorDisponibilidadPendiente({
			cantidad: creados.length,
			id_especialista,
		}).catch((e) => console.error("Error notificando disponibilidad batch:", e));

		return { creados: creados.length, ids: creados };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

const listMisDisponibilidadController = async ({ id_especialista, estado }) => {
	let sql = `
    SELECT
      d.id_disponibilidad,
      d.fecha,
      d.hora_inicio,
      d.hora_fin,
      d.id_eco,
      d.estado,
      d.creado_en,
      d.actualizado_en,
      e.nombre AS eco_nombre
    FROM disponibilidad d
    LEFT JOIN eco e ON e.id_eco = d.id_eco
    WHERE d.id_especialista = ?
  `;
	const params = [id_especialista];
	if (estado !== undefined) {
		sql += " AND d.estado = ?";
		params.push(estado);
	}
	sql += " ORDER BY d.fecha ASC, d.hora_inicio ASC";
	const [rows] = await pool.execute(sql, params);
	return rows;
};

const listSolicitudesSqlBase = `
    SELECT
      s.id_solicitud,
      s.id_especialista,
      s.fecha_desde,
      s.fecha_hasta,
      s.hora_inicio,
      s.hora_fin,
      s.id_eco,
      s.id_ecos_json,
      s.es_manual,
      s.estado,
      s.creado_en,
      u.nombre,
      u.apellido,
      es.nombre AS especialidad,
      e.nombre AS eco_nombre
    FROM disponibilidad_solicitud s
    INNER JOIN usuario u ON u.id_usuario = s.id_especialista
    INNER JOIN especialista esp ON esp.id_especialista = s.id_especialista
    INNER JOIN especialidad es ON es.id_especialidad = esp.id_especialidad
    LEFT JOIN eco e ON e.id_eco = s.id_eco
`;

/**
 * Solicitud macro (rango) sin crear bloques hasta aprobar.
 * Una fila por solicitud: varios ecos en `id_ecos_json` (más de un eco) o `id_eco` (uno solo).
 */
const createSolicitudMacroController = async ({
	id_especialista,
	fecha_desde,
	fecha_hasta,
	hora_inicio,
	hora_fin,
	id_eco,
	id_ecos,
	creado_por,
	es_manual = false,
}) => {
	let id_ecos_list = [];
	if (Array.isArray(id_ecos) && id_ecos.length) {
		id_ecos_list = [...new Set(id_ecos.filter(Boolean))];
	} else if (id_eco) {
		id_ecos_list = [id_eco];
	}
	if (id_ecos_list.length === 0) {
		const err = new Error(
			"Debes indicar al menos un tipo de eco (id_ecos o id_eco)",
		);
		err.code = "INVALID_INPUT";
		throw err;
	}

	const fd = normalizeFechaForDb(fecha_desde);
	const fh = normalizeFechaForDb(fecha_hasta);
	if (fd > fh) {
		const err = new Error("fecha_hasta debe ser mayor o igual a fecha_desde");
		err.code = "INVALID_INPUT";
		throw err;
	}
	const days = eachCalendarDay(fd, fh);
	if (days.length === 0) {
		const err = new Error("Rango de fechas inválido");
		err.code = "INVALID_INPUT";
		throw err;
	}
	if (days.length > MAX_SOLICITUD_RANGE_DAYS) {
		const err = new Error(
			`El rango máximo permitido es de ${MAX_SOLICITUD_RANGE_DAYS} días`,
		);
		err.code = "INVALID_INPUT";
		throw err;
	}
	const horaCheck = validateMacroHoraRange(hora_inicio, hora_fin);
	if (!horaCheck.ok) {
		const err = new Error(horaCheck.message);
		err.code = "INVALID_INPUT";
		throw err;
	}

	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();
		for (const ecoId of id_ecos_list) {
			const [ecoRows] = await conn.execute(
				"SELECT id_eco FROM eco WHERE id_eco = ? AND activo = 1",
				[ecoId],
			);
			if (!ecoRows.length) {
				const err = new Error("Eco no encontrado o inactivo");
				err.code = "ECO_NOT_FOUND";
				throw err;
			}
		}

		/* Reemplazo de solicitudes macro pendientes solapadas: el especialista no gestiona varias
		   pendientes a la vez en la UI; si envía un nuevo rango que choca con una pendiente (0),
		   cancelamos la anterior (3) y guardamos la nueva. Rechazadas (2), procesadas (1) y
		   canceladas (3) no participan en el UPDATE. */
		await conn.execute(
			`UPDATE disponibilidad_solicitud
       SET estado = 3
       WHERE id_especialista = ?
         AND estado = 0
         AND NOT (fecha_hasta < ? OR fecha_desde > ?)
         AND hora_inicio < ?
         AND hora_fin > ?`,
			[id_especialista, fd, fh, hora_fin, hora_inicio],
		);

		const id_eco_single = id_ecos_list.length === 1 ? id_ecos_list[0] : null;
		const id_ecos_json_val =
			id_ecos_list.length > 1 ? JSON.stringify(id_ecos_list) : null;

		const id_solicitud = crypto.randomUUID();
		await conn.execute(
			`INSERT INTO disponibilidad_solicitud
        (id_solicitud, id_especialista, fecha_desde, fecha_hasta, hora_inicio, hora_fin, id_eco, id_ecos_json, es_manual, estado, creado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
			[
				id_solicitud,
				id_especialista,
				fd,
				fh,
				hora_inicio,
				hora_fin,
				id_eco_single,
				id_ecos_json_val,
				es_manual ? 1 : 0,
				creado_por,
			],
		);
		await conn.commit();

		notificarAdminModeradorDisponibilidadPendiente({
			cantidad: 1,
			id_especialista,
		}).catch((e) => console.error("Error notificando solicitud macro:", e));

		return { id_solicitud };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

const listMisSolicitudesController = async ({ id_especialista, estado }) => {
	let sql = `${listSolicitudesSqlBase} WHERE s.id_especialista = ?`;
	const params = [id_especialista];
	if (estado !== undefined) {
		sql += " AND s.estado = ?";
		params.push(estado);
	}
	sql += " ORDER BY s.fecha_desde DESC, s.creado_en DESC";
	const [rows] = await pool.execute(sql, params);
	return enrichSolicitudesEcoNombres(rows);
};

const cancelSolicitudMacroController = async ({ id_solicitud, id_especialista }) => {
	const sql = `
    UPDATE disponibilidad_solicitud
    SET estado = 3
    WHERE id_solicitud = ? AND id_especialista = ? AND estado = 0
  `;
	const [res] = await pool.execute(sql, [id_solicitud, id_especialista]);
	if (res.affectedRows === 0) {
		const err = new Error("Solicitud no encontrada o no se puede cancelar");
		err.code = "NOT_FOUND";
		throw err;
	}
	return { id_solicitud, estado: 3 };
};

const approveSolicitudMacroController = async ({ id_solicitud, aprobado_por }) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		let aprobadoPorFinal = aprobado_por;
		if (aprobado_por) {
			const [userRows] = await conn.execute(
				"SELECT id_usuario FROM usuario WHERE id_usuario = ? LIMIT 1",
				[aprobado_por],
			);
			if (!userRows.length) aprobadoPorFinal = null;
		}

		const [solRows] = await conn.execute(
			`SELECT id_solicitud, id_especialista, fecha_desde, fecha_hasta, hora_inicio, hora_fin, id_eco, id_ecos_json, estado
       FROM disponibilidad_solicitud WHERE id_solicitud = ? FOR UPDATE`,
			[id_solicitud],
		);
		if (!solRows.length) {
			const err = new Error("Solicitud no encontrada");
			err.code = "NOT_FOUND";
			throw err;
		}
		const sol = solRows[0];
		if (sol.estado !== 0) {
			const err = new Error("La solicitud no está pendiente");
			err.code = "INVALID_STATE";
			throw err;
		}

		const fechaDesde = normalizeFechaForDb(sol.fecha_desde);
		const fechaHasta = normalizeFechaForDb(sol.fecha_hasta);
		const idEsp = sol.id_especialista;
		let ecosIds = [];
		if (sol.id_ecos_json) {
			try {
				const raw = sol.id_ecos_json;
				const parsed =
					typeof raw === "string" ? JSON.parse(raw) : raw;
				if (Array.isArray(parsed)) {
					ecosIds = parsed.filter(Boolean);
				}
			} catch (_) {
				ecosIds = [];
			}
		}
		if (!ecosIds.length && sol.id_eco) {
			ecosIds = [sol.id_eco];
		}
		if (!ecosIds.length) {
			const err = new Error(
				"La solicitud no tiene equipos (eco) asociados; no se puede aprobar",
			);
			err.code = "INVALID_STATE";
			throw err;
		}

		const slots = slots20EnRangoDiario(sol.hora_inicio, sol.hora_fin);
		const dias = eachCalendarDay(fechaDesde, fechaHasta);

		let bloques_creados = 0;
		let bloques_omitidos = 0;
		const ids_creados = [];

		for (const idEco of ecosIds) {
			for (const fecha of dias) {
				for (const slot of slots) {
					const ocupado = await hasSlotEcoOccupied(conn, {
						fecha,
						hora_inicio: slot.hora_inicio,
						hora_fin: slot.hora_fin,
						id_eco: idEco,
					});
					if (ocupado) {
						bloques_omitidos += 1;
						continue;
					}
					const id_disponibilidad = crypto.randomUUID();
					await conn.execute(
						`INSERT INTO disponibilidad
            (id_disponibilidad, id_especialista, fecha, hora_inicio, hora_fin, id_eco, id_solicitud, estado, creado_por, aprobado_por)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
						[
							id_disponibilidad,
							idEsp,
							fecha,
							slot.hora_inicio,
							slot.hora_fin,
							idEco,
							id_solicitud,
							idEsp,
							aprobadoPorFinal,
						],
					);
					bloques_creados += 1;
					ids_creados.push(id_disponibilidad);
				}
			}
		}

		await conn.execute(
			`UPDATE disponibilidad_solicitud SET estado = 1, aprobado_por = ? WHERE id_solicitud = ?`,
			[aprobadoPorFinal, id_solicitud],
		);

		await conn.commit();
		return {
			id_solicitud,
			bloques_creados,
			bloques_omitidos,
			ids_creados,
		};
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

const rejectSolicitudMacroController = async ({ id_solicitud, aprobado_por }) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();
		let aprobadoPorFinal = aprobado_por;
		if (aprobado_por) {
			const [userRows] = await conn.execute(
				"SELECT id_usuario FROM usuario WHERE id_usuario = ? LIMIT 1",
				[aprobado_por],
			);
			if (!userRows.length) aprobadoPorFinal = null;
		}
		const [res] = await conn.execute(
			`UPDATE disponibilidad_solicitud SET estado = 2, aprobado_por = ? WHERE id_solicitud = ? AND estado = 0`,
			[aprobadoPorFinal, id_solicitud],
		);
		if (res.affectedRows === 0) {
			const err = new Error("Solicitud no encontrada o no está pendiente");
			err.code = "NOT_FOUND";
			throw err;
		}
		await conn.commit();
		return { id_solicitud, estado: 2 };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

const createSolicitudMacroManualController = async (params) =>
	createSolicitudMacroController({ ...params, es_manual: true });

const listPendientesController = async () => {
	const sqlBloques = `
    SELECT
      d.id_disponibilidad,
      d.id_especialista,
      d.fecha,
      d.hora_inicio,
      d.hora_fin,
      d.id_eco,
      d.estado,
      u.nombre,
      u.apellido,
      es.nombre AS especialidad,
      e.nombre AS eco_nombre
    FROM disponibilidad d
    INNER JOIN usuario u ON u.id_usuario = d.id_especialista
    INNER JOIN especialista esp ON esp.id_especialista = d.id_especialista
    INNER JOIN especialidad es ON es.id_especialidad = esp.id_especialidad
    LEFT JOIN eco e ON e.id_eco = d.id_eco
    WHERE d.estado = 0
    ORDER BY d.fecha ASC, d.hora_inicio ASC
  `;
	const sqlSolicitudes = `${listSolicitudesSqlBase} WHERE s.estado = 0 ORDER BY s.fecha_desde ASC, s.creado_en ASC`;
	const [bloques] = await pool.execute(sqlBloques);
	const [solicitudesRaw] = await pool.execute(sqlSolicitudes);
	const solicitudes = await enrichSolicitudesEcoNombres(solicitudesRaw);
	const out = [
		...solicitudes.map((s) => ({ ...s, tipo: "solicitud_macro" })),
		...bloques.map((b) => ({ ...b, tipo: "bloque" })),
	];
	return out;
};

const listDisponibilidadesAdminController = async ({ estado }) => {
	let sql = `
		SELECT
			d.id_disponibilidad,
			d.id_especialista,
			d.fecha,
			d.hora_inicio,
			d.hora_fin,
			d.id_eco,
			d.estado,
			u.nombre,
			u.apellido,
			es.nombre AS especialidad,
			e.nombre AS eco_nombre
		FROM disponibilidad d
		INNER JOIN usuario u ON u.id_usuario = d.id_especialista
		INNER JOIN especialista esp ON esp.id_especialista = d.id_especialista
		INNER JOIN especialidad es ON es.id_especialidad = esp.id_especialidad
		LEFT JOIN eco e ON e.id_eco = d.id_eco
	`;
	const params = [];
	if (estado !== undefined) {
		sql += " WHERE d.estado = ?";
		params.push(estado);
	}
	sql += " ORDER BY d.fecha ASC, d.hora_inicio ASC";
	const [bloques] = await pool.execute(sql, params);

	let sqlSol = `${listSolicitudesSqlBase} `;
	const paramsSol = [];
	if (estado !== undefined) {
		sqlSol += " WHERE s.estado = ?";
		paramsSol.push(estado);
	}
	sqlSol += " ORDER BY s.fecha_desde ASC, s.creado_en DESC";
	const [solicitudesRaw] = await pool.execute(sqlSol, paramsSol);
	const solicitudes = await enrichSolicitudesEcoNombres(solicitudesRaw);

	return {
		bloques,
		solicitudes,
	};
};

const approveDisponibilidadController = async ({
	id_disponibilidad,
	aprobado_por,
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// Validar que el usuario que aprueba existe en la base de datos
		let aprobadoPorFinal = aprobado_por;
		if (aprobado_por) {
			const [userRows] = await conn.execute(
				"SELECT id_usuario FROM usuario WHERE id_usuario = ? LIMIT 1",
				[aprobado_por],
			);
			if (!userRows.length) {
				// Si el usuario no existe, establecer como NULL en lugar de fallar
				// Esto puede pasar si el token tiene un ID inválido
				console.warn(
					`Usuario con ID ${aprobado_por} no encontrado en la base de datos. Aprobando sin registrar aprobado_por.`,
				);
				aprobadoPorFinal = null;
			}
		}

		const [rows] = await conn.execute(
			"SELECT id_especialista, fecha, hora_inicio, hora_fin, estado, id_eco FROM disponibilidad WHERE id_disponibilidad = ? LIMIT 1",
			[id_disponibilidad],
		);
		if (!rows.length) {
			const err = new Error("Disponibilidad no encontrada");
			err.code = "NOT_FOUND";
			throw err;
		}
		const bloque = rows[0];
		if (bloque.estado !== 0) {
			const err = new Error(
				"Solo se puede aprobar si está en estado propuesto",
			);
			err.code = "INVALID_STATE";
			throw err;
		}

		const fechaNorm = normalizeFechaForDb(bloque.fecha);

		// Mismo especialista: no aprobar si choca con un bloque suyo que ya tiene cita (4).
		const overlapCita = await hasOverlap(conn, {
			id_especialista: bloque.id_especialista,
			fecha: fechaNorm,
			hora_inicio: bloque.hora_inicio,
			hora_fin: bloque.hora_fin,
			estados: [4],
		});
		if (overlapCita) {
			const err = new Error("Bloque se solapa con una cita existente");
			err.code = "OVERLAP";
			throw err;
		}

		// Otro especialista ya ocupa ese tramo en el mismo eco (recurso único): archivar como rechazado.
		const ocupadoPorOtro = await hasOverlapOtherSpecialistOccupied(conn, {
			id_especialista: bloque.id_especialista,
			fecha: fechaNorm,
			hora_inicio: bloque.hora_inicio,
			hora_fin: bloque.hora_fin,
			id_eco: bloque.id_eco ?? null,
		});

		if (ocupadoPorOtro) {
			await conn.execute(
				"UPDATE disponibilidad SET estado = 2, aprobado_por = ? WHERE id_disponibilidad = ?",
				[aprobadoPorFinal, id_disponibilidad],
			);
			await conn.commit();
			return {
				id_disponibilidad,
				estado: 2,
				rechazo_automatico: true,
				message:
					"Ese horario ya está asignado a otro especialista en el mismo equipo; se registró como rechazado.",
			};
		}

		await conn.execute(
			"UPDATE disponibilidad SET estado = 1, aprobado_por = ? WHERE id_disponibilidad = ?",
			[aprobadoPorFinal, id_disponibilidad],
		);

		await conn.commit();
		return { id_disponibilidad, estado: 1 };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

/**
 * Aprobar múltiples bloques en una sola transacción.
 * @param {Object} params
 * @param {string[]} params.ids - id_disponibilidad
 * @param {string|null} params.aprobado_por
 * @returns {{ aprobados: number, ids: string[], rechazados_automatico: number, ids_rechazados_automatico: string[] }}
 */
const approveDisponibilidadBatchController = async ({ ids, aprobado_por }) => {
	if (!Array.isArray(ids) || ids.length === 0) {
		const err = new Error("Se requiere al menos un id");
		err.code = "INVALID_INPUT";
		throw err;
	}
	const uniqueIds = [...new Set(ids)];
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();
		let aprobadoPorFinal = aprobado_por;
		if (aprobado_por) {
			const [userRows] = await conn.execute(
				"SELECT id_usuario FROM usuario WHERE id_usuario = ? LIMIT 1",
				[aprobado_por],
			);
			if (!userRows.length) aprobadoPorFinal = null;
		}
		const placeholders = uniqueIds.map(() => "?").join(",");
		const [allRows] = await conn.execute(
			`SELECT id_disponibilidad, id_especialista, fecha, hora_inicio, hora_fin, estado, id_eco FROM disponibilidad WHERE id_disponibilidad IN (${placeholders})`,
			uniqueIds,
		);
		const byId = new Map(
			allRows.map((r) => [String(r.id_disponibilidad), r]),
		);
		for (const id of uniqueIds) {
			if (!byId.has(String(id))) {
				const err = new Error(`Disponibilidad no encontrada: ${id}`);
				err.code = "NOT_FOUND";
				err.id = id;
				throw err;
			}
		}
		const sortedIds = [...uniqueIds].sort((a, b) => {
			const ra = byId.get(String(a));
			const rb = byId.get(String(b));
			const fa = normalizeFechaForDb(ra.fecha);
			const fb = normalizeFechaForDb(rb.fecha);
			if (fa !== fb) return fa.localeCompare(fb);
			const ta = String(ra.hora_inicio);
			const tb = String(rb.hora_inicio);
			if (ta !== tb) return ta.localeCompare(tb);
			return String(a).localeCompare(String(b));
		});

		const aprobados = [];
		const rechazados_automatico = [];
		for (const id_disponibilidad of sortedIds) {
			const bloque = byId.get(String(id_disponibilidad));
			if (bloque.estado !== 0) {
				const err = new Error(
					`Solo se puede aprobar si está en estado propuesto: ${id_disponibilidad}`,
				);
				err.code = "INVALID_STATE";
				err.id = id_disponibilidad;
				throw err;
			}
			const fechaNorm = normalizeFechaForDb(bloque.fecha);
			const overlapCita = await hasOverlap(conn, {
				id_especialista: bloque.id_especialista,
				fecha: fechaNorm,
				hora_inicio: bloque.hora_inicio,
				hora_fin: bloque.hora_fin,
				estados: [4],
			});
			if (overlapCita) {
				const err = new Error(
					`Bloque se solapa con una cita existente: ${id_disponibilidad}`,
				);
				err.code = "OVERLAP";
				err.id = id_disponibilidad;
				throw err;
			}
			const ocupadoPorOtro = await hasOverlapOtherSpecialistOccupied(conn, {
				id_especialista: bloque.id_especialista,
				fecha: fechaNorm,
				hora_inicio: bloque.hora_inicio,
				hora_fin: bloque.hora_fin,
				id_eco: bloque.id_eco ?? null,
			});
			if (ocupadoPorOtro) {
				await conn.execute(
					"UPDATE disponibilidad SET estado = 2, aprobado_por = ? WHERE id_disponibilidad = ?",
					[aprobadoPorFinal, id_disponibilidad],
				);
				rechazados_automatico.push(id_disponibilidad);
				continue;
			}
			await conn.execute(
				"UPDATE disponibilidad SET estado = 1, aprobado_por = ? WHERE id_disponibilidad = ?",
				[aprobadoPorFinal, id_disponibilidad],
			);
			aprobados.push(id_disponibilidad);
		}
		await conn.commit();
		return {
			aprobados: aprobados.length,
			ids: aprobados,
			rechazados_automatico: rechazados_automatico.length,
			ids_rechazados_automatico: rechazados_automatico,
		};
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

const rejectDisponibilidadController = async ({
	id_disponibilidad,
	aprobado_por,
}) => {
	const sql = `
    UPDATE disponibilidad
    SET estado = 2, aprobado_por = ?
    WHERE id_disponibilidad = ? AND estado = 0
  `;
	const [result] = await pool.execute(sql, [aprobado_por, id_disponibilidad]);
	return { updated: result.affectedRows, id_disponibilidad, estado: 2 };
};

const cancelDisponibilidadController = async ({
	id_disponibilidad,
	id_especialista,
}) => {
	const conn = await pool.getConnection();
	try {
		const [rows] = await conn.execute(
			`SELECT estado FROM disponibilidad
       WHERE id_disponibilidad = ? AND id_especialista = ?
       LIMIT 1`,
			[id_disponibilidad, id_especialista],
		);
		if (!rows.length) return { updated: 0 };

		if (rows[0].estado === 4) {
			const err = new Error("Bloque reservado no se puede cancelar");
			err.code = "RESERVED";
			throw err;
		}

		const sql = `
      UPDATE disponibilidad
      SET estado = 3
      WHERE id_disponibilidad = ?
        AND id_especialista = ?
        AND estado IN (0, 1)
    `;
		const [result] = await conn.execute(sql, [
			id_disponibilidad,
			id_especialista,
		]);
		return { updated: result.affectedRows, id_disponibilidad, estado: 3 };
	} finally {
		conn.release();
	}
};

const cancelDisponibilidadAdminController = async ({ id_disponibilidad }) => {
	const conn = await pool.getConnection();
	try {
		const [rows] = await conn.execute(
			`SELECT estado FROM disponibilidad
       WHERE id_disponibilidad = ?
       LIMIT 1`,
			[id_disponibilidad],
		);
		if (!rows.length) return { updated: 0 };

		if (rows[0].estado === 4) {
			const err = new Error("Bloque reservado no se puede cancelar");
			err.code = "RESERVED";
			throw err;
		}

		const sql = `
      UPDATE disponibilidad
      SET estado = 3
      WHERE id_disponibilidad = ?
        AND estado IN (0, 1)
    `;
		const [result] = await conn.execute(sql, [id_disponibilidad]);
		return { updated: result.affectedRows, id_disponibilidad, estado: 3 };
	} finally {
		conn.release();
	}
};

const cancelDisponibilidadBatchController = async ({ ids }) => {
	if (!Array.isArray(ids) || ids.length === 0) {
		const err = new Error("ids debe ser un array con al menos un id");
		err.code = "INVALID_INPUT";
		throw err;
	}
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();
		const cancelados = [];
		const reservados = [];
		const omitidos = [];
		const no_encontrados = [];

		for (const id_disponibilidad of ids) {
			const [rows] = await conn.execute(
				"SELECT estado FROM disponibilidad WHERE id_disponibilidad = ? LIMIT 1",
				[id_disponibilidad],
			);
			if (!rows.length) {
				no_encontrados.push(id_disponibilidad);
				continue;
			}
			const estado = rows[0].estado;
			if (estado === 4) {
				reservados.push(id_disponibilidad);
				continue;
			}
			if (estado !== 0 && estado !== 1) {
				omitidos.push(id_disponibilidad);
				continue;
			}
			await conn.execute(
				"UPDATE disponibilidad SET estado = 3 WHERE id_disponibilidad = ?",
				[id_disponibilidad],
			);
			cancelados.push(id_disponibilidad);
		}

		await conn.commit();
		return {
			cancelados: cancelados.length,
			ids: cancelados,
			reservados,
			omitidos,
			no_encontrados,
		};
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

const listPublicaController = async ({ id_especialista, fecha }) => {
	let sql = `
    SELECT
      d.id_disponibilidad,
      d.fecha,
      d.hora_inicio,
      d.hora_fin,
      d.id_eco,
      e.nombre AS eco_nombre
    FROM disponibilidad d
    LEFT JOIN eco e ON e.id_eco = d.id_eco
    WHERE d.estado = 1
      AND d.id_especialista = ?
  `;
	const params = [id_especialista];
	if (fecha) {
		sql += " AND d.fecha = ?";
		params.push(fecha);
	}
	sql += `
      AND (
        d.fecha > CURDATE()
        OR (
          d.fecha = CURDATE()
          AND CURTIME() < '17:00:00'
          AND d.hora_inicio > CURTIME()
        )
      )
    ORDER BY d.hora_inicio ASC
  `;
	const [rows] = await pool.execute(sql, params);
	return rows;
};

// Disponibilidad pública filtrada por id_eco: bloques aprobados con datos del especialista
const listPublicaPorEcoController = async ({ id_eco, fecha }) => {
	let sql = `
    SELECT
      d.id_disponibilidad,
      d.fecha,
      d.hora_inicio,
      d.hora_fin,
      d.id_eco,
      e.nombre AS eco_nombre,
      d.id_especialista,
      u.nombre AS especialista_nombre,
      u.apellido AS especialista_apellido,
      es.nombre AS especialidad_nombre
    FROM disponibilidad d
    INNER JOIN usuario u ON u.id_usuario = d.id_especialista
    INNER JOIN especialista esp ON esp.id_especialista = d.id_especialista
    INNER JOIN especialidad es ON es.id_especialidad = esp.id_especialidad
    LEFT JOIN eco e ON e.id_eco = d.id_eco
    WHERE d.estado = 1
      AND d.id_eco = ?
  `;
	const params = [id_eco];
	if (fecha) {
		sql += " AND d.fecha = ?";
		params.push(fecha);
	}
	sql += `
      AND (
        d.fecha > CURDATE()
        OR (
          d.fecha = CURDATE()
          AND CURTIME() < '17:00:00'
          AND d.hora_inicio > CURTIME()
        )
      )
    ORDER BY d.fecha ASC, d.hora_inicio ASC
  `;
	const [rows] = await pool.execute(sql, params);
	return rows;
};

const closeDisponibilidadDiaController = async ({
	id_especialista,
	fecha,
	cerrado_por,
}) => {
	const sql = `
    UPDATE disponibilidad
    SET estado = 3, aprobado_por = ?
    WHERE id_especialista = ?
      AND fecha = ?
      AND estado IN (0, 1)
  `;
	const [result] = await pool.execute(sql, [
		cerrado_por,
		id_especialista,
		fecha,
	]);
	return { updated: result.affectedRows, id_especialista, fecha };
};

// Obtener todas las disponibilidades de un especialista (aprobadas y pendientes) - para moderador/admin
const listDisponibilidadesByEspecialistaController = async (
	id_especialista,
) => {
	const sql = `
    SELECT
      d.id_disponibilidad,
      d.fecha,
      d.hora_inicio,
      d.hora_fin,
      d.id_eco,
      d.estado,
      e.nombre AS eco_nombre
    FROM disponibilidad d
    LEFT JOIN eco e ON e.id_eco = d.id_eco
    WHERE d.id_especialista = ?
      AND d.estado IN (0, 1) -- Solo pendientes y aprobadas
    ORDER BY d.fecha ASC, d.hora_inicio ASC
  `;
	const [rows] = await pool.execute(sql, [id_especialista]);
	return rows;
};

// Obtener todas las disponibilidades de un día específico (para moderador)
const listDisponibilidadesByFechaController = async (fecha) => {
	const sql = `
    SELECT
      d.id_disponibilidad,
      d.id_especialista,
      d.fecha,
      d.hora_inicio,
      d.hora_fin,
      d.id_eco,
      d.estado,
      u.nombre,
      u.apellido,
      es.nombre AS especialidad,
      e.nombre AS eco_nombre
    FROM disponibilidad d
    INNER JOIN usuario u ON u.id_usuario = d.id_especialista
    INNER JOIN especialista esp ON esp.id_especialista = d.id_especialista
    INNER JOIN especialidad es ON es.id_especialidad = esp.id_especialidad
    LEFT JOIN eco e ON e.id_eco = d.id_eco
    WHERE d.fecha = ?
    ORDER BY d.hora_inicio ASC
  `;
	const [rows] = await pool.execute(sql, [fecha]);
	return rows;
};

/**
 * Normaliza hora "HH:mm" o "HH:mm:ss" a "HH:mm:ss" para comparar en BD.
 */
const normalizeHora = (h) => {
	if (!h || typeof h !== "string") return null;
	const parts = h.trim().split(":");
	if (parts.length >= 2) {
		const hh = parts[0].padStart(2, "0");
		const mm = (parts[1] || "00").padStart(2, "0");
		const ss = (parts[2] || "00").padStart(2, "0");
		return `${hh}:${mm}:${ss}`;
	}
	return null;
};

/**
 * Aprobar todas las disponibilidades pendientes que coincidan con los criterios
 * (especialista, rango de fechas y/o rango de horas). Útil cuando un especialista solicita
 * muchos bloques (ej. 2 días todo el día y todos los ecos).
 * @param {Object} params
 * @param {string} [params.id_especialista]
 * @param {string} [params.fecha_desde] YYYY-MM-DD
 * @param {string} [params.fecha_hasta] YYYY-MM-DD
 * @param {string} [params.hora_desde] HH:mm o HH:mm:ss
 * @param {string} [params.hora_hasta] HH:mm o HH:mm:ss
 * @param {string|null} [params.aprobado_por]
 * @returns {{ aprobados: number, ids: string[] }}
 */
const approveDisponibilidadPorCriteriosController = async ({
	id_especialista,
	fecha_desde,
	fecha_hasta,
	hora_desde,
	hora_hasta,
	aprobado_por,
}) => {
	if (
		!id_especialista &&
		!fecha_desde &&
		!fecha_hasta &&
		!normalizeHora(hora_desde) &&
		!normalizeHora(hora_hasta)
	) {
		const err = new Error(
			"Debe indicar al menos un criterio: id_especialista, fecha_desde, fecha_hasta, hora_desde o hora_hasta",
		);
		err.code = "INVALID_INPUT";
		throw err;
	}
	const conditions = ["d.estado = 0"];
	const params = [];
	if (id_especialista) {
		conditions.push("d.id_especialista = ?");
		params.push(id_especialista);
	}
	if (fecha_desde) {
		conditions.push("d.fecha >= ?");
		params.push(fecha_desde);
	}
	if (fecha_hasta) {
		conditions.push("d.fecha <= ?");
		params.push(fecha_hasta);
	}
	const horaDesdeNorm = normalizeHora(hora_desde);
	if (horaDesdeNorm) {
		conditions.push("d.hora_inicio >= ?");
		params.push(horaDesdeNorm);
	}
	const horaHastaNorm = normalizeHora(hora_hasta);
	if (horaHastaNorm) {
		conditions.push("d.hora_fin <= ?");
		params.push(horaHastaNorm);
	}
	const whereClause = conditions.join(" AND ");
	const sql = `
    SELECT d.id_disponibilidad
    FROM disponibilidad d
    WHERE ${whereClause}
    ORDER BY d.fecha ASC, d.hora_inicio ASC
  `;
	const [rows] = await pool.execute(sql, params);
	const ids = rows.map((r) => r.id_disponibilidad);
	if (ids.length === 0) {
		return { aprobados: 0, ids: [] };
	}
	return approveDisponibilidadBatchController({ ids, aprobado_por });
};

/**
 * Elimina disponibilidades con fecha anterior a hoy que no tengan cita asignada.
 * Sirve para limpiar bloques pasados (pendientes, aprobados, cancelados, rechazados).
 * @returns {{ eliminados: number, ids: string[] }}
 */
const deleteDisponibilidadPasadaController = async () => {
	const conn = await pool.getConnection();
	try {
		const [idsRows] = await conn.execute(
			`SELECT d.id_disponibilidad
       FROM disponibilidad d
       LEFT JOIN cita c ON c.id_disponibilidad = d.id_disponibilidad
       WHERE c.id_cita IS NULL AND d.fecha < CURDATE()`,
		);
		const ids = idsRows.map((r) => r.id_disponibilidad);
		if (ids.length === 0) {
			return { eliminados: 0, ids: [] };
		}
		const placeholders = ids.map(() => "?").join(", ");
		await conn.execute(
			`DELETE FROM disponibilidad WHERE id_disponibilidad IN (${placeholders})`,
			ids,
		);
		return { eliminados: ids.length, ids };
	} finally {
		conn.release();
	}
};

/**
 * Elimina por criterios (id_especialista, fecha_desde, fecha_hasta, hora_desde, hora_hasta)
 * solo las que NO tienen cita asignada. Reutiliza la lógica de filtros de aprobación.
 * @returns {{ eliminados: number, ids: string[], con_cita_omitidos: number }}
 */
const deleteDisponibilidadPorCriteriosController = async ({
	id_especialista,
	fecha_desde,
	fecha_hasta,
	hora_desde,
	hora_hasta,
}) => {
	if (
		!id_especialista &&
		!fecha_desde &&
		!fecha_hasta &&
		!normalizeHora(hora_desde) &&
		!normalizeHora(hora_hasta)
	) {
		const err = new Error(
			"Debe indicar al menos un criterio: id_especialista, fecha_desde, fecha_hasta, hora_desde o hora_hasta",
		);
		err.code = "INVALID_INPUT";
		throw err;
	}
	const conditions = ["c.id_cita IS NULL"];
	const params = [];
	if (id_especialista) {
		conditions.push("d.id_especialista = ?");
		params.push(id_especialista);
	}
	if (fecha_desde) {
		conditions.push("d.fecha >= ?");
		params.push(fecha_desde);
	}
	if (fecha_hasta) {
		conditions.push("d.fecha <= ?");
		params.push(fecha_hasta);
	}
	const horaDesdeNorm = normalizeHora(hora_desde);
	if (horaDesdeNorm) {
		conditions.push("d.hora_inicio >= ?");
		params.push(horaDesdeNorm);
	}
	const horaHastaNorm = normalizeHora(hora_hasta);
	if (horaHastaNorm) {
		conditions.push("d.hora_fin <= ?");
		params.push(horaHastaNorm);
	}
	const whereClause = conditions.join(" AND ");
	const sql = `
    SELECT d.id_disponibilidad
    FROM disponibilidad d
    LEFT JOIN cita c ON c.id_disponibilidad = d.id_disponibilidad
    WHERE ${whereClause}
    ORDER BY d.fecha ASC, d.hora_inicio ASC
  `;
	const [rows] = await pool.execute(sql, params);
	const ids = rows.map((r) => r.id_disponibilidad);
	if (ids.length === 0) {
		return { eliminados: 0, ids: [], con_cita_omitidos: 0 };
	}
	const conn = await pool.getConnection();
	try {
		const placeholders = ids.map(() => "?").join(", ");
		await conn.execute(
			`DELETE FROM disponibilidad WHERE id_disponibilidad IN (${placeholders})`,
			ids,
		);
		return { eliminados: ids.length, ids, con_cita_omitidos: 0 };
	} finally {
		conn.release();
	}
};

// Disponibilidad pública filtrada SOLO por fecha: todos los ecos y especialistas aprobados
const listPublicaPorFechaController = async ({ fecha }) => {
	const sql = `
    SELECT
      d.id_disponibilidad,
      d.fecha,
      d.hora_inicio,
      d.hora_fin,
      d.id_eco,
      e.nombre AS eco_nombre,
      d.id_especialista,
      u.nombre AS especialista_nombre,
      u.apellido AS especialista_apellido,
      es.nombre AS especialidad_nombre
    FROM disponibilidad d
    INNER JOIN usuario u ON u.id_usuario = d.id_especialista
    INNER JOIN especialista esp ON esp.id_especialista = d.id_especialista
    INNER JOIN especialidad es ON es.id_especialidad = esp.id_especialidad
    LEFT JOIN eco e ON e.id_eco = d.id_eco
    WHERE d.estado = 1
      AND d.fecha = ?
      AND d.id_eco IS NOT NULL
      AND (
        d.fecha > CURDATE()
        OR (
          d.fecha = CURDATE()
          AND d.hora_inicio > CURTIME()
        )
      )
    ORDER BY e.nombre ASC, d.hora_inicio ASC
  `;
	const [rows] = await pool.execute(sql, [fecha]);
	return rows;
};

module.exports = {
	createDisponibilidadController,
	createDisponibilidadBatchController,
	createSolicitudMacroController,
	createSolicitudMacroManualController,
	listMisDisponibilidadController,
	listMisSolicitudesController,
	cancelSolicitudMacroController,
	approveSolicitudMacroController,
	rejectSolicitudMacroController,
	listPendientesController,
	listDisponibilidadesAdminController,
	approveDisponibilidadController,
	approveDisponibilidadBatchController,
	approveDisponibilidadPorCriteriosController,
	rejectDisponibilidadController,
	cancelDisponibilidadController,
	cancelDisponibilidadAdminController,
	cancelDisponibilidadBatchController,
	listPublicaController,
	listPublicaPorEcoController,
	closeDisponibilidadDiaController,
	listDisponibilidadesByFechaController,
	listDisponibilidadesByEspecialistaController,
	listPublicaPorFechaController,
	deleteDisponibilidadPasadaController,
	deleteDisponibilidadPorCriteriosController,
};
