const { pool } = require("../db");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { getRolIdByName } = require("../utils/roles");

const createEspecialistaController = async (payload) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		if (payload.telefono) {
			const [telefonoExists] = await conn.execute(
				"SELECT id_usuario FROM usuario WHERE telefono = ? LIMIT 1",
				[payload.telefono],
			);
			if (telefonoExists.length > 0) {
				const err = new Error("Ya existe un usuario con este número de teléfono");
				err.code = "DUPLICATE_TELEFONO";
				throw err;
			}
		}

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
				(id_especialista, id_especialidad, codigo_colegiatura, porcentaje)
			VALUES
				(?, ?, ?, ?)
		`;

		await conn.execute(sqlEspecialista, [
			id_usuario,
			payload.id_especialidad,
			payload.codigo_colegiatura ?? null,
			payload.porcentaje,
		]);

		// Asignar ecos al especialista si se proporcionaron
		if (
			payload.id_ecos &&
			Array.isArray(payload.id_ecos) &&
			payload.id_ecos.length > 0
		) {
			const sqlEco = `
				INSERT INTO especialista_eco (id_especialista, id_eco)
				VALUES (?, ?)
			`;
			// Verificar que todos los ecos existan y estén activos
			for (const id_eco of payload.id_ecos) {
				const [ecoRows] = await conn.execute(
					"SELECT id_eco FROM eco WHERE id_eco = ? AND activo = 1",
					[id_eco],
				);
				if (!ecoRows.length) {
					throw new Error(`Eco ${id_eco} no encontrado o inactivo`);
				}
				// Verificar que no esté ya asignado
				const [relRows] = await conn.execute(
					"SELECT id_especialista FROM especialista_eco WHERE id_especialista = ? AND id_eco = ?",
					[id_usuario, id_eco],
				);
				if (relRows.length === 0) {
					await conn.execute(sqlEco, [id_usuario, id_eco]);
				}
			}
		}

		await conn.commit();

		return {
			id_usuario,
			id_especialista: id_usuario,
			nombre: payload.nombre,
			apellido: payload.apellido,
			correo: payload.correo,
			telefono: payload.telefono,
			id_especialidad: payload.id_especialidad,
			porcentaje: payload.porcentaje,
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
      u.activo,
			e.id_especialidad,
			e.porcentaje,
      es.nombre AS especialidad
    FROM especialista e
    INNER JOIN usuario u ON u.id_usuario = e.id_especialista
    INNER JOIN especialidad es ON es.id_especialidad = e.id_especialidad
    WHERE u.activo = 1
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
      u.genero,
      u.cedula,
      u.correo,
      u.telefono,
      u.fecha_nacimiento,
			e.id_especialidad,
			e.codigo_colegiatura,
			e.porcentaje,
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
			e.porcentaje,
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

		if (payload.telefono) {
			const [telefonoExists] = await conn.execute(
				"SELECT id_usuario FROM usuario WHERE telefono = ? AND id_usuario != ? LIMIT 1",
				[payload.telefono, id_especialista],
			);
			if (telefonoExists.length > 0) {
				const err = new Error("Ya existe otro usuario con este número de teléfono");
				err.code = "DUPLICATE_TELEFONO";
				throw err;
			}
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

		const espFields = ["id_especialidad", "codigo_colegiatura", "porcentaje"];
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

		// Si se actualizó el porcentaje, recalcular montos en comisiones pendientes de este especialista
		if (payload.porcentaje !== undefined) {
			const newPorcentaje = Number(payload.porcentaje);
			if (Number.isFinite(newPorcentaje)) {
				await conn.execute(
					`UPDATE esp_comision ec
					 INNER JOIN cita c ON c.id_cita = ec.id_cita
					 INNER JOIN eco e ON e.id_eco = c.id_eco
					 SET ec.porcentaje = ?, ec.monto = ROUND((e.precio * ?) / 100, 2)
					 WHERE ec.id_especialista = ? AND ec.estado = 'Pendiente'`,
					[newPorcentaje, newPorcentaje, id_especialista],
				);
			}
		}

		// Actualizar ecos si se proporcionaron
		if (payload.id_ecos && Array.isArray(payload.id_ecos)) {
			// Eliminar todas las relaciones existentes
			await conn.execute(
				"DELETE FROM especialista_eco WHERE id_especialista = ?",
				[id_especialista],
			);

			// Insertar las nuevas relaciones
			if (payload.id_ecos.length > 0) {
				const sqlEco = `
					INSERT INTO especialista_eco (id_especialista, id_eco)
					VALUES (?, ?)
				`;
				// Verificar que todos los ecos existan y estén activos
				for (const id_eco of payload.id_ecos) {
					const [ecoRows] = await conn.execute(
						"SELECT id_eco FROM eco WHERE id_eco = ? AND activo = 1",
						[id_eco],
					);
					if (!ecoRows.length) {
						throw new Error(`Eco ${id_eco} no encontrado o inactivo`);
					}
					await conn.execute(sqlEco, [id_especialista, id_eco]);
				}
			}
		}

		if (!userUpdates.length && !espUpdates.length && !payload.id_ecos) {
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

const updateEspecialistaSelfController = async ({
	id_usuario,
	telefono,
	contrasena,
}) => {
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
			const [telefonoExists] = await conn.execute(
				"SELECT id_usuario FROM usuario WHERE telefono = ? AND id_usuario != ? LIMIT 1",
				[telefono, id_usuario],
			);
			if (telefonoExists.length > 0) {
				const err = new Error("Ya existe un usuario con este número de teléfono");
				err.code = "DUPLICATE_TELEFONO";
				throw err;
			}
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
