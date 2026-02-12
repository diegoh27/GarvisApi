const { Router } = require("express");
const {
	listComisionesHandler,
	generarComisionesPendientesHandler,
	pagarComisionHandler,
} = require("../handlers/espComisionHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const espComisionRoutes = Router();

espComisionRoutes.use(authenticateToken);
espComisionRoutes.use(authorizeRoles("admin", "moderador"));

// GET /comisiones-especialistas?estado=Pendiente&id_especialista=...&limit=...
espComisionRoutes.get("/", listComisionesHandler);

// POST /comisiones-especialistas/generar
espComisionRoutes.post("/generar", generarComisionesPendientesHandler);

// POST /comisiones-especialistas/:idComision/pagar
espComisionRoutes.post("/:idComision/pagar", pagarComisionHandler);

module.exports = espComisionRoutes;
