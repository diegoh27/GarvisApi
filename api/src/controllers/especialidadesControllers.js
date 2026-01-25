const { pool } = require("../db");
const crypto = require("crypto");

const listEspecialidadesController = async () => {
	const sql = `
    SELECT id_especialidad, nombre
    FROM especialidad
    ORDER BY nombre ASC
  `;
	const [rows] = await pool.execute(sql);
	return rows;
};

const createEspecialidadController = async ({ nombre }) => {
	const id_especialidad = crypto.randomUUID();
	const sql = `
    INSERT INTO especialidad (id_especialidad, nombre)
    VALUES (?, ?)
  `;
	await pool.execute(sql, [id_especialidad, nombre]);
	return { id_especialidad, nombre };
};

const updateEspecialidadController = async ({ id_especialidad, nombre }) => {
	const sql = `
    UPDATE especialidad
    SET nombre = ?
    WHERE id_especialidad = ?
  `;
	const [result] = await pool.execute(sql, [nombre, id_especialidad]);
	return { updated: result.affectedRows, id_especialidad, nombre };
};

const deleteEspecialidadController = async (id_especialidad) => {
	const [rows] = await pool.execute(
		"SELECT COUNT(*) AS total FROM especialista WHERE id_especialidad = ?",
		[id_especialidad],
	);
	if (rows[0].total > 0) {
		const err = new Error("No se puede eliminar: hay especialistas asociados");
		err.code = "IN_USE";
		throw err;
	}

	const [result] = await pool.execute(
		"DELETE FROM especialidad WHERE id_especialidad = ?",
		[id_especialidad],
	);
	return { deleted: result.affectedRows, id_especialidad };
};

module.exports = {
	listEspecialidadesController,
	createEspecialidadController,
	updateEspecialidadController,
	deleteEspecialidadController,
};
