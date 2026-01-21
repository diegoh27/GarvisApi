const { Router } = require("express");
const { userCreateHandler, prueba } = require("../handlers/userHandlers");

const userRoutes = Router();

userRoutes.get("/", prueba);
userRoutes.post("/", userCreateHandler);

module.exports = userRoutes;
