const { pool } = require("../db");

const listEcosByEspecialistaController = async (id_especialista) => {
	const sql = `
    SELECT
      e.id_eco,
      e.nombre,
      e.precio,
      e.duracion_min,
      e.activo
    FROM eco e
    INNER JOIN especialista_eco ee ON ee.id_eco = e.id_eco
    WHERE ee.id_especialista = ?
    ORDER BY e.nombre ASC
  `;
	const [rows] = await pool.execute(sql, [id_especialista]);
	return rows;
};

const asignarEcoToEspecialistaController = async ({ id_especialista, id_eco }) => {
	// Verificar que el especialista existe
	const [espRows] = await pool.execute(
		"SELECT id_especialista FROM especialista WHERE id_especialista = ?",
		[id_especialista]
	);
	if (!espRows.length) {
		const err = new Error("Especialista no encontrado");
		err.code = "ESPECIALISTA_NOT_FOUND";
		throw err;
	}

	// Verificar que el eco existe y está activo
	const [ecoRows] = await pool.execute(
		"SELECT id_eco FROM eco WHERE id_eco = ? AND activo = 1",
		[id_eco]
	);
	if (!ecoRows.length) {
		const err = new Error("Eco no encontrado o inactivo");
		err.code = "ECO_NOT_FOUND";
		throw err;
	}

	// Verificar que la relación no existe ya
	const [relRows] = await pool.execute(
		"SELECT id_especialista FROM especialista_eco WHERE id_especialista = ? AND id_eco = ?",
		[id_especialista, id_eco]
	);
	if (relRows.length > 0) {
		const err = new Error("El eco ya está asignado a este especialista");
		err.code = "ALREADY_ASSIGNED";
		throw err;
	}

	// Crear la relación
	const sql = `
    INSERT INTO especialista_eco (id_especialista, id_eco)
    VALUES (?, ?)
  `;
	await pool.execute(sql, [id_especialista, id_eco]);
	return { id_especialista, id_eco };
};

const quitarEcoFromEspecialistaController = async ({ id_especialista, id_eco }) => {
	const sql = `
    DELETE FROM especialista_eco
    WHERE id_especialista = ? AND id_eco = ?
  `;
	const [result] = await pool.execute(sql, [id_especialista, id_eco]);
	if (result.affectedRows === 0) {
		const err = new Error("Relación no encontrada");
		err.code = "NOT_FOUND";
		throw err;
	}
	return { id_especialista, id_eco };
};

const listAllEcosWithEspecialistasController = async () => {
	const sql = `
    SELECT
      e.id_eco,
      e.nombre,
      e.precio,
      e.duracion_min,
      e.activo,
      GROUP_CONCAT(
        CONCAT(u.nombre, ' ', u.apellido) 
        ORDER BY u.nombre, u.apellido
        SEPARATOR ', '
      ) AS especialistas
    FROM eco e
    LEFT JOIN especialista_eco ee ON ee.id_eco = e.id_eco
    LEFT JOIN especialista esp ON esp.id_especialista = ee.id_especialista
    LEFT JOIN usuario u ON u.id_usuario = esp.id_especialista
    GROUP BY e.id_eco, e.nombre, e.precio, e.duracion_min, e.activo
    ORDER BY e.nombre ASC
  `;
	const [rows] = await pool.execute(sql);
	return rows;
};

module.exports = {
	listEcosByEspecialistaController,
	asignarEcoToEspecialistaController,
	quitarEcoFromEspecialistaController,
	listAllEcosWithEspecialistasController,
};
