const { pool } = require("../db");
const crypto = require("crypto");

const createPacienteController = async (payload) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		const id_usuario = crypto.randomUUID();

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
			payload.contrasena,
			payload.fecha_nacimiento,
			payload.id_rol,
		]);

		// 2) Insert paciente (hereda de usuario: id_paciente = id_usuario)
		const sqlPaciente = `
      INSERT INTO paciente
        (id_paciente, tipo_sangre, descripcion)
      VALUES
        (?, ?, ?)
    `;

		await conn.execute(sqlPaciente, [
			id_usuario,
			payload.tipo_sangre,
			payload.descripcion,
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

module.exports = { createPacienteController };
