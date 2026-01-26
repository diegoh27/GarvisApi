require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
// Si no encuentra el .env en api, intentar en la raíz del proyecto
if (!process.env.DB_HOST) {
	require("dotenv").config({ path: require("path").join(__dirname, "../../../.env") });
}
const { pool } = require("../db");
const fs = require("fs");
const path = require("path");

async function runMigration() {
	const conn = await pool.getConnection();
	try {
		console.log("🔄 Ejecutando migración: agregar id_eco a disponibilidad...");
		
		// Leer el script SQL
		const sqlPath = path.join(__dirname, "add_eco_to_disponibilidad.sql");
		const sql = fs.readFileSync(sqlPath, "utf-8");
		
		// Dividir en statements (separados por ;)
		const statements = sql
			.split(";")
			.map((s) => s.trim())
			.filter((s) => s.length > 0 && !s.startsWith("--"));
		
		await conn.beginTransaction();
		
		for (const statement of statements) {
			if (statement.trim()) {
				console.log(`  → Ejecutando: ${statement.substring(0, 50)}...`);
				try {
					await conn.execute(statement);
				} catch (err) {
					// Si el campo ya existe o el índice ya existe, continuar
					if (
						err.code === "ER_DUP_FIELDNAME" ||
						err.code === "ER_DUP_KEYNAME" ||
						err.code === "ER_DUP_KEY"
					) {
						console.log(`  ⚠️  ${err.code}: ${err.message}`);
						console.log("  → Continuando...");
					} else {
						throw err;
					}
				}
			}
		}
		
		await conn.commit();
		console.log("✅ Migración completada exitosamente");
	} catch (err) {
		await conn.rollback();
		console.error("❌ Error en la migración:", err.message);
		console.error(err);
		process.exit(1);
	} finally {
		conn.release();
		await pool.end();
	}
}

runMigration();
