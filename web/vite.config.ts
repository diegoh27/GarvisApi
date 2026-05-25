import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import os from "os";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Detección y actualización automática de IP local
(() => {
	const getLocalIP = () => {
		const interfaces = os.networkInterfaces();
		for (const name of Object.keys(interfaces)) {
			for (const iface of interfaces[name] || []) {
				if (iface.family === "IPv4" && !iface.internal) {
					return iface.address;
				}
			}
		}
		return "localhost";
	};

	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	const envPath = path.join(__dirname, ".env");
	
	if (fs.existsSync(envPath)) {
		const localIP = getLocalIP();
		let content = fs.readFileSync(envPath, "utf8");
		let updated = false;

		// Buscar VITE_API_URL=http://... y actualizar el host con la IP local actual
		const regex = /^(VITE_API_URL=http[s]?:\/\/)([^:\/\s]+)(:\d+)?(.*)$/m;
		if (regex.test(content)) {
			content = content.replace(regex, (match, prefix, host, portPart, suffix) => {
				if (host !== localIP) {
					updated = true;
					return `${prefix}${localIP}${portPart || ""}${suffix}`;
				}
				return match;
			});
		}

		if (updated) {
			fs.writeFileSync(envPath, content, "utf8");
			console.log(`📡 [Garvis Frontend Startup] Dirección IP dinámica de API sincronizada a: ${localIP}`);
		}
	}
})();

export default defineConfig({
	plugins: [react()],
	server: {
		host: true,
		hmr: true
	},
	base: "/",
});
