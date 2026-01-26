const {
	userCreateController,
	getUserByIdController,
	updateUserController,
	setUserActiveController,
	listUsersController,
} = require("../controllers/usersControllers");

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

		if (payload.genero && !["Masculino", "Femenino", "Otro"].includes(payload.genero)) {
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
	setUserActiveHandler,
};
