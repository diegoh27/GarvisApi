const {
	createCitaFromDisponibilidadController,
	listCitasByPacienteController,
	listCitasByEspecialistaController,
	cancelCitaController,
	markCitaAtendidaController,
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

module.exports = {
	createCitaHandler,
	listCitasByPacienteHandler,
	listCitasByEspecialistaHandler,
	listCitasByEspecialistaSelfHandler,
	cancelCitaHandler,
	markCitaAtendidaHandler,
};
