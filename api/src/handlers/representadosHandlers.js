const {
	listByPacienteController,
	createRepresentadoController,
	createRepresentadoPorCedulaTitularController,
	listParentescosController,
	updateRepresentadoController,
	deleteRepresentadoController,
} = require("../controllers/representadosControllers");
const { validarCedula } = require("../utils/validacionCedula");

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

		let cedulaValue = cedula;
		if (cedula != null && String(cedula).trim()) {
			const cedulaResult = validarCedula(cedula, { required: false });
			if (!cedulaResult.valid) {
				return res.status(400).json({
					ok: false,
					message: cedulaResult.message,
				});
			}
			cedulaValue = cedulaResult.value;
		}

		const created = await createRepresentadoController(id_paciente, {
			nombre,
			apellido,
			cedula: cedulaValue,
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
		if (err.code === "DUPLICATE_CEDULA" || err.code === "DUPLICATE_REPRESENTADO") {
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

const createRepresentadoPorCedulaTitularHandler = async (req, res) => {
	try {
		const {
			cedula_titular,
			nombre,
			apellido,
			cedula,
			fecha_nacimiento,
			genero,
			parentesco,
			nombre_titular,
			apellido_titular,
			genero_titular,
			fecha_nacimiento_titular,
		} = req.body;

		if (!cedula_titular || !String(cedula_titular).trim()) {
			return res.status(400).json({
				ok: false,
				message: "La cédula del titular es obligatoria.",
			});
		}

		let cedulaValue = cedula;
		if (cedula != null && String(cedula).trim()) {
			const cedulaResult = validarCedula(cedula, { required: false });
			if (!cedulaResult.valid) {
				return res.status(400).json({
					ok: false,
					message: cedulaResult.message,
				});
			}
			cedulaValue = cedulaResult.value;
		}

		const opts = {};
		if (nombre_titular != null && String(nombre_titular).trim()) opts.nombre_titular = String(nombre_titular).trim();
		if (apellido_titular != null && String(apellido_titular).trim()) opts.apellido_titular = String(apellido_titular).trim();
		if (genero_titular != null && String(genero_titular).trim()) opts.genero_titular = String(genero_titular).trim();
		if (fecha_nacimiento_titular != null && String(fecha_nacimiento_titular).trim()) opts.fecha_nacimiento_titular = String(fecha_nacimiento_titular).trim();

		const created = await createRepresentadoPorCedulaTitularController(
			String(cedula_titular).trim(),
			{
				nombre,
				apellido,
				cedula: cedulaValue,
				fecha_nacimiento,
				genero,
				parentesco,
			},
			opts,
		);

		return res.status(201).json({
			ok: true,
			message: "Representado creado y asignado al titular.",
			data: created,
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
		if (err.code === "DUPLICATE_CEDULA" || err.code === "DUPLICATE_REPRESENTADO") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		if (err.code === "CONFLICT" || err.code === "ROL_NOT_FOUND") {
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

		let cedulaPayload = cedula;
		if (cedula !== undefined && cedula !== null && String(cedula).trim()) {
			const cedulaResult = validarCedula(cedula, { required: false });
			if (!cedulaResult.valid) {
				return res.status(400).json({
					ok: false,
					message: cedulaResult.message,
				});
			}
			cedulaPayload = cedulaResult.value;
		}

		const updated = await updateRepresentadoController(id_paciente, id, {
			nombre,
			apellido,
			cedula: cedulaPayload,
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
		if (err.code === "DUPLICATE_CEDULA" || err.code === "DUPLICATE_REPRESENTADO") {
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
	createRepresentadoPorCedulaTitularHandler,
	listParentescosHandler,
	updateRepresentadoHandler,
	deleteRepresentadoHandler,
};
