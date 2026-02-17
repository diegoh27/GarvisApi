const {
	userCreateController,
	getUserByIdController,
	getUserSelfController,
	updateUserController,
	updateUserSelfController,
	setUserActiveController,
	listUsersController,
} = require("../controllers/usersControllers");
const { validarTelefono } = require("../utils/validacionTelefono");

const userCreateHandler = (req, res) => {
	const obj = req.body;
	const result = userCreateController(obj);

	return res.status(200).json({
		message: "Usuario recibido",
		result,
	});
};

const listUsersHandler = async (req, res) => {
	try {
		const { rol, activo, q } = req.query;
		const users = await listUsersController({
			rol: rol || null,
			activo: activo !== undefined ? Number(activo) : undefined,
			q: q || null,
		});
		return res.status(200).json({
			ok: true,
			data: users,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const getUserByIdHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const user = await getUserByIdController(id);
		if (!user) {
			return res.status(404).json({
				ok: false,
				message: "Usuario no encontrado",
			});
		}
		return res.status(200).json({
			ok: true,
			data: user,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const updateUserHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const payload = req.body;

		if (
			payload.genero &&
			!["Masculino", "Femenino", "Otro"].includes(payload.genero)
		) {
			return res.status(400).json({
				ok: false,
				message: "genero inválido (Masculino | Femenino | Otro)",
			});
		}

		const result = await updateUserController(id, payload);
		if (!result.updated) {
			return res.status(404).json({
				ok: false,
				message: "Usuario no encontrado",
			});
		}
		const user = await getUserByIdController(id);
		return res.status(200).json({
			ok: true,
			message: "Usuario actualizado",
			data: user,
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

const getUserSelfHandler = async (req, res) => {
	try {
		const id_usuario = req.user?.id;
		const user = await getUserSelfController(id_usuario);
		if (!user) {
			return res.status(404).json({
				ok: false,
				message: "Admin no encontrado",
			});
		}
		return res.status(200).json({
			ok: true,
			data: user,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const updateUserSelfHandler = async (req, res) => {
	try {
		const id_usuario = req.user?.id;
		const payload = req.body;

		// No permitir campos vacíos cuando se envían
		if (payload.nombre !== undefined && String(payload.nombre).trim() === "") {
			return res.status(400).json({ ok: false, message: "El nombre no puede estar vacío." });
		}
		if (payload.apellido !== undefined && String(payload.apellido).trim() === "") {
			return res.status(400).json({ ok: false, message: "El apellido no puede estar vacío." });
		}
		if (payload.genero !== undefined && String(payload.genero).trim() === "") {
			return res.status(400).json({ ok: false, message: "El género no puede estar vacío." });
		}
		if (payload.cedula !== undefined && String(payload.cedula).trim() === "") {
			return res.status(400).json({ ok: false, message: "La cédula no puede estar vacía." });
		}
		if (payload.correo !== undefined && String(payload.correo).trim() === "") {
			return res.status(400).json({ ok: false, message: "El correo no puede estar vacío." });
		}
		if (payload.fecha_nacimiento !== undefined && String(payload.fecha_nacimiento).trim() === "") {
			return res.status(400).json({ ok: false, message: "La fecha de nacimiento no puede estar vacía." });
		}
		if (payload.telefono !== undefined && String(payload.telefono).trim() === "") {
			return res.status(400).json({ ok: false, message: "El teléfono no puede estar vacío." });
		}
		if (payload.telefono !== undefined && payload.telefono !== null && String(payload.telefono).trim() !== "") {
			const v = validarTelefono(payload.telefono);
			if (!v.valid) return res.status(400).json({ ok: false, message: v.message });
		}
		if (
			payload.genero &&
			!["Masculino", "Femenino", "Otro"].includes(payload.genero)
		) {
			return res.status(400).json({
				ok: false,
				message: "genero inválido (Masculino | Femenino | Otro)",
			});
		}

		const result = await updateUserSelfController({
			id_usuario,
			nombre: payload.nombre,
			apellido: payload.apellido,
			genero: payload.genero,
			cedula: payload.cedula,
			correo: payload.correo,
			telefono: payload.telefono,
			fecha_nacimiento: payload.fecha_nacimiento,
			contrasena: payload.contrasena,
		});

		if (!result.updated) {
			return res.status(404).json({
				ok: false,
				message: "Admin no encontrado",
			});
		}

		const user = await getUserSelfController(id_usuario);
		return res.status(200).json({
			ok: true,
			message: "Perfil actualizado",
			data: user,
		});
	} catch (err) {
		if (err?.code === "NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: "Admin no encontrado",
			});
		}
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

const setUserActiveHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const { activo } = req.body;

		if (!id) {
			return res.status(400).json({
				ok: false,
				message: "id es requerido",
			});
		}

		if (activo !== 0 && activo !== 1) {
			return res.status(400).json({
				ok: false,
				message: "activo debe ser 0 o 1",
			});
		}

		const result = await setUserActiveController({
			id_usuario: id,
			activo,
		});

		if (!result.updated) {
			return res.status(404).json({
				ok: false,
				message: "Usuario no encontrado",
			});
		}

		return res.status(200).json({
			ok: true,
			message: "Estado actualizado",
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

module.exports = {
	userCreateHandler,
	listUsersHandler,
	getUserByIdHandler,
	updateUserHandler,
	getUserSelfHandler,
	updateUserSelfHandler,
	setUserActiveHandler,
};
