require("dotenv").config();

const server = require("./src/app.js");
const { PORT } = process.env;

const { testConnection } = require("./src/db.js");
const { startCleanupDisponibilidad } = require("./src/jobs/cleanupDisponibilidad.js");
const { initDatabase } = require("./src/utils/initDatabase.js");

(async () => {
	try {
		await testConnection();
		
		// Inicializar base de datos si está vacía
		await initDatabase();
		
		startCleanupDisponibilidad();

		server.listen(PORT, () => {
			console.log("listening at port", PORT);
		});
	} catch (err) {
		console.error("❌ Error conectando a MySQL:", err.message);
		process.exit(1);
	}
})();
