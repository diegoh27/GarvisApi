const {
	listMovimientosFacturacionController,
	getResumenFacturacionController,
	deleteMovimientoFacturacionController,
} = require("../controllers/facturacionControllers");
const { logInventarioReq } = require("../controllers/invAuditoriaControllers");

exports.listMovimientosFacturacionHandler = async (req, res) => {
	try {
		const { tipo, origen_modulo, fecha_desde, fecha_hasta, q, limit, offset } =
			req.query;

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

exports.deleteMovimientoFacturacionHandler = async (req, res) => {
	try {
		const { id } = req.params;
		await deleteMovimientoFacturacionController(id);
		logInventarioReq(req, "facturacion", `Eliminó movimiento de facturación (ID: ${id})`, {
			entidad_tipo: "movimiento",
			entidad_id: id,
		}).catch((e) => console.error(e));
		return res.status(200).json({
			ok: true,
			message: "Movimiento eliminado correctamente",
		});
	} catch (error) {
		if (error?.code === "MOVIMIENTO_NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: error.message,
			});
		}
		console.error("Error in deleteMovimientoFacturacionHandler:", error);
		return res.status(500).json({
			ok: false,
			message: "Error al eliminar el movimiento",
		});
	}
};
