const bcrypt = require("bcryptjs");
const { pool } = require("../db");

const userCreateController = (user) => {
	return (user.nombre, "Listo por aqui");
};

const getUserByIdController = async (id_usuario) => {
	const sql = `
    SELECT
      u.id_usuario,
      u.nombre,
      u.apellido,
      u.genero,
      u.cedula,
      u.correo,
      u.telefono,
      u.activo,
      u.fecha_nacimiento,
      u.fecha_registro,
      r.nombre AS rol
    FROM usuario u
    INNER JOIN roles r ON r.id_rol = u.id_rol
    WHERE u.id_usuario = ?
    LIMIT 1
  `;
	const [rows] = await pool.execute(sql, [id_usuario]);
	return rows[0] || null;
};

const getUserSelfController = async (id_usuario) => {
	const sql = `
    SELECT
      u.id_usuario,
      u.nombre,
      u.apellido,
      u.genero,
      u.cedula,
      u.correo,
      u.telefono,
      u.activo,
      u.fecha_nacimiento,
      u.fecha_registro,
      r.nombre AS rol
    FROM usuario u
    INNER JOIN roles r ON r.id_rol = u.id_rol
    WHERE r.nombre = 'admin' AND u.id_usuario = ?
    LIMIT 1
  `;
	const [rows] = await pool.execute(sql, [id_usuario]);
	return rows[0] || null;
};

const updateUserSelfController = async ({
	id_usuario,
	nombre,
	apellido,
	genero,
	cedula,
	correo,
	telefono,
	fecha_nacimiento,
	contrasena,
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		const [rows] = await conn.execute(
			"SELECT u.id_usuario FROM usuario u INNER JOIN roles r ON r.id_rol = u.id_rol WHERE r.nombre = 'admin' AND u.id_usuario = ?",
			[id_usuario],
		);
		if (!rows.length) {
			const err = new Error("Admin no encontrado");
			err.code = "NOT_FOUND";
			throw err;
		}

		const updates = [];
		const params = [];

		if (nombre !== undefined) {
			updates.push("nombre = ?");
			params.push(nombre);
		}
		if (apellido !== undefined) {
			updates.push("apellido = ?");
			params.push(apellido);
		}
		if (genero !== undefined) {
			updates.push("genero = ?");
			params.push(genero);
		}
		if (cedula !== undefined) {
			updates.push("cedula = ?");
			params.push(cedula);
		}
		if (correo !== undefined) {
			updates.push("correo = ?");
			params.push(correo);
		}
		if (telefono !== undefined) {
			updates.push("telefono = ?");
			params.push(telefono);
		}
		if (fecha_nacimiento !== undefined) {
			updates.push("fecha_nacimiento = ?");
			params.push(fecha_nacimiento);
		}
		if (contrasena !== undefined) {
			const hashedPassword = await bcrypt.hash(contrasena, 10);
			updates.push("contrasena = ?");
			params.push(hashedPassword);
		}

		if (!updates.length) {
			const err = new Error("No hay campos para actualizar");
			err.code = "NO_FIELDS";
			throw err;
		}

		const sql = `
    UPDATE usuario
    SET ${updates.join(", ")}
    WHERE id_usuario = ?
  `;
		params.push(id_usuario);
		const [result] = await conn.execute(sql, params);

		await conn.commit();
		return { updated: result.affectedRows, id_usuario };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

const updateUserController = async (id_usuario, payload) => {
	const fields = [
		"nombre",
		"apellido",
		"genero",
		"cedula",
		"correo",
		"telefono",
		"fecha_nacimiento",
	];
	const updates = [];
	const params = [];

	fields.forEach((field) => {
		if (payload[field] !== undefined) {
			updates.push(`${field} = ?`);
			params.push(payload[field]);
		}
	});

	if (!updates.length) {
		const err = new Error("No hay campos para actualizar");
		err.code = "NO_FIELDS";
		throw err;
	}

	const sql = `
    UPDATE usuario
    SET ${updates.join(", ")}
    WHERE id_usuario = ?
  `;
	params.push(id_usuario);
	const [result] = await pool.execute(sql, params);
	return {
		updated: result.affectedRows,
		id_usuario,
	};
};

const setUserActiveController = async ({ id_usuario, activo }) => {
	const sql = `
    UPDATE usuario
    SET activo = ?
    WHERE id_usuario = ?
  `;
	const [result] = await pool.execute(sql, [activo, id_usuario]);
	return {
		updated: result.affectedRows,
		id_usuario,
		activo,
	};
};

const listUsersController = async ({ rol, activo, q }) => {
	let sql = `
    SELECT
      u.id_usuario,
      u.nombre,
      u.apellido,
      u.genero,
      u.cedula,
      u.correo,
      u.telefono,
      u.activo,
      u.fecha_nacimiento,
      u.fecha_registro,
      r.nombre AS rol,
      r.id_rol
    FROM usuario u
    INNER JOIN roles r ON r.id_rol = u.id_rol
    WHERE 1=1
  `;
	const params = [];

	if (rol) {
		sql += ` AND r.nombre = ?`;
		params.push(rol);
	}

	if (activo !== undefined && activo !== null) {
		sql += ` AND u.activo = ?`;
		params.push(activo);
	}

	if (q) {
		sql += ` AND (
      u.nombre LIKE ?
      OR u.apellido LIKE ?
      OR u.correo LIKE ?
      OR u.cedula LIKE ?
    )`;
		const searchTerm = `%${q}%`;
		params.push(searchTerm, searchTerm, searchTerm, searchTerm);
	}

	sql += ` ORDER BY u.fecha_registro DESC`;

	const [rows] = await pool.execute(sql, params);
	return rows;
};

module.exports = {
	userCreateController,
	getUserByIdController,
	getUserSelfController,
	updateUserController,
	updateUserSelfController,
	setUserActiveController,
	listUsersController,
};
