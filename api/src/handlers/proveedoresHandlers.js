const {
	listProveedoresController,
	getProveedorController,
	createProveedorController,
	updateProveedorController,
	deleteProveedorController,
} = require("../controllers/proveedoresControllers");
const { logInventarioReq } = require("../controllers/invAuditoriaControllers");

// ==========================================
// PROVEEDORES
// ==========================================

const listProveedoresHandler = async (req, res) => {
	try {
		const data = await listProveedoresController();
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al listar proveedores",
		});
	}
};

const getProveedorHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await getProveedorController(id);
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		if (err?.code === "PROVEEDOR_NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al obtener el proveedor",
		});
	}
};

const createProveedorHandler = async (req, res) => {
	try {
		const { nombre, rif, telefono, correo, direccion, contacto_nombre, activo } = req.body;
		if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
			return res.status(400).json({
				ok: false,
				message: "El nombre del proveedor es requerido",
			});
		}
		const data = await createProveedorController({
			nombre: nombre.trim(),
			rif: rif || null,
			telefono: telefono || null,
			correo: correo || null,
			direccion: direccion || null,
			contacto_nombre: contacto_nombre || null,
			activo: activo !== false && activo !== 0 ? 1 : 0,
		});
		logInventarioReq(req, "proveedores", `Creó proveedor "${data?.nombre || nombre}"`, {
			entidad_tipo: "proveedor",
			entidad_id: data?.id_proveedor,
		}).catch((e) => console.error(e));
		return res.status(201).json({
			ok: true,
			message: "Proveedor creado",
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
			message: "Error al crear el proveedor",
		});
	}
};

const updateProveedorHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const { nombre, rif, telefono, correo, direccion, contacto_nombre, activo } = req.body;

		const data = await updateProveedorController({
			id_proveedor: id,
			nombre: nombre?.trim(),
			rif,
			telefono,
			correo,
			direccion,
			contacto_nombre,
			activo: activo !== undefined ? (activo ? 1 : 0) : undefined,
		});
		const accion = activo === 0 ? "Desactivó" : activo === 1 ? "Activó" : "Modificó";
		logInventarioReq(req, "proveedores", `${accion} proveedor "${data?.nombre || id}"`, {
			entidad_tipo: "proveedor",
			entidad_id: id,
		}).catch((e) => console.error(e));
		return res.status(200).json({
			ok: true,
			message: "Proveedor actualizado",
			data,
		});
	} catch (err) {
		if (err?.code === "PROVEEDOR_NOT_FOUND") {
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
			message: "Error al actualizar el proveedor",
		});
	}
};

const deleteProveedorHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await deleteProveedorController(id);
		logInventarioReq(req, "proveedores", `Eliminó proveedor (ID: ${id})`, {
			entidad_tipo: "proveedor",
			entidad_id: id,
		}).catch((e) => console.error(e));
		return res.status(200).json({
			ok: true,
			message: data.message,
		});
	} catch (err) {
		if (err?.code === "PROVEEDOR_NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "PROVEEDOR_HAS_COMPRAS") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error al eliminar el proveedor",
		});
	}
};

// ==========================================
// CATÁLOGO DE PRECIOS PROVEEDOR (N:M con PRODUCTOS)
// ==========================================
const {
	getCatalogoProveedorController,
	getCatalogoGlobalController,
	asociarProductoProveedorController,
	updateCostoProductoProveedorController,
	deleteProductoProveedorController,
} = require("../controllers/proveedoresControllers");

const getCatalogoHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await getCatalogoProveedorController(id);
		return res.status(200).json({ ok: true, data });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error al listar catálogo" });
	}
};

const getCatalogoGlobalHandler = async (req, res) => {
	try {
		const data = await getCatalogoGlobalController();
		return res.status(200).json({ ok: true, data });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error al listar catálogo global" });
	}
};

const asociarCatalogoHandler = async (req, res) => {
	try {
		const { id } = req.params;
		const { id_producto, precio_costo } = req.body;
		
		if (!id_producto) {
			return res.status(400).json({ ok: false, message: "El id_producto es requerido" });
		}
		
		const data = await asociarProductoProveedorController({
			id_proveedor: id,
			id_producto,
			precio_costo: Number(precio_costo) || 0
		});
		
		logInventarioReq(req, "proveedores", `Asoció producto a catálogo del proveedor (ID: ${id})`, {
			entidad_tipo: "proveedor",
			entidad_id: id,
		}).catch((e) => console.error(e));
		
		return res.status(201).json({ ok: true, message: "Producto asociado al catálogo", data });
	} catch (err) {
		if (err?.code === "DUPLICATE_CATALOGO") {
			return res.status(409).json({ ok: false, message: err.message });
		}
		if (err?.code === "PROVEEDOR_NOT_FOUND" || err?.code === "PRODUCTO_NOT_FOUND") {
			return res.status(404).json({ ok: false, message: err.message });
		}
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error al asociar producto" });
	}
};

const updateCatalogoHandler = async (req, res) => {
	try {
		const { idRelacion } = req.params;
		const { precio_costo } = req.body;
		
		if (precio_costo === undefined) {
			return res.status(400).json({ ok: false, message: "El precio_costo es requerido" });
		}
		
		const data = await updateCostoProductoProveedorController({
			id_relacion: idRelacion,
			precio_costo: Number(precio_costo)
		});
		
		return res.status(200).json({ ok: true, message: "Costo actualizado", data });
	} catch (err) {
		if (err?.code === "RELACION_NOT_FOUND") {
			return res.status(404).json({ ok: false, message: err.message });
		}
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error al actualizar costo" });
	}
};

const deleteCatalogoHandler = async (req, res) => {
	try {
		const { idRelacion } = req.params;
		const data = await deleteProductoProveedorController(idRelacion);
		return res.status(200).json({ ok: true, message: data.message });
	} catch (err) {
		if (err?.code === "RELACION_NOT_FOUND") {
			return res.status(404).json({ ok: false, message: err.message });
		}
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error al desvincular producto" });
	}
};

module.exports = {
	listProveedoresHandler,
	getProveedorHandler,
	createProveedorHandler,
	updateProveedorHandler,
	deleteProveedorHandler,
	getCatalogoHandler,
	getCatalogoGlobalHandler,
	asociarCatalogoHandler,
	updateCatalogoHandler,
	deleteCatalogoHandler,
};
