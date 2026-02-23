const { Router } = require("express");
const { getDolarOficialHandler } = require("../handlers/dolarHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const dolarRoutes = Router();

// GET /dolar/oficial
// Accesible para admin, moderador y paciente
dolarRoutes.get(
	"/oficial",
	authenticateToken,
	authorizeRoles("admin", "moderador", "paciente"),
	getDolarOficialHandler,
);

module.exports = dolarRoutes;
