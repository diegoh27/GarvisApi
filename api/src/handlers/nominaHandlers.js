const {
	listEmpleadosController,
	getEmpleadoController,
	createEmpleadoController,
	updateEmpleadoController,
	deleteEmpleadoController,
	listHistorialPagosNominaController,
	listHistorialPagosEmpleadoController,
	registrarPagoNominaController,
	updatePagoNominaController,
	deletePagoNominaController,
} = require("../controllers/nominaControllers");

// ==========================================
// EMPLEADOS HANDLERS
// ==========================================

exports.listEmpleadosHandler = async (req, res) => {
	try {
		const limit = req.query.limit || 20;
		const empleados = await listEmpleadosController(limit);
		res.json(empleados);
	} catch (error) {
		console.error("Error in listEmpleadosHandler:", error);
		res.status(500).json({ message: "Error al obtener empleados" });
	}
};

exports.getEmpleadoHandler = async (req, res) => {
	try {
		const { idEmpleado } = req.params;
		const empleado = await getEmpleadoController(idEmpleado);
		if (!empleado) {
			return res.status(404).json({ message: "Empleado no encontrado" });
		}
		res.json(empleado);
	} catch (error) {
		console.error("Error in getEmpleadoHandler:", error);
		res.status(500).json({ message: "Error al obtener empleado" });
	}
};

exports.createEmpleadoHandler = async (req, res) => {
	try {
		const { nombre, apellido, cedula, cargo, periodo, sueldo } = req.body;

		if (!nombre || !cargo) {
			return res.status(400).json({
				message: "El nombre y cargo son obligatorios",
			});
		}

		const empleado = await createEmpleadoController({
			nombre,
			apellido,
			cedula,
			cargo,
			periodo,
			sueldo: parseFloat(sueldo) || 0,
		});

		res.status(201).json(empleado);
	} catch (error) {
		console.error("Error in createEmpleadoHandler:", error);
		res.status(500).json({ message: "Error al crear empleado" });
	}
};

exports.updateEmpleadoHandler = async (req, res) => {
	try {
		const { idEmpleado } = req.params;
		const {
			nombre,
			apellido,
			cedula,
			cargo,
			periodo,
			sueldo,
			estado,
			proximo_pago_manual,
			estatus_pago_manual,
		} = req.body;

		const proximoPagoManualValue =
			proximo_pago_manual === "" ? null : proximo_pago_manual;
		const estatusPagoManualValue =
			estatus_pago_manual === "" ? null : estatus_pago_manual;

		const empleado = await updateEmpleadoController(idEmpleado, {
			nombre,
			apellido,
			cedula,
			cargo,
			periodo,
			sueldo: sueldo ? parseFloat(sueldo) : undefined,
			estado,
			proximo_pago_manual: proximoPagoManualValue,
			estatus_pago_manual: estatusPagoManualValue,
		});

		if (!empleado) {
			return res.status(404).json({ message: "Empleado no encontrado" });
		}

		res.json(empleado);
	} catch (error) {
		console.error("Error in updateEmpleadoHandler:", error);
		res.status(500).json({ message: "Error al actualizar empleado" });
	}
};

exports.deleteEmpleadoHandler = async (req, res) => {
	try {
		const { idEmpleado } = req.params;
		const result = await deleteEmpleadoController(idEmpleado);

		if (!result.success) {
			return res.status(404).json({ message: "Empleado no encontrado" });
		}

		res.json({ message: "Empleado eliminado exitosamente" });
	} catch (error) {
		console.error("Error in deleteEmpleadoHandler:", error);
		res.status(500).json({ message: "Error al eliminar empleado" });
	}
};

// ==========================================
// PAGOS HANDLERS
// ==========================================

exports.listHistorialPagosNominaHandler = async (req, res) => {
	try {
		const limit = req.query.limit || 20;
		const historial = await listHistorialPagosNominaController(limit);
		res.json(historial);
	} catch (error) {
		console.error("Error in listHistorialPagosNominaHandler:", error);
		res.status(500).json({ message: "Error al obtener historial de pagos" });
	}
};

exports.listHistorialPagosEmpleadoHandler = async (req, res) => {
	try {
		const { idEmpleado } = req.params;
		const limit = req.query.limit || 20;
		const historial = await listHistorialPagosEmpleadoController(
			idEmpleado,
			limit,
		);
		res.json(historial);
	} catch (error) {
		console.error("Error in listHistorialPagosEmpleadoHandler:", error);
		res.status(500).json({ message: "Error al obtener historial de pagos" });
	}
};

exports.registrarPagoNominaHandler = async (req, res) => {
	try {
		const { idEmpleado } = req.params;
		const { fecha_pago, fecha_proximo_pago, monto, metodo, referencia } =
			req.body;
		const idUsuario = req.user.id;

		if (!fecha_pago || !fecha_proximo_pago || !monto) {
			return res.status(400).json({
				message: "La fecha de pago, fecha prxima y monto son obligatorios",
			});
		}

		const pago = await registrarPagoNominaController(
			idEmpleado,
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
		console.error("Error in registrarPagoNominaHandler:", error);
		res.status(500).json({ message: "Error al registrar pago" });
	}
};

exports.updatePagoNominaHandler = async (req, res) => {
	try {
		const { idPago } = req.params;
		const { fecha_pago, fecha_proximo_pago, monto, metodo, referencia } =
			req.body;

		const pago = await updatePagoNominaController(idPago, {
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
		console.error("Error in updatePagoNominaHandler:", error);
		res.status(500).json({ message: "Error al actualizar pago" });
	}
};

exports.deletePagoNominaHandler = async (req, res) => {
	try {
		const { idPago } = req.params;
		const result = await deletePagoNominaController(idPago);

		if (!result.success) {
			return res.status(404).json({ message: "Pago no encontrado" });
		}

		res.json({ message: "Pago eliminado exitosamente" });
	} catch (error) {
		console.error("Error in deletePagoNominaHandler:", error);
		res.status(500).json({ message: "Error al eliminar pago" });
	}
};
