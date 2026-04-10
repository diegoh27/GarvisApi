const {
	listProductosController,
	createProductoController,
	getProductoController,
	updateProductoController,
	deleteProductoController,
	registrarCompraProductoController,
	updateCompraProductoController,
	deleteCompraProductoController,
	listComprasProductoController,
	listHistorialComprasController,
	registrarAjusteStockController,
	listAjustesProductoController,
	listHistorialAjustesController,
	listHistorialConsumosController,
} = require("../controllers/productosControllers");
const { logInventarioReq } = require("../controllers/invAuditoriaControllers");

// ==========================================
// PRODUCTOS
// ==========================================

const listProductosHandler = async (req, res) => {
	try {
		const data = await listProductosController();
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al listar productos",
		});
	}
};

const createProductoHandler = async (req, res) => {
	try {
		const { nombre, presentacion, categoria, unidad_compra, unidad_consumo, factor_conversion, stock_base_total, stock_minimo_base, activo } = req.body;
		if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
			return res.status(400).json({
				ok: false,
				message: "El nombre es requerido",
			});
		}
		const data = await createProductoController({
			nombre: nombre.trim(),
			presentacion,
			categoria,
			unidad_compra,
			unidad_consumo,
			factor_conversion: Number(factor_conversion) || 1,
			stock_base_total: Number(stock_base_total) || 0,
			stock_minimo_base: Number(stock_minimo_base) || 0,
			activo: activo !== false && activo !== 0 ? 1 : 0,
		});
		logInventarioReq(req, "productos", `Creó producto "${data?.nombre || nombre}"`, {
			entidad_tipo: "producto",
			entidad_id: data?.id_producto,
		}).catch((e) => console.error(e));
		return res.status(201).json({
			ok: true,
			message: "Producto creado",
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
			message: "Error al crear el producto",
		});
	}
};

const getProductoHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await getProductoController(id);
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		if (err?.code === "PRODUCTO_NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al obtener el producto",
		});
	}
};

const updateProductoHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const { nombre, presentacion, categoria, unidad_compra, unidad_consumo, factor_conversion, stock_minimo_base, activo } = req.body;

		const data = await updateProductoController({
			id_producto: id,
			nombre: nombre?.trim(),
			presentacion,
			categoria,
			unidad_compra,
			unidad_consumo,
			factor_conversion: factor_conversion !== undefined ? Number(factor_conversion) : undefined,
			stock_minimo_base: stock_minimo_base !== undefined ? Number(stock_minimo_base) : undefined,
			activo: activo !== undefined ? (activo ? 1 : 0) : undefined,
		});
		const accion = activo === 0 ? "Desactivó" : activo === 1 ? "Activó" : "Modificó";
		logInventarioReq(req, "productos", `${accion} producto "${data?.nombre || id}"`, {
			entidad_tipo: "producto",
			entidad_id: id,
		}).catch((e) => console.error(e));
		return res.status(200).json({
			ok: true,
			message: "Producto actualizado",
			data,
		});
	} catch (err) {
		if (err?.code === "PRODUCTO_NOT_FOUND") {
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
			message: "Error al actualizar el producto",
		});
	}
};

const deleteProductoHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await deleteProductoController(id);

		logInventarioReq(req, "productos", `Eliminó producto "${data?.nombre || id}"`, {
			entidad_tipo: "producto",
			entidad_id: id,
		}).catch((e) => console.error(e));

		return res.status(200).json({
			ok: true,
			message: "Producto eliminado correctamente",
		});
	} catch (err) {
		if (err?.code === "PRODUCTO_NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "PRODUCTO_EN_USO") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al eliminar el producto",
		});
	}
};

// ==========================================
// COMPRAS
// ==========================================

const registrarCompraProductoHandler = async (req, res) => {
	try {
		const { id: id_producto } = req.params;
		const {
			fecha_ingreso,
			cantidad,
			precio_unitario,
			precio_total,
			proveedor,
			referencia,
		} = req.body;
		const id_usuario = req.user?.id;

		if (!cantidad || Number(cantidad) <= 0) {
			return res.status(400).json({
				ok: false,
				message: "La cantidad debe ser mayor a 0",
			});
		}

		if (!precio_unitario || Number(precio_unitario) < 0) {
			return res.status(400).json({
				ok: false,
				message: "El precio unitario es requerido",
			});
		}

		if (!fecha_ingreso) {
			return res.status(400).json({
				ok: false,
				message: "La fecha de ingreso es requerida",
			});
		}

		const data = await registrarCompraProductoController({
			id_producto,
			fecha_ingreso,
			cantidad: Number(cantidad),
			precio_unitario: Number(precio_unitario),
			precio_total:
				precio_total !== undefined ? Number(precio_total) : undefined,
			proveedor: proveedor || null,
			referencia: referencia || null,
			id_usuario,
		});
		const prodNombre = data?.producto_nombre || "producto";
		logInventarioReq(req, "productos", `Registró compra de ${cantidad} unidades de "${prodNombre}"`, {
			entidad_tipo: "compra",
			entidad_id: data?.id_compra,
			detalles: { cantidad, precio_unitario },
		}).catch((e) => console.error(e));
		return res.status(201).json({
			ok: true,
			message: "Compra registrada",
			data,
		});
	} catch (err) {
		if (err?.code === "PRODUCTO_NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al registrar la compra",
		});
	}
};

const updateCompraProductoHandler = async (req, res) => {
	try {
		const { idCompra } = req.params;
		const {
			fecha_ingreso,
			cantidad,
			precio_unitario,
			precio_total,
			proveedor,
			referencia,
		} = req.body;

		const data = await updateCompraProductoController({
			id_compra: idCompra,
			fecha_ingreso,
			cantidad: cantidad !== undefined ? Number(cantidad) : undefined,
			precio_unitario:
				precio_unitario !== undefined ? Number(precio_unitario) : undefined,
			precio_total:
				precio_total !== undefined ? Number(precio_total) : undefined,
			proveedor,
			referencia,
		});
		logInventarioReq(req, "productos", `Actualizó compra de producto (ID compra: ${idCompra})`, {
			entidad_tipo: "compra",
			entidad_id: idCompra,
		}).catch((e) => console.error(e));
		return res.status(200).json({
			ok: true,
			message: "Compra actualizada",
			data,
		});
	} catch (err) {
		if (err?.code === "COMPRA_NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al actualizar la compra",
		});
	}
};

const listComprasProductoHandler = async (req, res) => {
	try {
		const { id: id_producto } = req.params;
		const data = await listComprasProductoController(id_producto);
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al listar las compras",
		});
	}
};

const listHistorialComprasHandler = async (req, res) => {
	try {
		const limit = req.query.limit ? Number(req.query.limit) : 200;
		const data = await listHistorialComprasController({ limit });
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al listar el historial de compras",
		});
	}
};

const deleteCompraProductoHandler = async (req, res) => {
	try {
		const { idCompra } = req.params;
		await deleteCompraProductoController(idCompra);
		logInventarioReq(req, "productos", `Eliminó compra (ID: ${idCompra})`, {
			entidad_tipo: "compra",
			entidad_id: idCompra,
		}).catch((e) => console.error(e));
		return res.status(200).json({
			ok: true,
			message: "Compra eliminada correctamente",
		});
	} catch (err) {
		if (err?.code === "COMPRA_NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al eliminar la compra",
		});
	}
};

// ==========================================
// AJUSTES DE STOCK
// ==========================================

const registrarAjusteStockHandler = async (req, res) => {
	try {
		const { id: id_producto } = req.params;
		const { stock_nuevo, motivo } = req.body;
		const id_usuario = req.user?.id;

		if (stock_nuevo === undefined || stock_nuevo === null) {
			return res.status(400).json({
				ok: false,
				message: "El nuevo stock es requerido",
			});
		}

		if (Number(stock_nuevo) < 0) {
			return res.status(400).json({
				ok: false,
				message: "El stock no puede ser negativo",
			});
		}

		const data = await registrarAjusteStockController({
			id_producto,
			stock_nuevo: Number(stock_nuevo),
			motivo: motivo || null,
			id_usuario,
		});
		const prodNombre = data?.producto_nombre || "producto";
		const motivoTxt = motivo ? ` - ${motivo}` : "";
		logInventarioReq(req, "productos", `Ajustó stock de "${prodNombre}" a ${stock_nuevo}${motivoTxt}`, {
			entidad_tipo: "ajuste",
			entidad_id: data?.id_ajuste,
			detalles: { stock_nuevo: Number(stock_nuevo), motivo },
		}).catch((e) => console.error(e));
		return res.status(201).json({
			ok: true,
			message: "Ajuste de stock registrado",
			data,
		});
	} catch (err) {
		if (err?.code === "PRODUCTO_NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al registrar el ajuste de stock",
		});
	}
};

const listAjustesProductoHandler = async (req, res) => {
	try {
		const { id: id_producto } = req.params;
		const data = await listAjustesProductoController(id_producto);
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al listar los ajustes",
		});
	}
};

const listHistorialAjustesHandler = async (req, res) => {
	try {
		const limit = req.query.limit ? Number(req.query.limit) : 200;
		const data = await listHistorialAjustesController({ limit });
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al listar el historial de ajustes",
		});
	}
};

const listHistorialConsumosHandler = async (req, res) => {
	try {
		const limit = req.query.limit ? Number(req.query.limit) : 200;
		const data = await listHistorialConsumosController({ limit });
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al listar el historial de consumos",
		});
	}
};

module.exports = {
	// Productos
	listProductosHandler,
	createProductoHandler,
	getProductoHandler,
	updateProductoHandler,
	deleteProductoHandler,
	// Compras
	registrarCompraProductoHandler,
	updateCompraProductoHandler,
	deleteCompraProductoHandler,
	listComprasProductoHandler,
	listHistorialComprasHandler,
	// Ajustes
	registrarAjusteStockHandler,
	listAjustesProductoHandler,
	listHistorialAjustesHandler,
	// Consumos
	listHistorialConsumosHandler,
};
