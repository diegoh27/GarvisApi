const { pool } = require("../db");
const crypto = require("crypto");

// ==========================================
// RECETAS (inv_eco_insumo) — insumos por ecosonograma
// ==========================================

/**
 * Lista los insumos (receta) de un eco específico
 */
const listInsumosEcoController = async (id_eco) => {
	const sql = `
		SELECT 
			ei.id_eco_insumo,
			ei.id_eco,
			ei.id_producto,
			ei.cantidad,
			ei.creado_en,
			p.nombre AS producto_nombre,
			p.stock_base_total
		FROM inv_eco_insumo ei
		INNER JOIN inv_producto p ON p.id_producto = ei.id_producto
		WHERE ei.id_eco = ?
		ORDER BY p.nombre ASC
	`;
	const [rows] = await pool.execute(sql, [id_eco]);
	return rows;
};

/**
 * Lista todos los ecos con su conteo de insumos y costo estimado
 */
const listEcosConRecetaController = async () => {
	const sql = `
		SELECT 
			e.id_eco,
			e.nombre,
			e.precio,
			e.duracion_min,
			e.activo,
			COUNT(ei.id_eco_insumo) AS total_insumos,
			COALESCE(SUM(ei.cantidad), 0) AS total_unidades
		FROM eco e
		LEFT JOIN inv_eco_insumo ei ON ei.id_eco = e.id_eco
		WHERE e.activo = 1
		GROUP BY e.id_eco
		ORDER BY e.nombre ASC
	`;
	const [rows] = await pool.execute(sql);
	return rows;
};

/**
 * Agrega un insumo a la receta de un eco
 */
const addInsumoEcoController = async ({ id_eco, id_producto, cantidad = 1 }) => {
	// Validar eco
	const [ecoRows] = await pool.execute(
		"SELECT id_eco FROM eco WHERE id_eco = ? LIMIT 1",
		[id_eco],
	);
	if (!ecoRows.length) {
		const err = new Error("Ecosonograma no encontrado");
		err.code = "ECO_NOT_FOUND";
		throw err;
	}

	// Validar producto
	const [prodRows] = await pool.execute(
		"SELECT id_producto, nombre FROM inv_producto WHERE id_producto = ? LIMIT 1",
		[id_producto],
	);
	if (!prodRows.length) {
		const err = new Error("Producto no encontrado");
		err.code = "PRODUCTO_NOT_FOUND";
		throw err;
	}

	// Verificar que no exista ya
	const [existing] = await pool.execute(
		"SELECT id_eco_insumo FROM inv_eco_insumo WHERE id_eco = ? AND id_producto = ? LIMIT 1",
		[id_eco, id_producto],
	);
	if (existing.length > 0) {
		const err = new Error("Este insumo ya está en la receta de este ecosonograma");
		err.code = "DUPLICATE_INSUMO";
		throw err;
	}

	const id_eco_insumo = crypto.randomUUID();
	const cant = Number(cantidad);
	if (cant <= 0) {
		const err = new Error("La cantidad debe ser mayor a 0");
		err.code = "INVALID_CANTIDAD";
		throw err;
	}
	await pool.execute(
		`INSERT INTO inv_eco_insumo (id_eco_insumo, id_eco, id_producto, cantidad)
		 VALUES (?, ?, ?, ?)`,
		[id_eco_insumo, id_eco, id_producto, cant],
	);

	return {
		id_eco_insumo,
		id_eco,
		id_producto,
		producto_nombre: prodRows[0].nombre,
		cantidad: cant,
	};
};

/**
 * Actualiza la cantidad de un insumo en la receta
 */
const updateInsumoEcoController = async ({ id_eco_insumo, cantidad }) => {
	const [existing] = await pool.execute(
		"SELECT id_eco_insumo FROM inv_eco_insumo WHERE id_eco_insumo = ? LIMIT 1",
		[id_eco_insumo],
	);
	if (!existing.length) {
		const err = new Error("Insumo de receta no encontrado");
		err.code = "INSUMO_NOT_FOUND";
		throw err;
	}

	const cant = Number(cantidad);
	if (cant <= 0) {
		const err = new Error("La cantidad debe ser mayor a 0");
		err.code = "INVALID_CANTIDAD";
		throw err;
	}
	await pool.execute(
		"UPDATE inv_eco_insumo SET cantidad = ? WHERE id_eco_insumo = ?",
		[cant, id_eco_insumo],
	);

	return { id_eco_insumo, cantidad: cant };
};

/**
 * Elimina un insumo de la receta
 */
const deleteInsumoEcoController = async (id_eco_insumo) => {
	const [existing] = await pool.execute(
		"SELECT id_eco_insumo FROM inv_eco_insumo WHERE id_eco_insumo = ? LIMIT 1",
		[id_eco_insumo],
	);
	if (!existing.length) {
		const err = new Error("Insumo de receta no encontrado");
		err.code = "INSUMO_NOT_FOUND";
		throw err;
	}

	await pool.execute("DELETE FROM inv_eco_insumo WHERE id_eco_insumo = ?", [id_eco_insumo]);
	return { message: "Insumo eliminado de la receta" };
};

/**
 * Valida si hay stock suficiente para agendar una cita de un eco determinado.
 * Retorna { ok: true } si hay stock, o { ok: false, faltantes: [...] } si falta stock.
 */
const validarStockParaCitaController = async (id_eco) => {
	const [insumos] = await pool.execute(
		`SELECT 
			ei.id_producto,
			ei.cantidad AS cantidad_requerida,
			p.nombre AS producto_nombre,
			p.stock_base_total
		 FROM inv_eco_insumo ei
		 INNER JOIN inv_producto p ON p.id_producto = ei.id_producto
		 WHERE ei.id_eco = ?`,
		[id_eco],
	);

	if (insumos.length === 0) {
		// Sin receta = sin restricción de stock
		return { ok: true, insumos: [], faltantes: [] };
	}

	const faltantes = [];
	for (const ins of insumos) {
		if (Number(ins.stock_base_total) < Number(ins.cantidad_requerida)) {
			faltantes.push({
				producto: ins.producto_nombre,
				requerido: Number(ins.cantidad_requerida),
				disponible: Number(ins.stock_base_total),
				faltante: Number(ins.cantidad_requerida) - Number(ins.stock_base_total),
			});
		}
	}

	return {
		ok: faltantes.length === 0,
		insumos,
		faltantes,
	};
};

module.exports = {
	listInsumosEcoController,
	listEcosConRecetaController,
	addInsumoEcoController,
	updateInsumoEcoController,
	deleteInsumoEcoController,
	validarStockParaCitaController,
};
