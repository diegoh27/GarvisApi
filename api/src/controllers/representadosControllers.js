const { pool } = require("../db");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const GENEROS = ["Masculino", "Femenino"];

/**
 * Crea un titular (paciente) mínimo desde mostrador: solo usuario + paciente con datos básicos.
 * Usado cuando se quiere crear representado y el titular aún no está registrado.
 * El titular podrá completar registro después (correo, verificación, etc.).
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

	// El titular debe ser mayor de edad (18 años)
	const hoy = new Date();
	const fechaNacDate = new Date(String(fecha_nacimiento).trim());
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
 */
const createRepresentadoController = async (id_paciente, payload) => {
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
	const [duplicado] = await pool.execute(
		`SELECT id_representado FROM representado
		 WHERE id_paciente = ?
		   AND LOWER(TRIM(nombre)) = LOWER(?)
		   AND LOWER(TRIM(apellido)) = LOWER(?)
		   AND fecha_nacimiento = ?
		 LIMIT 1`,
		[id_paciente, nombreNorm, apellidoNorm, fecha_nacimiento],
	);
	if (duplicado.length > 0) {
		const err = new Error(
			"Ya existe un representado con el mismo nombre, apellido y fecha de nacimiento para este titular. No se puede registrar de nuevo.",
		);
		err.code = "DUPLICATE_REPRESENTADO";
		throw err;
	}

	const id_representado = crypto.randomUUID();
	const cedulaValue = cedula && cedula.trim() ? cedula.trim() : null;
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
		cedulaValue,
		genero,
		parentesco && parentesco.trim() ? parentesco.trim() : null,
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
 * Crear representado asignado a un titular por su cédula (mostrador; admin/moderador).
 * Si el titular no existe y se envían nombre_titular y apellido_titular, se da de alta al titular y luego se crea el representado.
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
	} else {
		// Titular no registrado: dar de alta si se envían todos los datos del titular
		const nombreTitular = opts.nombre_titular && String(opts.nombre_titular).trim();
		const apellidoTitular = opts.apellido_titular && String(opts.apellido_titular).trim();
		const generoTitular = opts.genero_titular && String(opts.genero_titular).trim();
		const fechaNacTitular = opts.fecha_nacimiento_titular && String(opts.fecha_nacimiento_titular).trim();
		if (nombreTitular && apellidoTitular && generoTitular && fechaNacTitular) {
			const titularCreado = await createTitularMinimalMostrador(
				cedulaTrim,
				nombreTitular,
				apellidoTitular,
				generoTitular,
				fechaNacTitular,
			);
			id_paciente = titularCreado.id_paciente;
			titular_cedula = titularCreado.titular_cedula;
			// Marcar que el titular fue creado para que el front muestre confirmación
			opts.titular_creado = true;
			opts.titular_nombre = nombreTitular;
			opts.titular_apellido = apellidoTitular;
		} else {
			const err = new Error(
				"No hay ningún paciente registrado con esta cédula. Para darlo de alta completa: nombre, apellido, género y fecha de nacimiento del titular.",
			);
			err.code = "NOT_FOUND";
			throw err;
		}
	}

	const created = await createRepresentadoController(id_paciente, payload);
	const result = { ...created, titular_cedula };
	if (opts.titular_creado && opts.titular_nombre && opts.titular_apellido) {
		result.titular_creado = true;
		result.titular_nombre = opts.titular_nombre;
		result.titular_apellido = opts.titular_apellido;
	} else if (titular_nombre != null && titular_apellido != null) {
		result.titular_nombre = titular_nombre;
		result.titular_apellido = titular_apellido;
	}
	return result;
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
