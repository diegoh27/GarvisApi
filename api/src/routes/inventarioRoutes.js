const { Router } = require("express");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");
const { listInventarioAuditoriaHandler } = require("../handlers/invAuditoriaHandlers");

const inventarioRoutes = Router();

// GET /inventario/auditoria - Historial de acciones en inventario (admin/moderador)
inventarioRoutes.get(
	"/auditoria",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	listInventarioAuditoriaHandler,
);

module.exports = inventarioRoutes;
