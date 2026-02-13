require("dotenv").config();
const { pool } = require("../db");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

/**
 * Verifica si la base de datos está vacía (sin tablas)
 */
async function isDatabaseEmpty() {
	try {
		const [tables] = await pool.execute(
			"SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ?",
			[process.env.DB_NAME || "garvis"]
		);
		return tables[0].count === 0;
	} catch (error) {
		console.error(
			"❌ Error verificando si la base de datos está vacía:",
			error.message
		);
		return false;
	}
}

/**
 * Crea todas las tablas leyendo el archivo SQL
 */
async function createTables() {
	try {
		const sqlPath = path.join(__dirname, "tables_without_db.sql");

		if (!fs.existsSync(sqlPath)) {
			console.error(`❌ Archivo SQL no encontrado: ${sqlPath}`);
			return false;
		}

		const sqlContent = fs.readFileSync(sqlPath, "utf8");

		// Limpiar el contenido SQL: remover comentarios de bloque y líneas
		let cleanedSQL = sqlContent
			.replace(/\/\*[\s\S]*?\*\//g, "") // Remover comentarios /* */
			.replace(/--.*$/gm, "") // Remover comentarios de línea --
			.replace(/^\s*$/gm, ""); // Remover líneas vacías

		// Dividir por punto y coma, pero mantener statements completos
		const statements = cleanedSQL
			.split(";")
			.map((stmt) => stmt.trim())
			.filter(
				(stmt) => stmt.length > 0 && !stmt.toLowerCase().startsWith("use ")
			);

		console.log("📦 Creando tablas...");
		let successCount = 0;
		let errorCount = 0;

		for (const statement of statements) {
			if (statement.length > 10) {
				// Solo ejecutar statements significativos
				try {
					await pool.execute(statement);
					successCount++;
				} catch (err) {
					// Ignorar errores de "table already exists" si usamos CREATE TABLE IF NOT EXISTS
					if (
						err.message.includes("already exists") ||
						err.message.includes("Duplicate") ||
						(err.message.includes("Table") &&
							!err.message.includes("doesn't exist"))
					) {
						// Error esperado, continuar
						successCount++;
					} else {
						errorCount++;
						console.warn(
							`⚠️  Advertencia al ejecutar statement: ${err.message.substring(
								0,
								100
							)}`
						);
					}
				}
			}
		}

		if (errorCount === 0 || successCount > 0) {
			console.log(
				`✅ Tablas creadas exitosamente (${successCount} statements ejecutados)`
			);
			return true;
		} else {
			console.error(`❌ Error creando tablas: ${errorCount} errores`);
			return false;
		}
	} catch (error) {
		console.error("❌ Error creando tablas:", error.message);
		return false;
	}
}

/**
 * Crea o obtiene un rol
 */
async function getOrCreateRole(nombre) {
	const [rows] = await pool.execute(
		"SELECT id_rol FROM roles WHERE nombre = ? LIMIT 1",
		[nombre]
	);
	if (rows.length) return rows[0].id_rol;

	const id_rol = crypto.randomUUID();
	await pool.execute("INSERT INTO roles (id_rol, nombre) VALUES (?, ?)", [
		id_rol,
		nombre,
	]);
	return id_rol;
}

/**
 * Crea un usuario
 */
async function createUsuario({
	nombre,
	apellido,
	genero,
	cedula,
	correo,
	telefono,
	fecha_nacimiento,
	id_rol,
	contrasena,
}) {
	const id_usuario = crypto.randomUUID();
	const hashedPassword = await bcrypt.hash(contrasena, 10);

	await pool.execute(
		`INSERT INTO usuario
		(id_usuario, nombre, apellido, genero, cedula, correo, telefono, contrasena, activo, fecha_nacimiento, id_rol)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
		[
			id_usuario,
			nombre,
			apellido,
			genero,
			cedula,
			correo,
			telefono,
			hashedPassword,
			fecha_nacimiento,
			id_rol,
		]
	);

	return id_usuario;
}

/**
 * Seeder básico: roles, 2 admins y 2 moderadores
 */
async function seedBasicData() {
	try {
		console.log("🌱 Iniciando seeder básico...");

		// Crear roles
		console.log("📝 Creando roles...");
		const adminRole = await getOrCreateRole("admin");
		const moderadorRole = await getOrCreateRole("moderador");
		const especialistaRole = await getOrCreateRole("especialista");
		const pacienteRole = await getOrCreateRole("paciente");
		console.log("✅ Roles creados");

		// Contraseña por defecto para entorno de pruebas
		const defaultPassword = "test123";

		// Crear 2 administradores
		console.log("👤 Creando administradores...");
		const admin1 = await createUsuario({
			nombre: "Admin",
			apellido: "Principal",
			genero: "Otro",
			cedula: "V-00000001",
			correo: "admin1@garvis.com",
			telefono: "0412-0000001",
			fecha_nacimiento: "1990-01-01",
			id_rol: adminRole,
			contrasena: defaultPassword,
		});

		const admin2 = await createUsuario({
			nombre: "Admin",
			apellido: "Secundario",
			genero: "Otro",
			cedula: "V-00000002",
			correo: "admin2@garvis.com",
			telefono: "0412-0000002",
			fecha_nacimiento: "1990-01-01",
			id_rol: adminRole,
			contrasena: defaultPassword,
		});
		console.log("✅ Administradores creados");

		// Crear 2 moderadores
		console.log("👤 Creando moderadores...");
		const moderador1 = await createUsuario({
			nombre: "Moderador",
			apellido: "Uno",
			genero: "Masculino",
			cedula: "V-00000003",
			correo: "moderador1@garvis.com",
			telefono: "0412-0000003",
			fecha_nacimiento: "1992-01-01",
			id_rol: moderadorRole,
			contrasena: defaultPassword,
		});

		const moderador2 = await createUsuario({
			nombre: "Moderador",
			apellido: "Dos",
			genero: "Femenino",
			cedula: "V-00000004",
			correo: "moderador2@garvis.com",
			telefono: "0412-0000004",
			fecha_nacimiento: "1993-01-01",
			id_rol: moderadorRole,
			contrasena: defaultPassword,
		});
		console.log("✅ Moderadores creados");

		// Crear 2 pacientes
		console.log("👤 Creando pacientes...");
		const paciente1 = await createUsuario({
			nombre: "Paciente",
			apellido: "Uno",
			genero: "Femenino",
			cedula: "V-00000005",
			correo: "paciente1@garvis.com",
			telefono: "0412-0000005",
			fecha_nacimiento: "1995-01-15",
			id_rol: pacienteRole,
			contrasena: defaultPassword,
		});

		const paciente2 = await createUsuario({
			nombre: "Paciente",
			apellido: "Dos",
			genero: "Masculino",
			cedula: "V-00000006",
			correo: "paciente2@garvis.com",
			telefono: "0412-0000006",
			fecha_nacimiento: "1996-02-20",
			id_rol: pacienteRole,
			contrasena: defaultPassword,
		});
		console.log("✅ Pacientes creados");

		// Crear 2 especialistas
		console.log("👨‍⚕️ Creando especialistas...");
		const especialista1 = await createUsuario({
			nombre: "Especialista",
			apellido: "Uno",
			genero: "Femenino",
			cedula: "V-00000007",
			correo: "especialista1@garvis.com",
			telefono: "0412-0000007",
			fecha_nacimiento: "1988-03-10",
			id_rol: especialistaRole,
			contrasena: defaultPassword,
		});

		const especialista2 = await createUsuario({
			nombre: "Especialista",
			apellido: "Dos",
			genero: "Masculino",
			cedula: "V-00000008",
			correo: "especialista2@garvis.com",
			telefono: "0412-0000008",
			fecha_nacimiento: "1987-04-22",
			id_rol: especialistaRole,
			contrasena: defaultPassword,
		});
		console.log("✅ Especialistas creados");

		await seedExtendedData({
			adminId: admin1,
			moderadorId: moderador1,
			pacienteIds: [paciente1, paciente2],
			especialistaIds: [especialista1, especialista2],
		});
		console.log("✅ Datos extendidos creados");

		console.log("\n📋 Credenciales de acceso:");
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		console.log("🔑 Contraseña por defecto: test123");
		console.log("\n👨‍💼 Administradores:");
		console.log(`   • admin1@garvis.com (${defaultPassword})`);
		console.log(`   • admin2@garvis.com (${defaultPassword})`);
		console.log("\n👥 Moderadores:");
		console.log(`   • moderador1@garvis.com (${defaultPassword})`);
		console.log(`   • moderador2@garvis.com (${defaultPassword})`);
		console.log("\n🧪 Nuevos usuarios de prueba:");
		console.log(`   • paciente1@garvis.com (${defaultPassword})`);
		console.log(`   • paciente2@garvis.com (${defaultPassword})`);
		console.log(`   • especialista1@garvis.com (${defaultPassword})`);
		console.log(`   • especialista2@garvis.com (${defaultPassword})`);
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

		return true;
	} catch (error) {
		console.error("❌ Error en seeder básico:", error.message);
		return false;
	}
}

async function seedExtendedData({
	adminId,
	moderadorId,
	pacienteIds,
	especialistaIds,
}) {
	const today = new Date();
	const formatDate = (date) => date.toISOString().slice(0, 10);
	const addDays = (baseDate, days) => {
		const date = new Date(baseDate);
		date.setDate(date.getDate() + days);
		return date;
	};

	const [especialidad1, especialidad2] = [crypto.randomUUID(), crypto.randomUUID()];
	await pool.execute(
		`INSERT INTO especialidad (id_especialidad, nombre) VALUES (?, ?), (?, ?)`,
		[especialidad1, "Cardiología", especialidad2, "Radiología"],
	);

	await pool.execute(
		`INSERT INTO paciente
			(id_paciente, tipo_sangre, descripcion, direccion, rif, contacto_emergencia_nombre, contacto_emergencia_telefono)
		 VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)`,
		[
			pacienteIds[0],
			"O+",
			"Paciente de prueba 1",
			"Av. Test 1",
			"J0000000001",
			"Contacto Uno",
			"04120000001",
			pacienteIds[1],
			"A+",
			"Paciente de prueba 2",
			"Av. Test 2",
			"J0000000002",
			"Contacto Dos",
			"04120000002",
		],
	);

	await pool.execute(
		`INSERT INTO especialista
			(id_especialista, id_especialidad, codigo_colegiatura, porcentaje)
		 VALUES (?, ?, ?, ?), (?, ?, ?, ?)`,
		[
			especialistaIds[0],
			especialidad1,
			"COL-TEST-001",
			20,
			especialistaIds[1],
			especialidad2,
			"COL-TEST-002",
			25,
		],
	);

	const [eco1, eco2] = [crypto.randomUUID(), crypto.randomUUID()];
	await pool.execute(
		`INSERT INTO eco (id_eco, nombre, precio, duracion_min, activo)
		 VALUES (?, ?, ?, ?, 1), (?, ?, ?, ?, 1)`,
		[eco1, "Eco Doppler", 100, 30, eco2, "Eco Abdomen", 120, 40],
	);

	await pool.execute(
		`INSERT INTO especialista_eco (id_especialista, id_eco) VALUES (?, ?), (?, ?)`,
		[especialistaIds[0], eco1, especialistaIds[1], eco2],
	);

	const [representado1, representado2] = [crypto.randomUUID(), crypto.randomUUID()];
	await pool.execute(
		`INSERT INTO representado
			(id_representado, id_paciente, nombre, apellido, fecha_nacimiento, cedula, genero, parentesco)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			representado1,
			pacienteIds[0],
			"Representado",
			"Uno",
			"2018-01-10",
			"V-10000001",
			"Masculino",
			"Hijo",
			representado2,
			pacienteIds[1],
			"Representado",
			"Dos",
			"2017-05-20",
			"V-10000002",
			"Femenino",
			"Hija",
		],
	);

	const [disp1, disp2] = [crypto.randomUUID(), crypto.randomUUID()];
	await pool.execute(
		`INSERT INTO disponibilidad
			(id_disponibilidad, id_especialista, fecha, hora_inicio, hora_fin, id_eco, estado, creado_por, aprobado_por)
		 VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?), (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
		[
			disp1,
			especialistaIds[0],
			formatDate(addDays(today, 1)),
			"08:00:00",
			"09:00:00",
			eco1,
			adminId,
			moderadorId,
			disp2,
			especialistaIds[1],
			formatDate(addDays(today, 2)),
			"09:00:00",
			"10:00:00",
			eco2,
			adminId,
			moderadorId,
		],
	);

	const [cita1, cita2] = [crypto.randomUUID(), crypto.randomUUID()];
	await pool.execute(
		`INSERT INTO cita
			(id_cita, id_paciente, id_representado, id_especialista, id_eco, fecha_cita, hora_cita, orden, id_disponibilidad, origen_cita, estado_cita, estado_pago)
		 VALUES
			(?, ?, ?, ?, ?, ?, ?, ?, ?, 'web', 3, 1),
			(?, ?, NULL, ?, ?, ?, ?, ?, ?, 'mostrador', 3, 1)`,
		[
			cita1,
			pacienteIds[0],
			representado1,
			especialistaIds[0],
			eco1,
			formatDate(addDays(today, -2)),
			"08:15:00",
			"ORD-TEST-001",
			disp1,
			cita2,
			pacienteIds[1],
			especialistaIds[1],
			eco2,
			formatDate(addDays(today, -1)),
			"09:15:00",
			"ORD-TEST-002",
			disp2,
		],
	);

	await pool.execute(
		`INSERT INTO cita_mostrador (id_cita, nombre, apellido, cedula, rif)
		 VALUES (?, ?, ?, ?, ?)`,
		[cita2, "Paciente", "Mostrador", "V-20000001", "J0000000999"],
	);

	const tasaDia = 36;
	const [pago1, pago2] = [crypto.randomUUID(), crypto.randomUUID()];
	await pool.execute(
		`INSERT INTO pagos
			(id_pago, id_cita, id_paciente, metodo, imagen, banco_origen, banco_destino, monto, monto_usd, monto_bs, cedula_pagador, telefono_pagador, referencia, estado_pago, fecha_validacion, validado_por, tasa_dia_bcv)
		 VALUES
			(?, ?, ?, 'PagoMovil', 'test1.png', 'Banco Test A', 'Banco Test B', ?, ?, ?, ?, ?, ?, 1, NOW(), ?, ?),
			(?, ?, ?, 'Zelle', 'test2.png', 'Banco Test C', 'Banco Test D', ?, ?, ?, ?, ?, ?, 1, NOW(), ?, ?)`,
		[
			pago1,
			cita1,
			pacienteIds[0],
			3600,
			100,
			3600,
			"V-00000005",
			"04120000005",
			"REF-TEST-PAGO-001",
			moderadorId,
			tasaDia,
			pago2,
			cita2,
			pacienteIds[1],
			120,
			120,
			4320,
			"V-20000001",
			"04120000999",
			"REF-TEST-PAGO-002",
			moderadorId,
			tasaDia,
		],
	);

	await pool.execute(
		`INSERT INTO resultado
			(id_resultado, id_cita, id_especialista, nombre, archivo, estado_resultado, fecha_publicacion)
		 VALUES (?, ?, ?, ?, ?, 2, NOW()), (?, ?, ?, ?, ?, 2, NOW())`,
		[
			crypto.randomUUID(),
			cita1,
			especialistaIds[0],
			"Resultado prueba 1",
			"resultado_test_1.pdf",
			crypto.randomUUID(),
			cita2,
			especialistaIds[1],
			"Resultado prueba 2",
			"resultado_test_2.pdf",
		],
	);

	await pool.execute(
		`INSERT INTO informe
			(id_informe, id_cita, id_especialista, reseña, recomendaciones, firma_url, informe_pdf_url)
		 VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)`,
		[
			crypto.randomUUID(),
			cita1,
			especialistaIds[0],
			"Reseña de prueba 1",
			"Reposo 24 horas",
			"firma1.png",
			"informe1.pdf",
			crypto.randomUUID(),
			cita2,
			especialistaIds[1],
			"Reseña de prueba 2",
			"Control en 15 días",
			"firma2.png",
			"informe2.pdf",
		],
	);

	await pool.execute(
		`INSERT INTO notificacion (id_notificacion, id_usuario, titulo, mensaje, tipo)
		 VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)`,
		[
			crypto.randomUUID(),
			adminId,
			"Notificación de prueba 1",
			"Mensaje de prueba para administrador",
			"sistema",
			crypto.randomUUID(),
			moderadorId,
			"Notificación de prueba 2",
			"Mensaje de prueba para moderador",
			"recordatorio",
		],
	);

	const [producto1, producto2] = [crypto.randomUUID(), crypto.randomUUID()];
	await pool.execute(
		`INSERT INTO inv_producto (id_producto, nombre, stock_actual, activo)
		 VALUES (?, ?, ?, 1), (?, ?, ?, 1)`,
		[producto1, "Gel conductor", 15, producto2, "Guantes", 40],
	);

	const [invCompra1, invCompra2] = [crypto.randomUUID(), crypto.randomUUID()];
	await pool.execute(
		`INSERT INTO inv_producto_compra
			(id_compra, id_producto, fecha_ingreso, cantidad, precio_unitario, precio_total, monto_usd, monto_bs, tasa_dia_bcv, proveedor, referencia, id_usuario)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			invCompra1,
			producto1,
			formatDate(addDays(today, -5)),
			10,
			5,
			50,
			50,
			1800,
			tasaDia,
			"Proveedor A",
			"INV-COMPRA-001",
			adminId,
			invCompra2,
			producto2,
			formatDate(addDays(today, -4)),
			20,
			2,
			40,
			40,
			1440,
			tasaDia,
			"Proveedor B",
			"INV-COMPRA-002",
			adminId,
		],
	);

	await pool.execute(
		`INSERT INTO inv_producto_ajuste
			(id_ajuste, id_producto, fecha, stock_anterior, stock_nuevo, motivo, id_usuario)
		 VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)`,
		[
			crypto.randomUUID(),
			producto1,
			formatDate(addDays(today, -3)),
			15,
			14,
			"Ajuste inventario prueba 1",
			adminId,
			crypto.randomUUID(),
			producto2,
			formatDate(addDays(today, -2)),
			40,
			39,
			"Ajuste inventario prueba 2",
			adminId,
		],
	);

	const [ente1, ente2] = [crypto.randomUUID(), crypto.randomUUID()];
	await pool.execute(
		`INSERT INTO leg_ente (id_ente, nombre, activo)
		 VALUES (?, ?, 1), (?, ?, 1)`,
		[ente1, "SENIAT", ente2, "Alcaldía"],
	);

	const [oblig1, oblig2] = [crypto.randomUUID(), crypto.randomUUID()];
	await pool.execute(
		`INSERT INTO leg_obligacion
			(id_obligacion, id_ente, concepto, periodo, fecha_vencimiento, monto, estado, recordatorio_dias)
		 VALUES (?, ?, ?, 'Mensual', ?, ?, 'Pendiente', ?), (?, ?, ?, 'Mensual', ?, ?, 'Pendiente', ?)`,
		[
			oblig1,
			ente1,
			"IVA",
			formatDate(addDays(today, 10)),
			100,
			5,
			oblig2,
			ente2,
			"Aseo urbano",
			formatDate(addDays(today, 12)),
			80,
			7,
		],
	);

	const [legPago1, legPago2] = [crypto.randomUUID(), crypto.randomUUID()];
	await pool.execute(
		`INSERT INTO leg_pago
			(id_pago, id_obligacion, fecha_pago, monto, monto_usd, monto_bs, tasa_dia_bcv, metodo, referencia, id_usuario)
		 VALUES (?, ?, ?, ?, ?, ?, ?, 'Transferencia', ?, ?), (?, ?, ?, ?, ?, ?, ?, 'PagoMovil', ?, ?)`,
		[
			legPago1,
			oblig1,
			formatDate(addDays(today, -6)),
			100,
			100,
			3600,
			tasaDia,
			"LEG-PAGO-001",
			adminId,
			legPago2,
			oblig2,
			formatDate(addDays(today, -5)),
			80,
			80,
			2880,
			tasaDia,
			"LEG-PAGO-002",
			adminId,
		],
	);

	const [empleado1, empleado2] = [crypto.randomUUID(), crypto.randomUUID()];
	await pool.execute(
		`INSERT INTO nom_empleado (id_empleado, nombre, apellido, cedula, cargo, periodo, sueldo, estado)
		 VALUES (?, ?, ?, ?, ?, 'Quincenal', ?, 'Activo'), (?, ?, ?, ?, ?, 'Mensual', ?, 'Activo')`,
		[
			empleado1,
			"Jose",
			"Gomez",
			"V-30000001",
			"Recepción",
			250,
			empleado2,
			"Maria",
			"Perez",
			"V-30000002",
			"Administración",
			300,
		],
	);

	const [nomPago1, nomPago2] = [crypto.randomUUID(), crypto.randomUUID()];
	await pool.execute(
		`INSERT INTO nom_pago
			(id_pago, id_empleado, fecha_pago, fecha_proximo_pago, monto, monto_usd, monto_bs, tasa_dia_bcv, metodo, referencia, id_usuario)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Transferencia', ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, 'PagoMovil', ?, ?)`,
		[
			nomPago1,
			empleado1,
			formatDate(addDays(today, -7)),
			formatDate(addDays(today, 8)),
			250,
			250,
			9000,
			tasaDia,
			"NOM-PAGO-001",
			adminId,
			nomPago2,
			empleado2,
			formatDate(addDays(today, -7)),
			formatDate(addDays(today, 23)),
			300,
			300,
			10800,
			tasaDia,
			"NOM-PAGO-002",
			adminId,
		],
	);

	const [contrato1, contrato2] = [crypto.randomUUID(), crypto.randomUUID()];
	await pool.execute(
		`INSERT INTO alq_contrato
			(id_contrato, nombre, descripcion, periodo, monto, estado, fecha_vencimiento)
		 VALUES (?, ?, ?, 'Mensual', ?, 'Pendiente', ?), (?, ?, ?, 'Mensual', ?, 'Pendiente', ?)`,
		[
			contrato1,
			"Sede El Limón",
			"Alquiler sede principal",
			500,
			formatDate(addDays(today, 15)),
			contrato2,
			"Depósito Central",
			"Alquiler depósito",
			350,
			formatDate(addDays(today, 20)),
		],
	);

	const [alqPago1, alqPago2] = [crypto.randomUUID(), crypto.randomUUID()];
	await pool.execute(
		`INSERT INTO alq_pago
			(id_pago, id_contrato, fecha_pago, monto, monto_usd, monto_bs, tasa_dia_bcv, metodo, referencia, id_usuario)
		 VALUES (?, ?, ?, ?, ?, ?, ?, 'Transferencia', ?, ?), (?, ?, ?, ?, ?, ?, ?, 'PagoMovil', ?, ?)`,
		[
			alqPago1,
			contrato1,
			formatDate(addDays(today, -8)),
			500,
			500,
			18000,
			tasaDia,
			"ALQ-PAGO-001",
			adminId,
			alqPago2,
			contrato2,
			formatDate(addDays(today, -8)),
			350,
			350,
			12600,
			tasaDia,
			"ALQ-PAGO-002",
			adminId,
		],
	);

	const [comision1, comision2] = [crypto.randomUUID(), crypto.randomUUID()];
	await pool.execute(
		`INSERT INTO esp_comision
			(id_comision, id_cita, id_especialista, porcentaje, monto, estado, fecha_pago, id_usuario)
		 VALUES (?, ?, ?, ?, ?, 'Pagada', ?, ?), (?, ?, ?, ?, ?, 'Pendiente', NULL, ?)`,
		[
			comision1,
			cita1,
			especialistaIds[0],
			20,
			20,
			formatDate(addDays(today, -1)),
			adminId,
			comision2,
			cita2,
			especialistaIds[1],
			25,
			30,
			adminId,
		],
	);

	await pool.execute(
		`INSERT INTO fac_movimiento
			(id_movimiento, tipo, fecha, monto, monto_usd, monto_bs, tasa_dia_bcv, descripcion, referencia, origen_modulo, origen_id, id_usuario)
		 VALUES
			(?, 'Ingreso', ?, ?, ?, ?, ?, ?, ?, 'CITA_PAGO', ?, ?),
			(?, 'Egreso', ?, ?, ?, ?, ?, ?, ?, 'ESP_COMISION', ?, ?),
			(?, 'Egreso', ?, ?, ?, ?, ?, ?, ?, 'INV_COMPRA', ?, ?),
			(?, 'Egreso', ?, ?, ?, ?, ?, ?, ?, 'INV_COMPRA', ?, ?),
			(?, 'Egreso', ?, ?, ?, ?, ?, ?, ?, 'LEG_PAGO', ?, ?),
			(?, 'Egreso', ?, ?, ?, ?, ?, ?, ?, 'LEG_PAGO', ?, ?),
			(?, 'Egreso', ?, ?, ?, ?, ?, ?, ?, 'NOM_PAGO', ?, ?),
			(?, 'Egreso', ?, ?, ?, ?, ?, ?, ?, 'NOM_PAGO', ?, ?),
			(?, 'Egreso', ?, ?, ?, ?, ?, ?, ?, 'ALQ_PAGO', ?, ?),
			(?, 'Egreso', ?, ?, ?, ?, ?, ?, ?, 'ALQ_PAGO', ?, ?)` ,
		[
			crypto.randomUUID(),
			formatDate(addDays(today, -2)),
			80,
			80,
			2880,
			tasaDia,
			"Ingreso por pago cita de prueba",
			"FM-CITA-001",
			pago1,
			adminId,
			crypto.randomUUID(),
			formatDate(addDays(today, -1)),
			20,
			20,
			720,
			tasaDia,
			"Egreso por comisión de prueba",
			"FM-COM-001",
			comision1,
			adminId,
			crypto.randomUUID(),
			formatDate(addDays(today, -5)),
			50,
			50,
			1800,
			tasaDia,
			"Compra de inventario - Gel conductor x10",
			"INV-COMPRA-001",
			invCompra1,
			adminId,
			crypto.randomUUID(),
			formatDate(addDays(today, -4)),
			40,
			40,
			1440,
			tasaDia,
			"Compra de inventario - Guantes x20",
			"INV-COMPRA-002",
			invCompra2,
			adminId,
			crypto.randomUUID(),
			formatDate(addDays(today, -6)),
			100,
			100,
			3600,
			tasaDia,
			"Pago obligación legal IVA",
			"LEG-PAGO-001",
			legPago1,
			adminId,
			crypto.randomUUID(),
			formatDate(addDays(today, -5)),
			80,
			80,
			2880,
			tasaDia,
			"Pago obligación legal Aseo urbano",
			"LEG-PAGO-002",
			legPago2,
			adminId,
			crypto.randomUUID(),
			formatDate(addDays(today, -7)),
			250,
			250,
			9000,
			tasaDia,
			"Pago nómina quincenal",
			"NOM-PAGO-001",
			nomPago1,
			adminId,
			crypto.randomUUID(),
			formatDate(addDays(today, -7)),
			300,
			300,
			10800,
			tasaDia,
			"Pago nómina mensual",
			"NOM-PAGO-002",
			nomPago2,
			adminId,
			crypto.randomUUID(),
			formatDate(addDays(today, -8)),
			500,
			500,
			18000,
			tasaDia,
			"Pago alquiler sede principal",
			"ALQ-PAGO-001",
			alqPago1,
			adminId,
			crypto.randomUUID(),
			formatDate(addDays(today, -8)),
			350,
			350,
			12600,
			tasaDia,
			"Pago alquiler depósito",
			"ALQ-PAGO-002",
			alqPago2,
			adminId,
		],
	);
}

/**
 * Función principal de inicialización
 */
async function initDatabase() {
	try {
		console.log("\n🔍 Verificando estado de la base de datos...");

		const isEmpty = await isDatabaseEmpty();

		if (isEmpty) {
			console.log("📭 Base de datos vacía detectada. Inicializando...\n");

			// Crear tablas
			const tablesCreated = await createTables();
			if (!tablesCreated) {
				console.error(
					"❌ No se pudieron crear las tablas. Abortando inicialización."
				);
				return false;
			}

			// Ejecutar seeder básico
			const seeded = await seedBasicData();
			if (!seeded) {
				console.error("❌ No se pudo ejecutar el seeder básico.");
				return false;
			}

			console.log("✅ Base de datos inicializada correctamente\n");
			return true;
		} else {
			console.log(
				"✅ Base de datos ya contiene tablas. Saltando inicialización.\n"
			);
			return true;
		}
	} catch (error) {
		console.error(
			"❌ Error en inicialización de base de datos:",
			error.message
		);
		return false;
	}
}

module.exports = { initDatabase };
