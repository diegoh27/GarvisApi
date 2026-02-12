const { Router } = require("express");
const {
	listContratosHandler,
	getContratoHandler,
	createContratoHandler,
	updateContratoHandler,
	deleteContratoHandler,
	listHistorialPagosAlquilerHandler,
	listPagosContratoHandler,
	registrarPagoAlquilerHandler,
	updatePagoAlquilerHandler,
	deletePagoAlquilerHandler,
} = require("../handlers/alquilerHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const alquilerRoutes = Router();

alquilerRoutes.use(authenticateToken);
alquilerRoutes.use(authorizeRoles("admin", "moderador"));

// Contratos
alquilerRoutes.get("/contratos", listContratosHandler);
alquilerRoutes.get("/contratos/:idContrato", getContratoHandler);
alquilerRoutes.post("/contratos", createContratoHandler);
alquilerRoutes.put("/contratos/:idContrato", updateContratoHandler);
alquilerRoutes.delete("/contratos/:idContrato", deleteContratoHandler);

// Pagos
alquilerRoutes.get("/pagos/historial", listHistorialPagosAlquilerHandler);
alquilerRoutes.get("/contratos/:idContrato/pagos", listPagosContratoHandler);
alquilerRoutes.post(
	"/contratos/:idContrato/pagos",
	registrarPagoAlquilerHandler,
);
alquilerRoutes.put("/pagos/:idPago", updatePagoAlquilerHandler);
alquilerRoutes.delete("/pagos/:idPago", deletePagoAlquilerHandler);

module.exports = alquilerRoutes;
