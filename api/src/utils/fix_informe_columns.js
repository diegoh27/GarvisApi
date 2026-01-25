require("dotenv").config();
const { pool } = require("../db");

async function fixInformeColumns() {
	const connection = await pool.getConnection();
	try {
		console.log("🔧 Actualizando columnas de la tabla 'informe'...\n");

		// Cambiar firma_url a TEXT
		try {
			await connection.execute(`
        ALTER TABLE informe 
        MODIFY COLUMN firma_url TEXT NULL
      `);
			console.log("✅ Columna firma_url actualizada a TEXT");
		} catch (error) {
			console.log("⚠️  Error al actualizar firma_url:", error.message);
		}

		// Cambiar informe_pdf_url a VARCHAR(500) para URLs más largas
		try {
			await connection.execute(`
        ALTER TABLE informe 
        MODIFY COLUMN informe_pdf_url VARCHAR(500) NULL
      `);
			console.log("✅ Columna informe_pdf_url actualizada a VARCHAR(500)");
		} catch (error) {
			console.log("⚠️  Error al actualizar informe_pdf_url:", error.message);
		}

		console.log("\n✅ Proceso completado");
	} catch (error) {
		console.error("❌ Error:", error.message);
		throw error;
	} finally {
		connection.release();
		process.exit(0);
	}
}

fixInformeColumns();
