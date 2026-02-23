const { Router } = require("express");
const {
	createModeradorHandler,
	listModeradoresHandler,
	getModeradorByIdHandler,
	updateModeradorHandler,
	deleteModeradorHandler,
	getModeradorSelfHandler,
	updateModeradorSelfHandler,
} = require("../handlers/moderadoresHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const moderadoresRoutes = Router();

// GET /moderadores (solo admin)
moderadoresRoutes.get(
	"/",
	authenticateToken,
	authorizeRoles("admin"),
	listModeradoresHandler,
);
// GET /moderadores/mi-perfil (moderador)
moderadoresRoutes.get(
	"/mi-perfil",
	authenticateToken,
	authorizeRoles("moderador"),
	getModeradorSelfHandler,
);
// PATCH /moderadores/mi-perfil (moderador)
moderadoresRoutes.patch(
	"/mi-perfil",
	authenticateToken,
	authorizeRoles("moderador"),
	updateModeradorSelfHandler,
);
// GET /moderadores/:id (solo admin)
moderadoresRoutes.get(
	"/:id",
	authenticateToken,
	authorizeRoles("admin"),
	getModeradorByIdHandler,
);
// POST /moderadores (solo admin)
moderadoresRoutes.post(
	"/",
	authenticateToken,
	authorizeRoles("admin"),
	createModeradorHandler,
);
// PUT /moderadores/:id (solo admin)
moderadoresRoutes.put(
	"/:id",
	authenticateToken,
	authorizeRoles("admin"),
	updateModeradorHandler,
);
// DELETE /moderadores/:id (solo admin)
moderadoresRoutes.delete(
	"/:id",
	authenticateToken,
	authorizeRoles("admin"),
	deleteModeradorHandler,
);

module.exports = moderadoresRoutes;
