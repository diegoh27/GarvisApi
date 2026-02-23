const { Router } = require("express");
const {
	createEspecialistaHandler,
	listEspecialistasHandler,
	getEspecialistaByIdHandler,
	getEspecialistaSelfHandler,
	deleteEspecialistaHandler,
	updateEspecialistaHandler,
	updateEspecialistaSelfHandler,
} = require("../handlers/especialistasHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const medicosRoutes = Router();

// GET /medicos (publico)
medicosRoutes.get("/", listEspecialistasHandler);
// GET /medicos/mi-perfil (especialista)
medicosRoutes.get(
	"/mi-perfil",
	authenticateToken,
	authorizeRoles("especialista"),
	getEspecialistaSelfHandler,
);
// PATCH /medicos/mi-perfil (especialista)
medicosRoutes.patch(
	"/mi-perfil",
	authenticateToken,
	authorizeRoles("especialista"),
	updateEspecialistaSelfHandler,
);
// GET /medicos/:id (publico)
medicosRoutes.get("/:id", getEspecialistaByIdHandler);
// POST /medicos (solo admin)
medicosRoutes.post(
	"/",
	authenticateToken,
	authorizeRoles("admin"),
	createEspecialistaHandler,
);
// DELETE /medicos/:id (solo admin)
medicosRoutes.delete(
	"/:id",
	authenticateToken,
	authorizeRoles("admin"),
	deleteEspecialistaHandler,
);

// PUT /medicos/:id (solo admin)
medicosRoutes.put(
	"/:id",
	authenticateToken,
	authorizeRoles("admin"),
	updateEspecialistaHandler,
);

module.exports = medicosRoutes;
