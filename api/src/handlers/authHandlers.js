const {
	registerPaciente,
	loginUser,
	verifyEmail,
	resendVerificationEmail,
	requestPasswordReset,
	resetPassword,
	getWebBaseUrl,
} = require("../controllers/authControllers");

const wantsHtml = (req) =>
	req.headers.accept && req.headers.accept.includes("text/html");

const registerPacienteHandler = async (req, res) => {
	try {
		const {
			nombre,
			apellido,
			genero,
			cedula,
			correo,
			telefono,
			contrasena,
			fecha_nacimiento,
			tipo_sangre,
			descripcion,
			direccion,
			contacto_emergencia_nombre,
			contacto_emergencia_telefono,
			rif,
		} = req.body;

		const missing = [];
		if (!nombre) missing.push("nombre");
		if (!apellido) missing.push("apellido");
		if (!genero) missing.push("genero");
		if (!cedula) missing.push("cedula");
		if (!correo) missing.push("correo");
		if (!telefono) missing.push("telefono");
		if (!contrasena) missing.push("contrasena");
		if (!fecha_nacimiento) missing.push("fecha_nacimiento");
		if (!tipo_sangre) missing.push("tipo_sangre");
		if (!descripcion) missing.push("descripcion");

		if (missing.length) {
			return res.status(400).json({
				ok: false,
				message: "Faltan campos requeridos",
				missing,
			});
		}

		if (!["Masculino", "Femenino", "Otro"].includes(genero)) {
			return res.status(400).json({
				ok: false,
				message: "genero inválido (Masculino | Femenino | Otro)",
			});
		}

		const created = await registerPaciente({
			nombre,
			apellido,
			genero,
			cedula,
			correo,
			telefono,
			contrasena,
			fecha_nacimiento,
			tipo_sangre,
			descripcion,
			direccion,
			contacto_emergencia_nombre,
			contacto_emergencia_telefono,
			rif,
		});

		return res.status(201).json({
			ok: true,
			message: "Paciente registrado. Revisa tu correo para verificarlo",
			data: created,
		});
	} catch (err) {
		// Errores de duplicados con mensajes específicos
		if (err?.code === "DUPLICATE_EMAIL") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "DUPLICATE_CEDULA") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "DUPLICATE_RIF") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		if (err?.code === "DUPLICATE_NAME") {
			return res.status(409).json({
				ok: false,
				message: err.message,
			});
		}
		// Fallback para otros errores de duplicado de MySQL
		if (err?.code === "ER_DUP_ENTRY") {
			return res.status(409).json({
				ok: false,
				message: "Ya existe un usuario con esos datos",
			});
		}
		if (err?.code === "ROL_NOT_FOUND") {
			return res.status(400).json({
				ok: false,
				message: err.message,
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const loginHandler = async (req, res) => {
	try {
		const { correo, contrasena } = req.body;
		if (!correo || !contrasena) {
			return res.status(400).json({
				ok: false,
				message: "correo y contrasena son requeridos",
			});
		}

		const result = await loginUser({ correo, contrasena });
		return res.status(200).json({
			ok: true,
			message: "Login exitoso",
			...result,
		});
	} catch (err) {
		if (err?.code === "INVALID_CREDENTIALS") {
			return res.status(401).json({
				ok: false,
				message: "Credenciales inválidas",
			});
		}
		if (err?.code === "EMAIL_NOT_VERIFIED") {
			return res.status(403).json({
				ok: false,
				message: "Debes verificar tu correo antes de iniciar sesion",
			});
		}
		if (err?.code === "JWT_SECRET_MISSING") {
			return res.status(500).json({
				ok: false,
				message: "JWT_SECRET no configurado",
			});
		}
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const verifyEmailHandler = async (req, res) => {
	try {
		const { token } = req.query;
		await verifyEmail({ token: token ? String(token) : "" });
		if (wantsHtml(req)) {
			const webUrl = getWebBaseUrl();
			return res.redirect(302, `${webUrl}/auth/login?verified=1`);
		}
		return res.status(200).json({
			ok: true,
			message: "Correo verificado",
		});
	} catch (err) {
		const message = err?.message || "Token invalido";
		if (wantsHtml(req)) {
			const webUrl = getWebBaseUrl();
			const errorParam = encodeURIComponent(message);
			return res.redirect(
				302,
				`${webUrl}/auth/login?verified=0&error=${errorParam}`,
			);
		}
		return res.status(400).json({
			ok: false,
			message,
		});
	}
};

const isValidEmailFormat = (email) =>
	email && typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const forgotPasswordHandler = async (req, res) => {
	try {
		const { correo } = req.body;
		if (!correo) {
			return res.status(400).json({
				ok: false,
				message: "El correo electrónico es requerido",
			});
		}
		if (!isValidEmailFormat(correo)) {
			return res.status(400).json({
				ok: false,
				message: "Ingresa un correo electrónico válido",
			});
		}

		await requestPasswordReset({ correo });
		return res.status(200).json({
			ok: true,
			message:
				"Si tu correo está registrado, recibirás un correo con instrucciones para restablecer tu contraseña. Revisa tu bandeja de entrada y correo no deseado.",
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const resetPasswordHandler = async (req, res) => {
	try {
		const token = req.body.token || req.query.token;
		const contrasena = req.body.contrasena || req.body.password;
		await resetPassword({
			token: token ? String(token) : "",
			contrasena,
		});
		if (wantsHtml(req)) {
			const webUrl = getWebBaseUrl();
			return res.redirect(302, `${webUrl}/auth/login?passwordReset=1`);
		}
		return res.status(200).json({
			ok: true,
			message: "Contrasena actualizada",
		});
	} catch (err) {
		const message = err?.message || "Token invalido";
		if (wantsHtml(req)) {
			const webUrl = getWebBaseUrl();
			const errorParam = encodeURIComponent(message);
			return res.redirect(
				302,
				`${webUrl}/auth/login?passwordReset=0&error=${errorParam}`,
			);
		}
		return res.status(400).json({
			ok: false,
			message,
		});
	}
};

const resendVerificationHandler = async (req, res) => {
	try {
		const { correo } = req.body;
		if (!correo) {
			return res.status(400).json({
				ok: false,
				message: "correo es requerido",
			});
		}

		await resendVerificationEmail({ correo });
		return res.status(200).json({
			ok: true,
			message: "Si el correo existe, reenviamos la verificacion",
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const resetPasswordFormHandler = (req, res) => {
	const token = req.query.token ? String(req.query.token) : "";
	if (!token) {
		return res
			.status(400)
			.send("<h2>Token requerido</h2><p>Enlace invalido.</p>");
	}

	return res.send(`
    <h2>Restablecer contrasena</h2>
    <form method="POST" action="/auth/reset?token=${encodeURIComponent(token)}">
      <label>Nueva contrasena</label><br />
      <input type="password" name="contrasena" required />
      <button type="submit">Actualizar</button>
    </form>
  `);
};

module.exports = {
	registerPacienteHandler,
	loginHandler,
	verifyEmailHandler,
	resendVerificationHandler,
	forgotPasswordHandler,
	resetPasswordHandler,
	resetPasswordFormHandler,
};
