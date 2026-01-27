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

// GET /resultados/citas-sin-resultado (moderador/admin/especialista)
// COMENTADO: Por los momentos especialista no sube resultados
// resultadosRoutes.get(
// 	"/citas-sin-resultado",
// 	authenticateToken,
// 	authorizeRoles("moderador", "admin", "especialista"),
// 	listCitasSinResultadoHandler,
// );
resultadosRoutes.get(
	"/citas-sin-resultado",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	listCitasSinResultadoHandler,
);
// GET /resultados/citas-atendidas (moderador/admin) - Todas las citas atendidas con info de resultados
resultadosRoutes.get(
	"/citas-atendidas",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	listCitasAtendidasConResultadosHandler,
);
// POST /resultados/upload (moderador/admin/especialista)
// COMENTADO: Por los momentos especialista no sube resultados
// resultadosRoutes.post(
// 	"/upload",
// 	authenticateToken,
// 	authorizeRoles("moderador", "admin", "especialista"),
// 	uploadResultado,
// 	uploadResultadoHandler,
// );
resultadosRoutes.post(
	"/upload",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	uploadResultado,
	uploadResultadoHandler,
);
// DELETE /resultados/:id_cita/archivo (moderador/admin) - Eliminar un archivo específico
resultadosRoutes.delete(
	"/:id_cita/archivo",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
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
