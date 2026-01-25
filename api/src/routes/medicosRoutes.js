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
// POST /medicos (admin/moderador)
medicosRoutes.post(
	"/",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	createEspecialistaHandler,
);
// DELETE /medicos/:id (admin/moderador)
medicosRoutes.delete(
	"/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	deleteEspecialistaHandler,
);

// PUT /medicos/:id (admin/moderador)
medicosRoutes.put(
	"/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	updateEspecialistaHandler,
);

module.exports = medicosRoutes;
