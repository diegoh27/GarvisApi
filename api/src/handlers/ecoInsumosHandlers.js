const {
	listInsumosEcoController,
	listEcosConRecetaController,
	addInsumoEcoController,
	updateInsumoEcoController,
	deleteInsumoEcoController,
	validarStockParaCitaController,
} = require("../controllers/ecoInsumosControllers");
const { logInventarioReq } = require("../controllers/invAuditoriaControllers");

// ==========================================
// RECETAS (INSUMOS POR ECO)
// ==========================================

const listEcosConRecetaHandler = async (req, res) => {
	try {
		const data = await listEcosConRecetaController();
		return res.status(200).json({ ok: true, data });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error al listar ecos con receta" });
	}
};

const listInsumosEcoHandler = async (req, res) => {
	try {
		const { idEco } = req.params;
		const data = await listInsumosEcoController(idEco);
		return res.status(200).json({ ok: true, data });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error al listar insumos del eco" });
	}
};

const addInsumoEcoHandler = async (req, res) => {
	try {
		const { idEco } = req.params;
		const { id_producto, cantidad } = req.body;

		if (!id_producto) {
			return res.status(400).json({ ok: false, message: "El producto es requerido" });
		}

		if (!cantidad || Number(cantidad) <= 0) {
			return res.status(400).json({ ok: false, message: "La cantidad debe ser mayor a 0" });
		}

		const data = await addInsumoEcoController({
			id_eco: idEco,
			id_producto,
			cantidad: Number(cantidad),
		});

		logInventarioReq(req, "recetas", `Agregó insumo "${data.producto_nombre}" a receta de eco`, {
			entidad_tipo: "eco_insumo",
			entidad_id: data.id_eco_insumo,
			detalles: { id_eco: idEco, cantidad: data.cantidad },
		}).catch((e) => console.error(e));

		return res.status(201).json({ ok: true, message: "Insumo agregado a la receta", data });
	} catch (err) {
		if (err?.code === "ECO_NOT_FOUND" || err?.code === "PRODUCTO_NOT_FOUND") {
			return res.status(404).json({ ok: false, message: err.message });
		}
		if (err?.code === "DUPLICATE_INSUMO") {
			return res.status(409).json({ ok: false, message: err.message });
		}
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error al agregar insumo" });
	}
};

const updateInsumoEcoHandler = async (req, res) => {
	try {
		const { idInsumo } = req.params;
		const { cantidad } = req.body;

		if (!cantidad || Number(cantidad) <= 0) {
			return res.status(400).json({ ok: false, message: "La cantidad debe ser mayor a 0" });
		}

		const data = await updateInsumoEcoController({
			id_eco_insumo: idInsumo,
			cantidad: Number(cantidad),
		});

		logInventarioReq(req, "recetas", `Actualizó cantidad de insumo en receta a ${cantidad}`, {
			entidad_tipo: "eco_insumo",
			entidad_id: idInsumo,
		}).catch((e) => console.error(e));

		return res.status(200).json({ ok: true, message: "Cantidad actualizada", data });
	} catch (err) {
		if (err?.code === "INSUMO_NOT_FOUND") {
			return res.status(404).json({ ok: false, message: err.message });
		}
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error al actualizar insumo" });
	}
};

const deleteInsumoEcoHandler = async (req, res) => {
	try {
		const { idInsumo } = req.params;
		const data = await deleteInsumoEcoController(idInsumo);

		logInventarioReq(req, "recetas", `Eliminó insumo de receta (ID: ${idInsumo})`, {
			entidad_tipo: "eco_insumo",
			entidad_id: idInsumo,
		}).catch((e) => console.error(e));

		return res.status(200).json({ ok: true, message: data.message });
	} catch (err) {
		if (err?.code === "INSUMO_NOT_FOUND") {
			return res.status(404).json({ ok: false, message: err.message });
		}
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error al eliminar insumo" });
	}
};

const validarStockParaCitaHandler = async (req, res) => {
	try {
		const { idEco } = req.params;
		const data = await validarStockParaCitaController(idEco);
		return res.status(200).json({ ok: true, data });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ ok: false, message: "Error al validar stock" });
	}
};

module.exports = {
	listEcosConRecetaHandler,
	listInsumosEcoHandler,
	addInsumoEcoHandler,
	updateInsumoEcoHandler,
	deleteInsumoEcoHandler,
	validarStockParaCitaHandler,
};
