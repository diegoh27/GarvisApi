const {
	listEcosByEspecialistaController,
	asignarEcoToEspecialistaController,
	quitarEcoFromEspecialistaController,
	listAllEcosWithEspecialistasController,
} = require("../controllers/especialistaEcosControllers");

const listEcosByEspecialistaHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user?.id;
		const userRole = req.user?.rol;

		// Si es especialista, solo puede ver sus propios ecos
		if (userRole === "especialista" && userId !== id) {
			return res.status(403).json({
				ok: false,
				message: "No tienes permiso para ver los ecos de otro especialista",
			});
		}

		const data = await listEcosByEspecialistaController(id);
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

const asignarEcoHandler = async (req, res) => {
	try {
		const { id_especialista, id_eco } = req.body;
		
		if (!id_especialista || !id_eco) {
			return res.status(400).json({
				ok: false,
				message: "id_especialista e id_eco son requeridos",
			});
		}

		const result = await asignarEcoToEspecialistaController({
			id_especialista,
			id_eco,
		});

		return res.status(201).json({
			ok: true,
			message: "Eco asignado al especialista",
			data: result,
		});
	} catch (err) {
		if (err?.code === "ESPECIALISTA_NOT_FOUND" || err?.code === "ECO_NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "ALREADY_ASSIGNED") {
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

const quitarEcoHandler = async (req, res) => {
	try {
		const { id_especialista, id_eco } = req.body;
		
		if (!id_especialista || !id_eco) {
			return res.status(400).json({
				ok: false,
				message: "id_especialista e id_eco son requeridos",
			});
		}

		const result = await quitarEcoFromEspecialistaController({
			id_especialista,
			id_eco,
		});

		return res.status(200).json({
			ok: true,
			message: "Eco removido del especialista",
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

const listAllEcosWithEspecialistasHandler = async (req, res) => {
	try {
		const data = await listAllEcosWithEspecialistasController();
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
	listEcosByEspecialistaHandler,
	asignarEcoHandler,
	quitarEcoHandler,
	listAllEcosWithEspecialistasHandler,
};
