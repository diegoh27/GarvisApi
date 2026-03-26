const { Router } = require("express");
const { listKardexHandler } = require("../handlers/kardexHandlers");
const { authorizeRoles } = require("../middleware/authorizeRoles");
const { authenticateToken } = require("../middleware/auth");

const kardexRoutes = Router();

// Todas las rutas de inventario/kardex son privadas y solo para staff (admin, moderador)
kardexRoutes.use(authenticateToken);
kardexRoutes.use(authorizeRoles("admin", "moderador"));

kardexRoutes.get("/", listKardexHandler);

module.exports = kardexRoutes;
