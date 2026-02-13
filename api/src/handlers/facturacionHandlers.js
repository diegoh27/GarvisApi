const {
	listMovimientosFacturacionController,
	getResumenFacturacionController,
} = require("../controllers/facturacionControllers");

exports.listMovimientosFacturacionHandler = async (req, res) => {
	try {
		const {
			tipo,
			origen_modulo,
			fecha_desde,
			fecha_hasta,
			q,
			limit,
			offset,
		} = req.query;

		const data = await listMovimientosFacturacionController({
			tipo,
			origen_modulo,
			fecha_desde,
			fecha_hasta,
			q,
			limit,
			offset,
		});

		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (error) {
		console.error("Error in listMovimientosFacturacionHandler:", error);
		return res.status(500).json({
			ok: false,
			message: "Error al listar movimientos de facturación",
		});
	}
};

exports.getResumenFacturacionHandler = async (_req, res) => {
	try {
		const data = await getResumenFacturacionController();
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (error) {
		console.error("Error in getResumenFacturacionHandler:", error);
		return res.status(500).json({
			ok: false,
			message: "Error al obtener resumen de facturación",
		});
	}
};
