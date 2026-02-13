const { Router } = require("express");
const {
	listMovimientosFacturacionHandler,
	getResumenFacturacionHandler,
} = require("../handlers/facturacionHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const facturacionRoutes = Router();

facturacionRoutes.use(authenticateToken);
facturacionRoutes.use(authorizeRoles("admin", "moderador"));

facturacionRoutes.get("/movimientos", listMovimientosFacturacionHandler);
facturacionRoutes.get("/resumen", getResumenFacturacionHandler);

module.exports = facturacionRoutes;
