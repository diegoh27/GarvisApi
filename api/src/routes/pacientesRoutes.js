const { Router } = require("express");
const {
	createPacienteHandler,
	listPacientesHandler,
	getPacienteByIdHandler,
	updatePacienteHandler,
	deletePacienteHandler,
	getPacienteSelfHandler,
	updatePacienteSelfHandler,
} = require("../handlers/pacientesHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const pacientesRoutes = Router();

// POST /pacientes
pacientesRoutes.post("/", createPacienteHandler);
// GET /pacientes/mi-perfil (paciente)
pacientesRoutes.get(
	"/mi-perfil",
	authenticateToken,
	authorizeRoles("paciente"),
	getPacienteSelfHandler,
);
// GET /pacientes (admin/moderador)
pacientesRoutes.get(
	"/",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	listPacientesHandler,
);
// PATCH /pacientes/mi-perfil (paciente)
pacientesRoutes.patch(
	"/mi-perfil",
	authenticateToken,
	authorizeRoles("paciente"),
	updatePacienteSelfHandler,
);
// GET /pacientes/:id (admin/moderador)
pacientesRoutes.get(
	"/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	getPacienteByIdHandler,
);
// PUT /pacientes/:id (admin/moderador)
pacientesRoutes.put(
	"/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	updatePacienteHandler,
);
// DELETE /pacientes/:id (admin/moderador)
pacientesRoutes.delete(
	"/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	deletePacienteHandler,
);

module.exports = pacientesRoutes;
