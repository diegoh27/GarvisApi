require("dotenv").config();
const { pool } = require("../db");

async function getEspecialistaInfo() {
	try {
		// Obtener el especialista que tiene las citas de prueba
		const [especialistas] = await pool.execute(
			`SELECT 
        e.id_especialista,
        u.nombre,
        u.apellido,
        u.correo,
        u.cedula,
        u.telefono,
        u.activo,
        e.codigo_colegiatura,
        e.id_especialidad,
        es.nombre AS especialidad_nombre
      FROM especialista e
      INNER JOIN usuario u ON u.id_usuario = e.id_especialista
      LEFT JOIN especialidad es ON es.id_especialidad = e.id_especialidad
      WHERE e.id_especialista = (
        SELECT DISTINCT id_especialista 
        FROM cita 
        WHERE orden LIKE 'TEST-%' 
        LIMIT 1
      )
      LIMIT 1`
		);

		if (especialistas.length === 0) {
			console.log("❌ No se encontró el especialista con citas de prueba");
			return;
		}

		const esp = especialistas[0];
		console.log("\n📋 Información del Especialista:");
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		console.log(`ID: ${esp.id_especialista}`);
		console.log(`Nombre: ${esp.nombre} ${esp.apellido}`);
		console.log(`Correo: ${esp.correo}`);
		console.log(`Cédula: ${esp.cedula}`);
		console.log(`Teléfono: ${esp.telefono}`);
		console.log(`Activo: ${esp.activo ? "Sí" : "No"}`);
		console.log(`Código Colegiatura: ${esp.codigo_colegiatura || "N/A"}`);
		console.log(`Especialidad: ${esp.especialidad_nombre || "N/A"}`);
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

		// También mostrar las citas de prueba asociadas
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
        e.nombre AS eco_nombre
      FROM cita c
      INNER JOIN usuario u ON u.id_usuario = c.id_paciente
      INNER JOIN eco e ON e.id_eco = c.id_eco
      WHERE c.id_especialista = ? AND c.orden LIKE 'TEST-%'
      ORDER BY c.hora_cita`,
			[esp.id_especialista]
		);

		if (citas.length > 0) {
			console.log(`📅 Citas de prueba asociadas (${citas.length}):`);
			citas.forEach((cita, index) => {
				const estadoCita =
					cita.estado_cita === 1
						? "Confirmada"
						: cita.estado_cita === 3
							? "Atendida"
							: "Pendiente";
				const estadoPago =
					cita.estado_pago === 1 ? "Pagado" : "Pendiente";
				console.log(
					`  ${index + 1}. ${cita.orden} - ${cita.fecha_cita} ${cita.hora_cita}`
				);
				console.log(
					`     Paciente: ${cita.paciente_nombre} ${cita.paciente_apellido}`
				);
				console.log(`     Eco: ${cita.eco_nombre}`);
				console.log(
					`     Estado: ${estadoCita} | Pago: ${estadoPago}`
				);
			});
		}
	} catch (error) {
		console.error("❌ Error:", error.message);
		throw error;
	} finally {
		process.exit(0);
	}
}

getEspecialistaInfo();
