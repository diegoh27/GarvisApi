const cron = require("node-cron");
const { pool } = require("../db");

const startCleanupDisponibilidad = () => {
	// Todos los dias a la 1:00 AM
	cron.schedule("0 1 * * *", async () => {
		try {
			const sql = `
        DELETE FROM disponibilidad
        WHERE fecha < CURDATE()
          AND id_disponibilidad NOT IN (
            SELECT id_disponibilidad
            FROM cita
            WHERE id_disponibilidad IS NOT NULL
          )
      `;
			const [result] = await pool.execute(sql);
			console.log(
				`🧹 Disponibilidad eliminada: ${result.affectedRows} bloques vencidos`,
			);
		} catch (err) {
			console.error("❌ Error en cleanup de disponibilidad:", err.message);
		}
	});
};

module.exports = { startCleanupDisponibilidad };
