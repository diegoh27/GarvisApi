const { pool } = require("../db");
const crypto = require("crypto");
const { getTodayBcvRate, normalizeUsdAmounts } = require("../utils/currency");

// ==========================================
// ÓRDENES DE COMPRA (STAND BY)
// ==========================================

/**
 * Genera el número de orden autoincremental de forma segura
 * Formato: OC-YYYYMMDD-XXXX
 */
const generarNumeroOrdenTransaction = async (connection, dateIso) => {
	// dateIso = 'YYYY-MM-DD'
	const prefix = `OC-${dateIso.replace(/-/g, "")}-`;
	
	// Buscamos el mayor existente de hoy bloqueando la porción (FOR UPDATE si es un índice, como es LIKE escanea, en InnoDB Lock es seguro con índices adecuados o lock de tabla, pero para simplificar bloquearemos la fila de un contador dummy si existiese, sino hacemos MAX for update).
	const [rows] = await connection.execute(
		`SELECT numero_orden FROM inv_orden_compra WHERE numero_orden LIKE ? ORDER BY numero_orden DESC LIMIT 1 FOR UPDATE`,
		[`${prefix}%`]
	);

	let nextNum = 1;
	if (rows.length > 0) {
		const lastNumStr = rows[0].numero_orden.replace(prefix, "");
		const lastNum = parseInt(lastNumStr, 10);
		if (!isNaN(lastNum)) {
			nextNum = lastNum + 1;
		}
	}
	
	const paddedNum = String(nextNum).padStart(4, "0");
	return `${prefix}${paddedNum}`;
};

/**
 * Crea una orden de compra junto con sus detalles en una transacción atómica.
 */
const createOrdenCompraController = async ({
	id_proveedor,
	fecha_emision,
	id_usuario,
	detalles // Array: [{id_producto, cantidad_ordenada, precio_unitario_acordado}, ...]
}) => {
	// Verificar que existan detalles
	if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
		const err = new Error("La orden de compra debe contener al menos un producto.");
		err.code = "ORDEN_SIN_DETALLE";
		throw err;
	}

	const connection = await pool.getConnection();
	try {
		await connection.beginTransaction();

		// Generar número de orden seguro dentro de la transacción
		const numero_orden = await generarNumeroOrdenTransaction(connection, fecha_emision);
		
		const id_orden = crypto.randomUUID();
		let total_estimado = 0;

		// Validar y preparar los detalles calculando subtotales
		const listValuesInsert = [];
		const baseValues = [];

		for (const det of detalles) {
			const { id_producto, cantidad_ordenada, precio_unitario_acordado } = det;
			if (!id_producto || !cantidad_ordenada || Number(cantidad_ordenada) <= 0) {
				const err = new Error("Cantidad u orden de producto inválida.");
				err.code = "INVALID_DETALLE";
				throw err;
			}

			const subtotal = Number(cantidad_ordenada) * Number(precio_unitario_acordado || 0);
			total_estimado += subtotal;

			const id_detalle = crypto.randomUUID();
			listValuesInsert.push(`(?, ?, ?, ?, ?, ?)`);
			baseValues.push(id_detalle, id_orden, id_producto, cantidad_ordenada, precio_unitario_acordado || 0, subtotal);
		}

		// Insertar Cabecera
		await connection.execute(
			`INSERT INTO inv_orden_compra (id_orden, numero_orden, id_proveedor, fecha_emision, estado, total_estimado, id_usuario)
			 VALUES (?, ?, ?, ?, 'Pendiente', ?, ?)`,
			[id_orden, numero_orden, id_proveedor, fecha_emision, total_estimado, id_usuario]
		);

		// Insertar Detalles Múltiples de un golpe
		await connection.execute(
			`INSERT INTO inv_orden_compra_detalle (id_detalle, id_orden, id_producto, cantidad_ordenada, precio_unitario_acordado, subtotal)
			 VALUES ${listValuesInsert.join(", ")}`,
			baseValues
		);

		await connection.commit();
		
		return {
			id_orden,
			numero_orden,
			id_proveedor,
			fecha_emision,
			estado: 'Pendiente',
			total_estimado,
			detalles
		};

	} catch (error) {
		await connection.rollback();
		throw error;
	} finally {
		connection.release();
	}
};

/**
 * Listar las Órdenes de Compra con join a su proveedor y agrupaciones básicas
 */
const listOrdenesCompraController = async () => {
	const sql = `
		SELECT 
			oc.id_orden,
			oc.numero_orden,
			oc.id_proveedor,
			oc.fecha_emision,
			oc.estado,
			oc.total_estimado,
			ROUND(oc.total_estimado * 1.16, 2) AS total_con_iva,
			oc.creado_en,
			p.nombre AS proveedor_nombre,
			COUNT(d.id_detalle) AS num_productos,
			SUM(d.cantidad_ordenada) AS total_unidades
		FROM inv_orden_compra oc
		JOIN inv_proveedor p ON oc.id_proveedor = p.id_proveedor
		LEFT JOIN inv_orden_compra_detalle d ON d.id_orden = oc.id_orden
		GROUP BY oc.id_orden, oc.numero_orden, oc.id_proveedor, oc.fecha_emision, oc.estado, oc.total_estimado, oc.creado_en, p.nombre
		ORDER BY oc.creado_en DESC
	`;
	const [rows] = await pool.execute(sql);
	return rows;
};

/**
 * Obtener una Orden de Compra individual junto a TODOS sus detalles
 */
const getOrdenCompraController = async (id_orden) => {
	// Cabecera
	const [cabeceras] = await pool.execute(`
		SELECT 
			oc.*,
			p.nombre AS proveedor_nombre,
			p.rif AS proveedor_rif,
			CONCAT(u.nombre, ' ', u.apellido) AS usuario_creador
		FROM inv_orden_compra oc
		JOIN inv_proveedor p ON oc.id_proveedor = p.id_proveedor
		LEFT JOIN usuario u ON oc.id_usuario = u.id_usuario
		WHERE oc.id_orden = ? LIMIT 1
	`, [id_orden]);

	if (cabeceras.length === 0) {
		const err = new Error("Orden de Compra no encontrada");
		err.code = "ORDEN_NOT_FOUND";
		throw err;
	}

	const cabecera = cabeceras[0];

	// Detalles
	const [detalles] = await pool.execute(`
		SELECT 
			d.id_detalle,
			d.id_producto,
			d.cantidad_ordenada,
			d.precio_unitario_acordado,
			d.subtotal,
			p.nombre AS producto_nombre,
			p.presentacion,
			p.unidad_compra
		FROM inv_orden_compra_detalle d
		JOIN inv_producto p ON d.id_producto = p.id_producto
		WHERE d.id_orden = ?
	`, [id_orden]);

	return {
		...cabecera,
		detalles
	};
};

/**
 * Procesar la recepción de una Orden de Compra, generando Nota de Compra y actualizando inventario y precios
 */
const procesarRecepcionOrdenController = async ({
	id_orden,
	numero_factura,
	fecha_compra,
	observaciones,
	lineas, // [{id_producto, cantidad, precio_unitario}] editables
	id_usuario
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// 1) Validar cabecera de la orden
		const [ordenRows] = await conn.execute(
			`SELECT * FROM inv_orden_compra WHERE id_orden = ? LIMIT 1 FOR UPDATE`,
			[id_orden]
		);
		if (!ordenRows.length) {
			const err = new Error("Orden de Compra no encontrada");
			err.code = "ORDEN_NOT_FOUND";
			throw err;
		}
		const orden = ordenRows[0];
		if (orden.estado !== 'Pendiente') {
			const err = new Error('La orden ya fue procesada o cancelada.');
			err.code = "ORDEN_NO_PENDIENTE";
			throw err;
		}

		// 2) Cálculos principales de Factura
		let subtotal = 0;
		const lineasProcesadas = [];
		for (const linea of lineas) {
			const cant = Number(linea.cantidad);
			const pu = Number(linea.precio_unitario);
			if (cant <= 0 || pu < 0) {
				const err = new Error("Cantidad o Precio inválidos en una de las líneas");
				err.code = "INVALID_LINE";
				throw err;
			}
			const pt = cant * pu;
			subtotal += pt;

			lineasProcesadas.push({
				id_detalle: crypto.randomUUID(),
				id_producto: linea.id_producto,
				cantidad: cant,
				precio_unitario: pu,
				precio_total: pt
			});
		}

		const impuesto = subtotal * 0.16;
		const total = subtotal + impuesto;
		const tasaDiaBcv = await getTodayBcvRate();
		const normalized = normalizeUsdAmounts({ montoUsd: total, tasaBcv: tasaDiaBcv });

		// 3) Crear Nota de Compra vinculando `id_orden`
		const id_nota_compra = crypto.randomUUID();
		await conn.execute(
			`INSERT INTO inv_nota_compra 
			 (id_nota_compra, id_proveedor, numero_factura, id_orden, fecha_compra, subtotal, impuesto, total, monto_usd, monto_bs, tasa_dia_bcv, observaciones, id_usuario)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id_nota_compra, orden.id_proveedor, numero_factura || null, id_orden, fecha_compra,
				subtotal, impuesto, total, normalized.monto_usd, normalized.monto_bs, normalized.tasa_dia_bcv,
				observaciones || null, id_usuario
			]
		);

		// 4) Procesar líneas, precios y Kardex
		for (const linea of lineasProcesadas) {
			const [prodRows] = await conn.execute(
				`SELECT stock_base_total, factor_conversion FROM inv_producto WHERE id_producto = ? LIMIT 1`,
				[linea.id_producto]
			);
			const stockAnterior = Number(prodRows[0].stock_base_total);
			const factorConversion = Number(prodRows[0].factor_conversion) || 1;
			const cantidadIngresadaBase = linea.cantidad * factorConversion;

			// Actualizar Catálogo e Historial de Precios SI HUBO VARIACIÓN
			const [relRows] = await conn.execute(
				`SELECT precio_costo FROM inv_producto_proveedor WHERE id_proveedor = ? AND id_producto = ? LIMIT 1`,
				[orden.id_proveedor, linea.id_producto]
			);
			if (relRows.length > 0) {
				const precioHistorico = Number(relRows[0].precio_costo);
				if (precioHistorico !== linea.precio_unitario) {
					// Update silently
					await conn.execute(
						`UPDATE inv_producto_proveedor SET precio_costo = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_proveedor = ? AND id_producto = ?`,
						[linea.precio_unitario, orden.id_proveedor, linea.id_producto]
					);
					// Log in history
					await conn.execute(
						`INSERT INTO inv_historial_precios (id_historial, id_proveedor, id_producto, precio_anterior, precio_nuevo, id_usuario)
						 VALUES (?, ?, ?, ?, ?, ?)`,
						[crypto.randomUUID(), orden.id_proveedor, linea.id_producto, precioHistorico, linea.precio_unitario, id_usuario]
					);
				}
			}

			// Insertar línea de Nota
			await conn.execute(
				`INSERT INTO inv_nota_compra_detalle (id_detalle, id_nota_compra, id_producto, cantidad, precio_unitario, precio_total)
				 VALUES (?, ?, ?, ?, ?, ?)`,
				[linea.id_detalle, id_nota_compra, linea.id_producto, linea.cantidad, linea.precio_unitario, linea.precio_total]
			);

			// Actualizar Stock
			await conn.execute(
				`UPDATE inv_producto SET stock_base_total = stock_base_total + ?, actualizado_en = CURRENT_TIMESTAMP WHERE id_producto = ?`,
				[cantidadIngresadaBase, linea.id_producto]
			);

			// Kardex
			await conn.execute(
				`INSERT INTO inv_kardex (id_kardex, id_producto, tipo_movimiento, cantidad, stock_anterior, stock_posterior, referencia_tipo, referencia_id, observaciones, id_usuario)
				 VALUES (?, ?, 'ENTRADA', ?, ?, ?, 'NOTA_COMPRA', ?, ?, ?)`,
				[crypto.randomUUID(), linea.id_producto, cantidadIngresadaBase, stockAnterior, stockAnterior + cantidadIngresadaBase, id_nota_compra, `Recepción de OC: ${orden.numero_orden}`, id_usuario]
			);
		}

		// 5) fac_movimiento
		await conn.execute(
			`INSERT INTO fac_movimiento (id_movimiento, tipo, fecha, monto, monto_usd, monto_bs, tasa_dia_bcv, descripcion, referencia, origen_modulo, origen_id, id_usuario, creado_en)
			 VALUES (UUID(), 'Egreso', ?, ?, ?, ?, ?, ?, ?, 'INV_COMPRA', ?, ?, NOW())`,
			[fecha_compra, normalized.monto_usd, normalized.monto_usd, normalized.monto_bs, normalized.tasa_dia_bcv, `Recepción OC ${orden.numero_orden}`, numero_factura || id_nota_compra, id_nota_compra, id_usuario]
		);

		// 6) Actualizar estado de la Orden
		await conn.execute(
			`UPDATE inv_orden_compra SET estado = 'Recibida', actualizado_en = CURRENT_TIMESTAMP WHERE id_orden = ?`,
			[id_orden]
		);

		await conn.commit();
		return {
			id_nota_compra,
			id_orden,
			estado_orden_nuevo: 'Recibida',
			factura: numero_factura,
			monto_usd: normalized.monto_usd
		};
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

const cancelarOrdenCompraController = async (id_orden) => {
	const [check] = await pool.execute("SELECT estado FROM inv_orden_compra WHERE id_orden = ?", [id_orden]);
	if (!check.length) {
		const err = new Error("Orden no encontrada");
		err.code = "ORDEN_NO_ENCONTRADA";
		throw err;
	}
	if (check[0].estado !== "Pendiente") {
		const err = new Error("Solo se pueden cancelar órdenes en estado Pendiente");
		err.code = "ORDEN_NO_PENDIENTE";
		throw err;
	}

	await pool.execute("UPDATE inv_orden_compra SET estado = 'Cancelada', actualizado_en = CURRENT_TIMESTAMP WHERE id_orden = ?", [id_orden]);
	return { message: "Orden cancelada exitosamente" };
};

module.exports = {
	createOrdenCompraController,
	listOrdenesCompraController,
	getOrdenCompraController,
	procesarRecepcionOrdenController,
	cancelarOrdenCompraController
};
