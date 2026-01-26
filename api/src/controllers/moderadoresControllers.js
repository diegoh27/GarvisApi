const { pool } = require("../db");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { getRolIdByName } = require("../utils/roles");

const createModeradorController = async (payload) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		const id_usuario = crypto.randomUUID();
		const id_rol = await getRolIdByName(conn, "moderador");
		const hashedPassword = await bcrypt.hash(payload.contrasena, 10);

		const sqlUsuario = `
      INSERT INTO usuario
        (id_usuario, nombre, apellido, genero, cedula, correo, telefono, contrasena, activo, fecha_nacimiento, id_rol)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `;

		await conn.execute(sqlUsuario, [
			id_usuario,
			payload.nombre,
			payload.apellido,
			payload.genero,
			payload.cedula,
			payload.correo,
			payload.telefono,
			hashedPassword,
			payload.fecha_nacimiento,
			id_rol,
		]);

		await conn.commit();

		return {
			id_usuario,
			nombre: payload.nombre,
			apellido: payload.apellido,
			correo: payload.correo,
			telefono: payload.telefono,
		};
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

const listModeradoresController = async ({ q }) => {
	let sql = `
    SELECT
      u.id_usuario AS id_moderador,
      u.nombre,
      u.apellido,
      u.genero,
      u.cedula,
      u.correo,
      u.telefono,
      u.activo,
      u.fecha_registro
    FROM usuario u
    INNER JOIN roles r ON r.id_rol = u.id_rol
    WHERE r.nombre = 'moderador'
  `;
	const params = [];
	if (q) {
		sql += `
      AND (
        u.nombre LIKE ?
        OR u.apellido LIKE ?
        OR u.correo LIKE ?
        OR u.cedula LIKE ?
      )
    `;
		const like = `%${q}%`;
		params.push(like, like, like, like);
	}
	sql += " ORDER BY u.nombre ASC, u.apellido ASC";
	const [rows] = await pool.execute(sql, params);
	return rows;
};

const getModeradorByIdController = async (id_moderador) => {
	const sql = `
    SELECT
      u.id_usuario AS id_moderador,
      u.nombre,
      u.apellido,
      u.genero,
      u.cedula,
      u.correo,
      u.telefono,
      u.activo,
      u.fecha_nacimiento,
      u.fecha_registro
    FROM usuario u
    INNER JOIN roles r ON r.id_rol = u.id_rol
    WHERE r.nombre = 'moderador' AND u.id_usuario = ?
    LIMIT 1
  `;
	const [rows] = await pool.execute(sql, [id_moderador]);
	return rows[0] || null;
};

const updateModeradorController = async (id_moderador, payload) => {
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
	params.push(id_moderador);
	const [result] = await pool.execute(sql, params);
	return {
		updated: result.affectedRows,
		id_moderador,
	};
};

const deactivateModeradorController = async (id_moderador) => {
	const sql = `
    UPDATE usuario
    SET activo = 0
    WHERE id_usuario = ?
  `;
	const [result] = await pool.execute(sql, [id_moderador]);
	return {
		updated: result.affectedRows,
		id_moderador,
	};
};

const getModeradorSelfController = async (id_moderador) => {
	const sql = `
    SELECT
      u.id_usuario AS id_moderador,
      u.nombre,
      u.apellido,
      u.genero,
      u.cedula,
      u.correo,
      u.telefono,
      u.activo,
      u.fecha_nacimiento,
      u.fecha_registro
    FROM usuario u
    INNER JOIN roles r ON r.id_rol = u.id_rol
    WHERE r.nombre = 'moderador' AND u.id_usuario = ?
    LIMIT 1
  `;
	const [rows] = await pool.execute(sql, [id_moderador]);
	return rows[0] || null;
};

const updateModeradorSelfController = async ({ id_usuario, telefono, contrasena }) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		const [rows] = await conn.execute(
			"SELECT id_usuario FROM usuario u INNER JOIN roles r ON r.id_rol = u.id_rol WHERE r.nombre = 'moderador' AND u.id_usuario = ?",
			[id_usuario],
		);
		if (!rows.length) {
			const err = new Error("Moderador no encontrado");
			err.code = "NOT_FOUND";
			throw err;
		}

		const updates = [];
		const params = [];

		if (telefono !== undefined) {
			updates.push("telefono = ?");
			params.push(telefono);
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

module.exports = {
	createModeradorController,
	listModeradoresController,
	getModeradorByIdController,
	updateModeradorController,
	deactivateModeradorController,
	getModeradorSelfController,
	updateModeradorSelfController,
};
