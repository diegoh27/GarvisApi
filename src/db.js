require("dotenv").config();
const mysql = require("mysql2/promise");

const {
	DB_HOST = "localhost",
	DB_USER = "root",
	DB_PASSWORD = "root",
	DB_NAME = "garvis",
	DB_PORT = 3306,
} = process.env;

const pool = mysql.createPool({
	host: DB_HOST,
	user: DB_USER,
	password: DB_PASSWORD,
	database: DB_NAME, // ojo: si no existe, dará error hasta que la crees
	port: Number(DB_PORT),
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
});

// Helper para queries con placeholders
async function query(sql, params = []) {
	const [rows] = await pool.execute(sql, params);
	return rows;
}

// Probar conexión (útil al arrancar)
async function testConnection() {
	await pool.query("SELECT 1");
	console.log("✅ MySQL conectado OK");
}

module.exports = {
	pool,
	query,
	testConnection,
};
