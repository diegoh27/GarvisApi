const { getDolarOficialController } = require("../controllers/dolarControllers");

const getDolarOficialHandler = async (req, res) => {
	try {
		const data = await getDolarOficialController();
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error("Error obteniendo tasa del dólar:", err.message);
		
		// Retornar error específico según el código
		if (err.code === "API_ERROR" || err.code === "CONNECTION_ERROR") {
			return res.status(503).json({
				ok: false,
				message: err.message,
			});
		}

		return res.status(500).json({
			ok: false,
			message: "Error interno al obtener la tasa del dólar",
		});
	}
};

module.exports = {
	getDolarOficialHandler,
};
