/**
 * Solicitudes macro por rango (sin bloques de 20 min hasta aprobar) + id_solicitud en disponibilidad.
 * Ejecutar: node api/src/utils/migration_disponibilidad_solicitud.js
 */
require("dotenv").config({
	path: require("path").resolve(__dirname, "../../.env"),
});
const { pool } = require("../db");

async function run() {
	const conn = await pool.getConnection();
	try {
		console.log("Migración: disponibilidad_solicitud + disponibilidad.id_solicitud...");
		await conn.execute(`
			CREATE TABLE IF NOT EXISTS disponibilidad_solicitud (
				id_solicitud CHAR(36) NOT NULL,
				id_especialista CHAR(36) NOT NULL,
				fecha_desde DATE NOT NULL,
				fecha_hasta DATE NOT NULL,
				hora_inicio TIME NOT NULL,
				hora_fin TIME NOT NULL,
				id_eco CHAR(36) NULL,
				id_ecos_json JSON NULL,
				es_manual TINYINT(1) NOT NULL DEFAULT 0,
				estado TINYINT NOT NULL DEFAULT 0 COMMENT '0 pendiente 1 procesada 2 archivada 3 cancelada',
				creado_por CHAR(36) NOT NULL,
				aprobado_por CHAR(36) NULL,
				creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
				actualizado_en TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
				PRIMARY KEY (id_solicitud),
				KEY idx_ds_esp_estado (id_especialista, estado),
				KEY idx_ds_fechas (fecha_desde, fecha_hasta),
				CONSTRAINT fk_ds_especialista FOREIGN KEY (id_especialista) REFERENCES especialista(id_especialista)
					ON UPDATE CASCADE ON DELETE RESTRICT,
				CONSTRAINT fk_ds_creado_por FOREIGN KEY (creado_por) REFERENCES usuario(id_usuario)
					ON UPDATE CASCADE ON DELETE RESTRICT,
				CONSTRAINT fk_ds_aprobado_por FOREIGN KEY (aprobado_por) REFERENCES usuario(id_usuario)
					ON UPDATE CASCADE ON DELETE SET NULL,
				CONSTRAINT fk_ds_eco FOREIGN KEY (id_eco) REFERENCES eco(id_eco)
					ON UPDATE CASCADE ON DELETE SET NULL
			) ENGINE=InnoDB
		`);

		const [cols] = await conn.execute(
			`SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'disponibilidad' AND COLUMN_NAME = 'id_solicitud'`,
		);
		if (!cols.length) {
			await conn.execute(
				`ALTER TABLE disponibilidad ADD COLUMN id_solicitud CHAR(36) NULL AFTER id_eco`,
			);
		}

		const [fks] = await conn.execute(
			`SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'disponibilidad' AND CONSTRAINT_NAME = 'fk_disp_solicitud'`,
		);
		if (!fks.length) {
			await conn.execute(`
				ALTER TABLE disponibilidad
				ADD CONSTRAINT fk_disp_solicitud FOREIGN KEY (id_solicitud) REFERENCES disponibilidad_solicitud(id_solicitud)
					ON DELETE SET NULL ON UPDATE CASCADE
			`);
		}

		console.log("OK: disponibilidad_solicitud");
	} catch (err) {
		console.error("Error en migración disponibilidad_solicitud:", err);
		process.exitCode = 1;
	} finally {
		conn.release();
	}
	process.exit(process.exitCode ?? 0);
}

run();
