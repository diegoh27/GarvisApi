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

		// Validar permisos: los pacientes solo pueden ver pagos de sus propias citas
		const userRole = req.user.rol;
		const userId = req.user.id;
		
		if (userRole === "paciente") {
			// Verificar que el pago pertenezca a una cita del paciente
			if (pago.id_paciente !== userId) {
				return res.status(403).json({
					ok: false,
					message: "No tienes permiso para ver este pago. Este pago pertenece a otra cita.",
				});
			}
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
