const { Router } = require("express");
const {
	listOrdenesCompraHandler,
	getOrdenCompraHandler,
	createOrdenCompraHandler,
	procesarRecepcionOrdenHandler,
	cancelarOrdenCompraHandler
} = require("../handlers/ordenesCompraHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const ordenesCompraRoutes = Router();

// GET /api/ordenes-compra
ordenesCompraRoutes.get(
	"/",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	listOrdenesCompraHandler
);

// POST /api/ordenes-compra
ordenesCompraRoutes.post(
	"/",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	createOrdenCompraHandler
);

// GET /api/ordenes-compra/:id
ordenesCompraRoutes.get(
	"/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	getOrdenCompraHandler
);

// Recibir mercancia de orden de compra (procesar)
ordenesCompraRoutes.post(
	"/:id/recepcion",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	procesarRecepcionOrdenHandler
);

// PATCH /api/ordenes-compra/:id/cancelar
ordenesCompraRoutes.patch(
	"/:id/cancelar",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	cancelarOrdenCompraHandler
);

module.exports = ordenesCompraRoutes;
