const { Router } = require("express");
const {
	listMisNotificacionesHandler,
	markNotificacionLeidaHandler,
	markTodasNotificacionesLeidasHandler,
} = require("../handlers/notificacionesHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const notificacionesRoutes = Router();

// GET /notificaciones/mis
// GET /notificaciones/mis
notificacionesRoutes.get(
	"/mis",
	authenticateToken,
	authorizeRoles("paciente", "especialista", "moderador", "admin"),
	listMisNotificacionesHandler,
);

// PATCH /notificaciones/leer-todas
notificacionesRoutes.patch(
	"/leer-todas",
	authenticateToken,
	authorizeRoles("paciente", "especialista", "moderador", "admin"),
	markTodasNotificacionesLeidasHandler,
);

// PATCH /notificaciones/:id/leer
notificacionesRoutes.patch(
	"/:id/leer",
	authenticateToken,
	authorizeRoles("paciente", "especialista", "moderador", "admin"),
	markNotificacionLeidaHandler,
);

module.exports = notificacionesRoutes;
