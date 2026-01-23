const { pool } = require("../db");
const crypto = require("crypto");

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
			`SELECT id_especialista, fecha, hora_inicio, estado
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

		await conn.execute(
			"UPDATE disponibilidad SET estado = 4 WHERE id_disponibilidad = ?",
			[id_disponibilidad],
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
      u.nombre AS especialista_nombre,
      u.apellido AS especialista_apellido,
      e.nombre AS eco_nombre
    FROM cita c
    INNER JOIN usuario u ON u.id_usuario = c.id_especialista
    INNER JOIN eco e ON e.id_eco = c.id_eco
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
      u.nombre AS paciente_nombre,
      u.apellido AS paciente_apellido,
      e.nombre AS eco_nombre
    FROM cita c
    INNER JOIN usuario u ON u.id_usuario = c.id_paciente
    INNER JOIN eco e ON e.id_eco = c.id_eco
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
			[id_cita],
		);
		if (!rows.length) {
			const err = new Error("Cita no encontrada");
			err.code = "NOT_FOUND";
			throw err;
		}

		await conn.execute(
			"UPDATE cita SET estado_cita = 2 WHERE id_cita = ?",
			[id_cita],
		);

		const { id_disponibilidad, fecha_cita } = rows[0];
		if (id_disponibilidad && fecha_cita >= new Date().toISOString().slice(0, 10)) {
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

module.exports = {
	createCitaFromDisponibilidadController,
	listCitasByPacienteController,
	listCitasByEspecialistaController,
	cancelCitaController,
};
