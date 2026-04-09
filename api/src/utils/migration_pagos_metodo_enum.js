require("dotenv").config({
	path: require("path").resolve(__dirname, "../../.env"),
});
const { pool } = require("../db");

/**
 * Amplía pagos.metodo con Binance, PayPal, EfectivoBs, EfectivoUSD (checkout web).
 */
async function run() {
	try {
		console.log("Migración: pagos.metodo ENUM ampliado...");
		await pool.execute(`
			ALTER TABLE pagos
			MODIFY metodo ENUM(
				'Transferencia','PagoMovil','Efectivo','Zelle','Otro',
				'Binance','PayPal','EfectivoBs','EfectivoUSD'
			) NOT NULL
		`);
		console.log("OK: pagos.metodo");
		console.log("Migración completada.");
	} catch (err) {
		console.error("Error en migración pagos.metodo:", err);
	}
	process.exit(0);
}

run();
