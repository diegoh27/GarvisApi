/**
 * Añade id_ecos_json para una sola fila de solicitud con varios ecos.
 * node api/src/utils/migration_disponibilidad_solicitud_id_ecos_json.js
 */
require("dotenv").config({
	path: require("path").resolve(__dirname, "../../.env"),
});
const { pool } = require("../db");

async function run() {
	const conn = await pool.getConnection();
	try {
		console.log("Migración: disponibilidad_solicitud.id_ecos_json...");
		const [cols] = await conn.execute(
			`SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'disponibilidad_solicitud' AND COLUMN_NAME = 'id_ecos_json'`,
		);
		if (!cols.length) {
			await conn.execute(
				`ALTER TABLE disponibilidad_solicitud ADD COLUMN id_ecos_json JSON NULL AFTER id_eco`,
			);
		}
		console.log("OK");
	} catch (err) {
		console.error(err);
		process.exitCode = 1;
	} finally {
		conn.release();
	}
	process.exit(process.exitCode ?? 0);
}

run();
