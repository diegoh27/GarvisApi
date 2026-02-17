const { Router } = require("express");
const {
	listEntesSimpleHandler,
	listEntesLegalesHandler,
	getEnteLegalHandler,
	createEnteLegalHandler,
	updateEnteLegalHandler,
	deleteEnteLegalHandler,
	listHistorialPagosEntesHandler,
	registrarPagoEnteLegalHandler,
	deletePagoEnteLegalHandler,
} = require("../handlers/entesLegalesHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const entesLegalesRoutes = Router();

// ==========================================
// ENTES LEGALES - CRUD
// ==========================================

// GET /entes-legales/lista - lista solo entes (para crear obligaciones)
entesLegalesRoutes.get(
	"/lista",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	listEntesSimpleHandler,
);

// GET /entes - lista todos los entes legales
entesLegalesRoutes.get(
	"/",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	listEntesLegalesHandler,
);

// POST /entes - crear ente legal
entesLegalesRoutes.post(
	"/",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	createEnteLegalHandler,
);

// GET /entes/pagos/historial - historial de pagos de todos los entes
entesLegalesRoutes.get(
	"/pagos/historial",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	listHistorialPagosEntesHandler,
);

// POST /entes/:id/pagos - registrar pago de un ente
entesLegalesRoutes.post(
	"/:id/pagos",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	registrarPagoEnteLegalHandler,
);

// DELETE /entes-legales/pagos/:idPago - eliminar un pago
entesLegalesRoutes.delete(
	"/pagos/:idPago",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	deletePagoEnteLegalHandler,
);

// GET /entes/:id - obtener un ente legal
entesLegalesRoutes.get(
	"/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	getEnteLegalHandler,
);

// PATCH /entes/:id - actualizar ente legal
entesLegalesRoutes.patch(
	"/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	updateEnteLegalHandler,
);

// DELETE /entes/:id - eliminar ente legal
entesLegalesRoutes.delete(
	"/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	deleteEnteLegalHandler,
);

module.exports = entesLegalesRoutes;
