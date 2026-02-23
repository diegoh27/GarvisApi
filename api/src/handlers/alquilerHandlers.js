const {
	listContratosController,
	getContratoController,
	createContratoController,
	updateContratoController,
	deleteContratoController,
	listHistorialPagosAlquilerController,
	listPagosContratoController,
	registrarPagoAlquilerController,
	updatePagoAlquilerController,
	deletePagoAlquilerController,
} = require("../controllers/alquilerControllers");

// ==========================================
// CONTRATOS
// ==========================================

exports.listContratosHandler = async (req, res) => {
	try {
		const limit = req.query.limit || 200;
		const contratos = await listContratosController(limit);
		res.json(contratos);
	} catch (error) {
		console.error("Error in listContratosHandler:", error);
		res.status(500).json({ message: "Error al obtener contratos" });
	}
};

exports.getContratoHandler = async (req, res) => {
	try {
		const { idContrato } = req.params;
		const contrato = await getContratoController(idContrato);
		if (!contrato) {
			return res.status(404).json({ message: "Contrato no encontrado" });
		}
		res.json(contrato);
	} catch (error) {
		console.error("Error in getContratoHandler:", error);
		res.status(500).json({ message: "Error al obtener contrato" });
	}
};

exports.createContratoHandler = async (req, res) => {
	try {
		const { nombre, descripcion, periodo, monto, estado, fecha_vencimiento } =
			req.body;

		if (!nombre || !nombre.trim()) {
			return res.status(400).json({ message: "El nombre es requerido" });
		}
		if (!fecha_vencimiento) {
			return res
				.status(400)
				.json({ message: "La fecha de vencimiento es requerida" });
		}
		if (monto === undefined || Number(monto) <= 0) {
			return res.status(400).json({ message: "El monto debe ser mayor a 0" });
		}

		const contrato = await createContratoController({
			nombre: nombre.trim(),
			descripcion,
			periodo,
			monto: parseFloat(monto),
			estado,
			fecha_vencimiento,
		});

		res.status(201).json(contrato);
	} catch (error) {
		console.error("Error in createContratoHandler:", error);
		res.status(500).json({ message: "Error al crear contrato" });
	}
};

exports.updateContratoHandler = async (req, res) => {
	try {
		const { idContrato } = req.params;
		const { nombre, descripcion, periodo, monto, estado, fecha_vencimiento } =
			req.body;

		const contrato = await updateContratoController(idContrato, {
			nombre: nombre !== undefined ? nombre.trim() : undefined,
			descripcion,
			periodo,
			monto: monto !== undefined ? parseFloat(monto) : undefined,
			estado,
			fecha_vencimiento,
		});

		if (!contrato) {
			return res.status(404).json({ message: "Contrato no encontrado" });
		}

		res.json(contrato);
	} catch (error) {
		console.error("Error in updateContratoHandler:", error);
		res.status(500).json({ message: "Error al actualizar contrato" });
	}
};

exports.deleteContratoHandler = async (req, res) => {
	try {
		const { idContrato } = req.params;
		const result = await deleteContratoController(idContrato);

		if (!result.success) {
			return res.status(404).json({ message: "Contrato no encontrado" });
		}

		res.json({ message: "Contrato eliminado exitosamente" });
	} catch (error) {
		console.error("Error in deleteContratoHandler:", error);
		res.status(500).json({ message: "Error al eliminar contrato" });
	}
};

// ==========================================
// PAGOS
// ==========================================

exports.listHistorialPagosAlquilerHandler = async (req, res) => {
	try {
		const limit = req.query.limit || 200;
		const historial = await listHistorialPagosAlquilerController(limit);
		res.json(historial);
	} catch (error) {
		console.error("Error in listHistorialPagosAlquilerHandler:", error);
		res.status(500).json({ message: "Error al obtener historial de pagos" });
	}
};

exports.listPagosContratoHandler = async (req, res) => {
	try {
		const { idContrato } = req.params;
		const limit = req.query.limit || 200;
		const historial = await listPagosContratoController(idContrato, limit);
		res.json(historial);
	} catch (error) {
		console.error("Error in listPagosContratoHandler:", error);
		res.status(500).json({ message: "Error al obtener pagos" });
	}
};

exports.registrarPagoAlquilerHandler = async (req, res) => {
	try {
		const { idContrato } = req.params;
		const { fecha_pago, fecha_proximo_pago, monto, metodo, referencia } =
			req.body;
		const idUsuario = req.user?.id;

		if (!idUsuario) {
			return res.status(401).json({ message: "Usuario no autenticado" });
		}

		if (!fecha_pago || !fecha_proximo_pago || !monto) {
			return res.status(400).json({
				message: "La fecha de pago, fecha proximo y monto son obligatorios",
			});
		}

		const pago = await registrarPagoAlquilerController(
			idContrato,
			{
				fecha_pago,
				fecha_proximo_pago,
				monto: parseFloat(monto),
				metodo,
				referencia,
			},
			idUsuario,
		);

		res.status(201).json(pago);
	} catch (error) {
		if (error?.code === "CONTRATO_NOT_FOUND") {
			return res.status(404).json({ message: error.message });
		}
		console.error("Error in registrarPagoAlquilerHandler:", error);
		res.status(500).json({ message: "Error al registrar pago" });
	}
};

exports.updatePagoAlquilerHandler = async (req, res) => {
	try {
		const { idPago } = req.params;
		const { fecha_pago, fecha_proximo_pago, monto, metodo, referencia } =
			req.body;

		const pago = await updatePagoAlquilerController(idPago, {
			fecha_pago,
			fecha_proximo_pago,
			monto: monto ? parseFloat(monto) : undefined,
			metodo,
			referencia,
		});

		if (!pago) {
			return res.status(404).json({ message: "Pago no encontrado" });
		}

		res.json(pago);
	} catch (error) {
		console.error("Error in updatePagoAlquilerHandler:", error);
		res.status(500).json({ message: "Error al actualizar pago" });
	}
};

exports.deletePagoAlquilerHandler = async (req, res) => {
	try {
		const { idPago } = req.params;
		const result = await deletePagoAlquilerController(idPago);

		if (!result.success) {
			return res.status(404).json({ message: "Pago no encontrado" });
		}

		res.json({ message: "Pago eliminado exitosamente" });
	} catch (error) {
		console.error("Error in deletePagoAlquilerHandler:", error);
		res.status(500).json({ message: "Error al eliminar pago" });
	}
};
