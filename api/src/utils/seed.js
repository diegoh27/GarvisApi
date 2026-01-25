require("dotenv").config();
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const {
	DB_HOST = "localhost",
	DB_USER = "root",
	DB_PASSWORD = "root",
	DB_NAME = "garvis",
	DB_PORT = 3306,
} = process.env;

const toDate = (date) => date.toISOString().slice(0, 10);
const addDays = (base, days) => {
	const copy = new Date(base);
	copy.setDate(copy.getDate() + days);
	return copy;
};

const main = async () => {
	const connection = await mysql.createConnection({
		host: DB_HOST,
		user: DB_USER,
		password: DB_PASSWORD,
		database: DB_NAME,
		port: Number(DB_PORT),
	});

	const now = new Date();
	const suffix = now.getTime().toString(36);
	const seedPassword = "Garvis123!";
	const hashedPassword = await bcrypt.hash(seedPassword, 10);

	const getOrCreateRole = async (nombre) => {
		const [rows] = await connection.execute(
			"SELECT id_rol FROM roles WHERE nombre = ? LIMIT 1",
			[nombre],
		);
		if (rows.length) return rows[0].id_rol;
		const id_rol = crypto.randomUUID();
		await connection.execute(
			"INSERT INTO roles (id_rol, nombre) VALUES (?, ?)",
			[id_rol, nombre],
		);
		return id_rol;
	};

	const getOrCreateEspecialidad = async (nombre) => {
		const [rows] = await connection.execute(
			"SELECT id_especialidad FROM especialidad WHERE nombre = ? LIMIT 1",
			[nombre],
		);
		if (rows.length) return rows[0].id_especialidad;
		const id = crypto.randomUUID();
		await connection.execute(
			"INSERT INTO especialidad (id_especialidad, nombre) VALUES (?, ?)",
			[id, nombre],
		);
		return id;
	};

	const createUsuario = async ({
		nombre,
		apellido,
		genero,
		cedula,
		correo,
		telefono,
		fecha_nacimiento,
		id_rol,
	}) => {
		const id_usuario = crypto.randomUUID();
		await connection.execute(
			`INSERT INTO usuario
        (id_usuario, nombre, apellido, genero, cedula, correo, telefono, contrasena, activo, fecha_nacimiento, id_rol)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
			[
				id_usuario,
				nombre,
				apellido,
				genero,
				cedula,
				correo,
				telefono,
				hashedPassword,
				fecha_nacimiento,
				id_rol,
			],
		);
		return id_usuario;
	};

	const createPaciente = async (id_usuario) => {
		await connection.execute(
			`INSERT INTO paciente
        (id_paciente, tipo_sangre, descripcion, direccion, contacto_emergencia_nombre, contacto_emergencia_telefono)
       VALUES (?, ?, ?, ?, ?, ?)`,
			[
				id_usuario,
				"O+",
				"Sin antecedentes relevantes",
				"Av. Principal 123",
				"Maria Perez",
				"0424-0000000",
			],
		);
	};

	const createEspecialista = async (id_usuario, id_especialidad) => {
		await connection.execute(
			`INSERT INTO especialista (id_especialista, id_especialidad, codigo_colegiatura)
       VALUES (?, ?, ?)`,
			[id_usuario, id_especialidad, `COL-${Math.floor(Math.random() * 9000) + 1000}`],
		);
	};

	const createEco = async (nombre, precio) => {
		const id_eco = crypto.randomUUID();
		await connection.execute(
			`INSERT INTO eco (id_eco, nombre, precio, duracion_min, activo)
       VALUES (?, ?, ?, ?, 1)`,
			[id_eco, nombre, precio, 60],
		);
		return id_eco;
	};

	const createCita = async ({
		id_paciente,
		id_especialista,
		id_eco,
		fecha_cita,
		hora_cita,
		estado_cita,
		estado_pago,
		orden,
	}) => {
		const id_cita = crypto.randomUUID();
		await connection.execute(
			`INSERT INTO cita
        (id_cita, id_paciente, id_representado, id_especialista, id_eco, fecha_cita, hora_cita, orden, id_disponibilidad, estado_cita, estado_pago)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, NULL, ?, ?)`,
			[
				id_cita,
				id_paciente,
				id_especialista,
				id_eco,
				fecha_cita,
				hora_cita,
				orden,
				estado_cita,
				estado_pago,
			],
		);
		return id_cita;
	};

	const createResultado = async ({
		id_cita,
		id_especialista,
		archivo,
		estado_resultado,
	}) => {
		const id_resultado = crypto.randomUUID();
		await connection.execute(
			`INSERT INTO resultado
        (id_resultado, id_cita, id_especialista, nombre, archivo, estado_resultado, fecha_publicacion)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[
				id_resultado,
				id_cita,
				id_especialista,
				"Resultado eco",
				archivo,
				estado_resultado,
				estado_resultado === 2 ? new Date() : null,
			],
		);
	};

	try {
		const roles = await Promise.all([
			getOrCreateRole("admin"),
			getOrCreateRole("moderador"),
			getOrCreateRole("especialista"),
			getOrCreateRole("paciente"),
		]);
		const [adminRole, moderadorRole, especialistaRole, pacienteRole] = roles;

		const [ginecoId, cardioId] = await Promise.all([
			getOrCreateEspecialidad("Ginecologia"),
			getOrCreateEspecialidad("Radiologia"),
		]);

		const adminId = await createUsuario({
			nombre: "Admin",
			apellido: "Garvis",
			genero: "Otro",
			cedula: `V-${Math.floor(Math.random() * 9000000) + 1000000}`,
			correo: `admin.${suffix}@garvis.com`,
			telefono: "0412-1111111",
			fecha_nacimiento: "1990-01-15",
			id_rol: adminRole,
		});

		const moderadorId = await createUsuario({
			nombre: "Luisa",
			apellido: "Martinez",
			genero: "Femenino",
			cedula: `V-${Math.floor(Math.random() * 9000000) + 1000000}`,
			correo: `moderador.${suffix}@garvis.com`,
			telefono: "0412-2222222",
			fecha_nacimiento: "1992-04-10",
			id_rol: moderadorRole,
		});

		const especialistaA = await createUsuario({
			nombre: "Celianna",
			apellido: "Rodriguez",
			genero: "Femenino",
			cedula: `V-${Math.floor(Math.random() * 9000000) + 1000000}`,
			correo: `especialista1.${suffix}@garvis.com`,
			telefono: "0412-3333333",
			fecha_nacimiento: "1988-06-08",
			id_rol: especialistaRole,
		});
		await createEspecialista(especialistaA, ginecoId);

		const especialistaB = await createUsuario({
			nombre: "Martin",
			apellido: "Ramirez",
			genero: "Masculino",
			cedula: `V-${Math.floor(Math.random() * 9000000) + 1000000}`,
			correo: `especialista2.${suffix}@garvis.com`,
			telefono: "0412-4444444",
			fecha_nacimiento: "1985-02-20",
			id_rol: especialistaRole,
		});
		await createEspecialista(especialistaB, cardioId);

		const pacienteA = await createUsuario({
			nombre: "Andrea",
			apellido: "Rangel",
			genero: "Femenino",
			cedula: `V-${Math.floor(Math.random() * 9000000) + 1000000}`,
			correo: `paciente1.${suffix}@garvis.com`,
			telefono: "0412-5555555",
			fecha_nacimiento: "2001-09-12",
			id_rol: pacienteRole,
		});
		await createPaciente(pacienteA);

		const pacienteB = await createUsuario({
			nombre: "Jose",
			apellido: "Castro",
			genero: "Masculino",
			cedula: `V-${Math.floor(Math.random() * 9000000) + 1000000}`,
			correo: `paciente2.${suffix}@garvis.com`,
			telefono: "0412-6666666",
			fecha_nacimiento: "1999-11-03",
			id_rol: pacienteRole,
		});
		await createPaciente(pacienteB);

		const pacienteC = await createUsuario({
			nombre: "Maria",
			apellido: "Diaz",
			genero: "Femenino",
			cedula: `V-${Math.floor(Math.random() * 9000000) + 1000000}`,
			correo: `paciente3.${suffix}@garvis.com`,
			telefono: "0412-7777777",
			fecha_nacimiento: "2003-03-22",
			id_rol: pacienteRole,
		});
		await createPaciente(pacienteC);

		const ecoPelvico = await createEco("Eco Pelvico", 25.0);
		const ecoAbdominal = await createEco("Eco Abdominal", 30.0);

		const cita1 = await createCita({
			id_paciente: pacienteA,
			id_especialista: especialistaA,
			id_eco: ecoPelvico,
			fecha_cita: toDate(addDays(now, -5)),
			hora_cita: "09:00:00",
			estado_cita: 1,
			estado_pago: 1,
			orden: `ORD-${suffix}-001`,
		});

		const cita2 = await createCita({
			id_paciente: pacienteB,
			id_especialista: especialistaA,
			id_eco: ecoAbdominal,
			fecha_cita: toDate(addDays(now, -2)),
			hora_cita: "11:00:00",
			estado_cita: 1,
			estado_pago: 1,
			orden: `ORD-${suffix}-002`,
		});

		const cita3 = await createCita({
			id_paciente: pacienteA,
			id_especialista: especialistaA,
			id_eco: ecoAbdominal,
			fecha_cita: toDate(addDays(now, 2)),
			hora_cita: "14:00:00",
			estado_cita: 0,
			estado_pago: 0,
			orden: `ORD-${suffix}-003`,
		});

		const cita4 = await createCita({
			id_paciente: pacienteC,
			id_especialista: especialistaB,
			id_eco: ecoPelvico,
			fecha_cita: toDate(addDays(now, 4)),
			hora_cita: "16:00:00",
			estado_cita: 0,
			estado_pago: 0,
			orden: `ORD-${suffix}-004`,
		});

		await createResultado({
			id_cita: cita1,
			id_especialista: especialistaA,
			archivo: `https://example.com/resultados/${cita1}.pdf`,
			estado_resultado: 2,
		});

		await createResultado({
			id_cita: cita2,
			id_especialista: especialistaA,
			archivo: `https://example.com/resultados/${cita2}.pdf`,
			estado_resultado: 1,
		});

		console.log("✅ Seed completado");
		console.log("Usuarios creados:");
		console.log(`Admin: admin.${suffix}@garvis.com`);
		console.log(`Moderador: moderador.${suffix}@garvis.com`);
		console.log(`Especialista 1: especialista1.${suffix}@garvis.com`);
		console.log(`Especialista 2: especialista2.${suffix}@garvis.com`);
		console.log(`Pacientes: paciente1.${suffix}@garvis.com, paciente2.${suffix}@garvis.com, paciente3.${suffix}@garvis.com`);
		console.log(`Password común: ${seedPassword}`);
		console.log(`Citas creadas: 4`);
		console.log(`Resultados creados: 2`);
		console.log(`Admin id: ${adminId}`);
		console.log(`Moderador id: ${moderadorId}`);
	} catch (error) {
		console.error("❌ Error en seed:", error.message);
	} finally {
		await connection.end();
	}
};

main();
