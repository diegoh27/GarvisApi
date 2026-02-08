const { Router } = require("express");
const {
	userCreateHandler,
	listUsersHandler,
	getUserByIdHandler,
	updateUserHandler,
	getUserSelfHandler,
	updateUserSelfHandler,
	setUserActiveHandler,
} = require("../handlers/userHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const userRoutes = Router();

// GET /users (solo admin) - Listar usuarios con filtros
userRoutes.get(
	"/",
	authenticateToken,
	authorizeRoles("admin"),
	listUsersHandler,
);
userRoutes.post("/", userCreateHandler);
// GET /users/mi-perfil (admin)
userRoutes.get(
	"/mi-perfil",
	authenticateToken,
	authorizeRoles("admin"),
	getUserSelfHandler,
);
// PATCH /users/mi-perfil (admin)
userRoutes.patch(
	"/mi-perfil",
	authenticateToken,
	authorizeRoles("admin"),
	updateUserSelfHandler,
);
// GET /users/:id (solo admin)
userRoutes.get(
	"/:id",
	authenticateToken,
	authorizeRoles("admin"),
	getUserByIdHandler,
);
// PUT /users/:id (solo admin)
userRoutes.put(
	"/:id",
	authenticateToken,
	authorizeRoles("admin"),
	updateUserHandler,
);
// PATCH /users/:id/estado (solo admin)
userRoutes.patch(
	"/:id/estado",
	authenticateToken,
	authorizeRoles("admin"),
	setUserActiveHandler,
);

module.exports = userRoutes;
