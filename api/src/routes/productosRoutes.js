const { Router } = require("express");
const {
	listProductosHandler,
	createProductoHandler,
	createProductoLoteHandler,
	listLotesByProductoHandler,
	listHistorialLotesHandler,
	updateProductoLoteHandler,
	updateProductoHandler,
	getGastoProductosHandler,
} = require("../handlers/productosHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const productosRoutes = Router();

// GET /productos - lista productos con stock (producto + producto_lote)
productosRoutes.get(
	"/",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	listProductosHandler
);

// POST /productos - crear producto
productosRoutes.post(
	"/",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	createProductoHandler
);

// GET /productos/gasto?desde=YYYY-MM-DD&hasta=YYYY-MM-DD - gasto en compras por período
productosRoutes.get(
	"/gasto",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	getGastoProductosHandler
);

// GET /productos/historial-lotes - historial de lotes de compras (todos los productos)
productosRoutes.get(
	"/historial-lotes",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	listHistorialLotesHandler
);

// PATCH /productos/:id - actualizar producto
productosRoutes.patch(
	"/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	updateProductoHandler
);

// GET /productos/:id/lotes - listar lotes de un producto
productosRoutes.get(
	"/:id/lotes",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	listLotesByProductoHandler
);

// PATCH /productos/:id/lotes/:idLote - actualizar un lote
productosRoutes.patch(
	"/:id/lotes/:idLote",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	updateProductoLoteHandler
);

// POST /productos/:id/lotes - registrar entrada/lote para un producto
productosRoutes.post(
	"/:id/lotes",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	createProductoLoteHandler
);

module.exports = productosRoutes;
