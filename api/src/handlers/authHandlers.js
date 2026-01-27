const {
	registerPaciente,
	loginUser,
} = require("../controllers/authControllers");

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
		});

		return res.status(201).json({
			ok: true,
			message: "Paciente registrado",
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

module.exports = {
	registerPacienteHandler,
	loginHandler,
};
