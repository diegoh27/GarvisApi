const { pool } = require("../db");
require("dotenv").config();

async function runMigration() {
	try {
		console.log("🚀 Iniciando migración de Inventario FASE 5 (UI Gerencial)");

		// 1. Agregar columnas si no existen
		try {
			await pool.query(
				"ALTER TABLE inv_producto ADD COLUMN categoria VARCHAR(100) DEFAULT 'General'",
			);
			console.log("✅ Columna 'categoria' añadida.");
		} catch (err) {
			if (err.code === "ER_DUP_FIELDNAME") {
				console.log("ℹ️ La columna 'categoria' ya existe.");
			} else {
				throw err;
			}
		}

		try {
			await pool.query(
				"ALTER TABLE inv_producto ADD COLUMN consumo_actual DECIMAL(12,4) DEFAULT 0.0000",
			);
			console.log("✅ Columna 'consumo_actual' añadida.");
		} catch (err) {
			if (err.code === "ER_DUP_FIELDNAME") {
				console.log("ℹ️ La columna 'consumo_actual' ya existe.");
			} else {
				throw err;
			}
		}

		// 2. Refactorizar el stock fraccional anterior a "Stock Entero + Consumo_Actual"
		console.log("🔄 Recalculando inventarios de volumen total a formato Gerencial...");
		const [productos] = await pool.query(
			"SELECT id_producto, stock_actual, contenido, unidad_medida FROM inv_producto",
		);

		let count = 0;
		for (const prod of productos) {
			const st = Number(prod.stock_actual);
			const ct = Number(prod.contenido > 0 ? prod.contenido : 1);

			// El inventario pasado guardaba (Cajas * Contenido) en la base de datos
			// Ejemplo: comprabas 15 cajas de 1000ml -> stock_actual era 15000.
			// Revertimos esto:
			// Cajas = Math.floor(15000 / 1000) = 15
			// Consumo/Excedente = 15000 % 1000 = 0 (Lo ya gastado de la caja abierta se resta en vez de sumar? 
			// ¡OJO! Si teníamos 14500 ml -> Son 14 cajas enteras + 500ml excedentes.
			// Pero espera: el "consumo_actual" mide lo GASTADO.
			// Si tengo 14 cajas completas y 500ml excedentes (de una caja de 1000ml)...
			// Significa que "tengo" la caja abierta número 15, y se han GASTADO 500ml.
			// Entonces:
			// stock_actual = Cajas Enteras + (Si hay excedente, +1 Caja abierta)
			// consumo_actual = Contenido de la presentación - Excedente.

			let cajasEnterasCompletas = Math.floor(st / ct);
			let liquidoSobrante = st % ct;

			let stockFinal = cajasEnterasCompletas;
			let consumoFinal = 0;

			if (liquidoSobrante > 0) {
				stockFinal += 1; // Añadimos la caja que está abierta al stock_actual
				consumoFinal = ct - liquidoSobrante; // Cantidad consumida de esa caja
			} else if (liquidoSobrante < 0) { 
				// Casos de negativos
				stockFinal = cajasEnterasCompletas;
				consumoFinal = 0;
			}

			// Asegurarnos que no tenga decimales largos por imprecisión JS
			consumoFinal = parseFloat(consumoFinal.toFixed(4));

			await pool.query(
				"UPDATE inv_producto SET stock_actual = ?, consumo_actual = ? WHERE id_producto = ?",
				[stockFinal, consumoFinal, prod.id_producto],
			);
			count++;
		}

		console.log(`✅ ¡Recalculados ${count} productos exitosamente!`);
		console.log("🎉 Migración FASE 5 completada.");
	} catch (error) {
		console.error("❌ Error en la migración:", error);
	} finally {
		process.exit(0);
	}
}

runMigration();
