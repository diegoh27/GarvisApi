const { Router } = require("express");
const {
	createDisponibilidadHandler,
	listMisDisponibilidadHandler,
	listPendientesHandler,
	approveDisponibilidadHandler,
	rejectDisponibilidadHandler,
	cancelDisponibilidadHandler,
	listPublicaHandler,
	closeDisponibilidadDiaHandler,
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
disponibilidadRoutes.get(
	"/mis-bloques",
	authenticateToken,
	authorizeRoles("especialista"),
	listMisDisponibilidadHandler,
);
disponibilidadRoutes.patch(
	"/:id/cancelar",
	authenticateToken,
	authorizeRoles("especialista"),
	cancelDisponibilidadHandler,
);

// Moderador: pendientes y aprobación/rechazo
disponibilidadRoutes.get(
	"/pendientes",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	listPendientesHandler,
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
// Moderador/Admin: cerrar disponibilidad por dia
disponibilidadRoutes.post(
	"/cerrar-dia",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	closeDisponibilidadDiaHandler,
);

module.exports = disponibilidadRoutes;
