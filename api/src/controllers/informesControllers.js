const { pool } = require("../db");
const crypto = require("crypto");
const { generateInformePDF } = require("../utils/generateInformePDF");
const { createNotificacionController } = require("./notificacionesControllers");
const { formatFechaCita, formatHoraCita } = require("../utils/citaEmails");

// Listar todos los informes del especialista
const listInformesByEspecialistaController = async (id_especialista) => {
	const sql = `
    SELECT 
      i.id_informe,
      i.id_cita,
      i.id_especialista,
      i.reseña,
      i.recomendaciones,
      i.firma_url,
      i.informe_pdf_url,
      i.fecha_creacion,
      i.fecha_actualizacion,
      c.fecha_cita,
      c.hora_cita,
      c.estado_cita,
      u.nombre AS paciente_nombre,
      u.apellido AS paciente_apellido,
      e.nombre AS eco_nombre
    FROM informe i
    INNER JOIN cita c ON c.id_cita = i.id_cita
    INNER JOIN usuario u ON u.id_usuario = c.id_paciente
    INNER JOIN eco e ON e.id_eco = c.id_eco
    WHERE i.id_especialista = ?
    ORDER BY c.fecha_cita DESC, c.hora_cita DESC
  `;
	const [rows] = await pool.execute(sql, [id_especialista]);
	return rows;
};

// Obtener informe por id_cita
const getInformeByCitaController = async (id_cita, id_especialista) => {
	try {
		const sql = `
      SELECT 
        i.id_informe,
        i.id_cita,
        i.id_especialista,
        i.reseña,
        i.recomendaciones,
        i.firma_url,
        i.informe_pdf_url,
        i.fecha_creacion,
        i.fecha_actualizacion,
        c.fecha_cita,
        c.hora_cita,
        c.estado_cita,
        u.nombre AS paciente_nombre,
        u.apellido AS paciente_apellido,
        e.nombre AS eco_nombre
      FROM informe i
      INNER JOIN cita c ON c.id_cita = i.id_cita
      INNER JOIN usuario u ON u.id_usuario = c.id_paciente
      INNER JOIN eco e ON e.id_eco = c.id_eco
      WHERE i.id_cita = ? AND i.id_especialista = ?
      LIMIT 1
    `;
		const [rows] = await pool.execute(sql, [id_cita, id_especialista]);
		return rows[0] || null;
	} catch (error) {
		console.error("Error en getInformeByCitaController:", error);
		throw error;
	}
};

// Crear o actualizar informe
const createOrUpdateInformeController = async ({
	id_cita,
	id_especialista,
	reseña,
	recomendaciones,
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// Obtener todos los datos necesarios de la cita, paciente (titular), representado, especialista, eco y resultado
		const [citaData] = await conn.execute(
			`SELECT 
        c.id_cita,
        c.id_paciente,
        c.id_representado,
        c.id_especialista,
        c.estado_cita,
        DATE_FORMAT(c.fecha_cita, '%d/%m/%Y') AS fecha_cita_formatted,
        c.fecha_cita,
        TIME_FORMAT(c.hora_cita, '%h:%i %p') AS hora_cita_formatted,
        c.hora_cita,
        r.archivo AS eco_archivo_url,
        r.estado_resultado AS resultado_estado,
        u_paciente.nombre AS paciente_nombre,
        u_paciente.apellido AS paciente_apellido,
        u_paciente.cedula AS paciente_cedula,
        u_paciente.telefono AS paciente_telefono,
        u_especialista.nombre AS especialista_nombre,
        u_especialista.apellido AS especialista_apellido,
        u_especialista.cedula AS especialista_cedula,
        e.nombre AS eco_nombre,
        rep.nombre AS representado_nombre,
        rep.apellido AS representado_apellido,
        rep.cedula AS representado_cedula,
        rep.fecha_nacimiento AS representado_fecha_nacimiento,
        rep.parentesco AS representado_parentesco
      FROM cita c
      INNER JOIN usuario u_paciente ON u_paciente.id_usuario = c.id_paciente
      INNER JOIN usuario u_especialista ON u_especialista.id_usuario = c.id_especialista
      INNER JOIN eco e ON e.id_eco = c.id_eco
      LEFT JOIN resultado r ON r.id_cita = c.id_cita
      LEFT JOIN representado rep ON rep.id_representado = c.id_representado
      WHERE c.id_cita = ?`,
			[id_cita],
		);

		if (!citaData.length) {
			const err = new Error("Cita no encontrada");
			err.code = "NOT_FOUND";
			throw err;
		}

		const citaInfo = citaData[0];

		if (citaInfo.id_especialista !== id_especialista) {
			const err = new Error("No autorizado para esta cita");
			err.code = "FORBIDDEN";
			throw err;
		}

		// Validar que la cita esté marcada como atendida (estado_cita = 3)
		if (citaInfo.estado_cita !== 3) {
			const err = new Error(
				"Solo se pueden crear informes para citas que han sido atendidas",
			);
			err.code = "INVALID_STATE";
			throw err;
		}

		// Verificar si ya existe un informe
		const [existing] = await conn.execute(
			`SELECT id_informe FROM informe WHERE id_cita = ?`,
			[id_cita],
		);

		// Normalizar valores null/undefined
		const reseñaValue = reseña || null;
		const recomendacionesValue = recomendaciones || null;

		// Usuario que agendó (siempre el titular - id_paciente)
		const usuarioQueAgendo = {
			nombre: citaInfo.paciente_nombre,
			apellido: citaInfo.paciente_apellido,
		};
		// Si hay representado, los datos del estudio son del representado; si no, del paciente titular
		const esRepresentado =
			citaInfo.id_representado &&
			(citaInfo.representado_nombre || citaInfo.representado_apellido);
		const representado = esRepresentado
			? {
					nombre: citaInfo.representado_nombre || "",
					apellido: citaInfo.representado_apellido || "",
					cedula: citaInfo.representado_cedula || null,
					fecha_nacimiento: citaInfo.representado_fecha_nacimiento
						? new Date(
								citaInfo.representado_fecha_nacimiento,
							).toLocaleDateString("es-VE")
						: null,
					parentesco: citaInfo.representado_parentesco || null,
				}
			: null;
		const paciente = {
			nombre: citaInfo.paciente_nombre,
			apellido: citaInfo.paciente_apellido,
			cedula: citaInfo.paciente_cedula,
			telefono: citaInfo.paciente_telefono,
		};

		// Generar PDF con todos los datos
		const pdfData = {
			reseña: reseñaValue,
			recomendaciones: recomendacionesValue,
			usuarioQueAgendo,
			paciente,
			representado,
			especialista: {
				nombre: citaInfo.especialista_nombre,
				apellido: citaInfo.especialista_apellido,
				cedula: citaInfo.especialista_cedula,
			},
			cita: {
				fecha_cita:
					citaInfo.fecha_cita_formatted ||
					new Date(citaInfo.fecha_cita).toLocaleDateString("es-VE"),
				hora_cita: citaInfo.hora_cita_formatted || citaInfo.hora_cita,
				eco_nombre: citaInfo.eco_nombre,
			},
			ecoUrl: citaInfo.eco_archivo_url || null, // URL del archivo del eco
		};

		// Debug: Log para verificar si hay URL del eco
		console.log("📄 Generando PDF para cita:", id_cita);
		console.log(
			"🔗 URL del eco (resultado.archivo):",
			citaInfo.eco_archivo_url,
		);
		console.log("📊 Estado del resultado:", citaInfo.resultado_estado);
		console.log("📋 Tipo de dato:", typeof citaInfo.eco_archivo_url);

		// Normalizar la URL del eco (puede ser null, undefined, o string vacío)
		let ecoUrlFinal = null;
		if (citaInfo.eco_archivo_url) {
			const urlTrimmed = String(citaInfo.eco_archivo_url).trim();
			if (urlTrimmed.length > 0) {
				ecoUrlFinal = urlTrimmed;
			}
		}

		// Actualizar el ecoUrl en pdfData con el valor normalizado
		pdfData.ecoUrl = ecoUrlFinal;

		// Generar y guardar PDF en el VPS
		const pdfResult = await generateInformePDF(pdfData);
		const informePdfUrl = pdfResult.url;

		let informeId;
		if (existing.length > 0) {
			// Actualizar informe existente
			informeId = existing[0].id_informe;
			await conn.execute(
				`UPDATE informe 
         SET reseña = ?, recomendaciones = ?, informe_pdf_url = ?
         WHERE id_informe = ?`,
				[reseñaValue, recomendacionesValue, informePdfUrl, informeId],
			);
		} else {
			// Crear nuevo informe
			informeId = crypto.randomUUID();
			await conn.execute(
				`INSERT INTO informe (
          id_informe, id_cita, id_especialista, reseña, recomendaciones, informe_pdf_url
        ) VALUES (?, ?, ?, ?, ?, ?)`,
				[
					informeId,
					id_cita,
					id_especialista,
					reseñaValue,
					recomendacionesValue,
					informePdfUrl,
				],
			);
		}

		await conn.commit();

		// Notificar al paciente que el especialista envió el informe
		try {
			const id_paciente = citaInfo.id_paciente;
			if (id_paciente) {
				const fecha = formatFechaCita(citaInfo.fecha_cita);
				const hora = formatHoraCita(citaInfo.hora_cita);
				const ecoNombre = citaInfo.eco_nombre ? ` (${citaInfo.eco_nombre})` : "";
				let mensaje = `El especialista ha enviado el informe de tu cita del ${fecha} a las ${hora}${ecoNombre}. Puedes verlo en el detalle de tu cita.`;
				if (mensaje.length > 255) mensaje = `${mensaje.slice(0, 252)}...`;
				await createNotificacionController({
					id_usuario: id_paciente,
					titulo: "Informe del especialista disponible",
					mensaje,
					tipo: "informe_disponible",
				});
			}
		} catch (e) {
			console.error("Error notificando paciente (informe):", e);
		}

		// Retornar el informe creado/actualizado usando la misma conexión
		// (aunque ya se hizo commit, podemos usar pool.execute normalmente)
		const informe = await getInformeByCitaController(id_cita, id_especialista);

		// Si no se encuentra el informe recién creado, retornar los datos básicos
		if (!informe) {
			return {
				id_informe: informeId,
				id_cita,
				id_especialista,
				reseña: reseñaValue,
				recomendaciones: recomendacionesValue,
				informe_pdf_url: informePdfUrl,
			};
		}

		return informe;
	} catch (error) {
		await conn.rollback();
		throw error;
	} finally {
		conn.release();
	}
};

// Listar todos los informes completados (para moderadores)
const listAllInformesController = async () => {
	const sql = `
    SELECT 
      i.id_informe,
      i.id_cita,
      i.id_especialista,
      i.reseña,
      i.recomendaciones,
      i.firma_url,
      i.informe_pdf_url,
      i.fecha_creacion,
      i.fecha_actualizacion,
      c.fecha_cita,
      c.hora_cita,
      c.estado_cita,
      u_paciente.nombre AS paciente_nombre,
      u_paciente.apellido AS paciente_apellido,
      u_paciente.cedula AS paciente_cedula,
      u_especialista.nombre AS especialista_nombre,
      u_especialista.apellido AS especialista_apellido,
      e.nombre AS eco_nombre
    FROM informe i
    INNER JOIN cita c ON c.id_cita = i.id_cita
    INNER JOIN usuario u_paciente ON u_paciente.id_usuario = c.id_paciente
    INNER JOIN usuario u_especialista ON u_especialista.id_usuario = i.id_especialista
    INNER JOIN eco e ON e.id_eco = c.id_eco
    ORDER BY c.fecha_cita DESC, c.hora_cita DESC
  `;
	const [rows] = await pool.execute(sql);
	return rows;
};

// Listar citas atendidas sin informe (para moderadores)
const listCitasAtendidasSinInformeController = async () => {
	const sql = `
    SELECT 
      c.id_cita,
      c.fecha_cita,
      c.hora_cita,
      c.estado_cita,
      u_paciente.nombre AS paciente_nombre,
      u_paciente.apellido AS paciente_apellido,
      u_paciente.cedula AS paciente_cedula,
      u_especialista.nombre AS especialista_nombre,
      u_especialista.apellido AS especialista_apellido,
      e.nombre AS eco_nombre
    FROM cita c
    INNER JOIN usuario u_paciente ON u_paciente.id_usuario = c.id_paciente
    INNER JOIN usuario u_especialista ON u_especialista.id_usuario = c.id_especialista
    INNER JOIN eco e ON e.id_eco = c.id_eco
    LEFT JOIN informe i ON i.id_cita = c.id_cita
    WHERE c.estado_cita = 3 AND i.id_informe IS NULL
    ORDER BY c.fecha_cita DESC, c.hora_cita DESC
  `;
	const [rows] = await pool.execute(sql);
	return rows;
};

module.exports = {
	listInformesByEspecialistaController,
	getInformeByCitaController,
	createOrUpdateInformeController,
	listAllInformesController,
	listCitasAtendidasSinInformeController,
};
