require("dotenv").config();
const mysql = require("mysql2/promise");

const toBool = (value) =>
	String(value || "")
		.trim()
		.toLowerCase() === "true";

async function deleteDatabaseOnStartup() {
	const shouldDelete = toBool(process.env.RESET_DATABASE_ON_STARTUP);
	const isProduction = process.env.NODE_ENV === "production";
	const allowInProduction = toBool(process.env.ALLOW_DB_RESET_IN_PRODUCTION);

	if (!shouldDelete) {
		console.log(
			"⏭️ RESET_DATABASE_ON_STARTUP no está activo. No se borra la base al iniciar servidor.",
		);
		return;
	}

	if (isProduction && !allowInProduction) {
		console.log(
			"🛡️ NODE_ENV=production detectado. Se bloquea el borrado de BD (usa ALLOW_DB_RESET_IN_PRODUCTION=true solo si es intencional).",
		);
		return;
	}

	const {
		DB_HOST = "localhost",
		DB_USER = "root",
		DB_PASSWORD = "root",
		DB_NAME = "garvis",
		DB_PORT = 3306,
	} = process.env;

	let connection;

	try {
		connection = await mysql.createConnection({
			host: DB_HOST,
			user: DB_USER,
			password: DB_PASSWORD,
			port: Number(DB_PORT),
		});

		console.log(
			`⚠️ Borrando base de datos al iniciar servidor: ${DB_NAME} (NODE_ENV=${process.env.NODE_ENV || "undefined"})...`,
		);
		await connection.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
		await connection.query(
			`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
		);
		console.log(
			`✅ Base de datos '${DB_NAME}' reiniciada (DROP + CREATE) para el arranque.`,
		);
	} catch (error) {
		console.error("❌ Error al borrar la base de datos:", error.message);
		throw error;
	} finally {
		if (connection) {
			await connection.end();
		}
	}
}

if (require.main === module) {
	deleteDatabaseOnStartup().catch((error) => {
		console.error("❌ Error ejecutando deleteDataBase.js:", error.message);
		process.exit(1);
	});
}

module.exports = { deleteDatabaseOnStartup };
