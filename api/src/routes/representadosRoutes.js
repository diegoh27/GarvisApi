const { Router } = require("express");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");
const {
	listRepresentadosHandler,
	createRepresentadoHandler,
	listParentescosHandler,
} = require("../handlers/representadosHandlers");

const representadosRoutes = Router();

// GET /representados?page=1&limit=5&search=&parentesco=&genero= (paciente)
representadosRoutes.get(
	"/",
	authenticateToken,
	authorizeRoles("paciente"),
	listRepresentadosHandler
);

// GET /representados/parentescos (paciente) - lista de parentescos para filtro
representadosRoutes.get(
	"/parentescos",
	authenticateToken,
	authorizeRoles("paciente"),
	listParentescosHandler
);

// POST /representados (paciente)
representadosRoutes.post(
	"/",
	authenticateToken,
	authorizeRoles("paciente"),
	createRepresentadoHandler
);

module.exports = representadosRoutes;
