require("dotenv").config();
const { pool, query } = require("../db");
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
			[process.env.DB_NAME || "garvis"]
		);
		return tables[0].count === 0;
	} catch (error) {
		console.error("❌ Error verificando si la base de datos está vacía:", error.message);
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
			.filter((stmt) => stmt.length > 0 && !stmt.toLowerCase().startsWith("use "));

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
						(err.message.includes("Table") && !err.message.includes("doesn't exist"))
					) {
						// Error esperado, continuar
						successCount++;
					} else {
						errorCount++;
						console.warn(`⚠️  Advertencia al ejecutar statement: ${err.message.substring(0, 100)}`);
					}
				}
			}
		}

		if (errorCount === 0 || successCount > 0) {
			console.log(`✅ Tablas creadas exitosamente (${successCount} statements ejecutados)`);
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
	const [rows] = await pool.execute("SELECT id_rol FROM roles WHERE nombre = ? LIMIT 1", [nombre]);
	if (rows.length) return rows[0].id_rol;

	const id_rol = crypto.randomUUID();
	await pool.execute("INSERT INTO roles (id_rol, nombre) VALUES (?, ?)", [id_rol, nombre]);
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
		[id_usuario, nombre, apellido, genero, cedula, correo, telefono, hashedPassword, fecha_nacimiento, id_rol]
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

		// Contraseña por defecto para usuarios de sistema
		const defaultPassword = "admin123";

		// Crear 2 administradores
		console.log("👤 Creando administradores...");
		const admin1 = await createUsuario({
			nombre: "Admin",
			apellido: "Principal",
			genero: "Otro",
			cedula: "V-00000001",
			correo: "admin1@garvis.com",
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
			correo: "admin2@garvis.com",
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
			correo: "moderador1@garvis.com",
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
			correo: "moderador2@garvis.com",
			telefono: "0412-0000004",
			fecha_nacimiento: "1993-01-01",
			id_rol: moderadorRole,
			contrasena: defaultPassword,
		});
		console.log("✅ Moderadores creados");

		console.log("\n📋 Credenciales de acceso:");
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		console.log("🔑 Contraseña por defecto: admin123");
		console.log("\n👨‍💼 Administradores:");
		console.log(`   • admin1@garvis.com (${defaultPassword})`);
		console.log(`   • admin2@garvis.com (${defaultPassword})`);
		console.log("\n👥 Moderadores:");
		console.log(`   • moderador1@garvis.com (${defaultPassword})`);
		console.log(`   • moderador2@garvis.com (${defaultPassword})`);
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

		return true;
	} catch (error) {
		console.error("❌ Error en seeder básico:", error.message);
		return false;
	}
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
				console.error("❌ No se pudieron crear las tablas. Abortando inicialización.");
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
			console.log("✅ Base de datos ya contiene tablas. Saltando inicialización.\n");
			return true;
		}
	} catch (error) {
		console.error("❌ Error en inicialización de base de datos:", error.message);
		return false;
	}
}

module.exports = { initDatabase };
