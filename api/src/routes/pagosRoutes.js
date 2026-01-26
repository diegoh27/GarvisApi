const { Router } = require("express");
const { getPagoByCitaHandler } = require("../handlers/pagosHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const pagosRoutes = Router();

// GET /pagos/cita/:id_cita (moderador/admin)
pagosRoutes.get(
	"/cita/:id_cita",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	getPagoByCitaHandler,
);

module.exports = pagosRoutes;
