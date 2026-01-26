const bcrypt = require("bcryptjs");

async function generateHashes() {
	console.log("=== Generador de Hashes para Usuarios ===\n");
	
	const passwords = {
		admin: "admin123",
		moderador: "admin123"
	};
	
	for (const [rol, password] of Object.entries(passwords)) {
		const hash = await bcrypt.hash(password, 10);
		console.log(`Rol: ${rol}`);
		console.log(`Contraseña: ${password}`);
		console.log(`Hash bcrypt: ${hash}`);
		console.log(`\nSQL para actualizar:\nUPDATE usuario SET contrasena = '${hash}' WHERE correo LIKE '%${rol}@garvis.com';\n`);
		console.log("---\n");
	}
	
	console.log("✅ Hashes generados. Copia los hashes y úsalos en el script SQL.");
}

generateHashes();
