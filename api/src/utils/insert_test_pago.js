require("dotenv").config();
const { pool } = require("../db");
const crypto = require("crypto");

const uuidv4 = () => crypto.randomUUID();

async function insertTestPago() {
	const connection = await pool.getConnection();
	const citaId = "8d7eae41-c7b9-4773-80d9-a068bcc42924";

	try {
		await connection.beginTransaction();

		console.log(`🔍 Verificando cita: ${citaId}...`);

		// Verificar que la cita existe
		const [citas] = await connection.execute(
			"SELECT id_cita, id_paciente FROM cita WHERE id_cita = ?",
			[citaId]
		);

		if (citas.length === 0) {
			throw new Error(`La cita con ID ${citaId} no existe en la base de datos.`);
		}

		const cita = citas[0];
		console.log(`✅ Cita encontrada. Paciente: ${cita.id_paciente}`);

		// Verificar si ya existe un pago para esta cita
		const [pagosExistentes] = await connection.execute(
			"SELECT id_pago FROM pagos WHERE id_cita = ?",
			[citaId]
		);

		if (pagosExistentes.length > 0) {
			console.log("⚠️  Ya existe un pago para esta cita. Eliminándolo...");
			await connection.execute("DELETE FROM pagos WHERE id_cita = ?", [citaId]);
			console.log("  ✅ Pago anterior eliminado");
		}

		// Obtener un moderador/admin para el campo validado_por (opcional, puede ser NULL)
		const [moderadores] = await connection.execute(
			`SELECT u.id_usuario 
       FROM usuario u
       INNER JOIN roles r ON r.id_rol = u.id_rol
       WHERE r.nombre IN ('moderador', 'admin')
       LIMIT 1`
		);

		const validadoPor = moderadores.length > 0 ? moderadores[0].id_usuario : null;

		// Datos aleatorios para el pago de prueba
		const metodos = ["Transferencia", "PagoMovil"];
		const bancos = [
			"Banco de Venezuela",
			"Banco Mercantil",
			"Banco Provincial",
			"Banesco",
			"Banco del Tesoro",
		];

		const metodo = metodos[Math.floor(Math.random() * metodos.length)];
		const bancoOrigen = bancos[Math.floor(Math.random() * bancos.length)];
		let bancoDestino = bancos[Math.floor(Math.random() * bancos.length)];
		// Asegurar que banco destino sea diferente al origen
		while (bancoDestino === bancoOrigen) {
			bancoDestino = bancos[Math.floor(Math.random() * bancos.length)];
		}

		const monto = (Math.random() * 200 + 50).toFixed(2); // Entre 50 y 250
		const referencia = `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
		const cedulaPagador = `${Math.floor(Math.random() * 90000000) + 10000000}`;
		const telefonoPagador = `041${Math.floor(Math.random() * 9000000) + 1000000}`;

		// Imagen placeholder
		const imagenUrl =
			"https://via.placeholder.com/800x600/1C837F/FFFFFF?text=Comprobante+de+Pago+de+Prueba";

		const pagoId = uuidv4();

		console.log("\n📝 Insertando pago de prueba...");
		console.log(`   Método: ${metodo}`);
		console.log(`   Banco origen: ${bancoOrigen}`);
		console.log(`   Banco destino: ${bancoDestino}`);
		console.log(`   Monto: $${monto}`);
		console.log(`   Referencia: ${referencia}`);

		await connection.execute(
			`INSERT INTO pagos (
        id_pago,
        id_cita,
        id_paciente,
        metodo,
        imagen,
        banco_origen,
        banco_destino,
        monto,
        cedula_pagador,
        telefono_pagador,
        referencia,
        estado_pago,
        fecha_pago,
        fecha_validacion,
        validado_por
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NULL, NULL)`,
			[
				pagoId,
				citaId,
				cita.id_paciente,
				metodo,
				imagenUrl,
				bancoOrigen,
				bancoDestino,
				monto,
				cedulaPagador,
				telefonoPagador,
				referencia,
				0, // estado_pago: 0 = Pendiente
			]
		);

		await connection.commit();
		console.log("\n✅ ¡Pago de prueba insertado exitosamente!");
		console.log(`\n📋 Detalles del pago:`);
		console.log(`   ID del pago: ${pagoId}`);
		console.log(`   ID de la cita: ${citaId}`);
		console.log(`   Estado: Pendiente (0)`);
		console.log(
			`\n💡 Puedes probar el modal de ver pago haciendo clic en "Ver pago" para la cita ${citaId}`
		);
	} catch (error) {
		await connection.rollback();
		console.error("\n❌ Error al insertar pago de prueba:", error.message);
		throw error;
	} finally {
		connection.release();
	}
}

// Ejecutar si se llama directamente
if (require.main === module) {
	insertTestPago()
		.then(() => {
			console.log("\n✅ Proceso completado");
			process.exit(0);
		})
		.catch((error) => {
			console.error("\n❌ Error:", error);
			process.exit(1);
		});
}

module.exports = { insertTestPago };
