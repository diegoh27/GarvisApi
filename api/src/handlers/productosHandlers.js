const {
	listProductosController,
	createProductoController,
	createProductoLoteController,
	listLotesByProductoController,
	listHistorialLotesController,
	updateProductoLoteController,
	updateProductoController,
	getGastoProductosController,
} = require("../controllers/productosControllers");

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
		const { nombre, unidad, stock_minimo, precio, activo } = req.body;
		if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
			return res.status(400).json({
				ok: false,
				message: "El nombre es requerido",
			});
		}
		if (!unidad || typeof unidad !== "string" || !unidad.trim()) {
			return res.status(400).json({
				ok: false,
				message: "La unidad es requerida",
			});
		}
		const precioNum = Number(precio);
		if (Number.isNaN(precioNum) || precioNum < 0) {
			return res.status(400).json({
				ok: false,
				message: "El precio debe ser un número mayor o igual a 0",
			});
		}
		const data = await createProductoController({
			nombre: nombre.trim(),
			unidad: unidad.trim(),
			stock_minimo: Number(stock_minimo) || 0,
			precio: precioNum,
			activo: activo !== false && activo !== 0 ? 1 : 0,
		});
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

const createProductoLoteHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const { cantidad, fecha_ingreso, fecha_vencimiento, costo_total } =
			req.body;
		if (!cantidad || Number(cantidad) <= 0) {
			return res.status(400).json({
				ok: false,
				message: "La cantidad es requerida y debe ser mayor a 0",
			});
		}
		if (
			!fecha_ingreso ||
			typeof fecha_ingreso !== "string" ||
			!fecha_ingreso.trim()
		) {
			return res.status(400).json({
				ok: false,
				message: "La fecha de ingreso es requerida",
			});
		}
		const data = await createProductoLoteController({
			id_producto: id,
			cantidad: Number(cantidad),
			fecha_ingreso: fecha_ingreso.trim(),
			fecha_vencimiento: fecha_vencimiento?.trim() || null,
			costo_total: costo_total != null ? Number(costo_total) : null,
			id_usuario: req.user?.id ?? null,
		});
		return res.status(201).json({
			ok: true,
			message: "Lote registrado",
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
			message: "Error al registrar el lote",
		});
	}
};

const listLotesByProductoHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await listLotesByProductoController(id);
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al listar los lotes",
		});
	}
};

const listHistorialLotesHandler = async (req, res) => {
	try {
		const limit = req.query.limit != null ? Number(req.query.limit) : 200;
		const data = await listHistorialLotesController({ limit });
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al cargar el historial de lotes",
		});
	}
};

const updateProductoLoteHandler = async (req, res) => {
	try {
		const { id: id_producto, idLote } = req.params;
		const { cantidad, fecha_ingreso, fecha_vencimiento, costo_total } =
			req.body;
		if (!idLote || !id_producto) {
			return res.status(400).json({
				ok: false,
				message: "ID de producto y de lote son requeridos",
			});
		}
		if (
			cantidad !== undefined &&
			(Number(cantidad) <= 0 || Number.isNaN(Number(cantidad)))
		) {
			return res.status(400).json({
				ok: false,
				message: "La cantidad debe ser un número mayor a 0",
			});
		}
		const payload = {
			id_lote: idLote,
			id_producto,
			cantidad: cantidad !== undefined ? Number(cantidad) : undefined,
			fecha_ingreso:
				typeof fecha_ingreso === "string"
					? fecha_ingreso.trim() || undefined
					: undefined,
			fecha_vencimiento:
				fecha_vencimiento !== undefined
					? fecha_vencimiento && typeof fecha_vencimiento === "string"
						? fecha_vencimiento.trim()
						: null
					: undefined,
			costo_total:
				costo_total !== undefined
					? costo_total === null || costo_total === ""
						? null
						: Number(costo_total)
					: undefined,
		};
		const data = await updateProductoLoteController(payload);
		return res.status(200).json({
			ok: true,
			message: "Lote actualizado",
			data,
		});
	} catch (err) {
		if (err?.code === "LOTE_NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al actualizar el lote",
		});
	}
};

const updateProductoHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const { nombre, unidad, stock_minimo, precio, activo } = req.body;
		if (!id || !id.trim()) {
			return res.status(400).json({
				ok: false,
				message: "ID de producto es requerido",
			});
		}
		if (
			nombre !== undefined &&
			(typeof nombre !== "string" || !nombre.trim())
		) {
			return res.status(400).json({
				ok: false,
				message: "El nombre debe ser un texto no vacío",
			});
		}
		if (
			unidad !== undefined &&
			(typeof unidad !== "string" || !unidad.trim())
		) {
			return res.status(400).json({
				ok: false,
				message: "La unidad debe ser un texto no vacío",
			});
		}
		if (precio !== undefined) {
			const precioNum = Number(precio);
			if (Number.isNaN(precioNum) || precioNum < 0) {
				return res.status(400).json({
					ok: false,
					message: "El precio debe ser un número mayor o igual a 0",
				});
			}
		}
		const data = await updateProductoController({
			id_producto: id.trim(),
			nombre: nombre?.trim(),
			unidad: unidad?.trim(),
			stock_minimo:
				stock_minimo !== undefined ? Number(stock_minimo) : undefined,
			precio: precio !== undefined ? Number(precio) : undefined,
			activo:
				activo !== undefined
					? activo !== false && activo !== 0
						? 1
						: 0
					: undefined,
		});
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

const getGastoProductosHandler = async (req, res) => {
	try {
		let { desde, hasta } = req.query;
		const today = new Date();
		const toYMD = (d) => d.toISOString().slice(0, 10);
		if (!desde || !hasta) {
			// Por defecto: primer día del mes actual hasta hoy
			const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
			desde = desde || toYMD(firstDay);
			hasta = hasta || toYMD(today);
		}
		const data = await getGastoProductosController({ desde, hasta });
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al obtener el gasto en productos",
		});
	}
};

module.exports = {
	listProductosHandler,
	createProductoHandler,
	createProductoLoteHandler,
	listLotesByProductoHandler,
	listHistorialLotesHandler,
	updateProductoLoteHandler,
	updateProductoHandler,
	getGastoProductosHandler,
};
