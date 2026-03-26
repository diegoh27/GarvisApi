const {
	listNotasCompraController,
	getNotaCompraController,
	createNotaCompraController,
	deleteNotaCompraController,
} = require("../controllers/notaCompraControllers");
const { logInventarioReq } = require("../controllers/invAuditoriaControllers");

// ==========================================
// NOTAS DE COMPRA
// ==========================================

const listNotasCompraHandler = async (req, res) => {
	try {
		const limit = req.query.limit ? Number(req.query.limit) : 200;
		const data = await listNotasCompraController({ limit });
		return res.status(200).json({ ok: true, data });
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al listar notas de compra",
		});
	}
};

const getNotaCompraHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await getNotaCompraController(id);
		return res.status(200).json({ ok: true, data });
	} catch (err) {
		if (err?.code === "NOTA_COMPRA_NOT_FOUND") {
			return res.status(404).json({ ok: false, message: err.message });
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al obtener la nota de compra",
		});
	}
};

const createNotaCompraHandler = async (req, res) => {
	try {
		const {
			id_proveedor,
			numero_factura,
			fecha_compra,
			observaciones,
			lineas,
		} = req.body;
		const id_usuario = req.user?.id;

		// Validaciones
		if (!id_proveedor) {
			return res.status(400).json({
				ok: false,
				message: "El proveedor es requerido",
			});
		}
		if (!fecha_compra) {
			return res.status(400).json({
				ok: false,
				message: "La fecha de compra es requerida",
			});
		}
		if (!lineas || !Array.isArray(lineas) || lineas.length === 0) {
			return res.status(400).json({
				ok: false,
				message: "Debe agregar al menos una línea de compra",
			});
		}

		// Validar cada línea
		for (let i = 0; i < lineas.length; i++) {
			const l = lineas[i];
			if (!l.id_producto) {
				return res.status(400).json({
					ok: false,
					message: `Línea ${i + 1}: debe seleccionar un producto`,
				});
			}
			if (!l.cantidad || Number(l.cantidad) <= 0) {
				return res.status(400).json({
					ok: false,
					message: `Línea ${i + 1}: la cantidad debe ser mayor a 0`,
				});
			}
			if (l.precio_unitario === undefined || Number(l.precio_unitario) < 0) {
				return res.status(400).json({
					ok: false,
					message: `Línea ${i + 1}: el precio unitario es requerido`,
				});
			}
		}

		const data = await createNotaCompraController({
			id_proveedor,
			numero_factura,
			fecha_compra,
			observaciones,
			lineas,
			id_usuario,
		});

		logInventarioReq(
			req,
			"compras",
			`Registró nota de compra (${data.lineas?.length || 0} líneas) - Proveedor: ${data.proveedor_nombre || id_proveedor}`,
			{
				entidad_tipo: "nota_compra",
				entidad_id: data.id_nota_compra,
				detalles: { total: data.total, lineas: data.lineas?.length },
			},
		).catch((e) => console.error(e));

		return res.status(201).json({
			ok: true,
			message: "Nota de compra registrada. Stock actualizado y kardex registrado.",
			data,
		});
	} catch (err) {
		if (err?.code === "PROVEEDOR_NOT_FOUND") {
			return res.status(404).json({ ok: false, message: err.message });
		}
		if (err?.code === "PRODUCTO_NOT_FOUND") {
			return res.status(404).json({ ok: false, message: err.message });
		}
		if (err?.code === "NO_LINEAS" || err?.code === "INVALID_CANTIDAD" || err?.code === "INVALID_PRECIO") {
			return res.status(400).json({ ok: false, message: err.message });
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al registrar la nota de compra",
		});
	}
};

const deleteNotaCompraHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await deleteNotaCompraController(id);
		logInventarioReq(req, "compras", `Eliminó nota de compra (ID: ${id}) - Stock revertido`, {
			entidad_tipo: "nota_compra",
			entidad_id: id,
		}).catch((e) => console.error(e));
		return res.status(200).json({ ok: true, message: data.message });
	} catch (err) {
		if (err?.code === "NOTA_COMPRA_NOT_FOUND") {
			return res.status(404).json({ ok: false, message: err.message });
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al eliminar la nota de compra",
		});
	}
};

module.exports = {
	listNotasCompraHandler,
	getNotaCompraHandler,
	createNotaCompraHandler,
	deleteNotaCompraHandler,
};
