const { pool } = require("../db");
const crypto = require("crypto");

const listEcosController = async () => {
	const sql = `
    SELECT
      id_eco,
      nombre,
      precio,
      duracion_min,
      activo,
      descripcion,
      etiqueta,
      icono
    FROM eco
    WHERE activo = 1
    ORDER BY nombre ASC
  `;
	const [rows] = await pool.execute(sql);
	return rows;
};

const createEcoController = async ({ nombre, precio, duracion_min, descripcion, etiqueta, icono }) => {
	// Validar que no exista un eco con el mismo nombre (case-insensitive)
	const [existingRows] = await pool.execute(
		"SELECT id_eco FROM eco WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?)) LIMIT 1",
		[nombre]
	);
	if (existingRows.length > 0) {
		const err = new Error("Ya existe un eco con ese nombre");
		err.code = "DUPLICATE_NAME";
		throw err;
	}

	const id_eco = crypto.randomUUID();
	const sql = `
    INSERT INTO eco (id_eco, nombre, precio, duracion_min, activo, descripcion, etiqueta, icono)
    VALUES (?, ?, ?, ?, 1, ?, ?, ?)
  `;
	await pool.execute(sql, [id_eco, nombre, precio, duracion_min || 0, descripcion || null, etiqueta || null, icono || null]);
	return { id_eco, nombre, precio, duracion_min: duracion_min || 0, descripcion, etiqueta, icono };
};

const updateEcoController = async ({ id_eco, nombre, precio, duracion_min, activo, descripcion, etiqueta, icono }) => {
	// Si se está actualizando el nombre, validar que no exista otro eco con el mismo nombre
	if (nombre !== undefined) {
		const [existingRows] = await pool.execute(
			"SELECT id_eco FROM eco WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?)) AND id_eco != ? LIMIT 1",
			[nombre, id_eco]
		);
		if (existingRows.length > 0) {
			const err = new Error("Ya existe un eco con ese nombre");
			err.code = "DUPLICATE_NAME";
			throw err;
		}
	}

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
	if (descripcion !== undefined) {
		updates.push("descripcion = ?");
		params.push(descripcion);
	}
	if (etiqueta !== undefined) {
		updates.push("etiqueta = ?");
		params.push(etiqueta);
	}
	if (icono !== undefined) {
		updates.push("icono = ?");
		params.push(icono);
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
