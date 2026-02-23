const {
	listEspecialidadesController,
	createEspecialidadController,
	updateEspecialidadController,
	deleteEspecialidadController,
} = require("../controllers/especialidadesControllers");

const listEspecialidadesHandler = async (req, res) => {
	try {
		const data = await listEspecialidadesController();
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

const createEspecialidadHandler = async (req, res) => {
	try {
		const { nombre } = req.body;
		if (!nombre) {
			return res.status(400).json({
				ok: false,
				message: "nombre es requerido",
			});
		}

		const created = await createEspecialidadController({ nombre });
		return res.status(201).json({
			ok: true,
			message: "Especialidad creada",
			data: created,
		});
	} catch (err) {
		if (err?.code === "ER_DUP_ENTRY") {
			return res.status(409).json({
				ok: false,
				message: "La especialidad ya existe",
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const updateEspecialidadHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const { nombre } = req.body;
		if (!nombre) {
			return res.status(400).json({
				ok: false,
				message: "nombre es requerido",
			});
		}
		const result = await updateEspecialidadController({ id_especialidad: id, nombre });
		if (!result.updated) {
			return res.status(404).json({
				ok: false,
				message: "Especialidad no encontrada",
			});
		}
		return res.status(200).json({
			ok: true,
			message: "Especialidad actualizada",
			data: result,
		});
	} catch (err) {
		if (err?.code === "ER_DUP_ENTRY") {
			return res.status(409).json({
				ok: false,
				message: "La especialidad ya existe",
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const deleteEspecialidadHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const result = await deleteEspecialidadController(id);
		if (!result.deleted) {
			return res.status(404).json({
				ok: false,
				message: "Especialidad no encontrada",
			});
		}
		return res.status(200).json({
			ok: true,
			message: "Especialidad eliminada",
			data: result,
		});
	} catch (err) {
		if (err?.code === "IN_USE") {
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
	listEspecialidadesHandler,
	createEspecialidadHandler,
	updateEspecialidadHandler,
	deleteEspecialidadHandler,
};
