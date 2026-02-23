const express = require("express");
const router = express.Router();
const {
	listEmpleadosHandler,
	getEmpleadoHandler,
	createEmpleadoHandler,
	updateEmpleadoHandler,
	deleteEmpleadoHandler,
	listHistorialPagosNominaHandler,
	listHistorialPagosEmpleadoHandler,
	registrarPagoNominaHandler,
	updatePagoNominaHandler,
	deletePagoNominaHandler,
} = require("../handlers/nominaHandlers");
const { authenticateToken } = require("../middleware/auth");

// Empleados
router.get("/empleados", listEmpleadosHandler);
router.get("/empleados/:idEmpleado", getEmpleadoHandler);
router.post("/empleados", authenticateToken, createEmpleadoHandler);
router.put("/empleados/:idEmpleado", authenticateToken, updateEmpleadoHandler);
router.delete(
	"/empleados/:idEmpleado",
	authenticateToken,
	deleteEmpleadoHandler,
);

// Pagos
router.get("/pagos/historial", listHistorialPagosNominaHandler);
router.get("/empleados/:idEmpleado/pagos", listHistorialPagosEmpleadoHandler);
router.post(
	"/empleados/:idEmpleado/pagos",
	authenticateToken,
	registrarPagoNominaHandler,
);
router.put("/pagos/:idPago", authenticateToken, updatePagoNominaHandler);
router.delete("/pagos/:idPago", authenticateToken, deletePagoNominaHandler);

module.exports = router;
