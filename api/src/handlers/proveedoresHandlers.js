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

module.exports = {
	listProveedoresHandler,
	getProveedorHandler,
	createProveedorHandler,
	updateProveedorHandler,
	deleteProveedorHandler,
};
