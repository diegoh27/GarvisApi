require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const { pool } = require("../db");

async function run() {
	try {
		console.log("Iniciando migración de producto...");
		
		await pool.execute("ALTER TABLE inv_producto ADD COLUMN presentacion VARCHAR(50) NULL AFTER nombre");
		await pool.execute("ALTER TABLE inv_producto ADD COLUMN contenido DECIMAL(12,4) NOT NULL DEFAULT 1 AFTER presentacion");
		
		console.log("Columnas agregadas con éxito.");
	} catch (err) {
		console.error("Error en migración:", err);
	} process.exit(0);
}

run();
