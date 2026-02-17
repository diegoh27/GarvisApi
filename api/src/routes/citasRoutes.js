const { Router } = require("express");
const {
	createCitaHandler,
	asignarCitaCompletaHandler,
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
	createCitaMostradorHandler,
	getUltimoPacienteMostradorHandler,
	listCitasMostradorDisponiblesParaVincularHandler,
	vincularCitasMostradorHandler,
} = require("../handlers/citasHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");
const {
	uploadOrdenMedica,
	uploadOrdenMedicaHandler,
} = require("../handlers/uploadHandlers");

const citasRoutes = Router();

// POST /citas (paciente)
citasRoutes.post(
	"/",
	authenticateToken,
	authorizeRoles("paciente"),
	createCitaHandler,
);
// POST /citas/asignar (admin/moderador o paciente) - Asignar cita completa con pago y resultado
citasRoutes.post(
	"/asignar",
	authenticateToken,
	authorizeRoles("admin", "moderador", "paciente"),
	asignarCitaCompletaHandler,
);
// GET /citas/mostrador/ultimo-paciente (admin/moderador) - Último paciente mostrador por cédula
citasRoutes.get(
	"/mostrador/ultimo-paciente",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	getUltimoPacienteMostradorHandler,
);
// GET /citas/mostrador/disponibles-vincular (paciente) - Citas de mostrador por cédula que aún no están vinculadas
citasRoutes.get(
	"/mostrador/disponibles-vincular",
	authenticateToken,
	authorizeRoles("paciente"),
	listCitasMostradorDisponiblesParaVincularHandler,
);
// POST /citas/mostrador/vincular (paciente) - Asociar citas de mostrador a la cuenta del paciente
citasRoutes.post(
	"/mostrador/vincular",
	authenticateToken,
	authorizeRoles("paciente"),
	vincularCitasMostradorHandler,
);
// POST /citas/mostrador (admin/moderador) - Registrar cita ya pagada de mostrador
citasRoutes.post(
	"/mostrador",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	createCitaMostradorHandler,
);
// POST /citas/upload-orden-medica (admin/moderador/paciente) - Subir orden médica
citasRoutes.post(
	"/upload-orden-medica",
	authenticateToken,
	authorizeRoles("moderador", "admin", "paciente"),
	uploadOrdenMedica,
	uploadOrdenMedicaHandler,
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
// PATCH /citas/:id/atender (especialista/paciente o admin/moderador)
citasRoutes.patch(
	"/:id/atender",
	authenticateToken,
	authorizeRoles("especialista", "paciente", "admin", "moderador"),
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
