const { Router } = require("express");
const {
	createDisponibilidadHandler,
	createDisponibilidadBatchHandler,
	listMisDisponibilidadHandler,
	listPendientesHandler,
	approveDisponibilidadHandler,
	approveDisponibilidadBatchHandler,
	approveDisponibilidadPorCriteriosHandler,
	rejectDisponibilidadHandler,
	cancelDisponibilidadHandler,
	listPublicaHandler,
	closeDisponibilidadDiaHandler,
	listDisponibilidadesByFechaHandler,
	listDisponibilidadesByEspecialistaHandler,
} = require("../handlers/disponibilidadHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const disponibilidadRoutes = Router();

// GET /disponibilidad/publica?id_especialista=...&fecha=YYYY-MM-DD
disponibilidadRoutes.get("/publica", listPublicaHandler);

// Especialista: crear/listar sus bloques
disponibilidadRoutes.post(
	"/",
	authenticateToken,
	authorizeRoles("especialista"),
	createDisponibilidadHandler
);
disponibilidadRoutes.post(
	"/batch",
	authenticateToken,
	authorizeRoles("especialista"),
	createDisponibilidadBatchHandler
);
disponibilidadRoutes.get(
	"/mis-bloques",
	authenticateToken,
	authorizeRoles("especialista"),
	listMisDisponibilidadHandler
);
disponibilidadRoutes.patch(
	"/:id/cancelar",
	authenticateToken,
	authorizeRoles("especialista"),
	cancelDisponibilidadHandler
);

// Moderador: pendientes y aprobación/rechazo (rutas fijas antes de /:id)
disponibilidadRoutes.get(
	"/pendientes",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	listPendientesHandler
);
disponibilidadRoutes.post(
	"/aprobar-lote",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	approveDisponibilidadBatchHandler
);
disponibilidadRoutes.post(
	"/aprobar-por-criterios",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	approveDisponibilidadPorCriteriosHandler
);
disponibilidadRoutes.patch(
	"/:id/aprobar",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	approveDisponibilidadHandler
);
disponibilidadRoutes.patch(
	"/:id/rechazar",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	rejectDisponibilidadHandler
);
// Moderador/Admin: cerrar disponibilidad por dia
disponibilidadRoutes.post(
	"/cerrar-dia",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	closeDisponibilidadDiaHandler
);
// Moderador/Admin: obtener disponibilidades por fecha
disponibilidadRoutes.get(
	"/por-fecha",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	listDisponibilidadesByFechaHandler
);
// Moderador/Admin: obtener disponibilidades por especialista (aprobadas y pendientes)
disponibilidadRoutes.get(
	"/por-especialista",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	listDisponibilidadesByEspecialistaHandler
);

module.exports = disponibilidadRoutes;
