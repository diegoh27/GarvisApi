const {
	createPacienteController,
	listPacientesController,
	getPacienteByIdController,
	updatePacienteController,
	deactivatePacienteController,
	updatePacienteSelfController,
} = require("../controllers/pacientesControllers");
const { validarCedula } = require("../utils/validacionCedula");
const { validarTelefono } = require("../utils/validacionTelefono");

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

		const fechaNacPac = new Date(fecha_nacimiento);
		if (!Number.isNaN(fechaNacPac.getTime()) && fechaNacPac.getTime() > Date.now()) {
			return res.status(400).json({
				ok: false,
				message: "La fecha de nacimiento no puede ser futura",
			});
		}

		let contactoTelefonoVal = contacto_emergencia_telefono;
		if (contacto_emergencia_telefono && String(contacto_emergencia_telefono).trim()) {
			const ctResult = validarTelefono(contacto_emergencia_telefono, { required: false });
			if (!ctResult.valid) {
				return res.status(400).json({
					ok: false,
					message: "Teléfono de emergencia: " + ctResult.message,
				});
			}
			contactoTelefonoVal = ctResult.value;
		}

		const created = await createPacienteController({
			nombre,
			apellido,
			genero,
			cedula: cedulaResult.value,
			correo,
			telefono: telefonoResult.value,
			contrasena,
			fecha_nacimiento,
			tipo_sangre,
			descripcion,
			direccion,
			rif,
			contacto_emergencia_nombre,
			contacto_emergencia_telefono: contactoTelefonoVal,
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
		const payload = { ...req.body };

		if (
			payload.genero &&
			!["Masculino", "Femenino", "Otro"].includes(payload.genero)
		) {
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
		if (payload.contacto_emergencia_telefono !== undefined && payload.contacto_emergencia_telefono !== null && String(payload.contacto_emergencia_telefono).trim()) {
			const ctResult = validarTelefono(payload.contacto_emergencia_telefono, { required: false });
			if (!ctResult.valid) {
				return res.status(400).json({
					ok: false,
					message: "Teléfono de emergencia: " + ctResult.message,
				});
			}
			payload.contacto_emergencia_telefono = ctResult.value;
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

const TIPOS_SANGRE_VALIDOS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const updatePacienteSelfHandler = async (req, res) => {
	try {
		const {
			telefono,
			contrasena,
			tipo_sangre,
			descripcion,
			direccion,
			contacto_emergencia_nombre,
			contacto_emergencia_telefono,
		} = req.body;
		const id_usuario = req.user?.id;

		// No permitir campos vacíos cuando se envían
		if (telefono !== undefined && String(telefono).trim() === "") {
			return res.status(400).json({ ok: false, message: "El teléfono no puede estar vacío." });
		}
		if (telefono !== undefined && telefono !== null && String(telefono).trim() !== "") {
			const v = validarTelefono(telefono);
			if (!v.valid) return res.status(400).json({ ok: false, message: v.message });
		}
		if (tipo_sangre !== undefined && String(tipo_sangre).trim() === "") {
			return res.status(400).json({ ok: false, message: "El tipo de sangre no puede estar vacío." });
		}
		if (tipo_sangre !== undefined && tipo_sangre !== null && !TIPOS_SANGRE_VALIDOS.includes(String(tipo_sangre).trim())) {
			return res.status(400).json({ ok: false, message: "Tipo de sangre inválido." });
		}
		if (descripcion !== undefined && String(descripcion).trim() === "") {
			return res.status(400).json({ ok: false, message: "La descripción no puede estar vacía." });
		}
		if (direccion !== undefined && String(direccion).trim() === "") {
			return res.status(400).json({ ok: false, message: "La dirección no puede estar vacía." });
		}
		if (contacto_emergencia_nombre !== undefined && String(contacto_emergencia_nombre).trim() === "") {
			return res.status(400).json({ ok: false, message: "El nombre del contacto de emergencia no puede estar vacío." });
		}
		if (contacto_emergencia_telefono !== undefined && String(contacto_emergencia_telefono).trim() === "") {
			return res.status(400).json({ ok: false, message: "El teléfono de emergencia no puede estar vacío." });
		}
		if (contacto_emergencia_telefono !== undefined && contacto_emergencia_telefono !== null && String(contacto_emergencia_telefono).trim() !== "") {
			const v = validarTelefono(contacto_emergencia_telefono);
			if (!v.valid) return res.status(400).json({ ok: false, message: "Teléfono de emergencia: " + v.message });
		}

		const result = await updatePacienteSelfController({
			id_usuario,
			telefono,
			contrasena,
			tipo_sangre,
			descripcion,
			direccion,
			contacto_emergencia_nombre,
			contacto_emergencia_telefono,
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
