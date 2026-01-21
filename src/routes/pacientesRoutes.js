const { Router } = require("express");
const { createPacienteHandler } = require("../handlers/pacientesHandlers");

const pacientesRoutes = Router();

// POST /pacientes
pacientesRoutes.post("/", createPacienteHandler);

module.exports = pacientesRoutes;
