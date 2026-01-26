require("dotenv").config();
const { pool } = require("../db");

/**
 * Calcula el RIF venezolano para una cédula usando el algoritmo Módulo 11
 * Basado en el algoritmo oficial venezolano
 * @param {string} tipoRIF - Tipo de RIF (V, E, J, G, etc.)
 * @param {string} cedula - Cédula sin guiones ni puntos
 * @returns {string} RIF completo (ej: V123456789)
 */
function calculateRIF(tipoRIF, cedula) {
	// Validaciones básicas
	if (!tipoRIF || !cedula) return null;

	// Normalizar datos
	tipoRIF = tipoRIF.toUpperCase();
	let cedulaStr = cedula.toString().replace(/\.|-|\s/g, ""); // Quita puntos, guiones o espacios

	// Tabla de valores para las letras
	const valoresTipo = {
		V: 4,
		E: 8,
		J: 12,
		P: 16,
		G: 20,
	};

	// Si el tipo no es válido, retornar null
	if (!valoresTipo[tipoRIF]) {
		return null;
	}

	// Rellenar con ceros a la izquierda hasta llegar a 8 dígitos
	while (cedulaStr.length < 8) {
		cedulaStr = "0" + cedulaStr;
	}

	// Validar que tenga exactamente 8 dígitos
	if (cedulaStr.length !== 8 || !/^\d+$/.test(cedulaStr)) {
		return null;
	}

	// Algoritmo Módulo 11
	const multiplicadores = [3, 2, 7, 6, 5, 4, 3, 2];

	// Valor inicial basado en la letra
	let suma = valoresTipo[tipoRIF];

	// Recorrer los 8 dígitos y multiplicar por su peso correspondiente
	for (let i = 0; i < 8; i++) {
		const digito = parseInt(cedulaStr.charAt(i), 10);
		suma += digito * multiplicadores[i];
	}

	// Calcular residuo y dígito final
	const residuo = suma % 11;
	let digitoVerificador = 0;

	if (residuo > 1) {
		digitoVerificador = 11 - residuo;
	} else {
		// Si el residuo es 0 o 1, el dígito es 0
		digitoVerificador = 0;
	}

	// Retornar resultado final (formato: V123456789, sin guiones para almacenamiento)
	// Nota: Si necesitas formato con guiones (V-12345678-9), se puede formatear después
	return tipoRIF + cedulaStr + digitoVerificador;
}

/**
 * Determina el tipo de RIF basado en la cédula
 * Para personas naturales, generalmente es 'V'
 * @param {string} cedula - Cédula del paciente
 * @returns {string} Tipo de RIF
 */
function getTipoRIF(cedula) {
	if (!cedula) return "V";

	// Limpiar la cédula
	const cedulaLimpia = cedula.toString().replace(/\.|-|\s/g, "");

	// Si la cédula empieza con una letra, usar ese prefijo
	const primeraLetra = cedula.charAt(0).toUpperCase();
	if (["V", "E", "J", "P", "G"].includes(primeraLetra)) {
		return primeraLetra;
	}

	// Por defecto, personas naturales usan 'V'
	return "V";
}

/**
 * Genera un RIF aleatorio válido usando el algoritmo Módulo 11
 * @param {string} tipoRIF - Tipo de RIF (por defecto 'V')
 * @returns {string} RIF completo válido (ej: V123456789)
 */
function generateRandomRIF(tipoRIF = "V") {
	// Tabla de valores para las letras
	const valoresTipo = {
		V: 4,
		E: 8,
		J: 12,
		P: 16,
		G: 20,
	};

	// Normalizar tipo
	tipoRIF = tipoRIF.toUpperCase();
	if (!valoresTipo[tipoRIF]) {
		tipoRIF = "V";
	}

	// Generar 8 dígitos aleatorios
	let cedulaStr = "";
	for (let i = 0; i < 8; i++) {
		cedulaStr += Math.floor(Math.random() * 10).toString();
	}

	// Algoritmo Módulo 11 para calcular el dígito verificador
	const multiplicadores = [3, 2, 7, 6, 5, 4, 3, 2];
	let suma = valoresTipo[tipoRIF];

	// Recorrer los 8 dígitos y multiplicar por su peso correspondiente
	for (let i = 0; i < 8; i++) {
		const digito = parseInt(cedulaStr.charAt(i), 10);
		suma += digito * multiplicadores[i];
	}

	// Calcular residuo y dígito final
	const residuo = suma % 11;
	let digitoVerificador = 0;

	if (residuo > 1) {
		digitoVerificador = 11 - residuo;
	} else {
		// Si el residuo es 0 o 1, el dígito es 0
		digitoVerificador = 0;
	}

	// Retornar resultado final (formato: V123456789, sin guiones para almacenamiento)
	return tipoRIF + cedulaStr + digitoVerificador;
}

async function updatePacientesRIF() {
	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();

		console.log("🔍 Obteniendo todos los pacientes...");

		// Verificar si la columna rif existe
		const [columnCheck] = await connection.execute(
			`SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'paciente' 
       AND COLUMN_NAME = 'rif'`
		);

		if (columnCheck.length === 0) {
			console.log("⚠️  La columna 'rif' no existe en la tabla 'paciente'.");
			console.log("   Ejecuta primero: ALTER TABLE paciente ADD COLUMN rif VARCHAR(20) NULL;");
			await connection.rollback();
			return;
		}

		// Obtener todos los pacientes con su cédula
		const [pacientes] = await connection.execute(
			`SELECT p.id_paciente, u.cedula, p.rif
       FROM paciente p
       INNER JOIN usuario u ON u.id_usuario = p.id_paciente
       ORDER BY u.cedula`
		);

		if (pacientes.length === 0) {
			console.log("⚠️  No se encontraron pacientes en la base de datos.");
			await connection.rollback();
			return;
		}

		console.log(`✅ Se encontraron ${pacientes.length} pacientes`);

		let actualizados = 0;
		let conRIF = 0;
		let errores = 0;

		for (const paciente of pacientes) {
			try {
				// Si ya tiene RIF, saltarlo
				if (paciente.rif && paciente.rif.trim() !== "") {
					conRIF++;
					continue;
				}

				// Intentar calcular RIF desde la cédula primero
				const tipoRIF = getTipoRIF(paciente.cedula);
				let rifCalculado = calculateRIF(tipoRIF, paciente.cedula);

				// Si no se pudo calcular, generar uno aleatorio válido
				if (!rifCalculado) {
					rifCalculado = generateRandomRIF(tipoRIF);
					console.log(
						`  ⚠️  No se pudo calcular RIF desde cédula ${paciente.cedula}, generando RIF aleatorio: ${rifCalculado}`
					);
				}

				// Actualizar el paciente con el RIF
				await connection.execute(
					"UPDATE paciente SET rif = ? WHERE id_paciente = ?",
					[rifCalculado, paciente.id_paciente]
				);

				actualizados++;
				console.log(
					`  ✅ Paciente ${paciente.id_paciente}: ${paciente.cedula} -> ${rifCalculado}`
				);
			} catch (error) {
				console.error(
					`❌ Error al actualizar paciente ${paciente.id_paciente}:`,
					error.message
				);
				errores++;
			}
		}

		await connection.commit();

		console.log("\n📊 Resumen de actualización:");
		console.log(`   Total de pacientes: ${pacientes.length}`);
		console.log(`   Actualizados: ${actualizados}`);
		console.log(`   Ya tenían RIF: ${conRIF}`);
		console.log(`   Errores: ${errores}`);
		console.log("\n✅ Proceso completado exitosamente");
	} catch (error) {
		await connection.rollback();
		console.error("\n❌ Error al actualizar RIF de pacientes:", error.message);
		throw error;
	} finally {
		connection.release();
	}
}

// Ejecutar si se llama directamente
if (require.main === module) {
	updatePacientesRIF()
		.then(() => {
			console.log("\n✅ Proceso finalizado");
			process.exit(0);
		})
		.catch((error) => {
			console.error("\n❌ Error:", error);
			process.exit(1);
		});
}

module.exports = { updatePacientesRIF, calculateRIF, getTipoRIF, generateRandomRIF };
