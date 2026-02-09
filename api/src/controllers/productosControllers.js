const { pool } = require("../db");
const crypto = require("crypto");

// ==========================================
// PRODUCTOS
// ==========================================

/**
 * Lista todos los productos (siempre se muestran aunque stock_actual sea 0)
 */
const listProductosController = async () => {
	const sql = `
		SELECT 
			id_producto,
			nombre,
			stock_actual,
			activo,
			creado_en,
			actualizado_en
		FROM inv_producto
		ORDER BY nombre ASC
	`;
	const [rows] = await pool.execute(sql);
	return rows;
};

/**
 * Crea un producto en el inventario
 */
const createProductoController = async ({
	nombre,
	stock_actual = 0,
	activo = 1,
}) => {
	// Validar que no exista otro producto con el mismo nombre
	const [existing] = await pool.execute(
		"SELECT id_producto FROM inv_producto WHERE nombre = ? LIMIT 1",
		[nombre.trim()],
	);
	if (existing.length > 0) {
		const err = new Error("Ya existe un producto con ese nombre");
		err.code = "DUPLICATE_NAME";
		throw err;
	}

	const id_producto = crypto.randomUUID();
	const cantidad = Number(stock_actual) || 0;
	const sql = `
		INSERT INTO inv_producto (id_producto, nombre, stock_actual, activo)
		VALUES (?, ?, ?, ?)
	`;
	await pool.execute(sql, [
		id_producto,
		nombre.trim(),
		cantidad,
		activo ? 1 : 0,
	]);

	return {
		id_producto,
		nombre: nombre.trim(),
		stock_actual: cantidad,
		activo: activo ? 1 : 0,
		creado_en: new Date(),
		actualizado_en: null,
	};
};

/**
 * Obtiene un producto por id
 */
const getProductoController = async (id_producto) => {
	const [rows] = await pool.execute(
		"SELECT * FROM inv_producto WHERE id_producto = ? LIMIT 1",
		[id_producto],
	);
	if (!rows.length) {
		const err = new Error("Producto no encontrado");
		err.code = "PRODUCTO_NOT_FOUND";
		throw err;
	}
	return rows[0];
};

/**
 * Actualiza un producto
 */
const updateProductoController = async ({ id_producto, nombre, activo }) => {
	const [existing] = await pool.execute(
		"SELECT id_producto FROM inv_producto WHERE id_producto = ? LIMIT 1",
		[id_producto],
	);
	if (!existing.length) {
		const err = new Error("Producto no encontrado");
		err.code = "PRODUCTO_NOT_FOUND";
		throw err;
	}

	if (nombre !== undefined) {
		const [duplicate] = await pool.execute(
			"SELECT id_producto FROM inv_producto WHERE nombre = ? AND id_producto != ? LIMIT 1",
			[nombre.trim(), id_producto],
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
	if (activo !== undefined) {
		updates.push("activo = ?");
		values.push(activo ? 1 : 0);
	}

	if (updates.length === 0) {
		const [row] = await pool.execute(
			"SELECT * FROM inv_producto WHERE id_producto = ?",
			[id_producto],
		);
		return row[0];
	}

	updates.push("actualizado_en = CURRENT_TIMESTAMP");
	values.push(id_producto);
	const sql = `UPDATE inv_producto SET ${updates.join(", ")} WHERE id_producto = ?`;
	await pool.execute(sql, values);

	const [row] = await pool.execute(
		"SELECT * FROM inv_producto WHERE id_producto = ?",
		[id_producto],
	);
	return row[0];
};

// ==========================================
// COMPRAS DE PRODUCTOS
// ==========================================

/**
 * Registra una compra de producto y suma al stock_actual
 * Operación en transacción para garantizar consistencia
 */
const registrarCompraProductoController = async ({
	id_producto,
	fecha_ingreso,
	cantidad,
	precio_unitario,
	precio_total,
	proveedor,
	referencia,
	id_usuario,
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// Validar que el producto exista
		const [producto] = await conn.execute(
			"SELECT id_producto, stock_actual FROM inv_producto WHERE id_producto = ? LIMIT 1",
			[id_producto],
		);
		if (!producto.length) {
			const err = new Error("Producto no encontrado");
			err.code = "PRODUCTO_NOT_FOUND";
			throw err;
		}

		const cantidadNum = Number(cantidad);
		const precioUnitario = Number(precio_unitario);
		// Usar precio_total si viene, sino calcularlo
		const precioTotal =
			precio_total !== undefined
				? Number(precio_total)
				: cantidadNum * precioUnitario;

		// Insertar compra
		const id_compra = crypto.randomUUID();
		await conn.execute(
			`INSERT INTO inv_producto_compra 
			(id_compra, id_producto, fecha_ingreso, cantidad, precio_unitario, precio_total, proveedor, referencia, id_usuario)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id_compra,
				id_producto,
				fecha_ingreso,
				cantidadNum,
				precioUnitario,
				precioTotal,
				proveedor || null,
				referencia || null,
				id_usuario,
			],
		);

		// Sumar al stock_actual
		await conn.execute(
			`UPDATE inv_producto SET stock_actual = stock_actual + ?, actualizado_en = CURRENT_TIMESTAMP WHERE id_producto = ?`,
			[cantidadNum, id_producto],
		);

		await conn.commit();

		return {
			id_compra,
			id_producto,
			fecha_ingreso,
			cantidad: cantidadNum,
			precio_unitario: precioUnitario,
			precio_total: precioTotal,
			proveedor,
			referencia,
			id_usuario,
		};
	} finally {
		conn.release();
	}
};

/**
 * Lista las compras de un producto específico
 */
const listComprasProductoController = async (id_producto) => {
	const [rows] = await pool.execute(
		`SELECT 
			id_compra,
			id_producto,
			fecha_ingreso,
			cantidad,
			precio_unitario,
			precio_total,
			proveedor,
			referencia,
			id_usuario,
			creado_en
		FROM inv_producto_compra
		WHERE id_producto = ?
		ORDER BY fecha_ingreso DESC`,
		[id_producto],
	);
	return rows;
};

/**
 * Lista todas las compras de todos los productos (historial general)
 */
const listHistorialComprasController = async ({ limit = 200 } = {}) => {
	const limitNum = Math.min(
		Math.max(1, parseInt(Number(limit), 10) || 200),
		500,
	);
	const sql = `
		SELECT 
			c.id_compra,
			c.id_producto,
			p.nombre AS nombre_producto,
			c.fecha_ingreso,
			c.cantidad,
			c.precio_unitario,
			c.precio_total,
			c.proveedor,
			c.referencia,
			c.id_usuario,
			c.creado_en
		FROM inv_producto_compra c
		INNER JOIN inv_producto p ON p.id_producto = c.id_producto
		ORDER BY c.fecha_ingreso DESC, c.creado_en DESC
		LIMIT ${limitNum}
	`;
	const [rows] = await pool.execute(sql);
	return rows;
};

// ==========================================
// AJUSTES DE STOCK
// ==========================================

/**
 * Realiza un ajuste de stock manual (cambiar cantidad)
 * Operación en transacción para garantizar consistencia
 */
const registrarAjusteStockController = async ({
	id_producto,
	stock_nuevo,
	motivo,
	id_usuario,
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// Obtener stock anterior
		const [producto] = await conn.execute(
			"SELECT stock_actual FROM inv_producto WHERE id_producto = ? LIMIT 1",
			[id_producto],
		);
		if (!producto.length) {
			const err = new Error("Producto no encontrado");
			err.code = "PRODUCTO_NOT_FOUND";
			throw err;
		}

		const stock_anterior = producto[0].stock_actual;
		const stock_nuevoNum = Number(stock_nuevo);

		// Registrar ajuste
		const id_ajuste = crypto.randomUUID();
		await conn.execute(
			`INSERT INTO inv_producto_ajuste 
			(id_ajuste, id_producto, fecha, stock_anterior, stock_nuevo, motivo, id_usuario)
			VALUES (?, ?, CURDATE(), ?, ?, ?, ?)`,
			[
				id_ajuste,
				id_producto,
				stock_anterior,
				stock_nuevoNum,
				motivo || null,
				id_usuario,
			],
		);

		// Actualizar stock_actual
		await conn.execute(
			`UPDATE inv_producto SET stock_actual = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id_producto = ?`,
			[stock_nuevoNum, id_producto],
		);

		await conn.commit();

		return {
			id_ajuste,
			id_producto,
			fecha: new Date().toISOString().slice(0, 10),
			stock_anterior,
			stock_nuevo: stock_nuevoNum,
			motivo,
			id_usuario,
		};
	} finally {
		conn.release();
	}
};

/**
 * Lista los ajustes de stock de un producto específico
 */
const listAjustesProductoController = async (id_producto) => {
	const [rows] = await pool.execute(
		`SELECT 
			id_ajuste,
			id_producto,
			fecha,
			stock_anterior,
			stock_nuevo,
			motivo,
			id_usuario,
			creado_en
		FROM inv_producto_ajuste
		WHERE id_producto = ?
		ORDER BY fecha DESC`,
		[id_producto],
	);
	return rows;
};

/**
 * Lista todos los ajustes de todos los productos (historial general)
 */
const listHistorialAjustesController = async ({ limit = 200 } = {}) => {
	const limitNum = Math.min(
		Math.max(1, parseInt(Number(limit), 10) || 200),
		500,
	);
	const sql = `
		SELECT 
			a.id_ajuste,
			a.id_producto,
			p.nombre AS nombre_producto,
			a.fecha,
			a.stock_anterior,
			a.stock_nuevo,
			a.motivo,
			a.id_usuario,
			a.creado_en
		FROM inv_producto_ajuste a
		INNER JOIN inv_producto p ON p.id_producto = a.id_producto
		ORDER BY a.fecha DESC, a.creado_en DESC
		LIMIT ${limitNum}
	`;
	const [rows] = await pool.execute(sql);
	return rows;
};

/**
 * Actualiza una compra de producto existente
 */
const updateCompraProductoController = async ({
	id_compra,
	id_producto,
	fecha_ingreso,
	cantidad,
	precio_unitario,
	precio_total,
	proveedor,
	referencia,
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// Obtener la compra actual
		const [compraActual] = await conn.execute(
			"SELECT id_compra, id_producto, cantidad FROM inv_producto_compra WHERE id_compra = ? LIMIT 1",
			[id_compra],
		);
		if (!compraActual.length) {
			const err = new Error("Compra no encontrada");
			err.code = "COMPRA_NOT_FOUND";
			throw err;
		}

		const compra = compraActual[0];
		const cantidadAnterior = Number(compra.cantidad);
		const cantidadNueva =
			cantidad !== undefined ? Number(cantidad) : cantidadAnterior;
		const diferenciaCantidad = cantidadNueva - cantidadAnterior;

		// Construir la actualización de la compra
		const updates = [];
		const params = [];

		if (fecha_ingreso !== undefined) {
			updates.push("fecha_ingreso = ?");
			params.push(fecha_ingreso);
		}
		if (cantidad !== undefined) {
			updates.push("cantidad = ?");
			params.push(cantidadNueva);
		}
		if (precio_unitario !== undefined) {
			updates.push("precio_unitario = ?");
			params.push(Number(precio_unitario));
		}
		if (precio_total !== undefined) {
			updates.push("precio_total = ?");
			params.push(Number(precio_total));
		} else if (precio_unitario !== undefined && cantidad !== undefined) {
			// Recalcular precio_total si se cambian ambos
			updates.push("precio_total = ?");
			params.push(Number(precio_unitario) * cantidadNueva);
		}
		if (proveedor !== undefined) {
			updates.push("proveedor = ?");
			params.push(proveedor || null);
		}
		if (referencia !== undefined) {
			updates.push("referencia = ?");
			params.push(referencia || null);
		}

		if (updates.length > 0) {
			params.push(id_compra);
			await conn.execute(
				`UPDATE inv_producto_compra SET ${updates.join(", ")} WHERE id_compra = ?`,
				params,
			);
		}

		// Ajustar stock_actual si cambió la cantidad
		if (diferenciaCantidad !== 0) {
			await conn.execute(
				`UPDATE inv_producto SET stock_actual = stock_actual + ?, actualizado_en = CURRENT_TIMESTAMP WHERE id_producto = ?`,
				[diferenciaCantidad, compra.id_producto],
			);
		}

		await conn.commit();

		// Obtener la compra actualizada
		const [compraActualizada] = await conn.execute(
			`SELECT 
				id_compra,
				id_producto,
				fecha_ingreso,
				cantidad,
				precio_unitario,
				precio_total,
				proveedor,
				referencia,
				id_usuario,
				creado_en
			FROM inv_producto_compra WHERE id_compra = ? LIMIT 1`,
			[id_compra],
		);

		return compraActualizada[0];
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

module.exports = {
	// Productos
	listProductosController,
	createProductoController,
	getProductoController,
	updateProductoController,
	// Compras
	registrarCompraProductoController,
	updateCompraProductoController,
	listComprasProductoController,
	listHistorialComprasController,
	// Ajustes
	registrarAjusteStockController,
	listAjustesProductoController,
	listHistorialAjustesController,
};
