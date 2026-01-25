const { Router } = require("express");
const {
	registerPacienteHandler,
	loginHandler,
} = require("../handlers/authHandlers");

const loginRoutes = Router();

// POST /auth/register (solo paciente)
loginRoutes.post("/register", registerPacienteHandler);

// POST /auth/login
loginRoutes.post("/login", loginHandler);

module.exports = loginRoutes;
