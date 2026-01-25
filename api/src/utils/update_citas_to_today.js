require("dotenv").config();
const { pool } = require("../db");

async function updateCitasToToday() {
	const connection = await pool.getConnection();
	try {
		await connection.beginTransaction();

		// Usar la fecha que el frontend está esperando: 2026-01-24
		const today = "2026-01-24";
		console.log(`📅 Actualizando citas de prueba a fecha: ${today}\n`);

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
        u.apellido AS paciente_apellido,
        r.archivo AS resultado_archivo
      FROM cita c
      INNER JOIN usuario u ON u.id_usuario = c.id_paciente
      LEFT JOIN resultado r ON r.id_cita = c.id_cita
      WHERE c.orden LIKE 'TEST-%'
      ORDER BY c.hora_cita`
		);

		console.log("📋 Citas actualizadas:");
		citas.forEach((cita, index) => {
			const fechaStr = cita.fecha_cita.toISOString().slice(0, 10);
			const estadoCita = cita.estado_cita === 1 ? "Confirmada" : cita.estado_cita === 3 ? "Atendida" : "Pendiente";
			const estadoPago = cita.estado_pago === 1 ? "Pagado" : "Pendiente";
			console.log(
				`  ${index + 1}. ${cita.orden} - ${fechaStr} ${cita.hora_cita}`
			);
			console.log(`     ${cita.paciente_nombre} ${cita.paciente_apellido} | ${estadoCita} | ${estadoPago}`);
			if (cita.resultado_archivo) {
				console.log(`     Resultado: ${cita.resultado_archivo}`);
			}
		});

		// Mostrar resumen
		const [resumen] = await connection.execute(
			`SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN estado_cita = 1 THEN 1 ELSE 0 END) AS confirmadas,
        SUM(CASE WHEN estado_pago = 0 THEN 1 ELSE 0 END) AS pendientes_pago,
        SUM(CASE WHEN estado_cita = 3 THEN 1 ELSE 0 END) AS atendidas,
        SUM(CASE WHEN estado_cita = 3 AND r.archivo IS NULL THEN 1 ELSE 0 END) AS atendidas_sin_resultado
      FROM cita c
      LEFT JOIN resultado r ON r.id_cita = c.id_cita
      WHERE c.orden LIKE 'TEST-%' AND DATE(c.fecha_cita) = ?`,
			[today]
		);

		console.log(`\n📊 Resumen para ${today}:`);
		console.log(`   Total: ${resumen[0].total}`);
		console.log(`   Confirmadas: ${resumen[0].confirmadas}`);
		console.log(`   Pendientes de pago: ${resumen[0].pendientes_pago}`);
		console.log(`   Atendidas: ${resumen[0].atendidas}`);
		console.log(`   Atendidas sin resultado: ${resumen[0].atendidas_sin_resultado}\n`);

		await connection.commit();
		console.log("✅ Citas actualizadas exitosamente");
	} catch (error) {
		await connection.rollback();
		console.error("❌ Error:", error.message);
		throw error;
	} finally {
		connection.release();
		process.exit(0);
	}
}

updateCitasToToday();
