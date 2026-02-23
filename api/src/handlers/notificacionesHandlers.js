const {
	listNotificacionesByUsuarioController,
	markNotificacionLeidaController,
} = require("../controllers/notificacionesControllers");

const listMisNotificacionesHandler = async (req, res) => {
	try {
		const id_usuario = req.user?.id;
		if (!id_usuario) {
			return res.status(401).json({
				ok: false,
				message: "Token inválido",
			});
		}

		const solo_no_leidas = req.query.solo_no_leidas === "true";
		const limit = req.query.limit ? Number(req.query.limit) : 50;

		const notificaciones = await listNotificacionesByUsuarioController({
			id_usuario,
			solo_no_leidas,
			limit,
		});

		return res.status(200).json({
			ok: true,
			data: notificaciones,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const markNotificacionLeidaHandler = async (req, res) => {
	try {
		const id_usuario = req.user?.id;
		const { id } = req.params;

		if (!id_usuario) {
			return res.status(401).json({
				ok: false,
				message: "Token inválido",
			});
		}

		if (!id) {
			return res.status(400).json({
				ok: false,
				message: "id_notificacion es requerido",
			});
		}

		const updated = await markNotificacionLeidaController({
			id_notificacion: id,
			id_usuario,
		});

		if (!updated) {
			return res.status(404).json({
				ok: false,
				message: "Notificación no encontrada",
			});
		}

		return res.status(200).json({
			ok: true,
			message: "Notificación marcada como leída",
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
	listMisNotificacionesHandler,
	markNotificacionLeidaHandler,
};
