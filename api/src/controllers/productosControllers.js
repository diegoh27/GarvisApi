const { pool } = require("../db");
const crypto = require("crypto");

/**
 * Lista productos con datos de producto y agregados de producto_lote:
 * cantidad (stock actual = suma de lotes), fecha_ingreso (más reciente), fecha_vencimiento (más próxima).
 */
const listProductosController = async () => {
	const sql = `
    SELECT
      p.id_producto,
      p.nombre,
      p.unidad,
      p.stock_minimo,
      p.precio,
      p.activo,
      COALESCE(SUM(l.cantidad), 0) AS cantidad,
      (SELECT MAX(l2.fecha_ingreso) FROM producto_lote l2 WHERE l2.id_producto = p.id_producto) AS fecha_ingreso,
      (SELECT MIN(l2.fecha_vencimiento) FROM producto_lote l2 WHERE l2.id_producto = p.id_producto AND l2.fecha_vencimiento IS NOT NULL) AS fecha_vencimiento
    FROM producto p
    LEFT JOIN producto_lote l ON l.id_producto = p.id_producto
    GROUP BY p.id_producto, p.nombre, p.unidad, p.stock_minimo, p.precio, p.activo
    ORDER BY p.nombre ASC
  `;
	const [rows] = await pool.execute(sql);
	return rows;
};

/**
 * Crea un producto.
 * @param {{ nombre: string, unidad: string, stock_minimo: number, precio: number, activo?: number }}
 */
const createProductoController = async ({
	nombre,
	unidad,
	stock_minimo = 0,
	precio,
	activo = 1,
}) => {
	const [existing] = await pool.execute(
		"SELECT id_producto FROM producto WHERE nombre = ? LIMIT 1",
		[nombre.trim()]
	);
	if (existing.length > 0) {
		const err = new Error("Ya existe un producto con ese nombre");
		err.code = "DUPLICATE_NAME";
		throw err;
	}

	const id_producto = crypto.randomUUID();
	const sql = `
    INSERT INTO producto (id_producto, nombre, unidad, stock_minimo, activo, precio)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
	await pool.execute(sql, [
		id_producto,
		nombre.trim(),
		unidad.trim(),
		Number(stock_minimo) || 0,
		activo ? 1 : 0,
		Number(precio),
	]);
	return {
		id_producto,
		nombre: nombre.trim(),
		unidad: unidad.trim(),
		stock_minimo: Number(stock_minimo) || 0,
		activo: activo ? 1 : 0,
		precio: Number(precio),
	};
};

/**
 * Crea un lote para un producto (entrada de stock) y opcionalmente registra el movimiento.
 * @param {{ id_producto: string, cantidad: number, fecha_ingreso: string, fecha_vencimiento?: string, costo_total?: number, id_usuario?: string }}
 */
const createProductoLoteController = async ({
	id_producto,
	cantidad,
	fecha_ingreso,
	fecha_vencimiento = null,
	costo_total = null,
	id_usuario = null,
}) => {
	const [productoRows] = await pool.execute(
		"SELECT id_producto FROM producto WHERE id_producto = ? LIMIT 1",
		[id_producto]
	);
	if (!productoRows.length) {
		const err = new Error("Producto no encontrado");
		err.code = "PRODUCTO_NOT_FOUND";
		throw err;
	}

	const id_lote = crypto.randomUUID();
	const cantidadNum = Number(cantidad);
	const costoVal = costo_total != null ? Number(costo_total) : null;
	try {
		const sql = `
      INSERT INTO producto_lote (id_lote, id_producto, cantidad, fecha_vencimiento, fecha_ingreso, costo_total)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
		await pool.execute(sql, [
			id_lote,
			id_producto,
			cantidadNum,
			fecha_vencimiento || null,
			fecha_ingreso,
			costoVal,
		]);
	} catch (err) {
		if (err.message && err.message.includes("costo_total")) {
			const sqlFallback = `
        INSERT INTO producto_lote (id_lote, id_producto, cantidad, fecha_vencimiento, fecha_ingreso)
        VALUES (?, ?, ?, ?, ?)
      `;
			await pool.execute(sqlFallback, [
				id_lote,
				id_producto,
				cantidadNum,
				fecha_vencimiento || null,
				fecha_ingreso,
			]);
		} else {
			throw err;
		}
	}

	if (id_usuario) {
		const id_movimiento = crypto.randomUUID();
		await pool.execute(
			`INSERT INTO inventario_movimiento (id_movimiento, id_producto, tipo, cantidad, motivo, id_usuario)
       VALUES (?, ?, 'Entrada', ?, ?, ?)`,
			[
				id_movimiento,
				id_producto,
				Number(cantidad),
				"Entrada de lote",
				id_usuario,
			]
		);
	}

	return {
		id_lote,
		id_producto,
		cantidad: cantidadNum,
		fecha_ingreso,
		fecha_vencimiento: fecha_vencimiento || null,
		costo_total: costoVal,
	};
};

/**
 * Lista los lotes de un producto (ordenados por fecha_ingreso desc).
 */
const listLotesByProductoController = async (id_producto) => {
	const [rows] = await pool.execute(
		`SELECT id_lote, id_producto, cantidad, fecha_ingreso, fecha_vencimiento, costo_total
     FROM producto_lote
     WHERE id_producto = ?
     ORDER BY fecha_ingreso DESC, id_lote ASC`,
		[id_producto]
	);
	return rows;
};

/**
 * Actualiza un lote. Solo actualiza campos enviados.
 * @param {{ id_lote: string, id_producto: string, cantidad?: number, fecha_ingreso?: string, fecha_vencimiento?: string, costo_total?: number }}
 */
const updateProductoLoteController = async ({
	id_lote,
	id_producto,
	cantidad,
	fecha_ingreso,
	fecha_vencimiento,
	costo_total,
}) => {
	const [existing] = await pool.execute(
		"SELECT id_lote FROM producto_lote WHERE id_lote = ? AND id_producto = ? LIMIT 1",
		[id_lote, id_producto]
	);
	if (!existing.length) {
		const err = new Error("Lote no encontrado");
		err.code = "LOTE_NOT_FOUND";
		throw err;
	}

	const updates = [];
	const values = [];
	if (cantidad !== undefined) {
		updates.push("cantidad = ?");
		values.push(Number(cantidad));
	}
	if (fecha_ingreso !== undefined) {
		updates.push("fecha_ingreso = ?");
		values.push(fecha_ingreso);
	}
	if (fecha_vencimiento !== undefined) {
		updates.push("fecha_vencimiento = ?");
		values.push(fecha_vencimiento || null);
	}
	if (costo_total !== undefined) {
		updates.push("costo_total = ?");
		values.push(
			costo_total === null || costo_total === "" ? null : Number(costo_total)
		);
	}

	if (updates.length === 0) {
		const [row] = await pool.execute(
			"SELECT id_lote, id_producto, cantidad, fecha_ingreso, fecha_vencimiento, costo_total FROM producto_lote WHERE id_lote = ?",
			[id_lote]
		);
		return row[0];
	}

	values.push(id_lote);
	await pool.execute(
		`UPDATE producto_lote SET ${updates.join(", ")} WHERE id_lote = ?`,
		values
	);
	const [row] = await pool.execute(
		"SELECT id_lote, id_producto, cantidad, fecha_ingreso, fecha_vencimiento, costo_total FROM producto_lote WHERE id_lote = ?",
		[id_lote]
	);
	return row[0];
};

/**
 * Actualiza un producto por id_producto.
 * @param {{ id_producto: string, nombre?: string, unidad?: string, stock_minimo?: number, precio?: number, activo?: number }}
 */
const updateProductoController = async ({
	id_producto,
	nombre,
	unidad,
	stock_minimo,
	precio,
	activo,
}) => {
	const [existing] = await pool.execute(
		"SELECT id_producto FROM producto WHERE id_producto = ? LIMIT 1",
		[id_producto]
	);
	if (!existing.length) {
		const err = new Error("Producto no encontrado");
		err.code = "PRODUCTO_NOT_FOUND";
		throw err;
	}

	if (nombre !== undefined) {
		const [duplicate] = await pool.execute(
			"SELECT id_producto FROM producto WHERE nombre = ? AND id_producto != ? LIMIT 1",
			[nombre.trim(), id_producto]
		);
		if (duplicate.length > 0) {
			const err = new Error("Ya existe otro producto con ese nombre");
			err.code = "DUPLICATE_NAME";
			throw err;
		}
	}

	const updates = [];
	const values = [];
	if (nombre !== undefined) {
		updates.push("nombre = ?");
		values.push(nombre.trim());
	}
	if (unidad !== undefined) {
		updates.push("unidad = ?");
		values.push(unidad.trim());
	}
	if (stock_minimo !== undefined) {
		updates.push("stock_minimo = ?");
		values.push(Number(stock_minimo) || 0);
	}
	if (precio !== undefined) {
		updates.push("precio = ?");
		values.push(Number(precio));
	}
	if (activo !== undefined) {
		updates.push("activo = ?");
		values.push(activo ? 1 : 0);
	}

	if (updates.length === 0) {
		const [row] = await pool.execute(
			"SELECT id_producto, nombre, unidad, stock_minimo, precio, activo FROM producto WHERE id_producto = ?",
			[id_producto]
		);
		return row[0];
	}

	values.push(id_producto);
	const sql = `UPDATE producto SET ${updates.join(", ")} WHERE id_producto = ?`;
	await pool.execute(sql, values);

	const [row] = await pool.execute(
		"SELECT id_producto, nombre, unidad, stock_minimo, precio, activo FROM producto WHERE id_producto = ?",
		[id_producto]
	);
	return row[0];
};

/**
 * Historial de lotes de compras (todos los productos), ordenado por fecha_ingreso desc.
 * @param {{ limit?: number }} limit opcional, default 200
 */
const listHistorialLotesController = async ({ limit = 200 } = {}) => {
	const limitNum = Math.min(
		Math.max(1, parseInt(Number(limit), 10) || 200),
		500
	);
	const sql = `SELECT
      l.id_lote,
      l.id_producto,
      p.nombre AS nombre_producto,
      l.cantidad,
      l.fecha_ingreso,
      l.fecha_vencimiento,
      l.costo_total
    FROM producto_lote l
    INNER JOIN producto p ON p.id_producto = l.id_producto
    ORDER BY l.fecha_ingreso DESC, l.id_lote DESC
    LIMIT ${limitNum}`;
	const [rows] = await pool.execute(sql);
	return rows.map((row) => ({
		id_lote: row.id_lote,
		id_producto: row.id_producto,
		nombre_producto: row.nombre_producto,
		cantidad: row.cantidad,
		fecha_ingreso:
			row.fecha_ingreso instanceof Date
				? row.fecha_ingreso.toISOString().slice(0, 10)
				: String(row.fecha_ingreso).slice(0, 10),
		fecha_vencimiento: row.fecha_vencimiento
			? row.fecha_vencimiento instanceof Date
				? row.fecha_vencimiento.toISOString().slice(0, 10)
				: String(row.fecha_vencimiento).slice(0, 10)
			: null,
		costo_total: row.costo_total != null ? Number(row.costo_total) : null,
	}));
};

/**
 * Gasto total en compras (entradas/lotes) en un rango de fechas.
 * Suma costo_total de producto_lote donde fecha_ingreso está entre desde y hasta.
 * @param {{ desde: string (YYYY-MM-DD), hasta: string (YYYY-MM-DD) }}
 * @returns {{ total: number, por_dia: Array<{ fecha: string, total: number, entradas: number }> }}
 */
const getGastoProductosController = async ({ desde, hasta }) => {
	const [porDia] = await pool.execute(
		`SELECT
			fecha_ingreso AS fecha,
			SUM(COALESCE(costo_total, 0)) AS total,
			COUNT(*) AS entradas
		FROM producto_lote
		WHERE fecha_ingreso BETWEEN ? AND ?
		GROUP BY fecha_ingreso
		ORDER BY fecha_ingreso ASC`,
		[desde, hasta]
	);

	const total = porDia.reduce((acc, row) => acc + Number(row.total || 0), 0);

	return {
		total: Math.round(total * 100) / 100,
		por_dia: porDia.map((row) => ({
			fecha:
				row.fecha instanceof Date
					? row.fecha.toISOString().slice(0, 10)
					: String(row.fecha).slice(0, 10),
			total: Math.round(Number(row.total || 0) * 100) / 100,
			entradas: Number(row.entradas || 0),
		})),
	};
};

module.exports = {
	listProductosController,
	createProductoController,
	createProductoLoteController,
	listLotesByProductoController,
	listHistorialLotesController,
	updateProductoLoteController,
	updateProductoController,
	getGastoProductosController,
};
