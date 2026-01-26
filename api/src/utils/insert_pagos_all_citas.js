require("dotenv").config();
const { pool } = require("../db");
const crypto = require("crypto");

const uuidv4 = () => crypto.randomUUID();

async function insertPagosAllCitas() {
	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();

		console.log("🔍 Obteniendo todas las citas sin pagos...");

		// Obtener todas las citas que no tienen pagos
		const [citasSinPago] = await connection.execute(
			`SELECT c.id_cita, c.id_paciente, c.estado_pago
       FROM cita c
       WHERE NOT EXISTS (
         SELECT 1 FROM pagos p WHERE p.id_cita = c.id_cita
       )
       ORDER BY c.fecha_cita DESC, c.hora_cita DESC`
		);

		if (citasSinPago.length === 0) {
			console.log("✅ Todas las citas ya tienen pagos asociados.");
			await connection.commit();
			return;
		}

		console.log(`✅ Se encontraron ${citasSinPago.length} citas sin pagos`);

		// Obtener un moderador/admin para el campo validado_por (opcional)
		const [moderadores] = await connection.execute(
			`SELECT u.id_usuario 
       FROM usuario u
       INNER JOIN roles r ON r.id_rol = u.id_rol
       WHERE r.nombre IN ('moderador', 'admin')
       LIMIT 1`
		);

		const validadoPor = moderadores.length > 0 ? moderadores[0].id_usuario : null;

		// Datos para generar pagos aleatorios
		const metodos = ["Transferencia", "PagoMovil"];
		const bancos = [
			"Banco de Venezuela",
			"Banco Mercantil",
			"Banco Provincial",
			"Banesco",
			"Banco del Tesoro",
			"100% Banco",
			"Banco Plaza",
		];

		let insertados = 0;
		let errores = 0;

		for (const cita of citasSinPago) {
			try {
				// Generar datos aleatorios para el pago
				const metodo = metodos[Math.floor(Math.random() * metodos.length)];
				const bancoOrigen = bancos[Math.floor(Math.random() * bancos.length)];
				let bancoDestino = bancos[Math.floor(Math.random() * bancos.length)];
				// Asegurar que banco destino sea diferente al origen
				while (bancoDestino === bancoOrigen) {
					bancoDestino = bancos[Math.floor(Math.random() * bancos.length)];
				}

				// Monto entre 50 y 500 USD
				const monto = (Math.random() * 450 + 50).toFixed(2);
				const referencia = `REF-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
				const cedulaPagador = `V${Math.floor(Math.random() * 90000000) + 10000000}`;
				const telefonoPagador = `041${Math.floor(Math.random() * 9000000) + 1000000}`;

				// Imagen placeholder
				const imagenUrl =
					"https://via.placeholder.com/800x600/1C837F/FFFFFF?text=Comprobante+de+Pago";

				// Determinar estado del pago basado en el estado_pago de la cita
				// Si la cita tiene estado_pago = 1, el pago debe estar aprobado
				// Si tiene estado_pago = 0, el pago puede estar pendiente o aprobado aleatoriamente
				// Si tiene estado_pago = 2, el pago debe estar rechazado
				let estadoPago = cita.estado_pago;
				let fechaValidacion = null;

				// Si el estado de la cita es 1 (aprobado), el pago debe estar aprobado
				if (cita.estado_pago === 1) {
					estadoPago = 1;
					fechaValidacion = new Date();
					// Fecha de validación aleatoria en los últimos 7 días
					fechaValidacion.setDate(fechaValidacion.getDate() - Math.floor(Math.random() * 7));
				} else if (cita.estado_pago === 2) {
					// Si la cita está rechazada, el pago también debe estar rechazado
					estadoPago = 2;
					fechaValidacion = new Date();
					fechaValidacion.setDate(fechaValidacion.getDate() - Math.floor(Math.random() * 7));
				} else {
					// Para citas pendientes, 70% aprobadas, 20% pendientes, 10% rechazadas
					const random = Math.random();
					if (random < 0.7) {
						estadoPago = 1;
						fechaValidacion = new Date();
						fechaValidacion.setDate(fechaValidacion.getDate() - Math.floor(Math.random() * 7));
					} else if (random < 0.9) {
						estadoPago = 0;
					} else {
						estadoPago = 2;
						fechaValidacion = new Date();
						fechaValidacion.setDate(fechaValidacion.getDate() - Math.floor(Math.random() * 7));
					}
				}

				const pagoId = uuidv4();

				// Fecha de pago aleatoria en los últimos 30 días
				const fechaPago = new Date();
				fechaPago.setDate(fechaPago.getDate() - Math.floor(Math.random() * 30));

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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					[
						pagoId,
						cita.id_cita,
						cita.id_paciente,
						metodo,
						imagenUrl,
						bancoOrigen,
						bancoDestino,
						monto,
						cedulaPagador,
						telefonoPagador,
						referencia,
						estadoPago,
						fechaPago,
						fechaValidacion,
						estadoPago === 1 || estadoPago === 2 ? validadoPor : null, // Solo validado si está aprobado o rechazado
					]
				);

				insertados++;
				if (insertados % 10 === 0) {
					console.log(`  ✅ ${insertados} pagos insertados...`);
				}
			} catch (error) {
				console.error(
					`❌ Error al insertar pago para cita ${cita.id_cita}:`,
					error.message,
				);
				errores++;
			}
		}

		await connection.commit();

		console.log("\n📊 Resumen de inserción:");
		console.log(`   Total de citas sin pagos: ${citasSinPago.length}`);
		console.log(`   Pagos insertados: ${insertados}`);
		console.log(`   Errores: ${errores}`);
		console.log("\n✅ Proceso completado exitosamente");
	} catch (error) {
		await connection.rollback();
		console.error("\n❌ Error al insertar pagos:", error.message);
		throw error;
	} finally {
		connection.release();
	}
}

// Ejecutar si se llama directamente
if (require.main === module) {
	insertPagosAllCitas()
		.then(() => {
			console.log("\n✅ Proceso finalizado");
			process.exit(0);
		})
		.catch((error) => {
			console.error("\n❌ Error:", error);
			process.exit(1);
		});
}

module.exports = { insertPagosAllCitas };
