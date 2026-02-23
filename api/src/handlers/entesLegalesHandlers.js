const {
	listEntesSimpleController,
	listEntesLegalesController,
	getEnteLegalController,
	createEnteLegalController,
	updateEnteLegalController,
	deleteEnteLegalController,
	listHistorialPagosEntesController,
	registrarPagoEnteLegalController,
	deletePagoEnteLegalController,
} = require("../controllers/entesLegalesControllers");

// ==========================================
// ENTES LEGALES
// ==========================================

/**
 * GET /entes-legales/lista - Lista solo entes con conteo de obligaciones
 */
const listEntesSimpleHandler = async (req, res) => {
	try {
		const data = await listEntesSimpleController();
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al listar entes legales",
		});
	}
};

const listEntesLegalesHandler = async (req, res) => {
	try {
		const data = await listEntesLegalesController();
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al listar entes legales",
		});
	}
};

const getEnteLegalHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await getEnteLegalController(id);
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		if (err?.code === "ENTE_NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al obtener el ente legal",
		});
	}
};

const createEnteLegalHandler = async (req, res) => {
	try {
		const { nombre_ente } = req.body;

		// Validaciones
		if (
			!nombre_ente ||
			typeof nombre_ente !== "string" ||
			!nombre_ente.trim()
		) {
			return res.status(400).json({
				ok: false,
				message: "El nombre del ente es requerido",
			});
		}

		const data = await createEnteLegalController({
			nombre_ente: nombre_ente.trim(),
		});

		return res.status(201).json({
			ok: true,
			message: "Ente legal creado",
			data,
		});
	} catch (err) {
		if (err?.code === "DUPLICATE_NAME") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al crear el ente legal",
		});
	}
};

const updateEnteLegalHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const { nombre_ente } = req.body;

		if (!nombre_ente || !nombre_ente.trim()) {
			return res.status(400).json({
				ok: false,
				message: "El nombre del ente es requerido",
			});
		}

		const data = await updateEnteLegalController({
			id_ente: id,
			nombre_ente: nombre_ente.trim(),
		});

		return res.status(200).json({
			ok: true,
			message: "Ente legal actualizado",
			data,
		});
	} catch (err) {
		if (err?.code === "ENTE_NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "DUPLICATE_NAME") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al actualizar el ente legal",
		});
	}
};

const deleteEnteLegalHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await deleteEnteLegalController(id);
		return res.status(200).json({
			ok: true,
			message: "Ente legal eliminado",
			data,
		});
	} catch (err) {
		if (err?.code === "ENTE_NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al eliminar el ente legal",
		});
	}
};

const listHistorialPagosEntesHandler = async (req, res) => {
	try {
		const limit = req.query.limit ? Number(req.query.limit) : 200;
		const data = await listHistorialPagosEntesController({ limit });
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al listar el historial de pagos",
		});
	}
};

const registrarPagoEnteLegalHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const { monto, fecha_pago, fecha_proxima_vencimiento, metodo, referencia } =
			req.body;
		const id_usuario = req.user?.id;

		if (!id_usuario) {
			return res.status(401).json({
				ok: false,
				message: "Usuario no autenticado",
			});
		}

		if (monto === undefined || monto === null || Number(monto) <= 0) {
			return res.status(400).json({
				ok: false,
				message: "El monto es requerido y debe ser mayor a 0",
			});
		}

		if (!fecha_pago) {
			return res.status(400).json({
				ok: false,
				message: "La fecha de pago es requerida",
			});
		}

		if (!fecha_proxima_vencimiento) {
			return res.status(400).json({
				ok: false,
				message: "La proxima fecha de vencimiento es requerida",
			});
		}

		const data = await registrarPagoEnteLegalController({
			id_ente: id,
			monto: Number(monto),
			fecha_pago,
			fecha_proxima_vencimiento,
			metodo,
			referencia,
			id_usuario,
		});

		return res.status(201).json({
			ok: true,
			message: "Pago registrado",
			data,
		});
	} catch (err) {
		if (err?.code === "OBLIGACION_NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al registrar el pago",
		});
	}
};

/**
 * DELETE /entes-legales/pagos/:idPago - Eliminar un pago de ente legal
 */
const deletePagoEnteLegalHandler = async (req, res) => {
	try {
		const { idPago } = req.params;
		await deletePagoEnteLegalController(idPago);
		return res.status(200).json({
			ok: true,
			message: "Pago eliminado correctamente",
		});
	} catch (err) {
		if (err?.code === "PAGO_NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al eliminar el pago",
		});
	}
};

module.exports = {
	listEntesSimpleHandler,
	listEntesLegalesHandler,
	getEnteLegalHandler,
	createEnteLegalHandler,
	updateEnteLegalHandler,
	deleteEnteLegalHandler,
	listHistorialPagosEntesHandler,
	registrarPagoEnteLegalHandler,
	deletePagoEnteLegalHandler,
};
