const {
	createEspecialistaController,
	listEspecialistasController,
	getEspecialistaByIdController,
	getEspecialistaSelfController,
	deactivateEspecialistaController,
	updateEspecialistaController,
	updateEspecialistaSelfController,
} = require("../controllers/especialistasControllers");

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

		const porcentajeValue = Number(porcentaje);
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
			cedula,
			correo,
			telefono,
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

		const payload = {
			nombre,
			apellido,
			genero,
			cedula,
			correo,
			telefono,
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
