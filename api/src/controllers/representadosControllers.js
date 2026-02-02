const { pool } = require("../db");
const crypto = require("crypto");

const GENEROS = ["Masculino", "Femenino", "Otro"];

/**
 * Listar representados del paciente con paginación, búsqueda y filtros.
 * @param {string} id_paciente
 * @param {{ page?: number, limit?: number, search?: string, parentesco?: string, genero?: string }} opts
 */
const listByPacienteController = async (id_paciente, opts = {}) => {
	const page = Math.max(1, Number(opts.page) || 1);
	const limit = Math.min(50, Math.max(1, Number(opts.limit) || 5));
	const search = typeof opts.search === "string" ? opts.search.trim() : "";
	const parentesco =
		typeof opts.parentesco === "string" && opts.parentesco.trim()
			? opts.parentesco.trim()
			: null;
	const genero =
		opts.genero && GENEROS.includes(opts.genero) ? opts.genero : null;

	let whereClause = "WHERE r.id_paciente = ?";
	const params = [id_paciente];

	if (search) {
		whereClause +=
			" AND (r.nombre LIKE ? OR r.apellido LIKE ? OR r.cedula LIKE ? OR r.parentesco LIKE ?)";
		const term = `%${search}%`;
		params.push(term, term, term, term);
	}
	if (parentesco) {
		whereClause += " AND r.parentesco = ?";
		params.push(parentesco);
	}
	if (genero) {
		whereClause += " AND r.genero = ?";
		params.push(genero);
	}

	// Total de registros
	const countSql = `SELECT COUNT(*) AS total FROM representado r ${whereClause}`;
	const [countRows] = await pool.execute(countSql, params);
	const total = Number(countRows[0]?.total ?? 0);
	const totalPages = Math.max(1, Math.ceil(total / limit));
	const offset = (page - 1) * limit;
	const limitInt = parseInt(limit, 10);
	const offsetInt = parseInt(offset, 10);

	const sql = `
    SELECT
      r.id_representado,
      r.id_paciente,
      r.nombre,
      r.apellido,
      r.cedula,
      r.fecha_nacimiento,
      r.genero,
      r.parentesco
    FROM representado r
    ${whereClause}
    ORDER BY r.apellido ASC, r.nombre ASC
    LIMIT ${limitInt} OFFSET ${offsetInt}
  `;
	const [rows] = await pool.execute(sql, params);

	return {
		data: rows,
		total,
		page,
		limit,
		totalPages,
	};
};

/**
 * Crear representado para el paciente.
 */
const createRepresentadoController = async (id_paciente, payload) => {
	const { nombre, apellido, cedula, fecha_nacimiento, genero, parentesco } =
		payload;

	if (!nombre || !apellido || !cedula || !fecha_nacimiento || !genero) {
		const err = new Error(
			"Faltan campos requeridos: nombre, apellido, cedula, fecha_nacimiento, genero"
		);
		err.code = "VALIDATION";
		throw err;
	}

	if (!GENEROS.includes(genero)) {
		const err = new Error("Género no válido");
		err.code = "VALIDATION";
		throw err;
	}

	// Cédula única por paciente (mismo paciente no puede tener dos representados con misma cédula)
	const [existing] = await pool.execute(
		"SELECT id_representado FROM representado WHERE id_paciente = ? AND cedula = ? LIMIT 1",
		[id_paciente, cedula.trim()]
	);
	if (existing.length > 0) {
		const err = new Error(
			"Ya existe un representado con esta cédula para su cuenta"
		);
		err.code = "DUPLICATE_CEDULA";
		throw err;
	}

	const id_representado = crypto.randomUUID();
	const sql = `
    INSERT INTO representado
      (id_representado, id_paciente, nombre, apellido, fecha_nacimiento, cedula, genero, parentesco)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?)
  `;
	await pool.execute(sql, [
		id_representado,
		id_paciente,
		nombre.trim(),
		apellido.trim(),
		fecha_nacimiento,
		cedula.trim(),
		genero,
		parentesco && parentesco.trim() ? parentesco.trim() : null,
	]);

	return {
		id_representado,
		id_paciente,
		nombre: nombre.trim(),
		apellido: apellido.trim(),
		cedula: cedula.trim(),
		fecha_nacimiento,
		genero,
		parentesco: parentesco && parentesco.trim() ? parentesco.trim() : null,
	};
};

/**
 * Obtener parentescos distintos (para filtros).
 */
const listParentescosController = async (id_paciente) => {
	const [rows] = await pool.execute(
		"SELECT DISTINCT parentesco FROM representado WHERE id_paciente = ? AND parentesco IS NOT NULL AND parentesco != '' ORDER BY parentesco",
		[id_paciente]
	);
	return rows.map((r) => r.parentesco);
};

module.exports = {
	listByPacienteController,
	createRepresentadoController,
	listParentescosController,
};
