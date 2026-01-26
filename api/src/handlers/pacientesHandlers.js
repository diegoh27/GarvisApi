const {
	createPacienteController,
	listPacientesController,
	getPacienteByIdController,
	updatePacienteController,
	deactivatePacienteController,
	updatePacienteSelfController,
} = require("../controllers/pacientesControllers");

const createPacienteHandler = async (req, res) => {
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
			tipo_sangre,
			descripcion,
			direccion,
			rif,
			contacto_emergencia_nombre,
			contacto_emergencia_telefono,
		} = req.body;

		// Validación mínima
		const missing = [];
		if (!nombre) missing.push("nombre");
		if (!apellido) missing.push("apellido");
		if (!genero) missing.push("genero");
		if (!cedula) missing.push("cedula");
		if (!correo) missing.push("correo");
		if (!telefono) missing.push("telefono");
		if (!contrasena) missing.push("contrasena");
		if (!fecha_nacimiento) missing.push("fecha_nacimiento");
		if (!tipo_sangre) missing.push("tipo_sangre");
		if (!descripcion) missing.push("descripcion");

		if (missing.length) {
			return res.status(400).json({
				ok: false,
				message: "Faltan campos requeridos",
				missing,
			});
		}

		// Opcional: validar genero
		if (!["Masculino", "Femenino", "Otro"].includes(genero)) {
			return res.status(400).json({
				ok: false,
				message: "genero inválido (Masculino | Femenino | Otro)",
			});
		}

		const created = await createPacienteController({
			nombre,
			apellido,
			genero,
			cedula,
			correo,
			telefono,
			contrasena,
			fecha_nacimiento,
			tipo_sangre,
			descripcion,
			direccion,
			rif,
			contacto_emergencia_nombre,
			contacto_emergencia_telefono,
		});

		return res.status(201).json({
			ok: true,
			message: "Paciente creado",
			data: created,
		});
	} catch (err) {
		// Errores típicos de MySQL: duplicados
		if (err?.code === "ER_DUP_ENTRY") {
			return res.status(409).json({
				ok: false,
				message: "Ya existe un usuario con esa cédula o correo",
			});
		}

		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const listPacientesHandler = async (req, res) => {
	try {
		const { q } = req.query;
		const data = await listPacientesController({ q });
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

const getPacienteByIdHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await getPacienteByIdController(id);
		if (!data) {
			return res.status(404).json({
				ok: false,
				message: "Paciente no encontrado",
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

const updatePacienteHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const payload = req.body;

		if (payload.genero && !["Masculino", "Femenino", "Otro"].includes(payload.genero)) {
			return res.status(400).json({
				ok: false,
				message: "genero inválido (Masculino | Femenino | Otro)",
			});
		}

		await updatePacienteController(id, payload);
		const data = await getPacienteByIdController(id);
		if (!data) {
			return res.status(404).json({
				ok: false,
				message: "Paciente no encontrado",
			});
		}
		return res.status(200).json({
			ok: true,
			message: "Paciente actualizado",
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
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const deletePacienteHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const result = await deactivatePacienteController(id);
		if (!result.updated) {
			return res.status(404).json({
				ok: false,
				message: "Paciente no encontrado",
			});
		}
		return res.status(200).json({
			ok: true,
			message: "Paciente desactivado",
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

const getPacienteSelfHandler = async (req, res) => {
	try {
		const id_paciente = req.user?.id;
		const data = await getPacienteByIdController(id_paciente);
		if (!data) {
			return res.status(404).json({
				ok: false,
				message: "Paciente no encontrado",
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

const updatePacienteSelfHandler = async (req, res) => {
	try {
		const { telefono, contrasena } = req.body;
		const id_usuario = req.user?.id;

		const result = await updatePacienteSelfController({
			id_usuario,
			telefono,
			contrasena,
		});

		if (!result.updated) {
			return res.status(404).json({
				ok: false,
				message: "Paciente no encontrado",
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
				message: "Paciente no encontrado",
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
	createPacienteHandler,
	listPacientesHandler,
	getPacienteByIdHandler,
	updatePacienteHandler,
	deletePacienteHandler,
	getPacienteSelfHandler,
	updatePacienteSelfHandler,
};
