const {
	createEspecialistaController,
	listEspecialistasController,
	getEspecialistaByIdController,
	getEspecialistaSelfController,
	deactivateEspecialistaController,
	updateEspecialistaController,
	updateEspecialistaSelfController,
} = require("../controllers/especialistasControllers");
const { validarCedula } = require("../utils/validacionCedula");
const { validarTelefono } = require("../utils/validacionTelefono");

const createEspecialistaHandler = async (req, res) => {
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
			id_especialidad,
			codigo_colegiatura,
			porcentaje,
			id_ecos, // Array de IDs de ecos
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
		if (!id_especialidad) missing.push("id_especialidad");
		if (porcentaje === undefined || porcentaje === null || porcentaje === "") {
			missing.push("porcentaje");
		}

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

		if (nombre.length > 36) {
			return res.status(400).json({
				ok: false,
				message: "El nombre no puede superar 36 caracteres",
			});
		}
		if (apellido.length > 36) {
			return res.status(400).json({
				ok: false,
				message: "El apellido no puede superar 36 caracteres",
			});
		}

		const cedulaResult = validarCedula(cedula);
		if (!cedulaResult.valid) {
			return res.status(400).json({
				ok: false,
				message: cedulaResult.message,
			});
		}
		const cedulaNormalizada = cedulaResult.value;

		const telefonoResult = validarTelefono(telefono);
		if (!telefonoResult.valid) {
			return res.status(400).json({
				ok: false,
				message: telefonoResult.message,
			});
		}

		const birthDate = new Date(fecha_nacimiento);
		if (Number.isNaN(birthDate.getTime())) {
			return res.status(400).json({
				ok: false,
				message: "Fecha de nacimiento inválida",
			});
		}
		const today = new Date();
		let age = today.getFullYear() - birthDate.getFullYear();
		const m = today.getMonth() - birthDate.getMonth();
		if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
		if (age < 18) {
			return res.status(400).json({
				ok: false,
				message: "El especialista debe ser mayor de edad (18 años o más)",
			});
		}

		const porcentajeValue = Number(porcentaje);
		if (Number.isNaN(porcentajeValue)) {
			return res.status(400).json({
				ok: false,
				message: "porcentaje inválido",
			});
		}
		if (porcentajeValue < 1 || porcentajeValue > 100) {
			return res.status(400).json({
				ok: false,
				message: "porcentaje debe estar entre 1 y 100",
			});
		}

		// Validar que id_ecos sea un array si se proporciona
		if (id_ecos !== undefined && !Array.isArray(id_ecos)) {
			return res.status(400).json({
				ok: false,
				message: "id_ecos debe ser un array",
			});
		}

		const created = await createEspecialistaController({
			nombre,
			apellido,
			genero,
			cedula: cedulaNormalizada,
			correo,
			telefono: telefonoResult.value,
			contrasena,
			fecha_nacimiento,
			id_especialidad,
			codigo_colegiatura,
			porcentaje: porcentajeValue,
			id_ecos: id_ecos || [],
		});

		return res.status(201).json({
			ok: true,
			message: "Especialista creado",
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
		if (err?.code === "ROL_NOT_FOUND" || err?.code === "ECO_NOT_FOUND") {
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

const listEspecialistasHandler = async (req, res) => {
	try {
		const { q } = req.query;
		const data = await listEspecialistasController({ q });
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

const getEspecialistaByIdHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await getEspecialistaByIdController(id);
		if (!data) {
			return res.status(404).json({
				ok: false,
				message: "Especialista no encontrado",
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

const getEspecialistaSelfHandler = async (req, res) => {
	try {
		const id_especialista = req.user?.id;
		const data = await getEspecialistaSelfController(id_especialista);
		if (!data) {
			return res.status(404).json({
				ok: false,
				message: "Especialista no encontrado",
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

const deleteEspecialistaHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const result = await deactivateEspecialistaController(id);
		if (!result.updated) {
			return res.status(404).json({
				ok: false,
				message: "Especialista no encontrado",
			});
		}
		return res.status(200).json({
			ok: true,
			message: "Especialista desactivado",
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

const updateEspecialistaHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const {
			nombre,
			apellido,
			genero,
			cedula,
			correo,
			telefono,
			fecha_nacimiento,
			id_especialidad,
			codigo_colegiatura,
			porcentaje,
			id_ecos, // Array de IDs de ecos
		} = req.body;

		if (genero && !["Masculino", "Femenino", "Otro"].includes(genero)) {
			return res.status(400).json({
				ok: false,
				message: "genero inválido",
			});
		}

		let porcentajeValue;
		if (porcentaje !== undefined) {
			porcentajeValue = Number(porcentaje);
			if (Number.isNaN(porcentajeValue)) {
				return res.status(400).json({
					ok: false,
					message: "porcentaje inválido",
				});
			}
			if (porcentajeValue < 0 || porcentajeValue > 100) {
				return res.status(400).json({
					ok: false,
					message: "porcentaje debe estar entre 0 y 100",
				});
			}
		}

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

		let telefonoPayload = telefono;
		if (telefono !== undefined && telefono !== null && String(telefono).trim()) {
			const telefonoResult = validarTelefono(telefono, { required: false });
			if (!telefonoResult.valid) {
				return res.status(400).json({
					ok: false,
					message: telefonoResult.message,
				});
			}
			telefonoPayload = telefonoResult.value;
		}

		const payload = {
			nombre,
			apellido,
			genero,
			cedula: cedulaPayload,
			correo,
			telefono: telefonoPayload,
			fecha_nacimiento,
			id_especialidad,
			codigo_colegiatura,
			porcentaje: porcentajeValue,
			id_ecos, // Array de IDs de ecos
		};

		const result = await updateEspecialistaController(id, payload);
		return res.status(200).json({
			ok: true,
			message: "Especialista actualizado",
			data: result,
		});
	} catch (err) {
		if (err?.code === "NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: "Especialista no encontrado",
			});
		}
		if (err?.code === "NO_FIELDS") {
			return res.status(400).json({
				ok: false,
				message: "No hay campos para actualizar",
			});
		}
		if (err?.code === "ER_DUP_ENTRY") {
			return res.status(409).json({
				ok: false,
				message: "Correo o cédula ya existe",
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

const updateEspecialistaSelfHandler = async (req, res) => {
	try {
		const { telefono, contrasena } = req.body;
		const id_usuario = req.user?.id;

		if (telefono !== undefined && String(telefono).trim() === "") {
			return res.status(400).json({ ok: false, message: "El teléfono no puede estar vacío." });
		}
		if (telefono !== undefined && telefono !== null && String(telefono).trim() !== "") {
			const v = validarTelefono(telefono);
			if (!v.valid) return res.status(400).json({ ok: false, message: v.message });
		}

		const result = await updateEspecialistaSelfController({
			id_usuario,
			telefono,
			contrasena,
		});

		if (!result.updated) {
			return res.status(404).json({
				ok: false,
				message: "Especialista no encontrado",
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
				message: "Especialista no encontrado",
			});
		}
		if (err?.code === "NO_FIELDS") {
			return res.status(400).json({
				ok: false,
				message: "No hay campos para actualizar",
			});
		}
		if (err?.code === "DUPLICATE_TELEFONO") {
			return res.status(409).json({
				ok: false,
				message: err.message || "Ya existe un usuario con este número de teléfono",
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
	createEspecialistaHandler,
	listEspecialistasHandler,
	getEspecialistaByIdHandler,
	getEspecialistaSelfHandler,
	deleteEspecialistaHandler,
	updateEspecialistaHandler,
	updateEspecialistaSelfHandler,
};
