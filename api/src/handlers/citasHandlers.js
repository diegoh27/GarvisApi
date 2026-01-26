const {
	createCitaFromDisponibilidadController,
	listCitasByPacienteController,
	listCitasByEspecialistaController,
	cancelCitaController,
	markCitaAtendidaController,
	listCitasPendientesPagoController,
	listCitasConPagosController,
	updateEstadoPagoController,
	listCitasByFechaController,
	getCitaByIdController,
} = require("../controllers/citasControllers");

const createCitaHandler = async (req, res) => {
	try {
		const { id_paciente, id_representado, id_eco, orden, id_disponibilidad } =
			req.body;

		const missing = [];
		if (!id_paciente) missing.push("id_paciente");
		if (!id_eco) missing.push("id_eco");
		if (!orden) missing.push("orden");
		if (!id_disponibilidad) missing.push("id_disponibilidad");

		if (missing.length) {
			return res.status(400).json({
				ok: false,
				message: "Faltan campos requeridos",
				missing,
			});
		}

		if (req.user?.id !== id_paciente) {
			return res.status(403).json({
				ok: false,
				message: "No autorizado para crear cita a otro paciente",
			});
		}

		const created = await createCitaFromDisponibilidadController({
			id_paciente,
			id_representado,
			id_eco,
			orden,
			id_disponibilidad,
		});

		return res.status(201).json({
			ok: true,
			message: "Cita creada",
			data: created,
		});
	} catch (err) {
		if (err?.code === "NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "INVALID_STATE") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "PAST_DATE") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "ER_DUP_ENTRY") {
			return res.status(409).json({
				ok: false,
				message: "La disponibilidad ya fue reservada",
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const listCitasByPacienteHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await listCitasByPacienteController(id);
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const listCitasByEspecialistaHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await listCitasByEspecialistaController(id);
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const listCitasByEspecialistaSelfHandler = async (req, res) => {
	try {
		const id = req.user?.id;
		if (!id) {
			return res.status(401).json({
				ok: false,
				message: "Token inválido",
			});
		}
		const data = await listCitasByEspecialistaController(id);
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const cancelCitaHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const result = await cancelCitaController({ id_cita: id });
		return res.status(200).json({
			ok: true,
			message: "Cita cancelada",
			data: result,
		});
	} catch (err) {
		if (err?.code === "NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const markCitaAtendidaHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const id_especialista = req.user?.id;
		if (!id_especialista) {
			return res.status(401).json({
				ok: false,
				message: "Token inválido",
			});
		}
		const data = await markCitaAtendidaController({
			id_cita: id,
			id_especialista,
		});
		return res.status(200).json({
			ok: true,
			message: "Cita atendida",
			data,
		});
	} catch (err) {
		if (err?.code === "NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "FORBIDDEN") {
			return res.status(403).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "INVALID_STATE" || err?.code === "FUTURE_DATE") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const listCitasPendientesPagoHandler = async (req, res) => {
	try {
		const data = await listCitasPendientesPagoController();
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const listCitasConPagosHandler = async (req, res) => {
	try {
		const data = await listCitasConPagosController();
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const updateEstadoPagoHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const { estado_pago } = req.body;
		const aprobado_por = req.user?.id;

		if (!aprobado_por) {
			return res.status(401).json({
				ok: false,
				message: "Token inválido",
			});
		}

		if (estado_pago === undefined || ![0, 1, 2].includes(Number(estado_pago))) {
			return res.status(400).json({
				ok: false,
				message: "estado_pago debe ser 0 (Pendiente), 1 (Aprobado) o 2 (Rechazado)",
			});
		}

		const data = await updateEstadoPagoController({
			id_cita: id,
			estado_pago: Number(estado_pago),
			aprobado_por,
		});

		return res.status(200).json({
			ok: true,
			message:
				estado_pago === 1
					? "Pago aprobado y cita confirmada"
					: estado_pago === 2
						? "Pago rechazado"
						: "Estado de pago actualizado",
			data,
		});
	} catch (err) {
		if (err?.code === "NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "INVALID_STATE") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const listCitasByFechaHandler = async (req, res) => {
	try {
		const { fecha } = req.query;
		if (!fecha) {
			return res.status(400).json({
				ok: false,
				message: "fecha es requerida",
			});
		}
		const data = await listCitasByFechaController(fecha);
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const getCitaByIdHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const { rol, id: id_usuario } = req.user; // Información del usuario autenticado (el campo es 'id' no 'id_usuario')
		
		if (!id) {
			return res.status(400).json({
				ok: false,
				message: "id es requerido",
			});
		}
		const data = await getCitaByIdController(id);
		if (!data) {
			return res.status(404).json({
				ok: false,
				message: "Cita no encontrada",
			});
		}
		
		// Si es especialista, solo puede ver sus propias citas
		// En la tabla cita, id_especialista hace referencia a especialista(id_especialista)
		// Y en la tabla especialista, id_especialista = id_usuario
		if (rol === "especialista") {
			// Convertir a string y comparar para evitar problemas de tipo
			const citaEspecialistaId = String(data.id_especialista || "").trim();
			const usuarioId = String(id_usuario || "").trim();
			
			if (citaEspecialistaId !== usuarioId) {
				console.log("🔒 Acceso denegado - Especialista intentando ver cita de otro:", {
					usuarioId,
					citaEspecialistaId,
					citaId: id,
					rol,
					comparison: citaEspecialistaId === usuarioId,
				});
				return res.status(403).json({
					ok: false,
					message: "No tienes permiso para ver esta cita. Esta cita pertenece a otro especialista.",
				});
			}
		}
		
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

module.exports = {
	createCitaHandler,
	listCitasByPacienteHandler,
	listCitasByEspecialistaHandler,
	listCitasByEspecialistaSelfHandler,
	cancelCitaHandler,
	markCitaAtendidaHandler,
	listCitasPendientesPagoHandler,
	listCitasConPagosHandler,
	updateEstadoPagoHandler,
	listCitasByFechaHandler,
	getCitaByIdHandler,
};
