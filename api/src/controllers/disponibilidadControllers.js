const { pool } = require("../db");
const crypto = require("crypto");

const hasOverlap = async (conn, { id_especialista, fecha, hora_inicio, hora_fin, estados }) => {
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

const createDisponibilidadController = async ({
	id_especialista,
	fecha,
	hora_inicio,
	hora_fin,
	creado_por,
	id_eco,
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();
		
		// Validar que el eco existe si se proporciona
		if (id_eco) {
			const [ecoRows] = await conn.execute(
				"SELECT id_eco FROM eco WHERE id_eco = ? AND activo = 1",
				[id_eco]
			);
			if (!ecoRows.length) {
				const err = new Error("Eco no encontrado o inactivo");
				err.code = "ECO_NOT_FOUND";
				throw err;
			}
		}

		const overlap = await hasOverlap(conn, {
			id_especialista,
			fecha,
			hora_inicio,
			hora_fin,
			estados: [0, 1, 4],
		});
		if (overlap) {
			const err = new Error("Bloque se solapa con otro existente");
			err.code = "OVERLAP";
			throw err;
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
			fecha,
			hora_inicio,
			hora_fin,
			id_eco || null,
			creado_por,
		]);

		await conn.commit();
		return {
			id_disponibilidad,
			id_especialista,
			fecha,
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

const listPendientesController = async () => {
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
    WHERE d.estado = 0
    ORDER BY d.fecha ASC, d.hora_inicio ASC
  `;
	const [rows] = await pool.execute(sql);
	return rows;
};

const approveDisponibilidadController = async ({ id_disponibilidad, aprobado_por }) => {
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
				console.warn(`Usuario con ID ${aprobado_por} no encontrado en la base de datos. Aprobando sin registrar aprobado_por.`);
				aprobadoPorFinal = null;
			}
		}

		const [rows] = await conn.execute(
			"SELECT id_especialista, fecha, hora_inicio, hora_fin, estado FROM disponibilidad WHERE id_disponibilidad = ? LIMIT 1",
			[id_disponibilidad],
		);
		if (!rows.length) {
			const err = new Error("Disponibilidad no encontrada");
			err.code = "NOT_FOUND";
			throw err;
		}
		const bloque = rows[0];
		if (bloque.estado !== 0) {
			const err = new Error("Solo se puede aprobar si está en estado propuesto");
			err.code = "INVALID_STATE";
			throw err;
		}

		const overlap = await hasOverlap(conn, {
			id_especialista: bloque.id_especialista,
			fecha: bloque.fecha,
			hora_inicio: bloque.hora_inicio,
			hora_fin: bloque.hora_fin,
			estados: [1, 4],
		});
		if (overlap) {
			const err = new Error("Bloque se solapa con otro aprobado");
			err.code = "OVERLAP";
			throw err;
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

const rejectDisponibilidadController = async ({ id_disponibilidad, aprobado_por }) => {
	const sql = `
    UPDATE disponibilidad
    SET estado = 2, aprobado_por = ?
    WHERE id_disponibilidad = ? AND estado = 0
  `;
	const [result] = await pool.execute(sql, [aprobado_por, id_disponibilidad]);
	return { updated: result.affectedRows, id_disponibilidad, estado: 2 };
};

const cancelDisponibilidadController = async ({ id_disponibilidad, id_especialista }) => {
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
		const [result] = await conn.execute(sql, [id_disponibilidad, id_especialista]);
		return { updated: result.affectedRows, id_disponibilidad, estado: 3 };
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
const listDisponibilidadesByEspecialistaController = async (id_especialista) => {
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

module.exports = {
	createDisponibilidadController,
	listMisDisponibilidadController,
	listPendientesController,
	approveDisponibilidadController,
	rejectDisponibilidadController,
	cancelDisponibilidadController,
	listPublicaController,
	closeDisponibilidadDiaController,
	listDisponibilidadesByFechaController,
	listDisponibilidadesByEspecialistaController,
};
