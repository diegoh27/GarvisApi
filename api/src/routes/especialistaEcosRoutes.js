const { Router } = require("express");
const {
	listEcosByEspecialistaHandler,
	asignarEcoHandler,
	quitarEcoHandler,
	listAllEcosWithEspecialistasHandler,
} = require("../handlers/especialistaEcosHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const especialistaEcosRoutes = Router();

// GET /especialista-ecos/:id - Obtener ecos de un especialista (admin/moderador/especialista)
// Los especialistas solo pueden ver sus propios ecos
especialistaEcosRoutes.get(
	"/:id",
	authenticateToken,
	authorizeRoles("admin", "moderador", "especialista"),
	listEcosByEspecialistaHandler,
);

// POST /especialista-ecos/asignar - Asignar eco a especialista (admin)
especialistaEcosRoutes.post(
	"/asignar",
	authenticateToken,
	authorizeRoles("admin"),
	asignarEcoHandler,
);

// DELETE /especialista-ecos/quitar - Quitar eco de especialista (admin)
especialistaEcosRoutes.delete(
	"/quitar",
	authenticateToken,
	authorizeRoles("admin"),
	quitarEcoHandler,
);

// GET /especialista-ecos/all - Listar todos los ecos con sus especialistas (admin)
especialistaEcosRoutes.get(
	"/all/with-especialistas",
	authenticateToken,
	authorizeRoles("admin"),
	listAllEcosWithEspecialistasHandler,
);

module.exports = especialistaEcosRoutes;
