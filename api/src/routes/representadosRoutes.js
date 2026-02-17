const { Router } = require("express");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");
const {
	listRepresentadosHandler,
	createRepresentadoHandler,
	createRepresentadoPorCedulaTitularHandler,
	listParentescosHandler,
	updateRepresentadoHandler,
	deleteRepresentadoHandler,
} = require("../handlers/representadosHandlers");

const representadosRoutes = Router();

// GET /representados?page=1&limit=5&search=&parentesco=&genero= (paciente)
representadosRoutes.get(
	"/",
	authenticateToken,
	authorizeRoles("paciente"),
	listRepresentadosHandler,
);

// GET /representados/parentescos (paciente) - lista de parentescos para filtro
representadosRoutes.get(
	"/parentescos",
	authenticateToken,
	authorizeRoles("paciente"),
	listParentescosHandler,
);

// POST /representados (paciente)
representadosRoutes.post(
	"/",
	authenticateToken,
	authorizeRoles("paciente"),
	createRepresentadoHandler,
);

// POST /representados/crear-por-cedula-titular (admin/moderador) - Crear representado y asignarlo al titular por cédula (mostrador)
representadosRoutes.post(
	"/crear-por-cedula-titular",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	createRepresentadoPorCedulaTitularHandler,
);

// PUT /representados/:id (paciente)
representadosRoutes.put(
	"/:id",
	authenticateToken,
	authorizeRoles("paciente"),
	updateRepresentadoHandler,
);

// DELETE /representados/:id (paciente)
representadosRoutes.delete(
	"/:id",
	authenticateToken,
	authorizeRoles("paciente"),
	deleteRepresentadoHandler,
);

module.exports = representadosRoutes;
