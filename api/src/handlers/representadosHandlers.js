const {
	listByPacienteController,
	createRepresentadoController,
	listParentescosController,
	updateRepresentadoController,
	deleteRepresentadoController,
} = require("../controllers/representadosControllers");

const listRepresentadosHandler = async (req, res) => {
	try {
		const id_paciente = req.user.id;
		if (req.user.rol !== "paciente") {
			return res.status(403).json({
				ok: false,
				message: "Solo el paciente puede ver sus representados",
			});
		}

		const { page, limit, search, parentesco, genero } = req.query;
		const data = await listByPacienteController(id_paciente, {
			page,
			limit,
			search,
			parentesco,
			genero,
		});

		return res.status(200).json({
			ok: true,
			data: data.data,
			total: data.total,
			page: data.page,
			limit: data.limit,
			totalPages: data.totalPages,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const createRepresentadoHandler = async (req, res) => {
	try {
		const id_paciente = req.user.id;
		if (req.user.rol !== "paciente") {
			return res.status(403).json({
				ok: false,
				message: "Solo el paciente puede crear representados",
			});
		}

		const { nombre, apellido, cedula, fecha_nacimiento, genero, parentesco } =
			req.body;

		const created = await createRepresentadoController(id_paciente, {
			nombre,
			apellido,
			cedula,
			fecha_nacimiento,
			genero,
			parentesco,
		});

		return res.status(201).json({
			ok: true,
			message: "Representado creado",
			data: created,
		});
	} catch (err) {
		if (err.code === "VALIDATION") {
			return res.status(400).json({
				ok: false,
				message: err.message,
			});
		}
		if (err.code === "DUPLICATE_CEDULA") {
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

const listParentescosHandler = async (req, res) => {
	try {
		const id_paciente = req.user.id;
		if (req.user.rol !== "paciente") {
			return res.status(403).json({
				ok: false,
				message: "Solo el paciente puede listar parentescos",
			});
		}

		const data = await listParentescosController(id_paciente);
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

const updateRepresentadoHandler = async (req, res) => {
	try {
		const id_paciente = req.user.id;
		if (req.user.rol !== "paciente") {
			return res.status(403).json({
				ok: false,
				message: "Solo el paciente puede actualizar representados",
			});
		}

		const { id } = req.params;
		const { nombre, apellido, cedula, fecha_nacimiento, genero, parentesco } =
			req.body;

		const updated = await updateRepresentadoController(id_paciente, id, {
			nombre,
			apellido,
			cedula,
			fecha_nacimiento,
			genero,
			parentesco,
		});

		return res.status(200).json({
			ok: true,
			message: "Representado actualizado",
			data: updated,
		});
	} catch (err) {
		if (err.code === "VALIDATION") {
			return res.status(400).json({
				ok: false,
				message: err.message,
			});
		}
		if (err.code === "NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		if (err.code === "DUPLICATE_CEDULA") {
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

const deleteRepresentadoHandler = async (req, res) => {
	try {
		const id_paciente = req.user.id;
		if (req.user.rol !== "paciente") {
			return res.status(403).json({
				ok: false,
				message: "Solo el paciente puede eliminar representados",
			});
		}

		const { id } = req.params;
		await deleteRepresentadoController(id_paciente, id);

		return res.status(200).json({
			ok: true,
			message: "Representado eliminado",
		});
	} catch (err) {
		if (err.code === "NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		if (err.code === "HAS_APPOINTMENTS") {
			return res.status(400).json({
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
	listRepresentadosHandler,
	createRepresentadoHandler,
	listParentescosHandler,
	updateRepresentadoHandler,
	deleteRepresentadoHandler,
};
