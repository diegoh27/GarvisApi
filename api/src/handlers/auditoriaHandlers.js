const {
	getEventosController,
	getUsuariosConEventosController,
} = require("../controllers/auditoriaControllers");

const getEventosHandler = async (req, res) => {
	try {
		const {
			usuarioId,
			metodo,
			estado,
			fechaDesde,
			fechaHasta,
			page  = 1,
			limit = 10,
		} = req.query;

		const result = await getEventosController({
			usuarioId,
			metodo,
			estado,
			fechaDesde,
			fechaHasta,
			page,
			limit,
		});

		return res.status(200).json({ ok: true, ...result });
	} catch (err) {
		console.error("[Auditoria] Error al obtener eventos:", err.message);
		return res.status(500).json({ ok: false, message: "Error interno" });
	}
};

const getUsuariosConEventosHandler = async (req, res) => {
	try {
		const usuarios = await getUsuariosConEventosController();
		return res.status(200).json({ ok: true, data: usuarios });
	} catch (err) {
		console.error("[Auditoria] Error al obtener usuarios:", err.message);
		return res.status(500).json({ ok: false, message: "Error interno" });
	}
};

module.exports = { getEventosHandler, getUsuariosConEventosHandler };
