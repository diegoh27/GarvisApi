require("dotenv").config();
const { pool } = require("../db");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

/**
 * Verifica si la base de datos está vacía (sin tablas)
 */
async function isDatabaseEmpty() {
	try {
		const [tables] = await pool.execute(
			"SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ?",
			[process.env.DB_NAME || "garvis"],
		);
		return tables[0].count === 0;
	} catch (error) {
		console.error(
			"❌ Error verificando si la base de datos está vacía:",
			error.message,
		);
		return false;
	}
}

/**
 * Crea todas las tablas leyendo el archivo SQL
 */
async function createTables() {
	try {
		const sqlPath = path.join(__dirname, "tables_without_db.sql");

		if (!fs.existsSync(sqlPath)) {
			console.error(`❌ Archivo SQL no encontrado: ${sqlPath}`);
			return false;
		}

		const sqlContent = fs.readFileSync(sqlPath, "utf8");

		// Limpiar el contenido SQL: remover comentarios de bloque y líneas
		let cleanedSQL = sqlContent
			.replace(/\/\*[\s\S]*?\*\//g, "") // Remover comentarios /* */
			.replace(/--.*$/gm, "") // Remover comentarios de línea --
			.replace(/^\s*$/gm, ""); // Remover líneas vacías

		// Dividir por punto y coma, pero mantener statements completos
		const statements = cleanedSQL
			.split(";")
			.map((stmt) => stmt.trim())
			.filter(
				(stmt) => stmt.length > 0 && !stmt.toLowerCase().startsWith("use "),
			);

		console.log("📦 Creando tablas...");
		let successCount = 0;
		let errorCount = 0;

		for (const statement of statements) {
			if (statement.length > 10) {
				// Solo ejecutar statements significativos
				try {
					await pool.execute(statement);
					successCount++;
				} catch (err) {
					// Ignorar errores de "table already exists" si usamos CREATE TABLE IF NOT EXISTS
					if (
						err.message.includes("already exists") ||
						err.message.includes("Duplicate") ||
						(err.message.includes("Table") &&
							!err.message.includes("doesn't exist"))
					) {
						// Error esperado, continuar
						successCount++;
					} else {
						errorCount++;
						console.warn(
							`⚠️  Advertencia al ejecutar statement: ${err.message.substring(
								0,
								100,
							)}`,
						);
					}
				}
			}
		}

		if (errorCount === 0 || successCount > 0) {
			console.log(
				`✅ Tablas creadas exitosamente (${successCount} statements ejecutados)`,
			);
			return true;
		} else {
			console.error(`❌ Error creando tablas: ${errorCount} errores`);
			return false;
		}
	} catch (error) {
		console.error("❌ Error creando tablas:", error.message);
		return false;
	}
}

/**
 * Crea o obtiene un rol
 */
async function getOrCreateRole(nombre) {
	const [rows] = await pool.execute(
		"SELECT id_rol FROM roles WHERE nombre = ? LIMIT 1",
		[nombre],
	);
	if (rows.length) return rows[0].id_rol;

	const id_rol = crypto.randomUUID();
	await pool.execute("INSERT INTO roles (id_rol, nombre) VALUES (?, ?)", [
		id_rol,
		nombre,
	]);
	return id_rol;
}

/**
 * Crea un usuario
 */
async function createUsuario({
	nombre,
	apellido,
	genero,
	cedula,
	correo,
	telefono,
	fecha_nacimiento,
	id_rol,
	contrasena,
}) {
	const id_usuario = crypto.randomUUID();
	const hashedPassword = await bcrypt.hash(contrasena, 10);

	await pool.execute(
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
}

/**
 * Seeder básico: roles, 2 admins y 2 moderadores
 */
async function seedBasicData() {
	try {
		console.log("🌱 Iniciando seeder básico...");

		// Crear roles
		console.log("📝 Creando roles...");
		const adminRole = await getOrCreateRole("admin");
		const moderadorRole = await getOrCreateRole("moderador");
		const especialistaRole = await getOrCreateRole("especialista");
		const pacienteRole = await getOrCreateRole("paciente");
		console.log("✅ Roles creados");

		// Contraseña por defecto para entorno de pruebas
		const defaultPassword = "test123";

		// Crear 2 administradores
		console.log("👤 Creando administradores...");
		const admin1 = await createUsuario({
			nombre: "Admin",
			apellido: "Principal",
			genero: "Otro",
			cedula: "V-00000001",
			correo: "admin1@garbis.com",
			telefono: "0412-0000001",
			fecha_nacimiento: "1990-01-01",
			id_rol: adminRole,
			contrasena: defaultPassword,
		});

		const admin2 = await createUsuario({
			nombre: "Admin",
			apellido: "Secundario",
			genero: "Otro",
			cedula: "V-00000002",
			correo: "admin2@garbis.com",
			telefono: "0412-0000002",
			fecha_nacimiento: "1990-01-01",
			id_rol: adminRole,
			contrasena: defaultPassword,
		});
		console.log("✅ Administradores creados");

		// Crear 2 moderadores
		console.log("👤 Creando moderadores...");
		const moderador1 = await createUsuario({
			nombre: "Moderador",
			apellido: "Uno",
			genero: "Masculino",
			cedula: "V-00000003",
			correo: "moderador1@garbis.com",
			telefono: "0412-0000003",
			fecha_nacimiento: "1992-01-01",
			id_rol: moderadorRole,
			contrasena: defaultPassword,
		});

		const moderador2 = await createUsuario({
			nombre: "Moderador",
			apellido: "Dos",
			genero: "Femenino",
			cedula: "V-00000004",
			correo: "moderador2@garbis.com",
			telefono: "0412-0000004",
			fecha_nacimiento: "1993-01-01",
			id_rol: moderadorRole,
			contrasena: defaultPassword,
		});
		console.log("✅ Moderadores creados");

		// Crear 2 pacientes
		console.log("👤 Creando pacientes...");
		const paciente1 = await createUsuario({
			nombre: "Paciente",
			apellido: "Uno",
			genero: "Femenino",
			cedula: "V-00000005",
			correo: "paciente1@garbis.com",
			telefono: "0412-0000005",
			fecha_nacimiento: "1995-01-15",
			id_rol: pacienteRole,
			contrasena: defaultPassword,
		});

		const paciente2 = await createUsuario({
			nombre: "Paciente",
			apellido: "Dos",
			genero: "Masculino",
			cedula: "V-00000006",
			correo: "paciente2@garbis.com",
			telefono: "0412-0000006",
			fecha_nacimiento: "1996-02-20",
			id_rol: pacienteRole,
			contrasena: defaultPassword,
		});

		const paciente3 = await createUsuario({
			nombre: "Diego",
			apellido: "Briceno",
			genero: "Masculino",
			cedula: "V-28025174",
			correo: "zulfarrak092700@gmail.com",
			telefono: "0412-0251740",
			fecha_nacimiento: "2000-07-27",
			id_rol: pacienteRole,
			contrasena: defaultPassword,
		});
		console.log("✅ Pacientes creados");

		// Crear 2 especialistas
		console.log("👨‍⚕️ Creando especialistas...");
		const especialista1 = await createUsuario({
			nombre: "Especialista",
			apellido: "Uno",
			genero: "Femenino",
			cedula: "V-00000007",
			correo: "especialista1@garbis.com",
			telefono: "0412-0000007",
			fecha_nacimiento: "1988-03-10",
			id_rol: especialistaRole,
			contrasena: defaultPassword,
		});

		const especialista2 = await createUsuario({
			nombre: "Especialista",
			apellido: "Dos",
			genero: "Masculino",
			cedula: "V-00000008",
			correo: "especialista2@garbis.com",
			telefono: "0412-0000008",
			fecha_nacimiento: "1987-04-22",
			id_rol: especialistaRole,
			contrasena: defaultPassword,
		});
		console.log("✅ Especialistas creados");

		await seedExtendedData({
			adminId: admin1,
			moderadorId: moderador1,
			pacienteIds: [paciente1, paciente2, paciente3],
			especialistaIds: [especialista1, especialista2],
		});
		console.log("✅ Datos extendidos creados");

		console.log("\n📋 Credenciales de acceso:");
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		console.log("🔑 Contraseña por defecto: test123");
		console.log("\n👨‍💼 Administradores:");
		console.log(`   • admin1@garbis.com (${defaultPassword})`);
		console.log(`   • admin2@garbis.com (${defaultPassword})`);
		console.log("\n👥 Moderadores:");
		console.log(`   • moderador1@garbis.com (${defaultPassword})`);
		console.log(`   • moderador2@garbis.com (${defaultPassword})`);
		console.log("\n🧪 Nuevos usuarios de prueba:");
		console.log(`   • paciente1@garbis.com (${defaultPassword})`);
		console.log(`   • paciente2@garbis.com (${defaultPassword})`);
		console.log(`   • zulfarrak092700@gmail.com (${defaultPassword})`);
		console.log(`   • especialista1@garbis.com (${defaultPassword})`);
		console.log(`   • especialista2@garbis.com (${defaultPassword})`);
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

		return true;
	} catch (error) {
		console.error("❌ Error en seeder básico:", error.message);
		return false;
	}
}

async function seedExtendedData({
	adminId,
	moderadorId,
	pacienteIds,
	especialistaIds,
}) {
	// Solo datos mínimos: especialidades, pacientes, especialistas, ecos (sin citas, sin fechas inyectadas, sin inventario, sin representados)

	const [especialidad1, especialidad2] = [
		crypto.randomUUID(),
		crypto.randomUUID(),
	];
	await pool.execute(
		`INSERT INTO especialidad (id_especialidad, nombre) VALUES (?, ?), (?, ?)`,
		[especialidad1, "Cardiología", especialidad2, "Radiología"],
	);

	await pool.execute(
		`INSERT INTO paciente
			(id_paciente, tipo_sangre, descripcion, direccion, rif, email_verificado, fecha_verificacion, contacto_emergencia_nombre, contacto_emergencia_telefono)
		 VALUES
			(?, ?, ?, ?, ?, 1, NOW(), ?, ?),
			(?, ?, ?, ?, ?, 1, NOW(), ?, ?),
			(?, ?, ?, ?, ?, 0, NULL, ?, ?)`,
		[
			pacienteIds[0],
			"O+",
			"Paciente de prueba 1",
			"Av. Test 1",
			"J0000000001",
			"Contacto Uno",
			"04120000001",
			pacienteIds[1],
			"A+",
			"Paciente de prueba 2",
			"Av. Test 2",
			"J0000000002",
			"Contacto Dos",
			"04120000002",
			pacienteIds[2],
			"O+",
			"Paciente de prueba 3",
			"Av. Local 3",
			"V280251743",
			"Contacto Tres",
			"04120000003",
		],
	);

	await pool.execute(
		`INSERT INTO especialista
			(id_especialista, id_especialidad, codigo_colegiatura, porcentaje)
		 VALUES (?, ?, ?, ?), (?, ?, ?, ?)`,
		[
			especialistaIds[0],
			especialidad1,
			"COL-TEST-001",
			20,
			especialistaIds[1],
			especialidad2,
			"COL-TEST-002",
			25,
		],
	);

	const [eco1, eco2] = [crypto.randomUUID(), crypto.randomUUID()];
	await pool.execute(
		`INSERT INTO eco (id_eco, nombre, precio, duracion_min, activo)
		 VALUES (?, ?, ?, ?, 1), (?, ?, ?, ?, 1)`,
		[eco1, "Eco Doppler", 100, 30, eco2, "Eco Abdomen", 120, 40],
	);

	await pool.execute(
		`INSERT INTO especialista_eco (id_especialista, id_eco) VALUES (?, ?), (?, ?)`,
		[especialistaIds[0], eco1, especialistaIds[1], eco2],
	);
}

/**
 * Función principal de inicialización
 */
async function initDatabase() {
	try {
		console.log("\n🔍 Verificando estado de la base de datos...");

		const isEmpty = await isDatabaseEmpty();

		if (isEmpty) {
			console.log("📭 Base de datos vacía detectada. Inicializando...\n");

			// Crear tablas
			const tablesCreated = await createTables();
			if (!tablesCreated) {
				console.error(
					"❌ No se pudieron crear las tablas. Abortando inicialización.",
				);
				return false;
			}

			// Ejecutar seeder básico
			const seeded = await seedBasicData();
			if (!seeded) {
				console.error("❌ No se pudo ejecutar el seeder básico.");
				return false;
			}

			console.log("✅ Base de datos inicializada correctamente\n");
			return true;
		} else {
			console.log(
				"✅ Base de datos ya contiene tablas. Saltando inicialización.\n",
			);
			return true;
		}
	} catch (error) {
		console.error(
			"❌ Error en inicialización de base de datos:",
			error.message,
		);
		return false;
	}
}

module.exports = { initDatabase };
