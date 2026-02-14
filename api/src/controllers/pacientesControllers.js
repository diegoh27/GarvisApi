const { pool } = require("../db");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const resolveRolId = async (conn) => {
	const [rows] = await conn.execute(
		"SELECT id_rol FROM roles WHERE nombre = ? LIMIT 1",
		["paciente"],
	);
	if (!rows.length) {
		const err = new Error("Rol paciente no existe");
		err.code = "ROL_NOT_FOUND";
		throw err;
	}
	return rows[0].id_rol;
};

const createPacienteController = async (payload) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		const id_usuario = crypto.randomUUID();
		const id_rol = await resolveRolId(conn);
		const hashedPassword = await bcrypt.hash(payload.contrasena, 10);

		// 1) Insert usuario (tabla base)
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

		// 2) Insert paciente (hereda de usuario: id_paciente = id_usuario)
		const sqlPaciente = `
      INSERT INTO paciente
        (id_paciente, tipo_sangre, descripcion, direccion, rif, contacto_emergencia_nombre, contacto_emergencia_telefono)
      VALUES
        (?, ?, ?, ?, ?, ?, ?)
    `;

		await conn.execute(sqlPaciente, [
			id_usuario,
			payload.tipo_sangre,
			payload.descripcion,
			payload.direccion ?? null,
			payload.rif ?? null,
			payload.contacto_emergencia_nombre ?? null,
			payload.contacto_emergencia_telefono ?? null,
		]);

		await conn.commit();

		// Lo que devuelves al front
		return {
			id_usuario,
			id_paciente: id_usuario,
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

const listPacientesController = async ({ q }) => {
	let sql = `
    SELECT
      u.id_usuario AS id_paciente,
      u.nombre,
      u.apellido,
      u.genero,
      u.cedula,
      u.correo,
      u.telefono,
      u.activo,
      u.fecha_nacimiento,
      p.tipo_sangre,
      p.descripcion,
      p.direccion,
      p.contacto_emergencia_nombre,
      p.contacto_emergencia_telefono
    FROM paciente p
    INNER JOIN usuario u ON u.id_usuario = p.id_paciente
    WHERE u.activo = 1
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

const getPacienteByIdController = async (id_paciente) => {
	const sql = `
    SELECT
      u.id_usuario AS id_paciente,
      u.nombre,
      u.apellido,
      u.genero,
      u.cedula,
      u.correo,
      u.telefono,
      u.activo,
      u.fecha_nacimiento,
      u.fecha_registro,
      p.tipo_sangre,
      p.descripcion,
      p.direccion,
			p.rif,
			p.email_verificado,
			p.fecha_verificacion,
      p.contacto_emergencia_nombre,
      p.contacto_emergencia_telefono
    FROM paciente p
    INNER JOIN usuario u ON u.id_usuario = p.id_paciente
    WHERE p.id_paciente = ?
    LIMIT 1
  `;
	const [rows] = await pool.execute(sql, [id_paciente]);
	return rows[0] || null;
};

const updatePacienteController = async (id_paciente, payload) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

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
			await conn.execute(sqlUsuario, [...userParams, id_paciente]);
		}

		const pacienteFields = [
			"tipo_sangre",
			"descripcion",
			"direccion",
			"rif",
			"contacto_emergencia_nombre",
			"contacto_emergencia_telefono",
		];
		const pacienteUpdates = [];
		const pacienteParams = [];

		pacienteFields.forEach((field) => {
			if (payload[field] !== undefined) {
				pacienteUpdates.push(`${field} = ?`);
				pacienteParams.push(payload[field]);
			}
		});

		if (pacienteUpdates.length) {
			const sqlPaciente = `
        UPDATE paciente
        SET ${pacienteUpdates.join(", ")}
        WHERE id_paciente = ?
      `;
			await conn.execute(sqlPaciente, [...pacienteParams, id_paciente]);
		}

		if (!userUpdates.length && !pacienteUpdates.length) {
			const err = new Error("No hay campos para actualizar");
			err.code = "NO_FIELDS";
			throw err;
		}

		await conn.commit();
		return { id_paciente };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

const deactivatePacienteController = async (id_paciente) => {
	const sql = `
    UPDATE usuario
    SET activo = 0
    WHERE id_usuario = ?
  `;
	const [result] = await pool.execute(sql, [id_paciente]);
	return {
		updated: result.affectedRows,
		id_paciente,
	};
};

const updatePacienteSelfController = async ({
	id_usuario,
	telefono,
	contrasena,
	tipo_sangre,
	descripcion,
	direccion,
	contacto_emergencia_nombre,
	contacto_emergencia_telefono,
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		const [rows] = await conn.execute(
			"SELECT id_paciente FROM paciente WHERE id_paciente = ?",
			[id_usuario],
		);
		if (!rows.length) {
			const err = new Error("Paciente no encontrado");
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

		const pacienteUpdates = [];
		const pacienteParams = [];
		if (tipo_sangre !== undefined) {
			pacienteUpdates.push("tipo_sangre = ?");
			pacienteParams.push(tipo_sangre);
		}
		if (descripcion !== undefined) {
			pacienteUpdates.push("descripcion = ?");
			pacienteParams.push(descripcion);
		}
		if (direccion !== undefined) {
			pacienteUpdates.push("direccion = ?");
			pacienteParams.push(direccion);
		}
		if (contacto_emergencia_nombre !== undefined) {
			pacienteUpdates.push("contacto_emergencia_nombre = ?");
			pacienteParams.push(contacto_emergencia_nombre);
		}
		if (contacto_emergencia_telefono !== undefined) {
			pacienteUpdates.push("contacto_emergencia_telefono = ?");
			pacienteParams.push(contacto_emergencia_telefono);
		}

		if (!updates.length && !pacienteUpdates.length) {
			const err = new Error("No hay campos para actualizar");
			err.code = "NO_FIELDS";
			throw err;
		}

		let totalUpdated = 0;
		if (updates.length) {
			const sql = `
      UPDATE usuario
      SET ${updates.join(", ")}
      WHERE id_usuario = ?
    `;
			params.push(id_usuario);
			const [result] = await conn.execute(sql, params);
			totalUpdated += result.affectedRows;
		}
		if (pacienteUpdates.length) {
			const sqlPaciente = `
      UPDATE paciente
      SET ${pacienteUpdates.join(", ")}
      WHERE id_paciente = ?
    `;
			pacienteParams.push(id_usuario);
			const [resultPaciente] = await conn.execute(sqlPaciente, pacienteParams);
			totalUpdated += resultPaciente.affectedRows;
		}

		await conn.commit();
		return { updated: totalUpdated, id_usuario };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

module.exports = {
	createPacienteController,
	listPacientesController,
	getPacienteByIdController,
	updatePacienteController,
	deactivatePacienteController,
	updatePacienteSelfController,
};
