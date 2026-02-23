const { Router } = require("express");
const {
	registerPacienteHandler,
	loginHandler,
	verifyEmailHandler,
	resendVerificationHandler,
	forgotPasswordHandler,
	resetPasswordHandler,
	resetPasswordFormHandler,
} = require("../handlers/authHandlers");

const loginRoutes = Router();

// POST /auth/register (solo paciente)
loginRoutes.post("/register", registerPacienteHandler);

// POST /auth/login
loginRoutes.post("/login", loginHandler);

// GET /auth/verify?token=...
loginRoutes.get("/verify", verifyEmailHandler);

// POST /auth/resend-verification
loginRoutes.post("/resend-verification", resendVerificationHandler);

// POST /auth/forgot
loginRoutes.post("/forgot", forgotPasswordHandler);

// GET /auth/reset?token=...
loginRoutes.get("/reset", resetPasswordFormHandler);

// POST /auth/reset
loginRoutes.post("/reset", resetPasswordHandler);

module.exports = loginRoutes;
