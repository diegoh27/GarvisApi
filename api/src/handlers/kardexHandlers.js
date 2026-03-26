const { listKardexController } = require("../controllers/kardexControllers");

const listKardexHandler = async (req, res) => {
	try {
		const { id_producto, limit } = req.query;
		const data = await listKardexController({ id_producto, limit });
		return res.status(200).json({ ok: true, data });
	} catch (err) {
		console.error("Error al listar kardex:", err);
		return res.status(500).json({
			ok: false,
			message: "Error interno al obtener el historial del Kardex",
		});
	}
};

module.exports = {
	listKardexHandler,
};
