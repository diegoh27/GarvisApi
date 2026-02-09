const {
	listObligacionesController,
	getObligacionController,
	createObligacionController,
	updateObligacionController,
	deleteObligacionController,
	registrarPagoObligacionController,
	updatePagoObligacionController,
} = require("../controllers/obligacionesControllers");

// ==========================================
// OBLIGACIONES HANDLERS
// ==========================================

/**
 * GET /obligaciones - Lista todas las obligaciones
 */
const listObligacionesHandler = async (req, res) => {
	try {
		const obligaciones = await listObligacionesController();
		return res.status(200).json({ ok: true, data: obligaciones });
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			ok: false,
			message: "Error al listar obligaciones",
		});
	}
};

/**
 * GET /obligaciones/:id - Obtiene una obligación
 */
const getObligacionHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const obligacion = await getObligacionController(id);
		return res.status(200).json({ ok: true, data: obligacion });
	} catch (error) {
		console.error(error);
		if (error.code === "OBLIGACION_NOT_FOUND") {
			return res.status(404).json({ ok: false, message: error.message });
		}
		return res.status(500).json({
			ok: false,
			message: "Error al obtener obligación",
		});
	}
};

/**
 * POST /obligaciones - Crea una nueva obligación
 */
const createObligacionHandler = async (req, res) => {
	try {
		const {
			id_ente,
			concepto,
			periodo,
			fecha_vencimiento,
			monto,
			estado,
			recordatorio_dias,
		} = req.body;

		// Validaciones
		if (!id_ente || !concepto || !periodo) {
			return res.status(400).json({
				ok: false,
				message: "Faltan campos obligatorios: id_ente, concepto, periodo",
			});
		}

		if (monto !== undefined && monto < 0) {
			return res.status(400).json({
				ok: false,
				message: "El monto no puede ser negativo",
			});
		}

		const obligacion = await createObligacionController({
			id_ente,
			concepto: concepto.trim(),
			periodo,
			fecha_vencimiento: fecha_vencimiento || null,
			monto: monto || null,
			estado: estado || "Pendiente",
			recordatorio_dias: recordatorio_dias || 0,
		});

		return res.status(201).json({ ok: true, data: obligacion });
	} catch (error) {
		console.error(error);
		if (error.code === "ENTE_NOT_FOUND") {
			return res.status(404).json({ ok: false, message: error.message });
		}
		return res.status(500).json({
			ok: false,
			message: "Error al crear obligación",
		});
	}
};

/**
 * PATCH /obligaciones/:id - Actualiza una obligación
 */
const updateObligacionHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const updates = req.body;

		// Validar monto si se proporciona
		if (updates.monto !== undefined && updates.monto < 0) {
			return res.status(400).json({
				ok: false,
				message: "El monto no puede ser negativo",
			});
		}

		const obligacion = await updateObligacionController(id, updates);
		return res.status(200).json({ ok: true, data: obligacion });
	} catch (error) {
		console.error(error);
		if (
			error.code === "OBLIGACION_NOT_FOUND" ||
			error.code === "NO_VALID_FIELDS"
		) {
			return res.status(400).json({ ok: false, message: error.message });
		}
		return res.status(500).json({
			ok: false,
			message: "Error al actualizar obligación",
		});
	}
};

/**
 * DELETE /obligaciones/:id - Elimina una obligación
 */
const deleteObligacionHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const result = await deleteObligacionController(id);
		return res.status(200).json({ ok: true, data: result });
	} catch (error) {
		console.error(error);
		if (error.code === "OBLIGACION_NOT_FOUND") {
			return res.status(404).json({ ok: false, message: error.message });
		}
		if (error.code === "HAS_PAYMENTS") {
			return res.status(400).json({ ok: false, message: error.message });
		}
		return res.status(500).json({
			ok: false,
			message: "Error al eliminar obligación",
		});
	}
};

/**
 * POST /obligaciones/:id/pagar - Registra un pago para una obligación
 */
const registrarPagoObligacionHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const { monto, fecha_pago, fecha_proxima_vencimiento, metodo, referencia } =
			req.body;
		const id_usuario = req.user?.id || null;

		// Validaciones
		if (!monto || !fecha_pago || !fecha_proxima_vencimiento) {
			return res.status(400).json({
				ok: false,
				message:
					"Faltan campos obligatorios: monto, fecha_pago, fecha_proxima_vencimiento",
			});
		}

		if (Number(monto) <= 0) {
			return res.status(400).json({
				ok: false,
				message: "El monto debe ser mayor a 0",
			});
		}

		const pago = await registrarPagoObligacionController({
			id_obligacion: id,
			monto: Number(monto),
			fecha_pago,
			fecha_proxima_vencimiento,
			metodo,
			referencia,
			id_usuario,
		});

		return res.status(201).json({ ok: true, data: pago });
	} catch (error) {
		console.error(error);
		if (error.code === "OBLIGACION_NOT_FOUND") {
			return res.status(404).json({ ok: false, message: error.message });
		}
		return res.status(500).json({
			ok: false,
			message: "Error al registrar pago de obligación",
		});
	}
};

/**
 * PUT /obligaciones/pagos/:idPago - Actualiza un pago de obligación existente
 */
const updatePagoObligacionHandler = async (req, res) => {
	try {
		const { idPago } = req.params;
		const { monto, fecha_pago, metodo, referencia } = req.body;

		const pago = await updatePagoObligacionController({
			id_pago: idPago,
			monto: monto !== undefined ? Number(monto) : undefined,
			fecha_pago,
			metodo,
			referencia,
		});

		return res.status(200).json({
			ok: true,
			message: "Pago actualizado",
			data: pago,
		});
	} catch (error) {
		console.error(error);
		if (error.code === "PAGO_NOT_FOUND") {
			return res.status(404).json({ ok: false, message: error.message });
		}
		return res.status(500).json({
			ok: false,
			message: "Error al actualizar pago",
		});
	}
};

module.exports = {
	listObligacionesHandler,
	getObligacionHandler,
	createObligacionHandler,
	updateObligacionHandler,
	deleteObligacionHandler,
	registrarPagoObligacionHandler,
	updatePagoObligacionHandler,
};
