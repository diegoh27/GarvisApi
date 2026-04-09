const { Router } = require("express");
const {
	uploadResultado,
	uploadResultadoHandler,
	listCitasSinResultadoHandler,
	listCitasAtendidasConResultadosHandler,
	listResultadosByPacienteHandler,
	deleteArchivoFromResultadoHandler,
} = require("../handlers/resultadosHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const resultadosRoutes = Router();

// GET /resultados/citas-sin-resultado (moderador/admin/especialista - especialista solo ve las suyas)
resultadosRoutes.get(
	"/citas-sin-resultado",
	authenticateToken,
	authorizeRoles("moderador", "admin", "especialista"),
	listCitasSinResultadoHandler,
);
// GET /resultados/citas-atendidas (moderador/admin) - Todas las citas atendidas con info de resultados
resultadosRoutes.get(
	"/citas-atendidas",
	authenticateToken,
	authorizeRoles("moderador", "admin", "especialista"),
	listCitasAtendidasConResultadosHandler,
);
// POST /resultados/upload (moderador/admin/especialista)
resultadosRoutes.post(
	"/upload",
	authenticateToken,
	authorizeRoles("moderador", "admin", "especialista"),
	uploadResultado,
	uploadResultadoHandler,
);
// DELETE /resultados/:id_cita/archivo (moderador/admin/especialista - especialista solo sus citas)
resultadosRoutes.delete(
	"/:id_cita/archivo",
	authenticateToken,
	authorizeRoles("moderador", "admin", "especialista"),
	deleteArchivoFromResultadoHandler,
);
// GET /resultados/mis-resultados (paciente) - Obtener resultados del paciente autenticado
resultadosRoutes.get(
	"/mis-resultados",
	authenticateToken,
	authorizeRoles("paciente"),
	listResultadosByPacienteHandler,
);

module.exports = resultadosRoutes;
