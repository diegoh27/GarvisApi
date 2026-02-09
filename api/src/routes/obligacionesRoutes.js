const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const {
	listObligacionesHandler,
	getObligacionHandler,
	createObligacionHandler,
	updateObligacionHandler,
	deleteObligacionHandler,
	registrarPagoObligacionHandler,
} = require("../handlers/obligacionesHandlers");

// Todas las rutas requieren autenticación y rol admin o moderador
router.use(authenticateToken);
router.use(authorizeRoles("admin", "moderador"));

// GET /obligaciones - Listar todas las obligaciones
router.get("/", listObligacionesHandler);

// GET /obligaciones/:id - Obtener una obligación específica
router.get("/:id", getObligacionHandler);

// POST /obligaciones - Crear nueva obligación
router.post("/", createObligacionHandler);

// POST /obligaciones/:id/pagar - Registrar pago de obligación
router.post("/:id/pagar", registrarPagoObligacionHandler);

// PATCH /obligaciones/:id - Actualizar obligación
router.patch("/:id", updateObligacionHandler);

// DELETE /obligaciones/:id - Eliminar obligación
router.delete("/:id", deleteObligacionHandler);

module.exports = router;
