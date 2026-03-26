const { pool } = require("../db");
const crypto = require("crypto");
const { getTodayBcvRate, normalizeUsdAmounts } = require("../utils/currency");

// ==========================================
// NOTAS DE COMPRA (cabecera + detalle)
// ==========================================

/**
 * Lista todas las notas de compra con datos de proveedor
 */
const listNotasCompraController = async ({ limit = 200 } = {}) => {
	const limitNum = Math.min(Math.max(1, parseInt(Number(limit), 10) || 200), 500);
	const sql = `
		SELECT 
			nc.id_nota_compra,
			nc.id_proveedor,
			p.nombre AS proveedor_nombre,
			nc.numero_factura,
			nc.fecha_compra,
			nc.subtotal,
			nc.impuesto,
			nc.total,
			nc.monto_usd,
			nc.monto_bs,
			nc.tasa_dia_bcv,
			nc.observaciones,
			nc.id_usuario,
			nc.creado_en,
			(SELECT COUNT(*) FROM inv_nota_compra_detalle d WHERE d.id_nota_compra = nc.id_nota_compra) AS total_lineas
		FROM inv_nota_compra nc
		INNER JOIN inv_proveedor p ON p.id_proveedor = nc.id_proveedor
		ORDER BY nc.fecha_compra DESC, nc.creado_en DESC
		LIMIT ${limitNum}
	`;
	const [rows] = await pool.execute(sql);
	return rows;
};

/**
 * Obtiene una nota de compra con sus líneas de detalle
 */
const getNotaCompraController = async (id_nota_compra) => {
	const [cabecera] = await pool.execute(
		`SELECT nc.*, p.nombre AS proveedor_nombre
		 FROM inv_nota_compra nc
		 INNER JOIN inv_proveedor p ON p.id_proveedor = nc.id_proveedor
		 WHERE nc.id_nota_compra = ? LIMIT 1`,
		[id_nota_compra],
	);
	if (!cabecera.length) {
		const err = new Error("Nota de compra no encontrada");
		err.code = "NOTA_COMPRA_NOT_FOUND";
		throw err;
	}

	const [detalle] = await pool.execute(
		`SELECT d.*, prod.nombre AS producto_nombre
		 FROM inv_nota_compra_detalle d
		 INNER JOIN inv_producto prod ON prod.id_producto = d.id_producto
		 WHERE d.id_nota_compra = ?
		 ORDER BY d.creado_en ASC`,
		[id_nota_compra],
	);

	return { ...cabecera[0], lineas: detalle };
};

/**
 * Crea una nota de compra completa (cabecera + detalle).
 * TRANSACCIÓN:
 *   1) Inserta cabecera en inv_nota_compra
 *   2) Inserta cada línea en inv_nota_compra_detalle
 *   3) Por cada línea: suma stock al producto + registra ENTRADA en inv_kardex
 *   4) Registra egreso en fac_movimiento
 */
const createNotaCompraController = async ({
	id_proveedor,
	numero_factura,
	fecha_compra,
	observaciones,
	lineas, // [{ id_producto, cantidad, precio_unitario }]
	id_usuario,
}) => {
	if (!lineas || !lineas.length) {
		const err = new Error("La nota de compra debe tener al menos una línea");
		err.code = "NO_LINEAS";
		throw err;
	}

	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// Validar proveedor
		const [provRows] = await conn.execute(
			"SELECT id_proveedor, nombre FROM inv_proveedor WHERE id_proveedor = ? LIMIT 1",
			[id_proveedor],
		);
		if (!provRows.length) {
			const err = new Error("Proveedor no encontrado");
			err.code = "PROVEEDOR_NOT_FOUND";
			throw err;
		}
		const proveedorNombre = provRows[0].nombre;

		// Calcular totales
		let subtotal = 0;
		const lineasProcesadas = [];
		for (const linea of lineas) {
			const cant = Number(linea.cantidad);
			const pu = Number(linea.precio_unitario);
			if (cant <= 0) {
				const err = new Error("La cantidad debe ser mayor a 0");
				err.code = "INVALID_CANTIDAD";
				throw err;
			}
			if (pu < 0) {
				const err = new Error("El precio unitario no puede ser negativo");
				err.code = "INVALID_PRECIO";
				throw err;
			}
			const pt = cant * pu;
			subtotal += pt;
			lineasProcesadas.push({
				id_detalle: crypto.randomUUID(),
				id_producto: linea.id_producto,
				cantidad: cant,
				precio_unitario: pu,
				precio_total: pt,
			});
		}

		const impuesto = subtotal * 0.16;
		const total = subtotal + impuesto;

		// BCV
		const tasaDiaBcv = await getTodayBcvRate();
		const normalized = normalizeUsdAmounts({
			montoUsd: total,
			tasaBcv: tasaDiaBcv,
		});

		// 1) Insertar cabecera
		const id_nota_compra = crypto.randomUUID();
		await conn.execute(
			`INSERT INTO inv_nota_compra 
			 (id_nota_compra, id_proveedor, numero_factura, fecha_compra, subtotal, impuesto, total, monto_usd, monto_bs, tasa_dia_bcv, observaciones, id_usuario)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id_nota_compra,
				id_proveedor,
				numero_factura || null,
				fecha_compra,
				subtotal,
				impuesto,
				total,
				normalized.monto_usd,
				normalized.monto_bs,
				normalized.tasa_dia_bcv,
				observaciones || null,
				id_usuario,
			],
		);

		// 2) Insertar líneas + actualizar stock + registrar kardex
		for (const linea of lineasProcesadas) {
			// Validar que el producto exista y obtener stock actual
			const [prodRows] = await conn.execute(
				"SELECT id_producto, nombre, stock_actual, contenido FROM inv_producto WHERE id_producto = ? LIMIT 1",
				[linea.id_producto],
			);
			if (!prodRows.length) {
				const err = new Error(`Producto no encontrado: ${linea.id_producto}`);
				err.code = "PRODUCTO_NOT_FOUND";
				throw err;
			}
			const stockAnterior = Number(prodRows[0].stock_actual);
			const contenidoNum = Number(prodRows[0].contenido) || 1;
			const cantidadIngresadaBase = linea.cantidad * contenidoNum;

			// Insertar línea de detalle
			await conn.execute(
				`INSERT INTO inv_nota_compra_detalle 
				 (id_detalle, id_nota_compra, id_producto, cantidad, precio_unitario, precio_total)
				 VALUES (?, ?, ?, ?, ?, ?)`,
				[
					linea.id_detalle,
					id_nota_compra,
					linea.id_producto,
					linea.cantidad,
					linea.precio_unitario,
					linea.precio_total,
				],
			);

			// Sumar stock al producto en unidades enteras (Fase 5: UI Gerencial)
			await conn.execute(
				`UPDATE inv_producto SET stock_actual = stock_actual + ?, actualizado_en = CURRENT_TIMESTAMP WHERE id_producto = ?`,
				[linea.cantidad, linea.id_producto],
			);

			// Registrar ENTRADA en kardex en unidades enteras (cajas/presentaciones)
			const id_kardex = crypto.randomUUID();
			await conn.execute(
				`INSERT INTO inv_kardex
				 (id_kardex, id_producto, tipo_movimiento, cantidad, stock_anterior, stock_posterior, referencia_tipo, referencia_id, observaciones, id_usuario)
				 VALUES (?, ?, 'ENTRADA', ?, ?, ?, 'NOTA_COMPRA', ?, ?, ?)`,
				[
					id_kardex,
					linea.id_producto,
					linea.cantidad,
					stockAnterior,
					stockAnterior + linea.cantidad,
					id_nota_compra,
					`Compra a ${proveedorNombre} - Fact: ${numero_factura || "S/N"}`,
					id_usuario,
				],
			);
		}

		// 3) Registrar egreso en fac_movimiento
		const descripcionLineas = lineasProcesadas
			.map((l, i) => {
				const prod = lineas[i];
				return `${prod.cantidad}x`;
			})
			.join(", ");

		await conn.execute(
			`INSERT INTO fac_movimiento
			 (id_movimiento, tipo, fecha, monto, monto_usd, monto_bs, tasa_dia_bcv, descripcion, referencia, origen_modulo, origen_id, id_usuario, creado_en)
			 VALUES (UUID(), 'Egreso', ?, ?, ?, ?, ?, ?, ?, 'NOTA_COMPRA', ?, ?, NOW())`,
			[
				fecha_compra,
				normalized.monto_usd,
				normalized.monto_usd,
				normalized.monto_bs,
				normalized.tasa_dia_bcv,
				`Nota de compra - ${proveedorNombre} (${lineasProcesadas.length} líneas)`,
				numero_factura || id_nota_compra,
				id_nota_compra,
				id_usuario,
			],
		);

		await conn.commit();

		return {
			id_nota_compra,
			id_proveedor,
			proveedor_nombre: proveedorNombre,
			numero_factura,
			fecha_compra,
			subtotal,
			impuesto,
			total,
			monto_usd: normalized.monto_usd,
			monto_bs: normalized.monto_bs,
			tasa_dia_bcv: normalized.tasa_dia_bcv,
			observaciones,
			id_usuario,
			lineas: lineasProcesadas,
		};
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

/**
 * Elimina una nota de compra: revierte stock, elimina kardex entries, elimina cabecera+detalle
 */
const deleteNotaCompraController = async (id_nota_compra) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// Obtener detalle para revertir stock
		const [detalleRows] = await conn.execute(
			"SELECT id_detalle, id_producto, cantidad FROM inv_nota_compra_detalle WHERE id_nota_compra = ?",
			[id_nota_compra],
		);

		if (!detalleRows.length) {
			// Verificar que la nota existe
			const [nc] = await conn.execute(
				"SELECT id_nota_compra FROM inv_nota_compra WHERE id_nota_compra = ? LIMIT 1",
				[id_nota_compra],
			);
			if (!nc.length) {
				const err = new Error("Nota de compra no encontrada");
				err.code = "NOTA_COMPRA_NOT_FOUND";
				throw err;
			}
		}

		// Revertir stock por cada línea
		for (const det of detalleRows) {
			await conn.execute(
				"UPDATE inv_producto SET stock_actual = GREATEST(0, stock_actual - ?), actualizado_en = CURRENT_TIMESTAMP WHERE id_producto = ?",
				[Number(det.cantidad), det.id_producto],
			);
		}

		// Eliminar kardex entries de esta nota
		await conn.execute(
			"DELETE FROM inv_kardex WHERE referencia_tipo = 'NOTA_COMPRA' AND referencia_id = ?",
			[id_nota_compra],
		);

		// Eliminar movimiento de facturación
		await conn.execute(
			"DELETE FROM fac_movimiento WHERE origen_modulo = 'NOTA_COMPRA' AND origen_id = ?",
			[id_nota_compra],
		);

		// Eliminar detalle (CASCADE debería hacerlo, pero por seguridad)
		await conn.execute(
			"DELETE FROM inv_nota_compra_detalle WHERE id_nota_compra = ?",
			[id_nota_compra],
		);

		// Eliminar cabecera
		await conn.execute(
			"DELETE FROM inv_nota_compra WHERE id_nota_compra = ?",
			[id_nota_compra],
		);

		await conn.commit();
		return { message: "Nota de compra eliminada y stock revertido correctamente" };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};

module.exports = {
	listNotasCompraController,
	getNotaCompraController,
	createNotaCompraController,
	deleteNotaCompraController,
};
