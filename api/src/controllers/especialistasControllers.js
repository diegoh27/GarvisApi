const { pool } = require("../db");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { getRolIdByName } = require("../utils/roles");

const createEspecialistaController = async (payload) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		const id_usuario = crypto.randomUUID();
		const id_rol = await getRolIdByName(conn, "especialista");
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

		const sqlEspecialista = `
      INSERT INTO especialista
        (id_especialista, id_especialidad, codigo_colegiatura)
      VALUES
        (?, ?, ?)
    `;

		await conn.execute(sqlEspecialista, [
			id_usuario,
			payload.id_especialidad,
			payload.codigo_colegiatura ?? null,
		]);

		await conn.commit();

		return {
			id_usuario,
			id_especialista: id_usuario,
			nombre: payload.nombre,
			apellido: payload.apellido,
			correo: payload.correo,
			telefono: payload.telefono,
			id_especialidad: payload.id_especialidad,
		};
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

const listEspecialistasController = async ({ q }) => {
	let sql = `
    SELECT
      u.id_usuario AS id_especialista,
      u.nombre,
      u.apellido,
      e.id_especialidad,
      es.nombre AS especialidad
    FROM especialista e
    INNER JOIN usuario u ON u.id_usuario = e.id_especialista
    INNER JOIN especialidad es ON es.id_especialidad = e.id_especialidad
    WHERE 1=1
  `;
	const params = [];
	if (q) {
		sql += `
      AND (
        u.nombre LIKE ?
        OR u.apellido LIKE ?
        OR u.correo LIKE ?
        OR es.nombre LIKE ?
      )
    `;
		const like = `%${q}%`;
		params.push(like, like, like, like);
	}
	sql += " ORDER BY u.nombre ASC, u.apellido ASC";
	const [rows] = await pool.execute(sql, params);
	return rows;
};

const getEspecialistaByIdController = async (id_especialista) => {
	const sql = `
    SELECT
      u.id_usuario AS id_especialista,
      u.nombre,
      u.apellido,
      e.id_especialidad,
      es.nombre AS especialidad
    FROM especialista e
    INNER JOIN usuario u ON u.id_usuario = e.id_especialista
    INNER JOIN especialidad es ON es.id_especialidad = e.id_especialidad
    WHERE e.id_especialista = ?
    LIMIT 1
  `;
	const [rows] = await pool.execute(sql, [id_especialista]);
	return rows[0] || null;
};

const getEspecialistaSelfController = async (id_especialista) => {
	const sql = `
    SELECT
      u.id_usuario AS id_especialista,
      u.nombre,
      u.apellido,
      u.genero,
      u.cedula,
      u.correo,
      u.telefono,
      u.activo,
      u.fecha_nacimiento,
      u.fecha_registro,
      e.id_especialidad,
      e.codigo_colegiatura,
      es.nombre AS especialidad
    FROM especialista e
    INNER JOIN usuario u ON u.id_usuario = e.id_especialista
    INNER JOIN especialidad es ON es.id_especialidad = e.id_especialidad
    WHERE e.id_especialista = ?
    LIMIT 1
  `;
	const [rows] = await pool.execute(sql, [id_especialista]);
	return rows[0] || null;
};

const deactivateEspecialistaController = async (id_especialista) => {
	const sql = `
    UPDATE usuario
    SET activo = 0
    WHERE id_usuario = ?
  `;
	const [result] = await pool.execute(sql, [id_especialista]);
	return {
		updated: result.affectedRows,
		id_especialista,
	};
};

const updateEspecialistaController = async (id_especialista, payload) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		const [existsRows] = await conn.execute(
			"SELECT id_especialista FROM especialista WHERE id_especialista = ?",
			[id_especialista],
		);
		if (!existsRows.length) {
			const err = new Error("Especialista no encontrado");
			err.code = "NOT_FOUND";
			throw err;
		}

		const userFields = [
			"nombre",
			"apellido",
			"genero",
			"cedula",
			"correo",
			"telefono",
			"fecha_nacimiento",
		];
		const userUpdates = [];
		const userParams = [];
		userFields.forEach((field) => {
			if (payload[field] !== undefined) {
				userUpdates.push(`${field} = ?`);
				userParams.push(payload[field]);
			}
		});
		if (userUpdates.length) {
			const sqlUsuario = `
        UPDATE usuario
        SET ${userUpdates.join(", ")}
        WHERE id_usuario = ?
      `;
			await conn.execute(sqlUsuario, [...userParams, id_especialista]);
		}

		const espFields = ["id_especialidad", "codigo_colegiatura"];
		const espUpdates = [];
		const espParams = [];
		espFields.forEach((field) => {
			if (payload[field] !== undefined) {
				espUpdates.push(`${field} = ?`);
				espParams.push(payload[field]);
			}
		});
		if (espUpdates.length) {
			const sqlEsp = `
        UPDATE especialista
        SET ${espUpdates.join(", ")}
        WHERE id_especialista = ?
      `;
			await conn.execute(sqlEsp, [...espParams, id_especialista]);
		}

		if (!userUpdates.length && !espUpdates.length) {
			const err = new Error("No hay campos para actualizar");
			err.code = "NO_FIELDS";
			throw err;
		}

		await conn.commit();
		return { updated: 1, id_especialista };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

const updateEspecialistaSelfController = async ({ id_usuario, telefono, contrasena }) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		const [rows] = await conn.execute(
			"SELECT id_especialista FROM especialista WHERE id_especialista = ?",
			[id_usuario],
		);
		if (!rows.length) {
			const err = new Error("Especialista no encontrado");
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
	createEspecialistaController,
	listEspecialistasController,
	getEspecialistaByIdController,
	deactivateEspecialistaController,
	updateEspecialistaController,
	updateEspecialistaSelfController,
	getEspecialistaSelfController,
};
