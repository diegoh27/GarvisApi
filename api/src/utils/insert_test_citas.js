require("dotenv").config();
const { pool } = require("../db");
const crypto = require("crypto");

const uuidv4 = () => crypto.randomUUID();

async function insertTestCitas() {
	const connection = await pool.getConnection();
	try {
		await connection.beginTransaction();

		console.log("🔍 Obteniendo datos existentes...");

		// Obtener especialista
		const [especialistas] = await connection.execute(
			"SELECT id_especialista FROM especialista LIMIT 1"
		);
		if (especialistas.length === 0) {
			throw new Error(
				"No hay especialistas en la base de datos. Crea uno primero."
			);
		}
		const especialista_id = especialistas[0].id_especialista;
		console.log(`✅ Especialista encontrado: ${especialista_id}`);

		// Obtener o crear pacientes
		let [pacientes] = await connection.execute(
			"SELECT id_paciente FROM paciente LIMIT 4"
		);

		// Crear pacientes de prueba si no hay suficientes
		if (pacientes.length < 4) {
			console.log("📝 Creando pacientes de prueba...");

			// Asegurar que existen los roles
			await connection.execute(
				"INSERT IGNORE INTO roles (id_rol, nombre) VALUES (?, 'especialista'), (?, 'paciente')",
				[uuidv4(), uuidv4()]
			);

			const [rolPaciente] = await connection.execute(
				"SELECT id_rol FROM roles WHERE nombre = 'paciente' LIMIT 1"
			);
			const rolPacienteId = rolPaciente[0].id_rol;

			const pacientesData = [
				{
					cedula: "V-11111111",
					nombre: "Juan",
					apellido: "Pérez",
					correo: "juan.test@garvis.com",
					telefono: "04121111111",
					tipo_sangre: "O+",
				},
				{
					cedula: "V-22222222",
					nombre: "María",
					apellido: "González",
					correo: "maria.test@garvis.com",
					telefono: "04122222222",
					tipo_sangre: "A+",
				},
				{
					cedula: "V-33333333",
					nombre: "Carlos",
					apellido: "Rodríguez",
					correo: "carlos.test@garvis.com",
					telefono: "04123333333",
					tipo_sangre: "B+",
				},
				{
					cedula: "V-44444444",
					nombre: "Ana",
					apellido: "Martínez",
					correo: "ana.test@garvis.com",
					telefono: "04124444444",
					tipo_sangre: "AB+",
				},
			];

			for (const pData of pacientesData) {
				// Verificar si ya existe
				const [existing] = await connection.execute(
					"SELECT id_usuario FROM usuario WHERE cedula = ?",
					[pData.cedula]
				);

				if (existing.length === 0) {
					const pacienteId = uuidv4();
					await connection.execute(
						`INSERT INTO usuario (
              id_usuario, nombre, apellido, genero, cedula, correo, telefono, 
              contrasena, activo, fecha_nacimiento, id_rol
            ) VALUES (?, ?, ?, 'Masculino', ?, ?, ?, '$2b$10$dummyhash', 1, '1990-01-01', ?)`,
						[
							pacienteId,
							pData.nombre,
							pData.apellido,
							pData.cedula,
							pData.correo,
							pData.telefono,
							rolPacienteId,
						]
					);

					await connection.execute(
						`INSERT INTO paciente (
              id_paciente, tipo_sangre, descripcion, direccion, 
              contacto_emergencia_nombre, contacto_emergencia_telefono
            ) VALUES (?, ?, ?, ?, ?, ?)`,
						[
							pacienteId,
							pData.tipo_sangre,
							`Paciente de prueba ${pData.nombre}`,
							"Dirección de prueba",
							`Contacto ${pData.nombre}`,
							pData.telefono,
						]
					);
					console.log(`  ✅ Paciente creado: ${pData.nombre} ${pData.apellido}`);
				}
			}

			// Re-obtener pacientes
			[pacientes] = await connection.execute(
				"SELECT id_paciente FROM paciente LIMIT 4"
			);
		}

		if (pacientes.length < 4) {
			throw new Error(
				`No hay suficientes pacientes. Solo se encontraron ${pacientes.length}, se necesitan 4.`
			);
		}

		const pacienteIds = pacientes.map((p) => p.id_paciente);
		console.log(`✅ ${pacienteIds.length} pacientes disponibles`);

		// Obtener o crear ecos
		let [ecos] = await connection.execute("SELECT id_eco FROM eco LIMIT 4");

		if (ecos.length < 4) {
			console.log("📝 Creando ecos de prueba...");
			const ecosData = [
				{ nombre: "Eco Abdominal", precio: 50.0, duracion: 30 },
				{ nombre: "Eco Obstétrico", precio: 60.0, duracion: 45 },
				{ nombre: "Eco Pélvico", precio: 55.0, duracion: 30 },
				{ nombre: "Eco Cardíaco", precio: 70.0, duracion: 45 },
			];

			for (const ecoData of ecosData) {
				const ecoId = uuidv4();
				await connection.execute(
					"INSERT IGNORE INTO eco (id_eco, nombre, precio, duracion_min, activo) VALUES (?, ?, ?, ?, 1)",
					[ecoId, ecoData.nombre, ecoData.precio, ecoData.duracion]
				);
				console.log(`  ✅ Eco creado: ${ecoData.nombre}`);
			}

			[ecos] = await connection.execute("SELECT id_eco FROM eco LIMIT 4");
		}

		if (ecos.length < 4) {
			throw new Error(
				`No hay suficientes ecos. Solo se encontraron ${ecos.length}, se necesitan 4.`
			);
		}

		const ecoIds = ecos.map((e) => e.id_eco);
		console.log(`✅ ${ecoIds.length} ecos disponibles`);

		// Limpiar citas de prueba anteriores de hoy
		const today = new Date().toISOString().slice(0, 10);
		console.log(`🧹 Limpiando citas de prueba anteriores de ${today}...`);

		const [citasToDelete] = await connection.execute(
			"SELECT id_cita FROM cita WHERE orden LIKE 'TEST-%' AND fecha_cita = ?",
			[today]
		);

		if (citasToDelete.length > 0) {
			const citasIds = citasToDelete.map((c) => c.id_cita);
			await connection.execute(
				"DELETE FROM resultado WHERE id_cita IN (?)",
				[citasIds]
			);
			await connection.execute(
				"DELETE FROM cita WHERE orden LIKE 'TEST-%' AND fecha_cita = ?",
				[today]
			);
			console.log(`  ✅ ${citasToDelete.length} citas eliminadas`);
		}

		// Insertar citas de prueba
		console.log(`📅 Insertando citas de prueba para ${today}...`);

		const citasData = [
			{
				// Cita 1: Confirmada con pago aprobado
				paciente_id: pacienteIds[0],
				eco_id: ecoIds[0],
				hora: "09:00:00",
				orden: "TEST-ORDEN-001",
				estado_cita: 1,
				estado_pago: 1,
			},
			{
				// Cita 2: Confirmada con pago pendiente
				paciente_id: pacienteIds[1],
				eco_id: ecoIds[1],
				hora: "10:30:00",
				orden: "TEST-ORDEN-002",
				estado_cita: 1,
				estado_pago: 0,
			},
			{
				// Cita 3: Atendida sin resultado
				paciente_id: pacienteIds[2],
				eco_id: ecoIds[2],
				hora: "11:00:00",
				orden: "TEST-ORDEN-003",
				estado_cita: 3,
				estado_pago: 1,
			},
			{
				// Cita 4: Atendida con resultado
				paciente_id: pacienteIds[3],
				eco_id: ecoIds[3],
				hora: "14:00:00",
				orden: "TEST-ORDEN-004",
				estado_cita: 3,
				estado_pago: 1,
			},
		];

		const insertedCitas = [];

		for (const citaData of citasData) {
			const citaId = uuidv4();
			await connection.execute(
				`INSERT INTO cita (
          id_cita, id_paciente, id_representado, id_especialista, id_eco,
          fecha_cita, hora_cita, orden, id_disponibilidad,
          estado_cita, estado_pago
        ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, NULL, ?, ?)`,
				[
					citaId,
					citaData.paciente_id,
					especialista_id,
					citaData.eco_id,
					today,
					citaData.hora,
					citaData.orden,
					citaData.estado_cita,
					citaData.estado_pago,
				]
			);
			insertedCitas.push({ id: citaId, orden: citaData.orden });
			console.log(
				`  ✅ Cita creada: ${citaData.orden} - ${citaData.hora} (Estado: ${citaData.estado_cita}, Pago: ${citaData.estado_pago})`
			);
		}

		// Crear resultado para la cita 4 (atendida con resultado)
		const cita4 = insertedCitas.find((c) => c.orden === "TEST-ORDEN-004");
		if (cita4) {
			const resultadoId = uuidv4();
			await connection.execute(
				`INSERT INTO resultado (
          id_resultado, id_cita, id_especialista, nombre, archivo, estado_resultado
        ) VALUES (?, ?, ?, ?, ?, ?)`,
				[
					resultadoId,
					cita4.id,
					especialista_id,
					"Resultado Eco Cardíaco",
					"resultado-test-004.pdf",
					2,
				]
			);
			console.log(`  ✅ Resultado creado para ${cita4.orden}`);
		}

		await connection.commit();
		console.log("\n✅ ¡Citas de prueba insertadas exitosamente!");

		// Mostrar resumen
		const [resumen] = await connection.execute(
			`SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN estado_cita = 1 THEN 1 ELSE 0 END) AS confirmadas,
        SUM(CASE WHEN estado_pago = 0 THEN 1 ELSE 0 END) AS pendientes_pago,
        SUM(CASE WHEN estado_cita = 3 THEN 1 ELSE 0 END) AS atendidas
      FROM cita 
      WHERE fecha_cita = ? AND orden LIKE 'TEST-%'`,
			[today]
		);

		console.log("\n📊 Resumen de citas insertadas:");
		console.log(`   Total: ${resumen[0].total}`);
		console.log(`   Confirmadas: ${resumen[0].confirmadas}`);
		console.log(`   Pendientes de pago: ${resumen[0].pendientes_pago}`);
		console.log(`   Atendidas: ${resumen[0].atendidas}`);
	} catch (error) {
		await connection.rollback();
		console.error("\n❌ Error al insertar citas de prueba:", error.message);
		throw error;
	} finally {
		connection.release();
	}
}

// Ejecutar si se llama directamente
if (require.main === module) {
	insertTestCitas()
		.then(() => {
			console.log("\n✅ Proceso completado");
			process.exit(0);
		})
		.catch((error) => {
			console.error("\n❌ Error:", error);
			process.exit(1);
		});
}

module.exports = { insertTestCitas };
