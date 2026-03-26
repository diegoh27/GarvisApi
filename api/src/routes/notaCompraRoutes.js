const { Router } = require("express");
const {
	listNotasCompraHandler,
	getNotaCompraHandler,
	createNotaCompraHandler,
	deleteNotaCompraHandler,
} = require("../handlers/notaCompraHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const notaCompraRoutes = Router();

// GET /notas-compra - listar todas las notas de compra
notaCompraRoutes.get(
	"/",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	listNotasCompraHandler,
);

// GET /notas-compra/:id - obtener nota de compra con detalle
notaCompraRoutes.get(
	"/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	getNotaCompraHandler,
);

// POST /notas-compra - crear nota de compra (con stock + kardex)
notaCompraRoutes.post(
	"/",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	createNotaCompraHandler,
);

// DELETE /notas-compra/:id - eliminar nota de compra (revierte stock)
notaCompraRoutes.delete(
	"/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	deleteNotaCompraHandler,
);

module.exports = notaCompraRoutes;
