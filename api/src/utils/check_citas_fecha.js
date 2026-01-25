require("dotenv").config();
const { pool } = require("../db");

async function checkCitasFecha() {
	try {
		const today = new Date().toISOString().slice(0, 10);
		console.log(`\n📅 Fecha actual del sistema: ${today}`);
		console.log(`📅 Fecha actual MySQL (CURDATE()): ${(await pool.execute("SELECT CURDATE() as fecha"))[0][0].fecha}`);
		
		const [citas] = await pool.execute(
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
      ORDER BY c.fecha_cita, c.hora_cita`
		);

		console.log(`\n📋 Citas de prueba encontradas: ${citas.length}\n`);
		
		citas.forEach((cita, index) => {
			const fechaStr = cita.fecha_cita.toISOString().slice(0, 10);
			const esHoy = fechaStr === today;
			console.log(`${index + 1}. ${cita.orden}`);
			console.log(`   Fecha: ${fechaStr} ${esHoy ? '✅ (HOY)' : '❌ (NO ES HOY)'}`);
			console.log(`   Hora: ${cita.hora_cita}`);
			console.log(`   Paciente: ${cita.paciente_nombre} ${cita.paciente_apellido}`);
			console.log(`   Estado cita: ${cita.estado_cita} | Estado pago: ${cita.estado_pago}`);
			console.log(`   Resultado archivo: ${cita.resultado_archivo || 'NULL'}`);
			console.log('');
		});

		// Contar por fecha de hoy
		const [citasHoy] = await pool.execute(
			`SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN estado_cita = 1 THEN 1 ELSE 0 END) AS confirmadas,
        SUM(CASE WHEN estado_pago = 0 THEN 1 ELSE 0 END) AS pendientes_pago,
        SUM(CASE WHEN estado_cita = 3 THEN 1 ELSE 0 END) AS atendidas,
        SUM(CASE WHEN estado_cita = 3 AND r.archivo IS NULL THEN 1 ELSE 0 END) AS atendidas_sin_resultado
      FROM cita c
      LEFT JOIN resultado r ON r.id_cita = c.id_cita
      WHERE c.orden LIKE 'TEST-%' AND DATE(c.fecha_cita) = CURDATE()`
		);

		console.log(`\n📊 Resumen para HOY (CURDATE()):`);
		console.log(`   Total: ${citasHoy[0].total}`);
		console.log(`   Confirmadas: ${citasHoy[0].confirmadas}`);
		console.log(`   Pendientes de pago: ${citasHoy[0].pendientes_pago}`);
		console.log(`   Atendidas: ${citasHoy[0].atendidas}`);
		console.log(`   Atendidas sin resultado: ${citasHoy[0].atendidas_sin_resultado}\n`);

	} catch (error) {
		console.error("❌ Error:", error.message);
		throw error;
	} finally {
		process.exit(0);
	}
}

checkCitasFecha();
