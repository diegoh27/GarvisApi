const { Router } = require("express");
const {
	listProveedoresHandler,
	getProveedorHandler,
	createProveedorHandler,
	updateProveedorHandler,
	deleteProveedorHandler,
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

module.exports = proveedoresRoutes;
