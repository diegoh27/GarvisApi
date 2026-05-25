const { pool } = require("../db");
const { DB_NAME = "garvis" } = process.env;

const downloadBackup = async (req, res) => {
	try {
		// 1. Obtener la lista de tablas en la base de datos MySQL
		const [tables] = await pool.query(
			"SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ?",
			[DB_NAME]
		);

		if (!tables.length) {
			return res.status(404).json({
				ok: false,
				message: "No se encontraron tablas en la base de datos."
			});
		}

		let backupSql = "";
		backupSql += `-- ========================================================\n`;
		backupSql += `-- Respaldo Manual de Base de Datos - Sistema Garvis\n`;
		backupSql += `-- Generado: ${new Date().toLocaleString()}\n`;
		backupSql += `-- Base de datos: ${DB_NAME}\n`;
		backupSql += `-- ========================================================\n\n`;
		backupSql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

		for (const row of tables) {
			const tableName = row.TABLE_NAME;

			// 2. Obtener el DDL (CREATE TABLE)
			const [createTableRows] = await pool.query(`SHOW CREATE TABLE \`${tableName}\``);
			if (createTableRows.length) {
				const createSql = createTableRows[0]["Create Table"];
				backupSql += `-- --------------------------------------------------------\n`;
				backupSql += `-- Esquema de la tabla: \`${tableName}\`\n`;
				backupSql += `-- --------------------------------------------------------\n`;
				backupSql += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
				backupSql += `${createSql};\n\n`;
			}

			// 3. Obtener los registros de la tabla
			const [dataRows] = await pool.query(`SELECT * FROM \`${tableName}\``);
			if (dataRows.length) {
				backupSql += `-- --------------------------------------------------------\n`;
				backupSql += `-- Registros de la tabla: \`${tableName}\`\n`;
				backupSql += `-- --------------------------------------------------------\n`;
				
				const columns = Object.keys(dataRows[0]).map(col => `\`${col}\``).join(", ");
				
				for (const item of dataRows) {
					const values = Object.values(item).map(val => escapeValue(val)).join(", ");
					backupSql += `INSERT INTO \`${tableName}\` (${columns}) VALUES (${values});\n`;
				}
				backupSql += `\n`;
			}
		}

		backupSql += `SET FOREIGN_KEY_CHECKS = 1;\n`;

		// 4. Configurar headers de descarga
		const dateStr = new Date().toISOString().slice(0, 10);
		const timestamp = Date.now();
		const filename = `garvis_respaldo_${dateStr}_${timestamp}.sql`;
		
		res.setHeader("Content-Type", "application/sql");
		res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
		
		return res.send(backupSql);
	} catch (error) {
		console.error("❌ Error generando el respaldo de base de datos:", error);
		return res.status(500).json({
			ok: false,
			message: "Error al generar el respaldo de la base de datos: " + error.message
		});
	}
};

function escapeValue(val) {
	if (val === null || val === undefined) return "NULL";
	if (typeof val === "number") return val.toString();
	if (typeof val === "boolean") return val ? "1" : "0";
	if (val instanceof Date) {
		// Formatear fecha en formato estándar MySQL 'YYYY-MM-DD HH:MM:SS'
		const pad = (n) => String(n).padStart(2, '0');
		const yyyy = val.getFullYear();
		const mm = pad(val.getMonth() + 1);
		const dd = pad(val.getDate());
		const hh = pad(val.getHours());
		const min = pad(val.getMinutes());
		const ss = pad(val.getSeconds());
		return `'${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}'`;
	}
	if (Buffer.isBuffer(val)) return `X'${val.toString('hex')}'`;
	
	// Escape de strings en SQL
	const escaped = val.toString()
		.replace(/\\/g, '\\\\')
		.replace(/'/g, "\\'")
		.replace(/\r/g, '\\r')
		.replace(/\n/g, '\\n');
	return `'${escaped}'`;
}

module.exports = { downloadBackup };
