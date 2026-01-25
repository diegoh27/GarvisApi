const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });
const { pool } = require(path.join(__dirname, "../db"));

async function createInformeTable() {
	const connection = await pool.getConnection();
	try {
		console.log("🔍 Verificando si la tabla 'informe' existe...");

		// Verificar si la tabla existe
		const [tables] = await connection.execute(
			`SELECT TABLE_NAME 
       FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'informe'`,
			[process.env.DB_NAME || "garvis"]
		);

		if (tables.length > 0) {
			console.log("✅ La tabla 'informe' ya existe");
			return;
		}

		console.log("📝 Creando tabla 'informe'...");

		// Crear la tabla
		await connection.execute(`
      CREATE TABLE IF NOT EXISTS informe (
        id_informe CHAR(36) NOT NULL,
        id_cita CHAR(36) NOT NULL,
        id_especialista CHAR(36) NOT NULL,
        reseña TEXT NULL,
        recomendaciones TEXT NULL,
        firma_url TEXT NULL,
        informe_pdf_url VARCHAR(500) NULL,
        fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

        PRIMARY KEY (id_informe),
        UNIQUE KEY uk_informe_cita (id_cita),
        KEY idx_informe_especialista (id_especialista),

        CONSTRAINT fk_informe_cita
          FOREIGN KEY (id_cita) REFERENCES cita(id_cita)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,

        CONSTRAINT fk_informe_especialista
          FOREIGN KEY (id_especialista) REFERENCES especialista(id_especialista)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

		// Si la tabla ya existe, actualizar las columnas si es necesario
		console.log("🔧 Verificando y actualizando columnas si es necesario...");
		try {
			await connection.execute(`
        ALTER TABLE informe 
        MODIFY COLUMN firma_url TEXT NULL
      `);
			console.log("  ✅ Columna firma_url actualizada a TEXT");
		} catch (alterError) {
			// Ignorar si la columna ya es del tipo correcto o no existe
			if (!alterError.message.includes("Duplicate column name")) {
				console.log("  ℹ️  Columna firma_url ya está actualizada o no existe");
			}
		}

		try {
			await connection.execute(`
        ALTER TABLE informe 
        MODIFY COLUMN informe_pdf_url VARCHAR(500) NULL
      `);
			console.log("  ✅ Columna informe_pdf_url actualizada a VARCHAR(500)");
		} catch (alterError) {
			// Ignorar si la columna ya es del tipo correcto
			if (!alterError.message.includes("Duplicate column name")) {
				console.log("  ℹ️  Columna informe_pdf_url ya está actualizada o no existe");
			}
		}

		console.log("✅ Tabla 'informe' creada exitosamente");
	} catch (error) {
		console.error("❌ Error al crear la tabla:", error.message);
		throw error;
	} finally {
		connection.release();
		process.exit(0);
	}
}

createInformeTable();
