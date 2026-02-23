const { pool } = require("../db");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { ensureMostradorPacienteBase, MOSTRADOR_PACIENTE_ID } = require("./citasControllers");

const GENEROS = ["Masculino", "Femenino"];

/**
 * @deprecated Ya no se crea usuario real para mostrador. Se usa representado con cedula_titular_mostrador.
 * Mantenido por si se necesita en otro flujo.
 */
const createTitularMinimalMostrador = async (cedula, nombre, apellido, genero, fecha_nacimiento) => {
	const cedulaTrim = cedula && String(cedula).trim();
	if (!cedulaTrim || !nombre || !String(nombre).trim() || !apellido || !String(apellido).trim()) {
		const err = new Error("Cédula, nombre y apellido del titular son obligatorios para darlo de alta.");
		err.code = "VALIDATION";
		throw err;
	}
	if (!genero || !GENEROS.includes(genero)) {
		const err = new Error("El género del titular es obligatorio.");
		err.code = "VALIDATION";
		throw err;
	}
	if (!fecha_nacimiento || !/^\d{4}-\d{2}-\d{2}$/.test(String(fecha_nacimiento).trim())) {
		const err = new Error("La fecha de nacimiento del titular es obligatoria (formato AAAA-MM-DD).");
		err.code = "VALIDATION";
		throw err;
	}

	const hoy = new Date();
	const fechaNacDate = new Date(String(fecha_nacimiento).trim());
	if (fechaNacDate.getTime() > hoy.getTime()) {
		const err = new Error("La fecha de nacimiento no puede ser futura.");
		err.code = "VALIDATION";
		throw err;
	}
	// El titular debe ser mayor de edad (18 años)
	let edad = hoy.getFullYear() - fechaNacDate.getFullYear();
	const mesDiff = hoy.getMonth() - fechaNacDate.getMonth();
	if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < fechaNacDate.getDate())) {
		edad -= 1;
	}
	if (edad < 18) {
		const err = new Error("El titular debe ser mayor de edad (al menos 18 años).");
		err.code = "VALIDATION";
		throw err;
	}

	const [rolRows] = await pool.execute(
		"SELECT id_rol FROM roles WHERE nombre = 'paciente' LIMIT 1",
	);
	if (!rolRows.length) {
		const err = new Error("Rol paciente no encontrado");
		err.code = "ROL_NOT_FOUND";
		throw err;
	}

	const cedulaSoloNum = cedulaTrim.replace(/\D/g, "");
	const correo = `mostrador-titular-${cedulaSoloNum}@garbis.local`;
	const telefono = `MOSTRADOR-${cedulaSoloNum}`;
	const rif = `J${cedulaSoloNum}`;

	const [existingUsuario] = await pool.execute(
		"SELECT id_usuario FROM usuario WHERE cedula = ? LIMIT 1",
		[cedulaTrim],
	);
	if (existingUsuario.length > 0) {
		const err = new Error("Ya existe un usuario con esta cédula.");
		err.code = "DUPLICATE_CEDULA";
		throw err;
	}

	const [existingCorreo] = await pool.execute(
		"SELECT id_usuario FROM usuario WHERE correo = ? LIMIT 1",
		[correo],
	);
	if (existingCorreo.length > 0) {
		const err = new Error("Conflicto interno al crear titular. Intente de nuevo.");
		err.code = "CONFLICT";
		throw err;
	}

	const id_usuario = crypto.randomUUID();
	const hashedPassword = await bcrypt.hash("SIN_REGISTRO_MOSTRADOR", 10);
	const fechaNac = String(fecha_nacimiento).trim();

	await pool.execute(
		`INSERT INTO usuario
      (id_usuario, nombre, apellido, genero, cedula, correo, telefono, contrasena, activo, fecha_nacimiento, id_rol)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
		[
			id_usuario,
			String(nombre).trim(),
			String(apellido).trim(),
			genero,
			cedulaTrim,
			correo,
			telefono,
			hashedPassword,
			fechaNac,
			rolRows[0].id_rol,
		],
	);

	// RIF único: si ya existe (p. ej. otro paciente con mismo número), añadir sufijo
	let rifFinal = rif;
	const [rifExists] = await pool.execute(
		"SELECT id_paciente FROM paciente WHERE rif = ? LIMIT 1",
		[rifFinal],
	);
	if (rifExists.length > 0) {
		rifFinal = `${rif}-${crypto.randomUUID().slice(0, 8)}`;
	}

	await pool.execute(
		`INSERT INTO paciente
      (id_paciente, tipo_sangre, descripcion, direccion, rif, contacto_emergencia_nombre, contacto_emergencia_telefono)
    VALUES (?, 'N/A', 'Titular desde mostrador', NULL, ?, NULL, NULL)`,
		[id_usuario, rifFinal],
	);

	return { id_paciente: id_usuario, titular_cedula: cedulaTrim };
};

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
 * @param {string} id_paciente
 * @param {object} payload - nombre, apellido, cedula, fecha_nacimiento, genero, parentesco
 * @param {object} [opts] - opts.cedula_titular_mostrador para representados de mostrador (sin usuario titular)
 */
const createRepresentadoController = async (id_paciente, payload, opts = {}) => {
	const { nombre, apellido, cedula, fecha_nacimiento, genero, parentesco } =
		payload;
	const cedulaTitularMostrador = opts.cedula_titular_mostrador && String(opts.cedula_titular_mostrador).trim() ? String(opts.cedula_titular_mostrador).trim() : null;

	if (!nombre || !apellido || !fecha_nacimiento || !genero) {
		const err = new Error(
			"Faltan campos requeridos: nombre, apellido, fecha_nacimiento, genero",
		);
		err.code = "VALIDATION";
		throw err;
	}

	if (!GENEROS.includes(genero)) {
		const err = new Error("Género no válido");
		err.code = "VALIDATION";
		throw err;
	}

	const hoyRep = new Date();
	const fechaNacRep = new Date(String(fecha_nacimiento).trim());
	if (fechaNacRep.getTime() > hoyRep.getTime()) {
		const err = new Error("La fecha de nacimiento no puede ser futura.");
		err.code = "VALIDATION";
		throw err;
	}

	// Cédula única por paciente (mismo paciente no puede tener dos representados con misma cédula)
	// Solo validar si se proporciona cédula
	if (cedula && cedula.trim()) {
		const [existing] = await pool.execute(
			"SELECT id_representado FROM representado WHERE id_paciente = ? AND cedula = ? LIMIT 1",
			[id_paciente, cedula.trim()],
		);
		if (existing.length > 0) {
			const err = new Error(
				"Ya existe un representado con esta cédula para su cuenta",
			);
			err.code = "DUPLICATE_CEDULA";
			throw err;
		}
	}

	// Evitar duplicado: mismo titular no puede tener dos representados con mismo nombre, apellido y fecha de nacimiento
	const nombreNorm = nombre.trim();
	const apellidoNorm = apellido.trim();
	let duplicadoSql = `SELECT id_representado FROM representado
		 WHERE id_paciente = ?
		   AND LOWER(TRIM(nombre)) = LOWER(?)
		   AND LOWER(TRIM(apellido)) = LOWER(?)
		   AND fecha_nacimiento = ?`;
	const duplicadoParams = [id_paciente, nombreNorm, apellidoNorm, fecha_nacimiento];
	if (cedulaTitularMostrador != null) {
		duplicadoSql += ` AND (cedula_titular_mostrador = ? OR (cedula_titular_mostrador IS NULL AND ? IS NULL))`;
		duplicadoParams.push(cedulaTitularMostrador, cedulaTitularMostrador);
	}
	duplicadoSql += " LIMIT 1";
	const [duplicado] = await pool.execute(duplicadoSql, duplicadoParams);
	if (duplicado.length > 0) {
		const err = new Error(
			"Ya existe un representado con el mismo nombre, apellido y fecha de nacimiento para este titular. No se puede registrar de nuevo.",
		);
		err.code = "DUPLICATE_REPRESENTADO";
		throw err;
	}

	const id_representado = crypto.randomUUID();
	const cedulaValue = cedula && cedula.trim() ? cedula.trim() : null;
	const columns = ["id_representado", "id_paciente", "nombre", "apellido", "fecha_nacimiento", "cedula", "genero", "parentesco"];
	const placeholders = ["?", "?", "?", "?", "?", "?", "?", "?"];
	const values = [id_representado, id_paciente, nombre.trim(), apellido.trim(), fecha_nacimiento, cedulaValue, genero, parentesco && parentesco.trim() ? parentesco.trim() : null];
	if (cedulaTitularMostrador != null) {
		columns.push("cedula_titular_mostrador");
		placeholders.push("?");
		values.push(cedulaTitularMostrador);
	}
	const sql = `
    INSERT INTO representado
      (${columns.join(", ")})
    VALUES
      (${placeholders.join(", ")})
  `;
	await pool.execute(sql, values);

	return {
		id_representado,
		id_paciente,
		nombre: nombre.trim(),
		apellido: apellido.trim(),
		cedula: cedulaValue,
		fecha_nacimiento,
		genero,
		parentesco: parentesco && parentesco.trim() ? parentesco.trim() : null,
	};
};

/**
 * Crear representado asignado a un titular por su cédula (mostrador; admin/moderador).
 * Si el titular ya está registrado (tiene usuario), se crea el representado bajo ese paciente.
 * Si el titular NO está registrado, se crea el representado como "fantasma" bajo el paciente
 * de mostrador (MOSTRADOR_PACIENTE_ID) con cedula_titular_mostrador = cedula, para que cuando
 * el usuario real se registre con esa cédula pueda reclamar citas y representados.
 * En ningún caso se crea un usuario (correo/contraseña) para el titular.
 */
const createRepresentadoPorCedulaTitularController = async (cedula_titular, payload, opts = {}) => {
	const cedulaTrim = cedula_titular && String(cedula_titular).trim();
	if (!cedulaTrim) {
		const err = new Error("La cédula del titular es obligatoria.");
		err.code = "VALIDATION";
		throw err;
	}

	const [pacienteRows] = await pool.execute(
		`SELECT p.id_paciente, u.cedula AS titular_cedula, u.nombre AS titular_nombre, u.apellido AS titular_apellido
		 FROM paciente p
		 INNER JOIN usuario u ON u.id_usuario = p.id_paciente
		 WHERE u.cedula = ?
		 LIMIT 1`,
		[cedulaTrim],
	);

	let id_paciente;
	let titular_cedula = cedulaTrim;
	let titular_nombre = null;
	let titular_apellido = null;

	if (pacienteRows.length > 0) {
		id_paciente = pacienteRows[0].id_paciente;
		titular_cedula = pacienteRows[0].titular_cedula || cedulaTrim;
		titular_nombre = pacienteRows[0].titular_nombre || null;
		titular_apellido = pacienteRows[0].titular_apellido || null;
		const created = await createRepresentadoController(id_paciente, payload);
		return { ...created, titular_cedula, titular_nombre, titular_apellido };
	}

	// Titular no registrado: no crear usuario. Crear representado "fantasma" bajo paciente mostrador.
	const nombreTitular = opts.nombre_titular && String(opts.nombre_titular).trim();
	const apellidoTitular = opts.apellido_titular && String(opts.apellido_titular).trim();
	if (!nombreTitular || !apellidoTitular) {
		const err = new Error(
			"Si el titular no está registrado, indica nombre y apellido del titular para esta cita. No se crea usuario; cuando se registre con su cédula podrá reclamar sus citas y representados.",
		);
		err.code = "VALIDATION";
		throw err;
	}

	const conn = await pool.getConnection();
	try {
		await ensureMostradorPacienteBase(conn);
	} finally {
		conn.release();
	}

	const created = await createRepresentadoController(MOSTRADOR_PACIENTE_ID, payload, {
		cedula_titular_mostrador: cedulaTrim,
	});
	return {
		...created,
		titular_cedula: cedulaTrim,
		titular_creado: false,
		titular_nombre: nombreTitular,
		titular_apellido: apellidoTitular,
	};
};

/**
 * Obtener parentescos distintos (para filtros).
 */
const listParentescosController = async (id_paciente) => {
	const [rows] = await pool.execute(
		"SELECT DISTINCT parentesco FROM representado WHERE id_paciente = ? AND parentesco IS NOT NULL AND parentesco != '' ORDER BY parentesco",
		[id_paciente],
	);
	return rows.map((r) => r.parentesco);
};

/**
 * Actualizar representado del paciente.
 */
const updateRepresentadoController = async (
	id_paciente,
	id_representado,
	payload,
) => {
	const { nombre, apellido, cedula, fecha_nacimiento, genero, parentesco } =
		payload;

	if (!nombre || !apellido || !fecha_nacimiento || !genero) {
		const err = new Error(
			"Faltan campos requeridos: nombre, apellido, fecha_nacimiento, genero",
		);
		err.code = "VALIDATION";
		throw err;
	}

	if (!GENEROS.includes(genero)) {
		const err = new Error("Género no válido");
		err.code = "VALIDATION";
		throw err;
	}

	const hoyUpd = new Date();
	const fechaNacUpd = new Date(String(fecha_nacimiento).trim());
	if (fechaNacUpd.getTime() > hoyUpd.getTime()) {
		const err = new Error("La fecha de nacimiento no puede ser futura.");
		err.code = "VALIDATION";
		throw err;
	}

	// Verificar que el representado pertenece al paciente
	const [existing] = await pool.execute(
		"SELECT id_representado FROM representado WHERE id_representado = ? AND id_paciente = ? LIMIT 1",
		[id_representado, id_paciente],
	);

	if (existing.length === 0) {
		const err = new Error("Representado no encontrado o no autorizado");
		err.code = "NOT_FOUND";
		throw err;
	}

	// Verificar que la cédula no esté duplicada (excepto el mismo representado)
	// Solo validar si se proporciona cédula
	if (cedula && cedula.trim()) {
		const [duplicate] = await pool.execute(
			"SELECT id_representado FROM representado WHERE id_paciente = ? AND cedula = ? AND id_representado != ? LIMIT 1",
			[id_paciente, cedula.trim(), id_representado],
		);

		if (duplicate.length > 0) {
			const err = new Error(
				"Ya existe otro representado con esta cédula para su cuenta",
			);
			err.code = "DUPLICATE_CEDULA";
			throw err;
		}
	}

	const cedulaValue = cedula && cedula.trim() ? cedula.trim() : null;
	const sql = `
    UPDATE representado
    SET nombre = ?, apellido = ?, cedula = ?, fecha_nacimiento = ?, genero = ?, parentesco = ?
    WHERE id_representado = ? AND id_paciente = ?
  `;

	await pool.execute(sql, [
		nombre.trim(),
		apellido.trim(),
		cedulaValue,
		fecha_nacimiento,
		genero,
		parentesco && parentesco.trim() ? parentesco.trim() : null,
		id_representado,
		id_paciente,
	]);

	return {
		id_representado,
		id_paciente,
		nombre: nombre.trim(),
		apellido: apellido.trim(),
		cedula: cedulaValue,
		fecha_nacimiento,
		genero,
		parentesco: parentesco && parentesco.trim() ? parentesco.trim() : null,
	};
};

/**
 * Eliminar representado del paciente.
 */
const deleteRepresentadoController = async (id_paciente, id_representado) => {
	// Verificar que el representado pertenece al paciente
	const [existing] = await pool.execute(
		"SELECT id_representado FROM representado WHERE id_representado = ? AND id_paciente = ? LIMIT 1",
		[id_representado, id_paciente],
	);

	if (existing.length === 0) {
		const err = new Error("Representado no encontrado o no autorizado");
		err.code = "NOT_FOUND";
		throw err;
	}

	// Verificar si hay citas asociadas
	const [citas] = await pool.execute(
		"SELECT id_cita FROM cita WHERE id_representado = ? LIMIT 1",
		[id_representado],
	);

	if (citas.length > 0) {
		const err = new Error(
			"No se puede eliminar un representado con citas asociadas",
		);
		err.code = "HAS_APPOINTMENTS";
		throw err;
	}

	await pool.execute(
		"DELETE FROM representado WHERE id_representado = ? AND id_paciente = ?",
		[id_representado, id_paciente],
	);

	return { id_representado };
};

module.exports = {
	listByPacienteController,
	createRepresentadoController,
	createRepresentadoPorCedulaTitularController,
	listParentescosController,
	updateRepresentadoController,
	deleteRepresentadoController,
};
