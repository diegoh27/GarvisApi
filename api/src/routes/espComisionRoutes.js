const { Router } = require("express");
const {
	listComisionesHandler,
	generarComisionesPendientesHandler,
	pagarComisionHandler,
	editarPagoComisionHandler,
	deletePagoComisionHandler,
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

// PUT /comisiones-especialistas/:idComision/pago
espComisionRoutes.put("/:idComision/pago", editarPagoComisionHandler);

// DELETE /comisiones-especialistas/:idComision/pago
espComisionRoutes.delete("/:idComision/pago", deletePagoComisionHandler);

module.exports = espComisionRoutes;
