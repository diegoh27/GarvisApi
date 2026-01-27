const { pool } = require("../db");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getRolIdByName } = require("../utils/roles");

const registerPaciente = async (payload) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// Validar duplicados antes de insertar
		// 1. Verificar correo duplicado
		const [correoExists] = await conn.execute(
			"SELECT id_usuario FROM usuario WHERE correo = ? LIMIT 1",
			[payload.correo]
		);
		if (correoExists.length > 0) {
			const err = new Error("Ya existe un usuario con este correo electrónico");
			err.code = "DUPLICATE_EMAIL";
			throw err;
		}

		// 2. Verificar cédula duplicada
		const [cedulaExists] = await conn.execute(
			"SELECT id_usuario FROM usuario WHERE cedula = ? LIMIT 1",
			[payload.cedula]
		);
		if (cedulaExists.length > 0) {
			const err = new Error("Ya existe un usuario con esta cédula");
			err.code = "DUPLICATE_CEDULA";
			throw err;
		}

		// 3. Verificar RIF duplicado (si se proporciona)
		if (payload.rif) {
			const [rifExists] = await conn.execute(
				"SELECT id_paciente FROM paciente WHERE rif = ? LIMIT 1",
				[payload.rif]
			);
			if (rifExists.length > 0) {
				const err = new Error("Ya existe un paciente con este RIF");
				err.code = "DUPLICATE_RIF";
				throw err;
			}
		}

		// 4. Verificar nombre + apellido duplicado
		const [nombreApellidoExists] = await conn.execute(
			"SELECT id_usuario FROM usuario WHERE nombre = ? AND apellido = ? LIMIT 1",
			[payload.nombre, payload.apellido]
		);
		if (nombreApellidoExists.length > 0) {
			const err = new Error("Ya existe un usuario con este nombre y apellido");
			err.code = "DUPLICATE_NAME";
			throw err;
		}

		const id_usuario = crypto.randomUUID();
		const id_rol = await getRolIdByName(conn, "paciente");
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

const loginUser = async ({ correo, contrasena }) => {
	const sql = `
    SELECT
      u.id_usuario,
      u.nombre,
      u.apellido,
      u.correo,
      u.contrasena,
      r.nombre AS rol
    FROM usuario u
    INNER JOIN roles r ON r.id_rol = u.id_rol
    WHERE u.correo = ? AND u.activo = 1
    LIMIT 1
  `;

	const [rows] = await pool.execute(sql, [correo]);
	if (!rows.length) {
		const err = new Error("Credenciales inválidas");
		err.code = "INVALID_CREDENTIALS";
		throw err;
	}

	const user = rows[0];
	const ok = await bcrypt.compare(contrasena, user.contrasena);
	if (!ok) {
		const err = new Error("Credenciales inválidas");
		err.code = "INVALID_CREDENTIALS";
		throw err;
	}

	if (!process.env.JWT_SECRET) {
		const err = new Error("JWT_SECRET no configurado");
		err.code = "JWT_SECRET_MISSING";
		throw err;
	}

	const token = jwt.sign(
		{
			id: user.id_usuario,
			rol: user.rol,
			correo: user.correo,
		},
		process.env.JWT_SECRET,
		{ expiresIn: "7d" },
	);

	return {
		token,
		user: {
			id_usuario: user.id_usuario,
			nombre: user.nombre,
			apellido: user.apellido,
			correo: user.correo,
			rol: user.rol,
		},
	};
};

module.exports = {
	registerPaciente,
	loginUser,
};
