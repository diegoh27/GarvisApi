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
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();
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
        (id_disponibilidad, id_especialista, fecha, hora_inicio, hora_fin, estado, creado_por)
      VALUES
        (?, ?, ?, ?, ?, 0, ?)
    `;
		await conn.execute(sql, [
			id_disponibilidad,
			id_especialista,
			fecha,
			hora_inicio,
			hora_fin,
			creado_por,
		]);

		await conn.commit();
		return {
			id_disponibilidad,
			id_especialista,
			fecha,
			hora_inicio,
			hora_fin,
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
      d.estado,
      d.creado_en,
      d.actualizado_en
    FROM disponibilidad d
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
      d.estado,
      u.nombre,
      u.apellido,
      es.nombre AS especialidad
    FROM disponibilidad d
    INNER JOIN usuario u ON u.id_usuario = d.id_especialista
    INNER JOIN especialista e ON e.id_especialista = d.id_especialista
    INNER JOIN especialidad es ON es.id_especialidad = e.id_especialidad
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
			[aprobado_por, id_disponibilidad],
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
      d.hora_fin
    FROM disponibilidad d
    WHERE d.estado = 1
      AND d.id_especialista = ?
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
	const params = [id_especialista];
	if (fecha) {
		sql = sql.replace("ORDER BY d.hora_inicio ASC", "AND d.fecha = ? ORDER BY d.hora_inicio ASC");
		params.push(fecha);
	}
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

module.exports = {
	createDisponibilidadController,
	listMisDisponibilidadController,
	listPendientesController,
	approveDisponibilidadController,
	rejectDisponibilidadController,
	cancelDisponibilidadController,
	listPublicaController,
	closeDisponibilidadDiaController,
};
