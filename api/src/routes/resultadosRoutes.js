const { Router } = require("express");
const {
	uploadResultado,
	uploadResultadoHandler,
	listCitasSinResultadoHandler,
	listCitasAtendidasConResultadosHandler,
	deleteArchivoFromResultadoHandler,
} = require("../handlers/resultadosHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const resultadosRoutes = Router();

// GET /resultados/citas-sin-resultado (moderador/admin)
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
// POST /resultados/upload (moderador/admin)
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

module.exports = resultadosRoutes;
