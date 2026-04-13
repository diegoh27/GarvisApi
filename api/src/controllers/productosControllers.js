const { pool } = require("../db");
const crypto = require("crypto");
const { getTodayBcvRate, normalizeUsdAmounts } = require("../utils/currency");

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
			presentacion,
			categoria,
			unidad_compra,
			unidad_consumo,
			factor_conversion,
			stock_base_total,
			consumo_actual,
			stock_minimo_base,
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
	presentacion,
	categoria,
	unidad_compra,
	unidad_consumo,
	factor_conversion = 1,
	stock_base_total = 0,
	stock_minimo_base = 0,
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
	const cantidad = Number(stock_base_total) || 0;
	const fConv = Number(factor_conversion) || 1;
	const sMin = Number(stock_minimo_base) || 0;
	const sql = `
		INSERT INTO inv_producto (id_producto, nombre, presentacion, categoria, unidad_compra, unidad_consumo, factor_conversion, stock_base_total, consumo_actual, stock_minimo_base, activo)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.0000, ?, ?)
	`;
	await pool.execute(sql, [
		id_producto,
		nombre.trim(),
		presentacion ? presentacion.trim() : null,
		categoria ? categoria.trim() : 'General',
		unidad_compra ? unidad_compra.trim() : null,
		unidad_consumo ? unidad_consumo.trim() : null,
		fConv,
		cantidad,
		sMin,
		activo ? 1 : 0,
	]);

	return {
		id_producto,
		nombre: nombre.trim(),
		presentacion: presentacion ? presentacion.trim() : null,
		categoria: categoria ? categoria.trim() : 'General',
		unidad_compra: unidad_compra ? unidad_compra.trim() : null,
		unidad_consumo: unidad_consumo ? unidad_consumo.trim() : null,
		factor_conversion: fConv,
		stock_base_total: cantidad,
		consumo_actual: 0,
		stock_minimo_base: sMin,
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
const updateProductoController = async ({ 
	id_producto, 
	nombre, 
	presentacion, 
	categoria, 
	unidad_compra, 
	unidad_consumo, 
	factor_conversion, 
	stock_minimo_base, 
	activo 
}) => {
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
	if (presentacion !== undefined) {
		updates.push("presentacion = ?");
		values.push(presentacion === "" ? null : presentacion.trim());
	}
	if (categoria !== undefined) {
		updates.push("categoria = ?");
		values.push(categoria === "" ? 'General' : categoria.trim());
	}
	if (unidad_compra !== undefined) {
		updates.push("unidad_compra = ?");
		values.push(unidad_compra === "" ? null : unidad_compra.trim());
	}
	if (unidad_consumo !== undefined) {
		updates.push("unidad_consumo = ?");
		values.push(unidad_consumo === "" ? null : unidad_consumo.trim());
	}
	if (factor_conversion !== undefined) {
		updates.push("factor_conversion = ?");
		values.push(Number(factor_conversion) || 1);
	}
	if (stock_minimo_base !== undefined) {
		updates.push("stock_minimo_base = ?");
		values.push(Number(stock_minimo_base) || 0);
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

/**
 * Elimina un producto y todos sus registros asociados (compras, ajustes, kardex, recetas, consumos)
 * Usa transacción para garantizar consistencia
 */
const deleteProductoController = async (id_producto) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// Verificar que el producto existe
		const [existing] = await conn.execute(
			"SELECT id_producto, nombre FROM inv_producto WHERE id_producto = ? LIMIT 1",
			[id_producto]
		);
		if (!existing.length) {
			const err = new Error("Producto no encontrado");
			err.code = "PRODUCTO_NOT_FOUND";
			throw err;
		}

		// Eliminar registros hijos en orden (tablas que referencian inv_producto)
		// 1) Kardex
		await conn.execute("DELETE FROM inv_kardex WHERE id_producto = ?", [id_producto]);
		// 2) Consumos de citas
		await conn.execute("DELETE FROM inv_cita_consumo WHERE id_producto = ?", [id_producto]);
		// 3) Recetas (eco-insumos)
		await conn.execute("DELETE FROM inv_eco_insumo WHERE id_producto = ?", [id_producto]);
		// 4) Detalle de notas de compra
		await conn.execute("DELETE FROM inv_nota_compra_detalle WHERE id_producto = ?", [id_producto]);
		// 5) Movimientos de facturación ligados a compras de este producto
		const [compras] = await conn.execute(
			"SELECT id_compra FROM inv_producto_compra WHERE id_producto = ?",
			[id_producto]
		);
		for (const compra of compras) {
			await conn.execute(
				"DELETE FROM fac_movimiento WHERE origen_modulo = 'INV_COMPRA' AND origen_id = ?",
				[compra.id_compra]
			);
		}
		// 6) Compras
		await conn.execute("DELETE FROM inv_producto_compra WHERE id_producto = ?", [id_producto]);
		// 7) Ajustes
		await conn.execute("DELETE FROM inv_producto_ajuste WHERE id_producto = ?", [id_producto]);

		// Finalmente eliminar el producto
		await conn.execute("DELETE FROM inv_producto WHERE id_producto = ?", [id_producto]);

		await conn.commit();
		return existing[0];
	} catch (error) {
		await conn.rollback();
		throw error;
	} finally {
		conn.release();
	}
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
			"SELECT id_producto, nombre, stock_base_total, factor_conversion FROM inv_producto WHERE id_producto = ? LIMIT 1",
			[id_producto],
		);
		if (!producto.length) {
			const err = new Error("Producto no encontrado");
			err.code = "PRODUCTO_NOT_FOUND";
			throw err;
		}

		const cantidadNum = Number(cantidad);
		const cantidadIngresadaBase = cantidadNum * (Number(producto[0].factor_conversion) || 1);
		const precioUnitario = Number(precio_unitario);
		// Usar precio_total si viene, sino calcularlo
		const precioTotal =
			precio_total !== undefined
				? Number(precio_total)
				: cantidadNum * precioUnitario;
		const tasaDiaBcv = await getTodayBcvRate();
		const normalized = normalizeUsdAmounts({
			montoUsd: precioTotal,
			tasaBcv: tasaDiaBcv,
		});

		// Insertar compra
		const id_compra = crypto.randomUUID();
		await conn.execute(
			`INSERT INTO inv_producto_compra 
			(id_compra, id_producto, fecha_ingreso, cantidad, precio_unitario, precio_total, monto_usd, monto_bs, tasa_dia_bcv, proveedor, referencia, id_usuario)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id_compra,
				id_producto,
				fecha_ingreso,
				cantidadNum,
				precioUnitario,
				precioTotal,
				normalized.monto_usd,
				normalized.monto_bs,
				normalized.tasa_dia_bcv,
				proveedor || null,
				referencia || null,
				id_usuario,
			],
		);

		// Sumar al stock_base_total
		await conn.execute(
			`UPDATE inv_producto SET stock_base_total = stock_base_total + ?, actualizado_en = CURRENT_TIMESTAMP WHERE id_producto = ?`,
			[cantidadIngresadaBase, id_producto],
		);

		await conn.execute(
			`INSERT INTO fac_movimiento
				(id_movimiento, tipo, fecha, monto, monto_usd, monto_bs, tasa_dia_bcv, descripcion, referencia, origen_modulo, origen_id, id_usuario, creado_en)
			 VALUES
				(UUID(), 'Egreso', ?, ?, ?, ?, ?, ?, ?, 'INV_COMPRA', ?, ?, NOW())`,
			[
				fecha_ingreso,
				normalized.monto_usd,
				normalized.monto_usd,
				normalized.monto_bs,
				normalized.tasa_dia_bcv,
				`Compra de inventario - ${producto[0].nombre} x${cantidadNum}`,
				referencia || id_compra,
				id_compra,
				id_usuario,
			],
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

		// Obtener stock anterior y nombre
		const [producto] = await conn.execute(
			"SELECT stock_base_total, nombre FROM inv_producto WHERE id_producto = ? LIMIT 1",
			[id_producto],
		);
		if (!producto.length) {
			const err = new Error("Producto no encontrado");
			err.code = "PRODUCTO_NOT_FOUND";
			throw err;
		}

		const stock_anterior = producto[0].stock_base_total;
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

		// Actualizar stock_base_total
		await conn.execute(
			`UPDATE inv_producto SET stock_base_total = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id_producto = ?`,
			[stock_nuevoNum, id_producto],
		);

		// Registrar en el Kardex
		const id_kardex = crypto.randomUUID();
		const tipoMovimiento = stock_nuevoNum > stock_anterior ? 'ENTRADA' : 'SALIDA';
		const cantidadAjuste = Math.abs(stock_nuevoNum - stock_anterior);
		
		await conn.execute(
			`INSERT INTO inv_kardex 
			(id_kardex, id_producto, tipo_movimiento, cantidad, stock_anterior, stock_posterior, referencia_tipo, referencia_id, id_usuario, observaciones)
			VALUES (?, ?, ?, ?, ?, ?, 'AJUSTE', ?, ?, ?)`,
			[
				id_kardex,
				id_producto,
				tipoMovimiento,
				cantidadAjuste,
				stock_anterior,
				stock_nuevoNum,
				id_ajuste,
				id_usuario,
				motivo ? `Ajuste manual: ${motivo}` : `Ajuste manual`
			]
		);

		await conn.commit();

		return {
			id_ajuste,
			id_producto,
			producto_nombre: producto[0]?.nombre || null,
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
		const [productoRows] = await conn.execute(
			"SELECT nombre, factor_conversion FROM inv_producto WHERE id_producto = ? LIMIT 1",
			[compra.id_producto],
		);
		const nombreProducto = productoRows[0]?.nombre || "Producto";
		const factorConversion = Number(productoRows[0]?.factor_conversion) || 1;
		const diferenciaCantidadBase = diferenciaCantidad * factorConversion;

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

		// Ajustar stock_base_total si cambió la cantidad
		if (diferenciaCantidadBase !== 0) {
			await conn.execute(
				`UPDATE inv_producto SET stock_base_total = stock_base_total + ?, actualizado_en = CURRENT_TIMESTAMP WHERE id_producto = ?`,
				[diferenciaCantidadBase, compra.id_producto],
			);
		}

		const [compraFinalRows] = await conn.execute(
			`SELECT id_compra, fecha_ingreso, cantidad, precio_total, monto_usd, monto_bs, tasa_dia_bcv, referencia, id_usuario
			 FROM inv_producto_compra
			 WHERE id_compra = ?
			 LIMIT 1`,
			[id_compra],
		);
		const compraFinal = compraFinalRows[0];

		if (compraFinal) {
			let tasaDiaBcv = Number(compraFinal.tasa_dia_bcv || 0);
			if (tasaDiaBcv <= 0) {
				tasaDiaBcv = await getTodayBcvRate();
			}
			const normalized = normalizeUsdAmounts({
				montoUsd: Number(compraFinal.precio_total || 0),
				tasaBcv: tasaDiaBcv,
			});

			await conn.execute(
				`UPDATE inv_producto_compra
				 SET monto_usd = ?, monto_bs = ?, tasa_dia_bcv = ?
				 WHERE id_compra = ?`,
				[
					normalized.monto_usd,
					normalized.monto_bs,
					normalized.tasa_dia_bcv,
					id_compra,
				],
			);

			await conn.execute(
				`UPDATE fac_movimiento
				 SET fecha = ?, monto = ?, monto_usd = ?, monto_bs = ?, tasa_dia_bcv = ?, descripcion = ?, referencia = ?, id_usuario = ?
				 WHERE origen_modulo = 'INV_COMPRA' AND origen_id = ?`,
				[
					compraFinal.fecha_ingreso,
					normalized.monto_usd,
					normalized.monto_usd,
					normalized.monto_bs,
					normalized.tasa_dia_bcv,
					`Compra de inventario - ${nombreProducto} x${Number(compraFinal.cantidad || 0)}`,
					compraFinal.referencia || compraFinal.id_compra,
					compraFinal.id_usuario,
					id_compra,
				],
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

/**
 * Elimina una compra de producto: quita el movimiento de facturación, resta stock y borra la compra
 */
const deleteCompraProductoController = async (id_compra) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		const [compraRows] = await conn.execute(
			"SELECT id_compra, id_producto, cantidad FROM inv_producto_compra WHERE id_compra = ? LIMIT 1",
			[id_compra],
		);
		if (!compraRows.length) {
			const err = new Error("Compra no encontrada");
			err.code = "COMPRA_NOT_FOUND";
			throw err;
		}
		const { id_producto, cantidad } = compraRows[0];
		const cantidadNum = Number(cantidad);

		const [prodRows] = await conn.execute("SELECT factor_conversion FROM inv_producto WHERE id_producto = ? LIMIT 1", [id_producto]);
		const factorConversion = Number(prodRows[0]?.factor_conversion) || 1;
		const cantidadBase = cantidadNum * factorConversion;

		await conn.execute(
			"DELETE FROM fac_movimiento WHERE origen_modulo = 'INV_COMPRA' AND origen_id = ?",
			[id_compra],
		);
		await conn.execute(
			"UPDATE inv_producto SET stock_base_total = stock_base_total - ?, actualizado_en = CURRENT_TIMESTAMP WHERE id_producto = ?",
			[cantidadBase, id_producto],
		);
		await conn.execute("DELETE FROM inv_producto_compra WHERE id_compra = ?", [
			id_compra,
		]);

		await conn.commit();
		return { message: "Compra eliminada correctamente" };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

/**
 * Lista todos los consumos de inventario por citas
 */
const listHistorialConsumosController = async ({ limit = 200 } = {}) => {
	const limitNum = Math.min(Math.max(1, parseInt(Number(limit), 10) || 200), 500);
	const sql = `
		WITH CitasNumeradas AS (
			SELECT 
				c.id_cita,
				c.orden,
				c.fecha_cita,
				c.hora_cita,
				c.id_paciente,
				c.id_especialista,
				ROW_NUMBER() OVER(ORDER BY c.fecha_cita ASC, c.hora_cita ASC) as secuencial_cita
			FROM cita c
		)
		SELECT 
			c.id_cita AS id_consumo,
			c.id_cita,
			c.secuencial_cita AS numero_cita,
			c.fecha_cita AS fecha_consumo,
			COALESCE(cm.nombre, u.nombre) AS paciente_nombre,
			COALESCE(cm.apellido, u.apellido) AS paciente_apellido,
			ue.nombre AS especialista_nombre,
			ue.apellido AS especialista_apellido,
			GROUP_CONCAT(CONCAT(p.nombre, ' (', cc.cantidad, ')') SEPARATOR ', ') AS nombre_producto,
			SUM(cc.cantidad) AS cantidad,
			'cita' AS origen,
			NULL AS descripcion
		FROM CitasNumeradas c
		INNER JOIN inv_cita_consumo cc ON c.id_cita = cc.id_cita
		INNER JOIN inv_producto p ON cc.id_producto = p.id_producto
		INNER JOIN usuario u ON c.id_paciente = u.id_usuario
		INNER JOIN usuario ue ON c.id_especialista = ue.id_usuario
		LEFT JOIN cita_mostrador cm ON cm.id_cita = c.id_cita
		GROUP BY 
			c.id_cita, 
			c.secuencial_cita, 
			c.fecha_cita, 
			c.hora_cita, 
			u.nombre, 
			u.apellido, 
			cm.nombre, 
			cm.apellido, 
			ue.nombre, 
			ue.apellido

		UNION ALL

		SELECT 
			a.id_ajuste AS id_consumo,
			NULL AS id_cita,
			NULL AS numero_cita,
			a.fecha AS fecha_consumo,
			NULL AS paciente_nombre,
			NULL AS paciente_apellido,
			NULL AS especialista_nombre,
			NULL AS especialista_apellido,
			CONCAT(p.nombre, ' (', (a.stock_anterior - a.stock_nuevo), ')') AS nombre_producto,
			(a.stock_anterior - a.stock_nuevo) AS cantidad,
			'manual' AS origen,
			a.motivo AS descripcion
		FROM inv_producto_ajuste a
		INNER JOIN inv_producto p ON a.id_producto = p.id_producto
		WHERE a.stock_nuevo < a.stock_anterior
		
		ORDER BY fecha_consumo DESC LIMIT ${limitNum}
	`;
	const [rows] = await pool.execute(sql);
	return rows;
};

module.exports = {
	// Productos
	listProductosController,
	createProductoController,
	getProductoController,
	updateProductoController,
	deleteProductoController,
	// Compras
	registrarCompraProductoController,
	updateCompraProductoController,
	deleteCompraProductoController,
	listComprasProductoController,
	listHistorialComprasController,
	// Ajustes
	registrarAjusteStockController,
	listAjustesProductoController,
	listHistorialAjustesController,
	// Consumos
	listHistorialConsumosController,
};
