const {
	listEcosController,
	createEcoController,
	updateEcoController,
	deleteEcoController,
} = require("../controllers/ecosControllers");

const listEcosHandler = async (req, res) => {
	try {
		const data = await listEcosController();
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

const createEcoHandler = async (req, res) => {
	try {
		const { nombre, precio, duracion_min } = req.body;

		const missing = [];
		if (!nombre) missing.push("nombre");
		if (precio === undefined || precio === null) missing.push("precio");

		if (missing.length) {
			return res.status(400).json({
				ok: false,
				message: "Faltan campos requeridos",
				missing,
			});
		}

		if (typeof precio !== "number" || precio < 0) {
			return res.status(400).json({
				ok: false,
				message: "precio debe ser un número positivo",
			});
		}

		const created = await createEcoController({
			nombre,
			precio: Number(precio),
			duracion_min: duracion_min ? Number(duracion_min) : 0,
		});

		return res.status(201).json({
			ok: true,
			message: "Eco creado",
			data: created,
		});
	} catch (err) {
		if (err?.code === "ER_DUP_ENTRY") {
			return res.status(409).json({
				ok: false,
				message: "Ya existe un eco con ese nombre",
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const updateEcoHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const { nombre, precio, duracion_min, activo } = req.body;

		if (precio !== undefined && (typeof precio !== "number" || precio < 0)) {
			return res.status(400).json({
				ok: false,
				message: "precio debe ser un número positivo",
			});
		}

		const result = await updateEcoController({
			id_eco: id,
			nombre,
			precio: precio !== undefined ? Number(precio) : undefined,
			duracion_min: duracion_min !== undefined ? Number(duracion_min) : undefined,
			activo: activo !== undefined ? Number(activo) : undefined,
		});

		if (!result.updated) {
			return res.status(404).json({
				ok: false,
				message: "Eco no encontrado",
			});
		}

		return res.status(200).json({
			ok: true,
			message: "Eco actualizado",
			data: result,
		});
	} catch (err) {
		if (err?.code === "NO_FIELDS") {
			return res.status(400).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "ER_DUP_ENTRY") {
			return res.status(409).json({
				ok: false,
				message: "Ya existe un eco con ese nombre",
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const deleteEcoHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const result = await deleteEcoController(id);
		if (!result.deleted) {
			return res.status(404).json({
				ok: false,
				message: "Eco no encontrado",
			});
		}
		return res.status(200).json({
			ok: true,
			message: "Eco eliminado",
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
	listEcosHandler,
	createEcoHandler,
	updateEcoHandler,
	deleteEcoHandler,
};
