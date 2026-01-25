require("dotenv").config();
const { pool } = require("../db");

async function fixCitasFecha() {
	const connection = await pool.getConnection();
	try {
		await connection.beginTransaction();

		// Obtener la fecha actual del sistema (no de MySQL)
		// Usar la fecha de hoy según el sistema
		const now = new Date();
		// Ajustar a zona horaria local para evitar problemas de UTC
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
			.toISOString()
			.slice(0, 10);
		console.log(`📅 Fecha del sistema: ${today}`);
		console.log(`📅 Actualizando citas a fecha: ${today}`);

		// Actualizar todas las citas de prueba a la fecha de hoy
		const [result] = await connection.execute(
			`UPDATE cita 
       SET fecha_cita = ? 
       WHERE orden LIKE 'TEST-%'`,
			[today]
		);

		console.log(`✅ ${result.affectedRows} citas actualizadas\n`);

		// Mostrar las citas actualizadas
		const [citas] = await connection.execute(
			`SELECT 
        c.id_cita,
        c.fecha_cita,
        c.hora_cita,
        c.orden,
        c.estado_cita,
        c.estado_pago,
        u.nombre AS paciente_nombre,
        u.apellido AS paciente_apellido
      FROM cita c
      INNER JOIN usuario u ON u.id_usuario = c.id_paciente
      WHERE c.orden LIKE 'TEST-%'
      ORDER BY c.hora_cita`
		);

		console.log("📋 Citas actualizadas:");
		citas.forEach((cita, index) => {
			const fechaStr = cita.fecha_cita.toISOString().slice(0, 10);
			console.log(
				`  ${index + 1}. ${cita.orden} - ${fechaStr} ${cita.hora_cita} - ${cita.paciente_nombre} ${cita.paciente_apellido} (Estado: ${cita.estado_cita}, Pago: ${cita.estado_pago})`
			);
		});

		await connection.commit();
		console.log("\n✅ Citas actualizadas exitosamente");
	} catch (error) {
		await connection.rollback();
		console.error("❌ Error:", error.message);
		throw error;
	} finally {
		connection.release();
		process.exit(0);
	}
}

fixCitasFecha();
