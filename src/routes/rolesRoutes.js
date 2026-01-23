const { Router } = require("express");
const {
	listRolesHandler,
	rolePermissionsHandler,
} = require("../handlers/rolesHandlers");

const rolesRoutes = Router();

// GET /roles
rolesRoutes.get("/", listRolesHandler);
// GET /roles/permisos
rolesRoutes.get("/permisos", rolePermissionsHandler);

module.exports = rolesRoutes;
