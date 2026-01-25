require("dotenv").config();
const mysql = require("mysql2/promise");
const crypto = require("crypto");

const {
	DB_HOST = "localhost",
	DB_USER = "root",
	DB_PASSWORD = "root",
	DB_NAME = "garvis",
	DB_PORT = 3306,
} = process.env;

const main = async () => {
	const conn = await mysql.createConnection({
		host: DB_HOST,
		user: DB_USER,
		password: DB_PASSWORD,
		database: DB_NAME,
		port: Number(DB_PORT),
	});

	const [espRows] = await conn.execute(
		"SELECT id_usuario FROM usuario WHERE correo = ? LIMIT 1",
		["especialista1.mks0rumg@garvis.com"],
	);
	const [pacRows] = await conn.execute(
		"SELECT id_usuario FROM usuario WHERE correo = ? LIMIT 1",
		["paciente1.mks0rumg@garvis.com"],
	);
	const [ecoRows] = await conn.execute("SELECT id_eco FROM eco LIMIT 1");

	const esp = espRows[0];
	const pac = pacRows[0];
	const eco = ecoRows[0];

	if (!esp || !pac || !eco) {
		console.log("Faltan ids", { esp, pac, eco });
		await conn.end();
		return;
	}

	const id_cita = crypto.randomUUID();
	const fecha = new Date().toISOString().slice(0, 10);
	const hora = "14:00:00";
	const orden = `ORD-EXTRA-${Date.now()}`;

	await conn.execute(
		`INSERT INTO cita
      (id_cita, id_paciente, id_representado, id_especialista, id_eco, fecha_cita, hora_cita, orden, id_disponibilidad, estado_cita, estado_pago)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, NULL, ?, ?)`,
		[id_cita, pac.id_usuario, esp.id_usuario, eco.id_eco, fecha, hora, orden, 1, 1],
	);

	console.log("✅ Cita extra creada", { id_cita, fecha, hora, orden });
	await conn.end();
};

main().catch((error) => {
	console.error("❌ Error al crear cita extra:", error.message);
	process.exit(1);
});
