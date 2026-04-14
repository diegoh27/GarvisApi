const { Router } = require("express");
const { listPagosGuardadosHandler, deletePagoGuardadoHandler } = require("../handlers/pagosGuardadosHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const pagosGuardadosRoutes = Router();

// GET /pagos-guardados/:id_paciente (paciente) — lista sus cuentas guardadas
pagosGuardadosRoutes.get(
	"/:id_paciente",
	authenticateToken,
	authorizeRoles("paciente"),
	listPagosGuardadosHandler,
);

// DELETE /pagos-guardados/:id_guardado (paciente) — elimina una cuenta guardada
pagosGuardadosRoutes.delete(
	"/:id_guardado",
	authenticateToken,
	authorizeRoles("paciente"),
	deletePagoGuardadoHandler,
);

module.exports = pagosGuardadosRoutes;
