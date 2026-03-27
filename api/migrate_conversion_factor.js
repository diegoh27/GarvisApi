/**
 * Migration: Conversion Factor System
 * Alters the existing inv_producto table to add new columns and remove old ones.
 * Run once: node migrate_conversion_factor.js
 */
const { pool } = require("./src/db");

async function migrate() {
	const conn = await pool.getConnection();
	try {
		console.log("🔄 Starting conversion factor migration...");

		// 1) Add new columns (IF NOT EXISTS via checking INFORMATION_SCHEMA)
		const [cols] = await conn.execute(
			`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inv_producto'`
		);
		const existingCols = new Set(cols.map((c) => c.COLUMN_NAME));

		if (!existingCols.has("categoria")) {
			await conn.execute(`ALTER TABLE inv_producto ADD COLUMN categoria VARCHAR(50) NOT NULL DEFAULT 'General' AFTER presentacion`);
			console.log("  ✅ Added: categoria");
		}
		if (!existingCols.has("unidad_compra")) {
			await conn.execute(`ALTER TABLE inv_producto ADD COLUMN unidad_compra VARCHAR(50) NOT NULL DEFAULT 'Unidad' AFTER categoria`);
			console.log("  ✅ Added: unidad_compra");
		}
		if (!existingCols.has("unidad_consumo")) {
			await conn.execute(`ALTER TABLE inv_producto ADD COLUMN unidad_consumo VARCHAR(50) NOT NULL DEFAULT 'Unidad' AFTER unidad_compra`);
			console.log("  ✅ Added: unidad_consumo");
		}
		if (!existingCols.has("factor_conversion")) {
			await conn.execute(`ALTER TABLE inv_producto ADD COLUMN factor_conversion DECIMAL(12,4) NOT NULL DEFAULT 1.0000 AFTER unidad_consumo`);
			console.log("  ✅ Added: factor_conversion");
		}
		if (!existingCols.has("stock_base_total")) {
			// Copy data from stock_actual if it exists
			if (existingCols.has("stock_actual")) {
				await conn.execute(`ALTER TABLE inv_producto ADD COLUMN stock_base_total DECIMAL(12,4) NOT NULL DEFAULT 0 AFTER factor_conversion`);
				await conn.execute(`UPDATE inv_producto SET stock_base_total = stock_actual`);
				console.log("  ✅ Added: stock_base_total (copied from stock_actual)");
			} else {
				await conn.execute(`ALTER TABLE inv_producto ADD COLUMN stock_base_total DECIMAL(12,4) NOT NULL DEFAULT 0 AFTER factor_conversion`);
				console.log("  ✅ Added: stock_base_total");
			}
		}
		if (!existingCols.has("consumo_actual")) {
			await conn.execute(`ALTER TABLE inv_producto ADD COLUMN consumo_actual DECIMAL(12,4) NOT NULL DEFAULT 0 AFTER stock_base_total`);
			console.log("  ✅ Added: consumo_actual");
		}
		if (!existingCols.has("stock_minimo_base")) {
			await conn.execute(`ALTER TABLE inv_producto ADD COLUMN stock_minimo_base DECIMAL(12,4) NOT NULL DEFAULT 0 AFTER consumo_actual`);
			console.log("  ✅ Added: stock_minimo_base");
		}

		// 2) Copy contenido -> factor_conversion if contenido exists and factor_conversion was just added
		if (existingCols.has("contenido") && !existingCols.has("factor_conversion")) {
			// Already handled above but just in case
		} else if (existingCols.has("contenido")) {
			await conn.execute(`UPDATE inv_producto SET factor_conversion = GREATEST(contenido, 1) WHERE factor_conversion = 1 AND contenido > 1`);
			console.log("  ✅ Copied contenido -> factor_conversion for existing products");
		}

		// 3) Copy unidad_medida -> unidad_consumo if unidad_medida exists
		if (existingCols.has("unidad_medida")) {
			await conn.execute(`UPDATE inv_producto SET unidad_consumo = unidad_medida WHERE unidad_medida IS NOT NULL AND unidad_medida != '' AND unidad_consumo = 'Unidad'`);
			console.log("  ✅ Copied unidad_medida -> unidad_consumo for existing products");
		}

		console.log("\n✅ Migration complete! The old columns (stock_actual, contenido, unidad_medida) are kept for safety.");
		console.log("   You can drop them later if everything works fine:");
		console.log("   ALTER TABLE inv_producto DROP COLUMN stock_actual, DROP COLUMN contenido, DROP COLUMN unidad_medida;");

	} catch (err) {
		console.error("❌ Migration failed:", err.message);
		throw err;
	} finally {
		conn.release();
		await pool.end();
	}
}

migrate().catch(() => process.exit(1));
