const {
	listComisionesController,
	generarComisionesPendientesController,
	pagarComisionController,
	editarPagoComisionController,
	deletePagoComisionController,
} = require("../controllers/espComisionControllers");
const { logInventarioReq } = require("../controllers/invAuditoriaControllers");

// ==========================================
// LISTADO
// ==========================================

exports.listComisionesHandler = async (req, res) => {
	try {
		const { id_especialista, estado, limit } = req.query;
		const data = await listComisionesController({
			id_especialista,
			estado,
			limit,
		});
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (error) {
		console.error("Error in listComisionesHandler:", error);
		return res.status(500).json({
			ok: false,
			message: "Error al listar comisiones",
		});
	}
};

// ==========================================
// GENERAR
// ==========================================

exports.generarComisionesPendientesHandler = async (req, res) => {
	try {
		const id_usuario = req.user?.id;
		if (!id_usuario) {
			return res.status(401).json({
				ok: false,
				message: "Usuario no autenticado",
			});
		}

		const result = await generarComisionesPendientesController({
			id_usuario,
		});
		const count = result?.inserted ?? 0;
		logInventarioReq(req, "comisiones", `Generó ${count} comisiones pendientes`, {
			entidad_tipo: "comision",
			detalles: { cantidad: count },
		}).catch((e) => console.error(e));

		return res.status(200).json({
			ok: true,
			message: "Comisiones generadas",
			data: result,
		});
	} catch (error) {
		console.error("Error in generarComisionesPendientesHandler:", error);
		return res.status(500).json({
			ok: false,
			message: "Error al generar comisiones",
		});
	}
};

// ==========================================
// PAGAR
// ==========================================

exports.pagarComisionHandler = async (req, res) => {
	try {
		const { idComision } = req.params;
		const { fecha_pago, metodo, referencia } = req.body;
		const id_usuario = req.user?.id;

		if (!id_usuario) {
			return res.status(401).json({
				ok: false,
				message: "Usuario no autenticado",
			});
		}

		const data = await pagarComisionController({
			id_comision: idComision,
			id_usuario,
			fecha_pago,
			metodo,
			referencia,
		});

		if (!data) {
			return res.status(404).json({
				ok: false,
				message: "Comision no encontrada",
			});
		}
		const espNombre = data?.nombre_especialista || idComision;
		logInventarioReq(req, "comisiones", `Pagó comisión de "${espNombre}" (ID: ${idComision})`, {
			entidad_tipo: "pago_comision",
			entidad_id: idComision,
			detalles: { monto: data?.monto },
		}).catch((e) => console.error(e));

		return res.status(200).json({
			ok: true,
			message: "Comision pagada",
			data,
		});
	} catch (error) {
		if (error?.code === "ALREADY_PAID") {
			return res.status(409).json({
				ok: false,
				message: error.message,
			});
		}
		if (error?.code === "INVALID_STATE") {
			return res.status(409).json({
				ok: false,
				message: error.message,
			});
		}
		console.error("Error in pagarComisionHandler:", error);
		return res.status(500).json({
			ok: false,
			message: "Error al pagar comision",
		});
	}
};

// ==========================================
// EDITAR PAGO
// ==========================================

exports.editarPagoComisionHandler = async (req, res) => {
	try {
		const { idComision } = req.params;
		const { fecha_pago, metodo, referencia } = req.body;
		const id_usuario = req.user?.id;

		if (!id_usuario) {
			return res.status(401).json({
				ok: false,
				message: "Usuario no autenticado",
			});
		}

		const data = await editarPagoComisionController({
			id_comision: idComision,
			id_usuario,
			fecha_pago,
			metodo,
			referencia,
		});

		if (!data) {
			return res.status(404).json({
				ok: false,
				message: "Comision no encontrada",
			});
		}
		logInventarioReq(req, "comisiones", `Editó pago de comisión (ID: ${idComision})`, {
			entidad_tipo: "pago_comision",
			entidad_id: idComision,
		}).catch((e) => console.error(e));

		return res.status(200).json({
			ok: true,
			message: "Pago actualizado",
			data,
		});
	} catch (error) {
		if (error?.code === "INVALID_STATE") {
			return res.status(409).json({
				ok: false,
				message: error.message,
			});
		}
		console.error("Error in editarPagoComisionHandler:", error);
		return res.status(500).json({
			ok: false,
			message: "Error al editar pago",
		});
	}
};

// ==========================================
// ELIMINAR PAGO
// ==========================================

exports.deletePagoComisionHandler = async (req, res) => {
	try {
		const { idComision } = req.params;
		await deletePagoComisionController(idComision);
		logInventarioReq(req, "comisiones", `Eliminó pago de comisión (ID: ${idComision})`, {
			entidad_tipo: "pago_comision",
			entidad_id: idComision,
		}).catch((e) => console.error(e));
		return res.status(200).json({
			ok: true,
			message: "Pago de comisión eliminado correctamente",
		});
	} catch (error) {
		if (error?.code === "COMISION_NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: error.message,
			});
		}
		if (error?.code === "COMISION_NO_PAGADA") {
			return res.status(400).json({
				ok: false,
				message: error.message,
			});
		}
		console.error("Error in deletePagoComisionHandler:", error);
		return res.status(500).json({
			ok: false,
			message: "Error al eliminar pago de comisión",
		});
	}
};
