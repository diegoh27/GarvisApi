const {
	createModeradorController,
	listModeradoresController,
	getModeradorByIdController,
	updateModeradorController,
	deactivateModeradorController,
	getModeradorSelfController,
	updateModeradorSelfController,
} = require("../controllers/moderadoresControllers");
const { validarCedula } = require("../utils/validacionCedula");
const { validarTelefono } = require("../utils/validacionTelefono");

const createModeradorHandler = async (req, res) => {
	try {
		const {
			nombre,
			apellido,
			genero,
			cedula,
			correo,
			telefono,
			contrasena,
			fecha_nacimiento,
		} = req.body;

		const missing = [];
		if (!nombre) missing.push("nombre");
		if (!apellido) missing.push("apellido");
		if (!genero) missing.push("genero");
		if (!cedula) missing.push("cedula");
		if (!correo) missing.push("correo");
		if (!telefono) missing.push("telefono");
		if (!contrasena) missing.push("contrasena");
		if (!fecha_nacimiento) missing.push("fecha_nacimiento");

		if (missing.length) {
			return res.status(400).json({
				ok: false,
				message: "Faltan campos requeridos",
				missing,
			});
		}

		if (!["Masculino", "Femenino", "Otro"].includes(genero)) {
			return res.status(400).json({
				ok: false,
				message: "genero inválido (Masculino | Femenino | Otro)",
			});
		}

		const cedulaResult = validarCedula(cedula);
		if (!cedulaResult.valid) {
			return res.status(400).json({
				ok: false,
				message: cedulaResult.message,
			});
		}

		const telefonoResult = validarTelefono(telefono);
		if (!telefonoResult.valid) {
			return res.status(400).json({
				ok: false,
				message: telefonoResult.message,
			});
		}

		const created = await createModeradorController({
			nombre,
			apellido,
			genero,
			cedula: cedulaResult.value,
			correo,
			telefono: telefonoResult.value,
			contrasena,
			fecha_nacimiento,
		});

		return res.status(201).json({
			ok: true,
			message: "Moderador creado",
			data: created,
		});
	} catch (err) {
		if (err?.code === "ER_DUP_ENTRY") {
			return res.status(409).json({
				ok: false,
				message: "Ya existe un usuario con esa cédula o correo",
			});
		}
		if (err?.code === "DUPLICATE_TELEFONO") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "ROL_NOT_FOUND") {
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

const listModeradoresHandler = async (req, res) => {
	try {
		const { q } = req.query;
		const data = await listModeradoresController({ q });
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

const getModeradorByIdHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await getModeradorByIdController(id);
		if (!data) {
			return res.status(404).json({
				ok: false,
				message: "Moderador no encontrado",
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

const updateModeradorHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const payload = { ...req.body };

		if (payload.genero && !["Masculino", "Femenino", "Otro"].includes(payload.genero)) {
			return res.status(400).json({
				ok: false,
				message: "genero inválido (Masculino | Femenino | Otro)",
			});
		}

		if (payload.cedula !== undefined && payload.cedula !== null && String(payload.cedula).trim()) {
			const cedulaResult = validarCedula(payload.cedula, { required: false });
			if (!cedulaResult.valid) {
				return res.status(400).json({
					ok: false,
					message: cedulaResult.message,
				});
			}
			payload.cedula = cedulaResult.value;
		}
		if (payload.telefono !== undefined && payload.telefono !== null && String(payload.telefono).trim()) {
			const telefonoResult = validarTelefono(payload.telefono, { required: false });
			if (!telefonoResult.valid) {
				return res.status(400).json({
					ok: false,
					message: telefonoResult.message,
				});
			}
			payload.telefono = telefonoResult.value;
		}

		const result = await updateModeradorController(id, payload);
		if (!result.updated) {
			return res.status(404).json({
				ok: false,
				message: "Moderador no encontrado",
			});
		}
		const data = await getModeradorByIdController(id);
		return res.status(200).json({
			ok: true,
			message: "Moderador actualizado",
			data,
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
				message: "Cédula o correo ya existe",
			});
		}
		if (err?.code === "DUPLICATE_TELEFONO") {
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

const deleteModeradorHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const result = await deactivateModeradorController(id);
		if (!result.updated) {
			return res.status(404).json({
				ok: false,
				message: "Moderador no encontrado",
			});
		}
		return res.status(200).json({
			ok: true,
			message: "Moderador desactivado",
			data: result,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const getModeradorSelfHandler = async (req, res) => {
	try {
		const id_moderador = req.user?.id;
		const data = await getModeradorSelfController(id_moderador);
		if (!data) {
			return res.status(404).json({
				ok: false,
				message: "Moderador no encontrado",
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

const updateModeradorSelfHandler = async (req, res) => {
	try {
		const { telefono, contrasena } = req.body;
		const id_usuario = req.user?.id;

		const result = await updateModeradorSelfController({
			id_usuario,
			telefono,
			contrasena,
		});

		if (!result.updated) {
			return res.status(404).json({
				ok: false,
				message: "Moderador no encontrado",
			});
		}

		return res.status(200).json({
			ok: true,
			message: "Perfil actualizado",
			data: result,
		});
	} catch (err) {
		if (err?.code === "NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: "Moderador no encontrado",
			});
		}
		if (err?.code === "NO_FIELDS") {
			return res.status(400).json({
				ok: false,
				message: "No hay campos para actualizar",
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
	createModeradorHandler,
	listModeradoresHandler,
	getModeradorByIdHandler,
	updateModeradorHandler,
	deleteModeradorHandler,
	getModeradorSelfHandler,
	updateModeradorSelfHandler,
};
