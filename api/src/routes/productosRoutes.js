const { Router } = require("express");
const {
	listProductosHandler,
	createProductoHandler,
	getProductoHandler,
	updateProductoHandler,
	deleteProductoHandler,
	registrarCompraProductoHandler,
	updateCompraProductoHandler,
	deleteCompraProductoHandler,
	listComprasProductoHandler,
	listHistorialComprasHandler,
	registrarAjusteStockHandler,
	listAjustesProductoHandler,
	listHistorialAjustesHandler,
	listHistorialConsumosHandler,
} = require("../handlers/productosHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const productosRoutes = Router();

// ==========================================
// CRUD PRODUCTOS
// ==========================================

// GET /productos - lista todos los productos
productosRoutes.get(
	"/",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	listProductosHandler,
);

// POST /productos - crear producto
productosRoutes.post(
	"/",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	createProductoHandler,
);

// GET /productos/:id - obtener un producto
productosRoutes.get(
	"/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	getProductoHandler,
);

// PATCH /productos/:id - actualizar producto
productosRoutes.patch(
	"/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	updateProductoHandler,
);

// DELETE /productos/:id - eliminar producto
productosRoutes.delete(
	"/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	deleteProductoHandler,
);

// ==========================================
// COMPRAS
// ==========================================

// POST /productos/:id/compras - registrar una compra (suma al stock)
productosRoutes.post(
	"/:id/compras",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	registrarCompraProductoHandler,
);

// PUT /productos/compras/:idCompra - actualizar una compra existente
productosRoutes.put(
	"/compras/:idCompra",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	updateCompraProductoHandler,
);

// DELETE /productos/compras/:idCompra - eliminar una compra
productosRoutes.delete(
	"/compras/:idCompra",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	deleteCompraProductoHandler,
);

// GET /productos/:id/compras - listar compras de un producto
productosRoutes.get(
	"/:id/compras",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	listComprasProductoHandler,
);

// GET /productos/compras/historial - historial de todas las compras
productosRoutes.get(
	"/compras/historial",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	listHistorialComprasHandler,
);

// ==========================================
// AJUSTES DE STOCK
// ==========================================

// POST /productos/:id/ajustes - registrar un ajuste de stock
productosRoutes.post(
	"/:id/ajustes",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	registrarAjusteStockHandler,
);

// GET /productos/:id/ajustes - listar ajustes de un producto
productosRoutes.get(
	"/:id/ajustes",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	listAjustesProductoHandler,
);

// GET /productos/ajustes/historial - historial de todos los ajustes
productosRoutes.get(
	"/ajustes/historial",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	listHistorialAjustesHandler,
);

// ==========================================
// CONSUMOS
// ==========================================

// GET /productos/consumos/historial - historial de consumos
productosRoutes.get(
	"/consumos/historial",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	listHistorialConsumosHandler,
);

module.exports = productosRoutes;
