const { Router } = require("express");
const { getPagoByCitaHandler } = require("../handlers/pagosHandlers");
const { uploadComprobantePago, uploadComprobantePagoHandler } = require("../handlers/uploadHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const pagosRoutes = Router();

// GET /pagos/cita/:id_cita (moderador/admin/paciente)
pagosRoutes.get(
	"/cita/:id_cita",
	authenticateToken,
	authorizeRoles("moderador", "admin", "paciente"),
	getPagoByCitaHandler,
);

// POST /pagos/upload-comprobante (moderador/admin/paciente) - Subir imagen de comprobante de pago
pagosRoutes.post(
	"/upload-comprobante",
	authenticateToken,
	authorizeRoles("moderador", "admin", "paciente"),
	uploadComprobantePago,
	uploadComprobantePagoHandler,
);

module.exports = pagosRoutes;
