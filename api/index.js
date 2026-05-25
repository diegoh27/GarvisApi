// Detección y actualización automática de IP local
(() => {
	const os = require("os");
	const fs = require("fs");
	const path = require("path");

	function getLocalIP() {
		const interfaces = os.networkInterfaces();
		for (const name of Object.keys(interfaces)) {
			for (const iface of interfaces[name] || []) {
				if (iface.family === "IPv4" && !iface.internal) {
					return iface.address;
				}
			}
		}
		return "localhost";
	}

	const envPath = path.join(__dirname, ".env");
	if (fs.existsSync(envPath)) {
		const localIP = getLocalIP();
		let content = fs.readFileSync(envPath, "utf8");
		let updated = false;

		const keysToUpdate = [
			"BASE_URL_SERVER",
			"UPLOADS_BASE_URL",
			"URL_BASE_FRONT",
			"APP_BASE_URL",
			"WEB_BASE_URL"
		];

		keysToUpdate.forEach(key => {
			const regex = new RegExp(`^(${key}=http[s]?:\\/\\/)([^:\\/\\s]+)(:\\d+)?(.*)$`, "m");
			if (regex.test(content)) {
				content = content.replace(regex, (match, prefix, host, portPart, suffix) => {
					const oldHost = host;
					if (oldHost !== localIP) {
						updated = true;
						return `${prefix}${localIP}${portPart || ""}${suffix}`;
					}
					return match;
				});
			}
		});

		if (updated) {
			fs.writeFileSync(envPath, content, "utf8");
			console.log(`📡 [Garvis API Startup] Dirección IP dinámica sincronizada a: ${localIP}`);
		}
	}
})();

require("dotenv").config();

const server = require("./src/app.js");
const { PORT } = process.env;

const { testConnection } = require("./src/db.js");
const {
	startCleanupDisponibilidad,
} = require("./src/jobs/cleanupDisponibilidad.js");
const { initDatabase } = require("./src/utils/initDatabase.js");
const { runMigrations } = require("./src/utils/migrations.js");
const { deleteDatabaseOnStartup } = require("./src/utils/deleteDataBase.js");

(async () => {
	try {
		await deleteDatabaseOnStartup();

		await testConnection();

		// Inicializar base de datos si está vacía
		await initDatabase();

		// Ejecutar migraciones para aplicar cambios en el esquema
		await runMigrations();

		startCleanupDisponibilidad();

		server.listen(PORT, () => {
			console.log("listening at port", PORT);
		});
	} catch (err) {
		console.error("❌ Error conectando a MySQL:", err.message);
		process.exit(1);
	}
})();
