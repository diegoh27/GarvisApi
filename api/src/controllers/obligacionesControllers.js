const { pool } = require("../db");
const crypto = require("crypto");
const { getTodayBcvRate, normalizeUsdAmounts } = require("../utils/currency");

// ==========================================
// OBLIGACIONES
// ==========================================

/**
 * Lista todas las obligaciones con información del ente
 */
const listObligacionesController = async () => {
	const sql = `
		SELECT 
			o.id_obligacion,
			o.id_ente,
			e.nombre as nombre_ente,
			o.concepto,
			o.periodo,
			o.fecha_vencimiento,
			o.monto,
			o.estado,
			o.recordatorio_dias,
			o.creado_en,
			o.actualizado_en
		FROM leg_obligacion o
		INNER JOIN leg_ente e ON o.id_ente = e.id_ente
		WHERE e.activo = 1
		ORDER BY o.fecha_vencimiento ASC, o.estado ASC
	`;
	const [rows] = await pool.execute(sql);
	return rows;
};

/**
 * Obtiene una obligación específica
 */
const getObligacionController = async (id_obligacion) => {
	const sql = `
		SELECT 
			o.id_obligacion,
			o.id_ente,
			e.nombre as nombre_ente,
			o.concepto,
			o.periodo,
			o.fecha_vencimiento,
			o.monto,
			o.estado,
			o.recordatorio_dias,
			o.creado_en,
			o.actualizado_en
		FROM leg_obligacion o
		INNER JOIN leg_ente e ON o.id_ente = e.id_ente
		WHERE o.id_obligacion = ?
	`;
	const [rows] = await pool.execute(sql, [id_obligacion]);

	if (!rows.length) {
		const err = new Error("Obligación no encontrada");
		err.code = "OBLIGACION_NOT_FOUND";
		throw err;
	}

	return rows[0];
};

/**
 * Crea una nueva obligación
 */
const createObligacionController = async ({
	id_ente,
	concepto,
	periodo,
	fecha_vencimiento = null,
	monto = null,
	estado = "Pendiente",
	recordatorio_dias = 0,
}) => {
	const id_obligacion = crypto.randomUUID();

	// Verificar que el ente existe
	const [enteRows] = await pool.execute(
		"SELECT id_ente FROM leg_ente WHERE id_ente = ? AND activo = 1",
		[id_ente],
	);

	if (!enteRows.length) {
		const err = new Error("El ente legal no existe o está inactivo");
		err.code = "ENTE_NOT_FOUND";
		throw err;
	}

	const sql = `
		INSERT INTO leg_obligacion (
			id_obligacion,
			id_ente,
			concepto,
			periodo,
			fecha_vencimiento,
			monto,
			estado,
			recordatorio_dias
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`;

	await pool.execute(sql, [
		id_obligacion,
		id_ente,
		concepto,
		periodo,
		fecha_vencimiento,
		monto,
		estado,
		recordatorio_dias,
	]);

	return getObligacionController(id_obligacion);
};

/**
 * Actualiza una obligación existente
 */
const updateObligacionController = async (id_obligacion, updates) => {
	const allowedFields = [
		"concepto",
		"periodo",
		"fecha_vencimiento",
		"monto",
		"estado",
		"recordatorio_dias",
	];
	const fields = [];
	const values = [];

	Object.keys(updates).forEach((key) => {
		if (allowedFields.includes(key) && updates[key] !== undefined) {
			fields.push(`${key} = ?`);
			values.push(updates[key]);
		}
	});

	if (fields.length === 0) {
		const err = new Error("No hay campos válidos para actualizar");
		err.code = "NO_VALID_FIELDS";
		throw err;
	}

	values.push(id_obligacion);

	const sql = `
		UPDATE leg_obligacion
		SET ${fields.join(", ")}
		WHERE id_obligacion = ?
	`;

	const [result] = await pool.execute(sql, values);

	if (result.affectedRows === 0) {
		const err = new Error("Obligación no encontrada");
		err.code = "OBLIGACION_NOT_FOUND";
		throw err;
	}

	return getObligacionController(id_obligacion);
};

/**
 * Elimina una obligación
 */
const deleteObligacionController = async (id_obligacion) => {
	// Verificar si tiene pagos registrados
	const [pagos] = await pool.execute(
		"SELECT COUNT(*) as count FROM leg_pago WHERE id_obligacion = ?",
		[id_obligacion],
	);

	if (pagos[0].count > 0) {
		const err = new Error(
			"No se puede eliminar una obligación con pagos registrados",
		);
		err.code = "HAS_PAYMENTS";
		throw err;
	}

	const sql = "DELETE FROM leg_obligacion WHERE id_obligacion = ?";
	const [result] = await pool.execute(sql, [id_obligacion]);

	if (result.affectedRows === 0) {
		const err = new Error("Obligación no encontrada");
		err.code = "OBLIGACION_NOT_FOUND";
		throw err;
	}

	return { message: "Obligación eliminada exitosamente" };
};

/**
 * Registra un pago de una obligación y actualiza su estado y próxima fecha de vencimiento
 */
const registrarPagoObligacionController = async ({
	id_obligacion,
	monto,
	fecha_pago,
	fecha_proxima_vencimiento,
	metodo = "Transferencia",
	referencia = null,
	id_usuario,
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// Verificar que la obligación existe
		const [obligaciones] = await conn.execute(
			`SELECT o.id_obligacion, o.id_ente, o.concepto, e.nombre AS nombre_ente
			 FROM leg_obligacion o
			 INNER JOIN leg_ente e ON e.id_ente = o.id_ente
			 WHERE o.id_obligacion = ?`,
			[id_obligacion],
		);

		if (!obligaciones.length) {
			const err = new Error("Obligación no encontrada");
			err.code = "OBLIGACION_NOT_FOUND";
			throw err;
		}

		const id_pago = crypto.randomUUID();
		const tasaDiaBcv = await getTodayBcvRate();
		const normalized = normalizeUsdAmounts({
			montoUsd: Number(monto),
			tasaBcv: tasaDiaBcv,
		});

		// Insertar el pago
		await conn.execute(
			`INSERT INTO leg_pago
			(id_pago, id_obligacion, fecha_pago, monto, monto_usd, monto_bs, tasa_dia_bcv, metodo, referencia, id_usuario)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id_pago,
				id_obligacion,
				fecha_pago,
				Number(monto),
				normalized.monto_usd,
				normalized.monto_bs,
				normalized.tasa_dia_bcv,
				metodo,
				referencia,
				id_usuario,
			],
		);

		// Actualizar la obligación con el nuevo estado, monto y fecha de vencimiento
		await conn.execute(
			`UPDATE leg_obligacion
			 SET estado = ?, monto = ?, fecha_vencimiento = ?, actualizado_en = CURRENT_TIMESTAMP
			 WHERE id_obligacion = ?`,
			["Pagado", Number(monto), fecha_proxima_vencimiento, id_obligacion],
		);

		await conn.execute(
			`INSERT INTO fac_movimiento
				(id_movimiento, tipo, fecha, monto, monto_usd, monto_bs, tasa_dia_bcv, descripcion, referencia, origen_modulo, origen_id, id_usuario, creado_en)
			 VALUES
				(UUID(), 'Egreso', ?, ?, ?, ?, ?, ?, ?, 'LEG_PAGO', ?, ?, NOW())`,
			[
				fecha_pago,
				normalized.monto_usd,
				normalized.monto_usd,
				normalized.monto_bs,
				normalized.tasa_dia_bcv,
				`Pago obligación ${obligaciones[0].concepto} - ${obligaciones[0].nombre_ente}`,
				referencia || id_pago,
				id_pago,
				id_usuario,
			],
		);

		await conn.commit();

		return {
			id_pago,
			id_obligacion,
			monto: Number(monto),
			fecha_pago,
			fecha_proxima_vencimiento,
			metodo,
			referencia,
			creado_en: new Date(),
		};
	} catch (error) {
		await conn.rollback();
		throw error;
	} finally {
		conn.release();
	}
};

/**
 * Actualiza un pago de obligación existente
 */
const updatePagoObligacionController = async ({
	id_pago,
	monto,
	fecha_pago,
	metodo,
	referencia,
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// Verificar que el pago existe y obtener datos actuales
		const [pagos] = await conn.execute(
			`SELECT id_pago, id_obligacion, monto, monto_usd, monto_bs, tasa_dia_bcv, referencia, id_usuario FROM leg_pago WHERE id_pago = ?`,
			[id_pago],
		);

		if (!pagos.length) {
			const err = new Error("Pago no encontrado");
			err.code = "PAGO_NOT_FOUND";
			throw err;
		}

		const pago = pagos[0];
		const montoAnterior = Number(pago.monto);
		const montoNuevo = monto !== undefined ? Number(monto) : montoAnterior;

		// Construir la actualización del pago
		const updates = [];
		const params = [];

		if (fecha_pago !== undefined) {
			updates.push("fecha_pago = ?");
			params.push(fecha_pago);
		}
		if (monto !== undefined) {
			updates.push("monto = ?");
			params.push(montoNuevo);
			const tasaPago = Number(pago.tasa_dia_bcv || 0);
			if (tasaPago > 0) {
				const normalizedMonto = normalizeUsdAmounts({
					montoUsd: montoNuevo,
					tasaBcv: tasaPago,
				});
				updates.push("monto_usd = ?", "monto_bs = ?");
				params.push(normalizedMonto.monto_usd, normalizedMonto.monto_bs);
			}
		}
		if (metodo !== undefined) {
			updates.push("metodo = ?");
			params.push(metodo);
		}
		if (referencia !== undefined) {
			updates.push("referencia = ?");
			params.push(referencia || null);
		}

		if (updates.length > 0) {
			params.push(id_pago);
			await conn.execute(
				`UPDATE leg_pago SET ${updates.join(", ")} WHERE id_pago = ?`,
				params,
			);
		}

		// Si cambió el monto, actualizar también en la obligación
		if (monto !== undefined && montoNuevo !== montoAnterior) {
			await conn.execute(
				`UPDATE leg_obligacion SET monto = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id_obligacion = ?`,
				[montoNuevo, pago.id_obligacion],
			);
		}

		const [obligacionRows] = await conn.execute(
			`SELECT o.concepto, e.nombre AS nombre_ente
			 FROM leg_obligacion o
			 INNER JOIN leg_ente e ON e.id_ente = o.id_ente
			 WHERE o.id_obligacion = ?
			 LIMIT 1`,
			[pago.id_obligacion],
		);

		const tasaLedger = Number(pago.tasa_dia_bcv || 0);
		const montoUsdLedger = Number(
			monto !== undefined ? montoNuevo : pago.monto_usd || pago.monto || 0,
		);
		const montoBsLedger =
			tasaLedger > 0
				? Number((montoUsdLedger * tasaLedger).toFixed(2))
				: Number(pago.monto_bs || montoUsdLedger);

		await conn.execute(
			`UPDATE fac_movimiento
			 SET fecha = COALESCE(?, fecha),
				 monto = ?,
				 monto_usd = ?,
				 monto_bs = ?,
				 tasa_dia_bcv = ?,
				 descripcion = ?,
				 referencia = ?,
				 id_usuario = ?
			 WHERE origen_modulo = 'LEG_PAGO' AND origen_id = ?`,
			[
				fecha_pago,
				montoUsdLedger,
				montoUsdLedger,
				montoBsLedger,
				tasaLedger,
				`Pago obligación ${obligacionRows[0]?.concepto || ""} - ${obligacionRows[0]?.nombre_ente || ""}`.trim(),
				referencia !== undefined
					? referencia || id_pago
					: pago.referencia || id_pago,
				pago.id_usuario,
				id_pago,
			],
		);

		await conn.commit();

		// Obtener el pago actualizado
		const [pagoActualizado] = await conn.execute(
			`SELECT 
				id_pago,
				id_obligacion,
				fecha_pago,
				monto,
				metodo,
				referencia,
				id_usuario,
				creado_en
			FROM leg_pago WHERE id_pago = ?`,
			[id_pago],
		);

		return pagoActualizado[0];
	} catch (error) {
		await conn.rollback();
		throw error;
	} finally {
		conn.release();
	}
};

module.exports = {
	listObligacionesController,
	getObligacionController,
	createObligacionController,
	updateObligacionController,
	deleteObligacionController,
	registrarPagoObligacionController,
	updatePagoObligacionController,
};
