const { Router } = require("express");
const {
	listProveedoresHandler,
	getProveedorHandler,
	createProveedorHandler,
	updateProveedorHandler,
	deleteProveedorHandler,
	getCatalogoGlobalHandler,
	getCatalogoHandler,
	asociarCatalogoHandler,
	updateCatalogoHandler,
	deleteCatalogoHandler,
} = require("../handlers/proveedoresHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const proveedoresRoutes = Router();

// GET /proveedores - listar todos los proveedores
proveedoresRoutes.get(
	"/",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	listProveedoresHandler,
);

// POST /proveedores - crear proveedor
proveedoresRoutes.post(
	"/",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	createProveedorHandler,
);

// GET /proveedores/catalogo-global - obtener todo el catalogo (Debe ir antes de /:id)
proveedoresRoutes.get(
	"/catalogo-global",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	getCatalogoGlobalHandler,
);

// GET /proveedores/:id - obtener un proveedor
proveedoresRoutes.get(
	"/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	getProveedorHandler,
);

// PATCH /proveedores/:id - actualizar proveedor
proveedoresRoutes.patch(
	"/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	updateProveedorHandler,
);

// DELETE /proveedores/:id - eliminar proveedor
proveedoresRoutes.delete(
	"/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	deleteProveedorHandler,
);

// ==========================================
// CATÁLOGO
// ==========================================

// ==========================================

proveedoresRoutes.get(
	"/:id/catalogo",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	getCatalogoHandler,
);

proveedoresRoutes.post(
	"/:id/catalogo",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	asociarCatalogoHandler,
);

proveedoresRoutes.patch(
	"/:id/catalogo/:idRelacion",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	updateCatalogoHandler,
);

proveedoresRoutes.delete(
	"/:id/catalogo/:idRelacion",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	deleteCatalogoHandler,
);

module.exports = proveedoresRoutes;
