const { Router } = require("express");
const {
	listRolesHandler,
	rolePermissionsHandler,
	getPermisosInventarioHandler,
	getPermisosInventarioModeradorHandler,
	updatePermisosInventarioModeradorHandler,
	getPermisosMenuHandler,
	getPermisosMenuModeradorHandler,
	updatePermisosMenuModeradorHandler,
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

// GET /roles/permisos-menu (solo moderador — sidebar)
rolesRoutes.get(
	"/permisos-menu",
	authenticateToken,
	authorizeRoles("moderador"),
	getPermisosMenuHandler,
);
// GET /roles/permisos-menu-moderador (solo admin — pantalla de permisos)
rolesRoutes.get(
	"/permisos-menu-moderador",
	authenticateToken,
	authorizeRoles("admin"),
	getPermisosMenuModeradorHandler,
);
// PUT /roles/permisos-menu-moderador (solo admin)
rolesRoutes.put(
	"/permisos-menu-moderador",
	authenticateToken,
	authorizeRoles("admin"),
	updatePermisosMenuModeradorHandler,
);

module.exports = rolesRoutes;
