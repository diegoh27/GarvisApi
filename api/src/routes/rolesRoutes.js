const { Router } = require("express");
const {
	listRolesHandler,
	rolePermissionsHandler,
	getPermisosInventarioHandler,
	getPermisosInventarioModeradorHandler,
	updatePermisosInventarioModeradorHandler,
} = require("../handlers/rolesHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const rolesRoutes = Router();

// GET /roles
rolesRoutes.get("/", listRolesHandler);
// GET /roles/permisos
rolesRoutes.get("/permisos", rolePermissionsHandler);

// GET /roles/permisos-inventario (admin o moderador)
rolesRoutes.get(
	"/permisos-inventario",
	authenticateToken,
	getPermisosInventarioHandler,
);
// GET /roles/permisos-inventario-moderador (solo admin - para pantalla de config)
rolesRoutes.get(
	"/permisos-inventario-moderador",
	authenticateToken,
	authorizeRoles("admin"),
	getPermisosInventarioModeradorHandler,
);
// PUT /roles/permisos-inventario-moderador (solo admin)
rolesRoutes.put(
	"/permisos-inventario-moderador",
	authenticateToken,
	authorizeRoles("admin"),
	updatePermisosInventarioModeradorHandler,
);

module.exports = rolesRoutes;
