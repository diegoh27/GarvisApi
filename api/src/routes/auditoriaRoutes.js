const { Router } = require("express");
const { getEventosHandler, getUsuariosConEventosHandler } = require("../handlers/auditoriaHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const auditoriaRoutes = Router();

// Solo admin y moderador pueden ver la auditoría
auditoriaRoutes.get(
	"/",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	getEventosHandler,
);

auditoriaRoutes.get(
	"/usuarios",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	getUsuariosConEventosHandler,
);

module.exports = auditoriaRoutes;
