const { Router } = require("express");
const {
	listEcosHandler,
	createEcoHandler,
	updateEcoHandler,
	deleteEcoHandler,
} = require("../handlers/ecosHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const ecosRoutes = Router();

// GET /ecos (público)
ecosRoutes.get("/", listEcosHandler);

// POST /ecos (admin)
ecosRoutes.post(
	"/",
	authenticateToken,
	authorizeRoles("admin"),
	createEcoHandler,
);

// PUT /ecos/:id (admin)
ecosRoutes.put(
	"/:id",
	authenticateToken,
	authorizeRoles("admin"),
	updateEcoHandler,
);

// DELETE /ecos/:id (admin)
ecosRoutes.delete(
	"/:id",
	authenticateToken,
	authorizeRoles("admin"),
	deleteEcoHandler,
);

module.exports = ecosRoutes;
