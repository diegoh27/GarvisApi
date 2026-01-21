const {
	createPacienteController,
} = require("../controllers/pacientesControllers");

const createPacienteHandler = async (req, res) => {
	try {
		const {
			nombre,
			apellido,
			genero,
			cedula,
			correo,
			telefono,
			contrasena, // opcional (nullable)
			fecha_nacimiento,
			tipo_sangre,
			descripcion,
			id_rol, // opcional si lo manejas
		} = req.body;

		// Validación mínima
		const missing = [];
		if (!nombre) missing.push("nombre");
		if (!apellido) missing.push("apellido");
		if (!genero) missing.push("genero");
		if (!cedula) missing.push("cedula");
		if (!correo) missing.push("correo");
		if (!telefono) missing.push("telefono");
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

		// Opcional: validar genero
		if (!["Masculino", "Femenino"].includes(genero)) {
			return res.status(400).json({
				ok: false,
				message: "genero inválido (Masculino | Femenino)",
			});
		}

		const created = await createPacienteController({
			nombre,
			apellido,
			genero,
			cedula,
			correo,
			telefono,
			contrasena: contrasena ?? null,
			fecha_nacimiento,
			tipo_sangre,
			descripcion,
			id_rol: id_rol ?? null,
		});

		return res.status(201).json({
			ok: true,
			message: "Paciente creado",
			data: created,
		});
	} catch (err) {
		// Errores típicos de MySQL: duplicados
		if (err?.code === "ER_DUP_ENTRY") {
			return res.status(409).json({
				ok: false,
				message: "Ya existe un usuario con esa cédula o correo",
			});
		}

		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

module.exports = { createPacienteHandler };
