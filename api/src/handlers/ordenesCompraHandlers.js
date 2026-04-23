const {
	createOrdenCompraController,
	listOrdenesCompraController,
	getOrdenCompraController,
	procesarRecepcionOrdenController,
	cancelarOrdenCompraController
} = require("../controllers/ordenesCompraControllers");
const { logInventarioReq } = require("../controllers/invAuditoriaControllers");

// ==========================================
// ÓRDENES DE COMPRA (STAND BY)
// ==========================================

const listOrdenesCompraHandler = async (req, res) => {
	try {
		const data = await listOrdenesCompraController();
		return res.status(200).json({ ok: true, data });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error al listar órdenes de compra" });
	}
};

const getOrdenCompraHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await getOrdenCompraController(id);
		return res.status(200).json({ ok: true, data });
	} catch (err) {
		if (err?.code === "ORDEN_NOT_FOUND") {
			return res.status(404).json({ ok: false, message: err.message });
		}
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error al obtener la orden de compra" });
	}
};

const createOrdenCompraHandler = async (req, res) => {
	try {
		const { id_proveedor, fecha_emision, detalles } = req.body;
		const id_usuario = req.user?.id_usuario;

		if (!id_proveedor) return res.status(400).json({ ok: false, message: "Proveedor es requerido" });
		if (!fecha_emision) return res.status(400).json({ ok: false, message: "Fecha de emisión es requerida" });
		if (!id_usuario) return res.status(401).json({ ok: false, message: "No autorizado (Falta ID de usuario)" });

		const data = await createOrdenCompraController({
			id_proveedor,
			fecha_emision,
			id_usuario,
			detalles
		});

		// Registrar log de auditoría
		logInventarioReq(req, "órdenes de compra", `Creó la Orden de Compra ${data.numero_orden}`, {
			entidad_tipo: "orden_compra",
			entidad_id: data.id_orden,
		}).catch((e) => console.error(e));

		return res.status(201).json({
			ok: true,
			message: "Orden de Compra generada correctamente",
			data
		});

	} catch (err) {
		if (err?.code === "ORDEN_SIN_DETALLE" || err?.code === "INVALID_DETALLE") {
			return res.status(400).json({ ok: false, message: err.message });
		}
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error al crear orden de compra" });
	}
};

const procesarRecepcionOrdenHandler = async (req, res) => {
	try {
		const { id } = req.params; // id_orden
		const { numero_factura, fecha_compra, observaciones, lineas } = req.body;
		const id_usuario = req.user?.id_usuario;

		if (!id_usuario) return res.status(401).json({ ok: false, message: "No autorizado" });
		if (!fecha_compra) return res.status(400).json({ ok: false, message: "Fecha de compra es requerida" });
		if (!lineas || !Array.isArray(lineas) || lineas.length === 0) return res.status(400).json({ ok: false, message: "Debe proveer líneas para procesar la recepción" });

		const data = await procesarRecepcionOrdenController({
			id_orden: id,
			numero_factura,
			fecha_compra,
			observaciones,
			lineas,
			id_usuario
		});

		// Registrar log de auditoría
		logInventarioReq(req, "recepción orden compra", `Recibió la Orden de Compra (Nota creada con ${lineas.length} items)`, {
			entidad_tipo: "orden_compra",
			entidad_id: id,
		}).catch((e) => console.error(e));

		return res.status(201).json({
			ok: true,
			message: "Recepción procesada y factura interna creada",
			data
		});

	} catch (err) {
		if (err?.code === "ORDEN_NOT_FOUND" || err?.code === "ORDEN_NO_PENDIENTE" || err?.code === "INVALID_LINE") {
			return res.status(400).json({ ok: false, message: err.message });
		}
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error al procesar la recepción" });
	}
};

const cancelarOrdenCompraHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const result = await cancelarOrdenCompraController(id);

		logInventarioReq(req, "orden_compra", `Canceló Orden de Compra (ID: ${id})`, {
			entidad_tipo: "orden_compra",
			entidad_id: id,
		}).catch((e) => console.error(e));

		return res.status(200).json({ ok: true, message: result.message });
	} catch (err) {
		if (err?.code === "ORDEN_NO_ENCONTRADA" || err?.code === "ORDEN_NO_PENDIENTE") {
			return res.status(400).json({ ok: false, message: err.message });
		}
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error al cancelar la orden de compra" });
	}
};

module.exports = {
	listOrdenesCompraHandler,
	getOrdenCompraHandler,
	createOrdenCompraHandler,
	procesarRecepcionOrdenHandler,
	cancelarOrdenCompraHandler
};
