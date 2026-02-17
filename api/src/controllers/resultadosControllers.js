const { pool } = require("../db");
const crypto = require("crypto");

// Crear o actualizar resultado (subir archivo)
const createOrUpdateResultadoController = async ({
	id_cita,
	id_especialista,
	archivo_url,
	nombre,
	id_usuario_actual,
	rol,
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// Verificar que la cita existe y está atendida
		const [citaRows] = await conn.execute(
			`SELECT id_especialista, estado_cita
       FROM cita
       WHERE id_cita = ?
       FOR UPDATE`,
			[id_cita]
		);
		if (!citaRows.length) {
			const err = new Error("Cita no encontrada");
			err.code = "NOT_FOUND";
			throw err;
		}
		const cita = citaRows[0];
		if (cita.estado_cita !== 3) {
			const err = new Error(
				"Solo se pueden subir resultados para citas atendidas"
			);
			err.code = "INVALID_STATE";
			throw err;
		}
		// Si es especialista, solo puede subir resultados para sus propias citas
		if (rol === "especialista" && id_usuario_actual && cita.id_especialista !== id_usuario_actual) {
			const err = new Error("Solo puedes subir resultados para tus propias citas.");
			err.code = "FORBIDDEN";
			throw err;
		}

		// Verificar si ya existe un resultado para esta cita
		const [existingRows] = await conn.execute(
			"SELECT id_resultado, archivo FROM resultado WHERE id_cita = ?",
			[id_cita]
		);

		// archivo_url puede ser una URL simple o un JSON array de URLs
		let archivoToSave;
		if (typeof archivo_url === "string") {
			archivoToSave = archivo_url;
		} else {
			archivoToSave = JSON.stringify(archivo_url);
		}

		// Si ya existe un resultado, fusionar los archivos existentes con los nuevos
		if (existingRows.length > 0 && existingRows[0].archivo) {
			const archivoExistente = existingRows[0].archivo;
			let archivosExistentes = [];

			// Parsear archivos existentes
			try {
				const parsed = JSON.parse(archivoExistente);
				archivosExistentes = Array.isArray(parsed)
					? parsed
					: [archivoExistente];
			} catch {
				if (
					archivoExistente &&
					archivoExistente !== "" &&
					archivoExistente !== "[]"
				) {
					archivosExistentes = [archivoExistente];
				}
			}

			// Parsear nuevos archivos
			let archivosNuevos = [];
			try {
				const parsed = JSON.parse(archivoToSave);
				archivosNuevos = Array.isArray(parsed) ? parsed : [archivoToSave];
			} catch {
				archivosNuevos = [archivoToSave];
			}

			// Fusionar arrays, evitando duplicados
			const archivosCombinados = [...archivosExistentes];
			archivosNuevos.forEach((url) => {
				if (!archivosCombinados.includes(url) && url.trim() !== "") {
					archivosCombinados.push(url);
				}
			});

			// Convertir de vuelta a string
			if (archivosCombinados.length === 0) {
				archivoToSave = "[]";
			} else if (archivosCombinados.length === 1) {
				archivoToSave = archivosCombinados[0];
			} else {
				archivoToSave = JSON.stringify(archivosCombinados);
			}
		}

		// Determinar el estado según si hay archivos
		// 0: Pendiente, 1: Vacío, 2: Con resultados (resultado_archivo)
		const tieneArchivos =
			archivoToSave && archivoToSave !== "[]" && archivoToSave.trim() !== "";
		const nuevoEstado = tieneArchivos ? 2 : 1;

		if (existingRows.length > 0) {
			// Actualizar resultado existente
			const sql = `
        UPDATE resultado
        SET archivo = ?, nombre = ?, fecha_emision = CURRENT_TIMESTAMP, estado_resultado = ?
        WHERE id_cita = ?
      `;
			await conn.execute(sql, [
				archivoToSave,
				nombre || null,
				nuevoEstado,
				id_cita,
			]);
			await conn.commit();
			return {
				id_resultado: existingRows[0].id_resultado,
				id_cita,
				archivo: archivoToSave,
				nombre: nombre || null,
				updated: true,
			};
		} else {
			// Crear nuevo resultado
			const id_resultado = crypto.randomUUID();
			const sql = `
        INSERT INTO resultado
          (id_resultado, id_cita, id_especialista, nombre, archivo, estado_resultado)
        VALUES
          (?, ?, ?, ?, ?, ?)
      `;
			await conn.execute(sql, [
				id_resultado,
				id_cita,
				cita.id_especialista,
				nombre || null,
				archivoToSave,
				nuevoEstado,
			]);
			await conn.commit();
			return {
				id_resultado,
				id_cita,
				archivo: archivoToSave,
				nombre: nombre || null,
				updated: false,
			};
		}
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

// Listar citas atendidas sin resultado (para moderador)
const listCitasSinResultadoController = async (id_especialista = null) => {
	let sql = `
    SELECT
      c.id_cita,
      c.id_paciente,
      c.id_especialista,
      c.id_eco,
      c.fecha_cita,
      c.hora_cita,
      c.estado_cita,
      u_paciente.nombre AS paciente_nombre,
      u_paciente.apellido AS paciente_apellido,
      u_especialista.nombre AS especialista_nombre,
      u_especialista.apellido AS especialista_apellido,
      e.nombre AS eco_nombre,
      r.archivo AS resultado_archivo
    FROM cita c
    INNER JOIN usuario u_paciente ON u_paciente.id_usuario = c.id_paciente
    INNER JOIN usuario u_especialista ON u_especialista.id_usuario = c.id_especialista
    INNER JOIN eco e ON e.id_eco = c.id_eco
    LEFT JOIN resultado r ON r.id_cita = c.id_cita
    WHERE c.estado_cita = 3
      AND (r.archivo IS NULL OR r.archivo = '' OR r.archivo = '[]')
  `;

	// Si se proporciona id_especialista, filtrar solo sus citas
	if (id_especialista) {
		sql += ` AND c.id_especialista = ?`;
	}

	sql += ` ORDER BY c.fecha_cita DESC, c.hora_cita DESC`;

	const params = id_especialista ? [id_especialista] : [];
	const [rows] = await pool.execute(sql, params);
	return rows;
};

// Listar todas las citas atendidas con información de resultados (para moderador)
const listCitasAtendidasConResultadosController = async () => {
	const sql = `
    SELECT
      c.id_cita,
      c.id_paciente,
      c.id_representado,
      c.id_especialista,
      c.id_eco,
      c.fecha_cita,
      c.hora_cita,
      c.estado_cita,
      u_paciente.nombre AS paciente_nombre,
      u_paciente.apellido AS paciente_apellido,
      u_especialista.nombre AS especialista_nombre,
      u_especialista.apellido AS especialista_apellido,
      e.nombre AS eco_nombre,
      r.archivo AS resultado_archivo,
      r.estado_resultado AS resultado_estado
    FROM cita c
    INNER JOIN usuario u_paciente ON u_paciente.id_usuario = c.id_paciente
    INNER JOIN usuario u_especialista ON u_especialista.id_usuario = c.id_especialista
    INNER JOIN eco e ON e.id_eco = c.id_eco
    LEFT JOIN resultado r ON r.id_cita = c.id_cita
    WHERE c.estado_cita = 3
    ORDER BY c.fecha_cita DESC, c.hora_cita DESC
  `;
	const [rows] = await pool.execute(sql);
	return rows;
};

// Obtener resultados del paciente autenticado
const listResultadosByPacienteController = async (id_paciente) => {
	const sql = `
    SELECT
      c.id_cita,
      c.id_paciente,
      c.id_especialista,
      c.id_eco,
      c.fecha_cita,
      c.hora_cita,
      c.estado_cita,
      u_paciente.nombre AS paciente_nombre,
      u_paciente.apellido AS paciente_apellido,
      u_especialista.nombre AS especialista_nombre,
      u_especialista.apellido AS especialista_apellido,
      e.nombre AS eco_nombre,
      r.archivo AS resultado_archivo,
      r.estado_resultado AS resultado_estado
    FROM cita c
    INNER JOIN usuario u_paciente ON u_paciente.id_usuario = c.id_paciente
    INNER JOIN usuario u_especialista ON u_especialista.id_usuario = c.id_especialista
    INNER JOIN eco e ON e.id_eco = c.id_eco
    LEFT JOIN resultado r ON r.id_cita = c.id_cita
    WHERE c.id_paciente = ? AND c.estado_cita = 3 AND r.archivo IS NOT NULL
    ORDER BY c.fecha_cita DESC, c.hora_cita DESC
  `;
	const [rows] = await pool.execute(sql, [id_paciente]);
	return rows;
};

// Eliminar un archivo específico de un resultado
const deleteArchivoFromResultadoController = async ({
	id_cita,
	archivoUrl,
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// Verificar que la cita existe y tiene resultado
		const [citaRows] = await conn.execute(
			`SELECT id_especialista, estado_cita
       FROM cita
       WHERE id_cita = ?
       FOR UPDATE`,
			[id_cita]
		);
		if (!citaRows.length) {
			const err = new Error("Cita no encontrada");
			err.code = "NOT_FOUND";
			throw err;
		}

		// Obtener el resultado actual
		const [resultadoRows] = await conn.execute(
			"SELECT archivo FROM resultado WHERE id_cita = ?",
			[id_cita]
		);
		if (!resultadoRows.length) {
			const err = new Error("No se encontró resultado para esta cita");
			err.code = "NOT_FOUND";
			throw err;
		}

		const archivoActual = resultadoRows[0].archivo;
		if (!archivoActual || archivoActual === "" || archivoActual === "[]") {
			const err = new Error("No hay archivos para eliminar");
			err.code = "INVALID_STATE";
			throw err;
		}

		// Parsear el archivo (puede ser JSON array o string simple)
		let archivos = [];
		try {
			const parsed = JSON.parse(archivoActual);
			archivos = Array.isArray(parsed) ? parsed : [archivoActual];
		} catch {
			archivos = [archivoActual];
		}

		// Filtrar el archivo a eliminar
		const archivosFiltrados = archivos.filter(
			(url) => url !== archivoUrl && url.trim() !== archivoUrl.trim()
		);

		if (archivosFiltrados.length === archivos.length) {
			const err = new Error("El archivo especificado no se encontró");
			err.code = "NOT_FOUND";
			throw err;
		}

		// Guardar el array actualizado
		const nuevoArchivo =
			archivosFiltrados.length === 0
				? "[]"
				: archivosFiltrados.length === 1
				? archivosFiltrados[0]
				: JSON.stringify(archivosFiltrados);

		// Actualizar estado: 1 Vacío si no hay archivos, 2 Con resultados si hay archivos
		const nuevoEstado = archivosFiltrados.length === 0 ? 1 : 2;

		await conn.execute(
			"UPDATE resultado SET archivo = ?, estado_resultado = ? WHERE id_cita = ?",
			[nuevoArchivo, nuevoEstado, id_cita]
		);

		await conn.commit();
		return {
			id_cita,
			archivo: nuevoArchivo,
			archivos_restantes: archivosFiltrados.length,
		};
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

module.exports = {
	createOrUpdateResultadoController,
	listCitasSinResultadoController,
	listCitasAtendidasConResultadosController,
	listResultadosByPacienteController,
	deleteArchivoFromResultadoController,
};
