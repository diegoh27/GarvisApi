const {
	getPagoByCitaController,
	updatePagoController,
} = require("../controllers/pagosControllers");

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
					message:
						"No tienes permiso para ver este pago. Este pago pertenece a otra cita.",
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

const updatePagoHandler = async (req, res) => {
	try {
		const { id_cita } = req.params;
		const userId = req.user?.id;
		const userRole = req.user?.rol;

		if (!id_cita) {
			return res.status(400).json({
				ok: false,
				message: "id_cita es requerido",
			});
		}

		// Validar que sea paciente quien edita
		if (userRole !== "paciente") {
			return res.status(403).json({
				ok: false,
				message: "Solo los pacientes pueden corregir sus pagos",
			});
		}

		// Verificar que la cita pertenezca al paciente
		const pagoActual = await getPagoByCitaController(id_cita);
		if (!pagoActual) {
			return res.status(404).json({
				ok: false,
				message: "Pago no encontrado",
			});
		}

		if (pagoActual.id_paciente !== userId) {
			return res.status(403).json({
				ok: false,
				message: "No tienes permiso para editar este pago",
			});
		}

		// Validar datos del body
		const pagoData = {};
		if (req.body.metodo !== undefined) pagoData.metodo = req.body.metodo;
		if (req.body.imagen !== undefined) pagoData.imagen = req.body.imagen;
		if (req.body.banco_origen !== undefined)
			pagoData.banco_origen = req.body.banco_origen;
		if (req.body.banco_destino !== undefined)
			pagoData.banco_destino = req.body.banco_destino;
		if (req.body.monto !== undefined) pagoData.monto = req.body.monto;
		if (req.body.cedula_pagador !== undefined)
			pagoData.cedula_pagador = req.body.cedula_pagador;
		if (req.body.telefono_pagador !== undefined)
			pagoData.telefono_pagador = req.body.telefono_pagador;
		if (req.body.referencia !== undefined)
			pagoData.referencia = req.body.referencia;

		const result = await updatePagoController(id_cita, pagoData);

		return res.status(200).json({
			ok: true,
			message: "Pago actualizado correctamente. Será revisado nuevamente.",
			data: result,
		});
	} catch (err) {
		if (err?.code === "NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "INVALID_STATE") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

module.exports = {
	getPagoByCitaHandler,
	updatePagoHandler,
};
