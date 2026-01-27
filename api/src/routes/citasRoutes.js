const { Router } = require("express");
const {
	createCitaHandler,
	listCitasByPacienteHandler,
	listMisCitasCompletasHandler,
	listCitasByEspecialistaHandler,
	listCitasByEspecialistaSelfHandler,
	cancelCitaHandler,
	markCitaAtendidaHandler,
	listCitasPendientesPagoHandler,
	listCitasConPagosHandler,
	updateEstadoPagoHandler,
	listCitasByFechaHandler,
	getCitaByIdHandler,
	posponerCitaHandler,
	getAllCitasHandler,
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
// PATCH /citas/:id/posponer (admin/moderador)
citasRoutes.patch(
	"/:id/posponer",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	posponerCitaHandler,
);
// PATCH /citas/:id/atender (especialista)
citasRoutes.patch(
	"/:id/atender",
	authenticateToken,
	authorizeRoles("especialista"),
	markCitaAtendidaHandler,
);
// GET /citas/pendientes-pago (moderador/admin)
	citasRoutes.get(
		"/pendientes-pago",
		authenticateToken,
		authorizeRoles("moderador", "admin"),
		listCitasPendientesPagoHandler,
	);
// GET /citas/con-pagos (moderador/admin) - Todas las citas con pagos para verificación
	citasRoutes.get(
		"/con-pagos",
		authenticateToken,
		authorizeRoles("moderador", "admin"),
		listCitasConPagosHandler,
	);
// PATCH /citas/:id/estado-pago (moderador/admin)
citasRoutes.patch(
	"/:id/estado-pago",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	updateEstadoPagoHandler,
);
// GET /citas/por-fecha?fecha=YYYY-MM-DD (moderador/admin)
citasRoutes.get(
	"/por-fecha",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	listCitasByFechaHandler,
);
// GET /citas/todas (moderador/admin) - Todas las citas con información completa
citasRoutes.get(
	"/todas",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	getAllCitasHandler,
);
// GET /citas/mis-citas (paciente) - Todas las citas del paciente con información completa
citasRoutes.get(
	"/mis-citas",
	authenticateToken,
	authorizeRoles("paciente"),
	listMisCitasCompletasHandler,
);
// GET /citas/:id (moderador/admin/especialista/paciente)
	citasRoutes.get(
		"/:id",
		authenticateToken,
		authorizeRoles("moderador", "admin", "especialista", "paciente"),
		getCitaByIdHandler,
	);

module.exports = citasRoutes;
