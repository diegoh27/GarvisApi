const { Router } = require("express");
const {
	listEspecialidadesHandler,
	createEspecialidadHandler,
	updateEspecialidadHandler,
	deleteEspecialidadHandler,
} = require("../handlers/especialidadesHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const especialidadesRoutes = Router();

// GET /especialidades (publico para llenar el select)
especialidadesRoutes.get("/", listEspecialidadesHandler);

// POST /especialidades (admin/moderador)
especialidadesRoutes.post(
	"/",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	createEspecialidadHandler,
);
// PUT /especialidades/:id (admin/moderador)
especialidadesRoutes.put(
	"/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	updateEspecialidadHandler,
);
// DELETE /especialidades/:id (admin/moderador)
especialidadesRoutes.delete(
	"/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador"),
	deleteEspecialidadHandler,
);

module.exports = especialidadesRoutes;
