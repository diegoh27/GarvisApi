const { getPagoByCitaController } = require("../controllers/pagosControllers");

const getPagoByCitaHandler = async (req, res) => {
	try {
		const { id_cita } = req.params;
		if (!id_cita) {
			return res.status(400).json({
				ok: false,
				message: "id_cita es requerido",
			});
		}

		const pago = await getPagoByCitaController(id_cita);
		if (!pago) {
			return res.status(404).json({
				ok: false,
				message: "Pago no encontrado para esta cita",
			});
		}

		return res.status(200).json({
			ok: true,
			data: pago,
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
	getPagoByCitaHandler,
};
