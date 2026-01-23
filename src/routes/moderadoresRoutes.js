const { Router } = require("express");
const {
	createModeradorHandler,
	listModeradoresHandler,
	getModeradorByIdHandler,
	updateModeradorHandler,
	deleteModeradorHandler,
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
