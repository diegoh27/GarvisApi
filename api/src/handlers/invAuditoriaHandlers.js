const { listInventarioAuditoriaController } = require("../controllers/invAuditoriaControllers");

const listInventarioAuditoriaHandler = async (req, res) => {
	try {
		const modulo = req.query.modulo || null;
		const limit = req.query.limit ? Number(req.query.limit) : 200;
		const offset = req.query.offset ? Number(req.query.offset) : 0;

		const data = await listInventarioAuditoriaController({
			modulo: modulo || undefined,
			limit,
			offset,
		});

		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al obtener el historial de auditoría",
		});
	}
};

module.exports = {
	listInventarioAuditoriaHandler,
};
