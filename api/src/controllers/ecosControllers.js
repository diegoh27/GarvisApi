const { pool } = require("../db");
const crypto = require("crypto");

const listEcosController = async () => {
	const sql = `
    SELECT
      id_eco,
      nombre,
      precio,
      duracion_min,
      activo
    FROM eco
    WHERE activo = 1
    ORDER BY nombre ASC
  `;
	const [rows] = await pool.execute(sql);
	return rows;
};

const createEcoController = async ({ nombre, precio, duracion_min }) => {
	const id_eco = crypto.randomUUID();
	const sql = `
    INSERT INTO eco (id_eco, nombre, precio, duracion_min, activo)
    VALUES (?, ?, ?, ?, 1)
  `;
	await pool.execute(sql, [id_eco, nombre, precio, duracion_min || 0]);
	return { id_eco, nombre, precio, duracion_min: duracion_min || 0 };
};

const updateEcoController = async ({ id_eco, nombre, precio, duracion_min, activo }) => {
	const updates = [];
	const params = [];

	if (nombre !== undefined) {
		updates.push("nombre = ?");
		params.push(nombre);
	}
	if (precio !== undefined) {
		updates.push("precio = ?");
		params.push(precio);
	}
	if (duracion_min !== undefined) {
		updates.push("duracion_min = ?");
		params.push(duracion_min);
	}
	if (activo !== undefined) {
		updates.push("activo = ?");
		params.push(activo);
	}

	if (!updates.length) {
		const err = new Error("No hay campos para actualizar");
		err.code = "NO_FIELDS";
		throw err;
	}

	const sql = `
    UPDATE eco
    SET ${updates.join(", ")}
    WHERE id_eco = ?
  `;
	params.push(id_eco);
	const [result] = await pool.execute(sql, params);
	return { updated: result.affectedRows, id_eco };
};

const deleteEcoController = async (id_eco) => {
	// Verificar si hay citas que usan este eco
	const [citasRows] = await pool.execute(
		"SELECT COUNT(*) AS total FROM cita WHERE id_eco = ?",
		[id_eco]
	);
	if (citasRows[0].total > 0) {
		const err = new Error("No se puede eliminar: hay citas asociadas");
		err.code = "IN_USE";
		throw err;
	}

	const [result] = await pool.execute("DELETE FROM eco WHERE id_eco = ?", [id_eco]);
	return { deleted: result.affectedRows, id_eco };
};

module.exports = {
	listEcosController,
	createEcoController,
	updateEcoController,
	deleteEcoController,
};
