const {
	listInformesByEspecialistaController,
	getInformeByCitaController,
	createOrUpdateInformeController,
} = require("../controllers/informesControllers");

const listInformesHandler = async (req, res) => {
	try {
		const id_especialista = req.user?.id;
		if (!id_especialista) {
			return res.status(401).json({
				ok: false,
				message: "Token inválido",
			});
		}
		const data = await listInformesByEspecialistaController(id_especialista);
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

const getInformeByCitaHandler = async (req, res) => {
	try {
		const { id_cita } = req.params;
		const id_especialista = req.user?.id;
		if (!id_especialista) {
			return res.status(401).json({
				ok: false,
				message: "Token inválido",
			});
		}
		const data = await getInformeByCitaController(id_cita, id_especialista);
		if (!data) {
			return res.status(404).json({
				ok: false,
				message: "Informe no encontrado",
			});
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

const createOrUpdateInformeHandler = async (req, res) => {
	try {
		const { id_cita, reseña, recomendaciones } = req.body;
		const id_especialista = req.user?.id;
		if (!id_especialista) {
			return res.status(401).json({
				ok: false,
				message: "Token inválido",
			});
		}
		if (!id_cita) {
			return res.status(400).json({
				ok: false,
				message: "id_cita es requerido",
			});
		}
		const data = await createOrUpdateInformeController({
			id_cita,
			id_especialista,
			reseña,
			recomendaciones,
		});
		return res.status(200).json({
			ok: true,
			message: "Informe guardado exitosamente",
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
		if (err?.code === "INVALID_STATE") {
			return res.status(400).json({
				ok: false,
				message: err.message,
			});
		}
		console.error("Error en createOrUpdateInformeHandler:", err);
		console.error("Stack:", err.stack);
		return res.status(500).json({
			ok: false,
			message: err.message || "Error interno",
			error: process.env.NODE_ENV === "development" ? err.message : undefined,
		});
	}
};

module.exports = {
	listInformesHandler,
	getInformeByCitaHandler,
	createOrUpdateInformeHandler,
};
