const { Router } = require("express");
const {
	createCitaHandler,
	listCitasByPacienteHandler,
	listCitasByEspecialistaHandler,
	listCitasByEspecialistaSelfHandler,
	cancelCitaHandler,
	markCitaAtendidaHandler,
} = require("../handlers/citasHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const citasRoutes = Router();

// POST /citas (paciente)
citasRoutes.post(
	"/",
	authenticateToken,
	authorizeRoles("paciente"),
	createCitaHandler,
);
// GET /citas/paciente/:id (admin/moderador)
citasRoutes.get(
	"/paciente/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	listCitasByPacienteHandler,
);
// GET /citas/especialista/:id (admin/moderador)
citasRoutes.get(
	"/especialista/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	listCitasByEspecialistaHandler,
);
// GET /citas/mi-especialista (especialista)
citasRoutes.get(
	"/mi-especialista",
	authenticateToken,
	authorizeRoles("especialista"),
	listCitasByEspecialistaSelfHandler,
);
// PATCH /citas/:id/cancelar (admin/moderador)
citasRoutes.patch(
	"/:id/cancelar",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	cancelCitaHandler,
);
// PATCH /citas/:id/atender (especialista)
citasRoutes.patch(
	"/:id/atender",
	authenticateToken,
	authorizeRoles("especialista"),
	markCitaAtendidaHandler,
);

module.exports = citasRoutes;
