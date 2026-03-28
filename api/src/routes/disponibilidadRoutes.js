const { Router } = require("express");
const {
	createDisponibilidadHandler,
	createDisponibilidadBatchHandler,
	createSolicitudMacroHandler,
	createSolicitudMacroManualHandler,
	listMisSolicitudesHandler,
	cancelSolicitudMacroHandler,
	approveSolicitudMacroHandler,
	rejectSolicitudMacroHandler,
	listMisDisponibilidadHandler,
	listPendientesHandler,
	listDisponibilidadesAdminHandler,
	approveDisponibilidadHandler,
	approveDisponibilidadBatchHandler,
	approveDisponibilidadPorCriteriosHandler,
	rejectDisponibilidadHandler,
	cancelDisponibilidadHandler,
	cancelDisponibilidadAdminHandler,
	cancelDisponibilidadBatchHandler,
	cancelDisponibilidadBatchEspecialistaHandler,
	listPublicaHandler,
	closeDisponibilidadDiaHandler,
	listDisponibilidadesByFechaHandler,
	listDisponibilidadesByEspecialistaHandler,
	deleteDisponibilidadPasadaHandler,
	deleteDisponibilidadPorCriteriosHandler,
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
	createDisponibilidadHandler,
);
disponibilidadRoutes.post(
	"/batch",
	authenticateToken,
	authorizeRoles("especialista"),
	createDisponibilidadBatchHandler,
);
disponibilidadRoutes.post(
	"/solicitud-macro",
	authenticateToken,
	authorizeRoles("especialista"),
	createSolicitudMacroHandler,
);
disponibilidadRoutes.post(
	"/solicitud-macro-manual",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	createSolicitudMacroManualHandler,
);
disponibilidadRoutes.get(
	"/mis-solicitudes",
	authenticateToken,
	authorizeRoles("especialista"),
	listMisSolicitudesHandler,
);
disponibilidadRoutes.patch(
	"/solicitud/:id/cancelar",
	authenticateToken,
	authorizeRoles("especialista"),
	cancelSolicitudMacroHandler,
);
disponibilidadRoutes.patch(
	"/solicitud/:id/aprobar",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	approveSolicitudMacroHandler,
);
disponibilidadRoutes.patch(
	"/solicitud/:id/rechazar",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	rejectSolicitudMacroHandler,
);
disponibilidadRoutes.get(
	"/mis-bloques",
	authenticateToken,
	authorizeRoles("especialista"),
	listMisDisponibilidadHandler,
);
disponibilidadRoutes.post(
	"/cancelar-mi-lote",
	authenticateToken,
	authorizeRoles("especialista"),
	cancelDisponibilidadBatchEspecialistaHandler,
);
disponibilidadRoutes.patch(
	"/:id/cancelar",
	authenticateToken,
	authorizeRoles("especialista"),
	cancelDisponibilidadHandler,
);

// Moderador: pendientes y aprobación/rechazo (rutas fijas antes de /:id)
disponibilidadRoutes.get(
	"/pendientes",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	listPendientesHandler,
);
disponibilidadRoutes.get(
	"/todas",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	listDisponibilidadesAdminHandler,
);
disponibilidadRoutes.post(
	"/aprobar-lote",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	approveDisponibilidadBatchHandler,
);
disponibilidadRoutes.post(
	"/aprobar-por-criterios",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	approveDisponibilidadPorCriteriosHandler,
);
disponibilidadRoutes.post(
	"/cancelar-lote",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	cancelDisponibilidadBatchHandler,
);
disponibilidadRoutes.post(
	"/eliminar-pasada",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	deleteDisponibilidadPasadaHandler,
);
disponibilidadRoutes.post(
	"/eliminar-por-criterios",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	deleteDisponibilidadPorCriteriosHandler,
);
disponibilidadRoutes.patch(
	"/:id/aprobar",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	approveDisponibilidadHandler,
);
disponibilidadRoutes.patch(
	"/:id/rechazar",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	rejectDisponibilidadHandler,
);
disponibilidadRoutes.patch(
	"/:id/cancelar-admin",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	cancelDisponibilidadAdminHandler,
);
// Moderador/Admin: cerrar disponibilidad por dia
disponibilidadRoutes.post(
	"/cerrar-dia",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	closeDisponibilidadDiaHandler,
);
// Moderador/Admin: obtener disponibilidades por fecha
disponibilidadRoutes.get(
	"/por-fecha",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	listDisponibilidadesByFechaHandler,
);
// Moderador/Admin: obtener disponibilidades por especialista (aprobadas y pendientes)
disponibilidadRoutes.get(
	"/por-especialista",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	listDisponibilidadesByEspecialistaHandler,
);

module.exports = disponibilidadRoutes;
