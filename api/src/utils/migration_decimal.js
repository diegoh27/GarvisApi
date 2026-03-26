require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const { pool } = require("../db");

async function run() {
	try {
		console.log("Iniciando migración a DECIMAL(12,4) para inventario...");
		
		await pool.execute("ALTER TABLE inv_producto MODIFY stock_actual DECIMAL(12,4) NOT NULL DEFAULT 0");
		console.log("OK: inv_producto");

		await pool.execute("ALTER TABLE inv_producto_compra MODIFY cantidad DECIMAL(12,4) NOT NULL");
		console.log("OK: inv_producto_compra");

		await pool.execute("ALTER TABLE inv_nota_compra_detalle MODIFY cantidad DECIMAL(12,4) NOT NULL");
		console.log("OK: inv_nota_compra_detalle");

		await pool.execute("ALTER TABLE inv_eco_insumo MODIFY cantidad DECIMAL(12,4) NOT NULL DEFAULT 1");
		console.log("OK: inv_eco_insumo");

		await pool.execute("ALTER TABLE inv_cita_consumo MODIFY cantidad DECIMAL(12,4) NOT NULL");
		console.log("OK: inv_cita_consumo");

		await pool.execute("ALTER TABLE inv_kardex MODIFY cantidad DECIMAL(12,4) NOT NULL;");
		await pool.execute("ALTER TABLE inv_kardex MODIFY stock_anterior DECIMAL(12,4) NOT NULL;");
		await pool.execute("ALTER TABLE inv_kardex MODIFY stock_posterior DECIMAL(12,4) NOT NULL;");
		console.log("OK: inv_kardex");

		console.log("Migración completada con éxito.");
	} catch (err) {
		console.error("Error en migración:", err);
	} process.exit(0);
}

run();
