const { Router } = require("express");
const {
	listEcosConRecetaHandler,
	listInsumosEcoHandler,
	addInsumoEcoHandler,
	updateInsumoEcoHandler,
	deleteInsumoEcoHandler,
	validarStockParaCitaHandler,
} = require("../handlers/ecoInsumosHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const ecoInsumosRoutes = Router();

// GET /eco-insumos - listar todos los ecos con su resumen de receta
ecoInsumosRoutes.get(
	"/",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	listEcosConRecetaHandler,
);

// GET /eco-insumos/:idEco - listar insumos de un eco
ecoInsumosRoutes.get(
	"/:idEco",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	listInsumosEcoHandler,
);

// POST /eco-insumos/:idEco - agregar insumo a la receta
ecoInsumosRoutes.post(
	"/:idEco",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	addInsumoEcoHandler,
);

// PATCH /eco-insumos/insumo/:idInsumo - actualizar cantidad
ecoInsumosRoutes.patch(
	"/insumo/:idInsumo",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	updateInsumoEcoHandler,
);

// DELETE /eco-insumos/insumo/:idInsumo - eliminar insumo de receta
ecoInsumosRoutes.delete(
	"/insumo/:idInsumo",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	deleteInsumoEcoHandler,
);

// GET /eco-insumos/:idEco/validar-stock - validar stock para agendar cita
ecoInsumosRoutes.get(
	"/:idEco/validar-stock",
	authenticateToken,
	validarStockParaCitaHandler,
);

module.exports = ecoInsumosRoutes;
