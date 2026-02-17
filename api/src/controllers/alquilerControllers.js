const crypto = require("crypto");
const { pool } = require("../db");
const { getTodayBcvRate, normalizeUsdAmounts } = require("../utils/currency");

const sanitizeLimit = (limit, fallback = 200, max = 1000) => {
	const parsed = Number.parseInt(limit, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return Math.min(parsed, max);
};

// ==========================================
// CONTRATOS
// ==========================================

/**
 * Lista contratos. Estado calculado en lectura: Pendiente + fecha_vencimiento pasada => Vencido.
 */
exports.listContratosController = async (limit = 200) => {
	const safeLimit = sanitizeLimit(limit, 200, 1000);
	const query = `
		SELECT
			id_contrato,
			nombre,
			descripcion,
			periodo,
			monto,
			CASE
				WHEN estado = 'Pagado' THEN 'Pagado'
				WHEN fecha_vencimiento IS NOT NULL AND fecha_vencimiento < CURDATE() THEN 'Vencido'
				ELSE estado
			END AS estado,
			fecha_vencimiento,
			creado_en,
			actualizado_en
		FROM alq_contrato
		ORDER BY creado_en DESC
		LIMIT ${safeLimit}
	`;
	const [rows] = await pool.execute(query);
	return rows;
};

/**
 * Obtiene un contrato. Estado calculado: Pendiente + fecha vencida => Vencido.
 */
exports.getContratoController = async (idContrato) => {
	const [rows] = await pool.execute(
		`SELECT
			id_contrato,
			nombre,
			descripcion,
			periodo,
			monto,
			CASE
				WHEN estado = 'Pagado' THEN 'Pagado'
				WHEN fecha_vencimiento IS NOT NULL AND fecha_vencimiento < CURDATE() THEN 'Vencido'
				ELSE estado
			END AS estado,
			fecha_vencimiento,
			creado_en,
			actualizado_en
		FROM alq_contrato
		WHERE id_contrato = ?`,
		[idContrato],
	);
	return rows[0] || null;
};

exports.createContratoController = async (payload) => {
	const {
		nombre,
		descripcion,
		periodo = "Mensual",
		monto = 0,
		estado = "Pendiente",
		fecha_vencimiento,
	} = payload;

	const idContrato = crypto.randomUUID();

	await pool.execute(
		`INSERT INTO alq_contrato
			(id_contrato, nombre, descripcion, periodo, monto, estado, fecha_vencimiento, creado_en)
		VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
		[
			idContrato,
			nombre,
			descripcion || null,
			periodo,
			monto,
			estado,
			fecha_vencimiento,
		],
	);

	const [rows] = await pool.execute(
		`SELECT
			id_contrato,
			nombre,
			descripcion,
			periodo,
			monto,
			CASE
				WHEN estado = 'Pagado' THEN 'Pagado'
				WHEN fecha_vencimiento IS NOT NULL AND fecha_vencimiento < CURDATE() THEN 'Vencido'
				ELSE estado
			END AS estado,
			fecha_vencimiento,
			creado_en,
			actualizado_en
		FROM alq_contrato
		WHERE id_contrato = ?`,
		[idContrato],
	);

	return rows[0];
};

exports.updateContratoController = async (idContrato, payload) => {
	const { nombre, descripcion, periodo, monto, estado, fecha_vencimiento } =
		payload;

	const fields = [];
	const values = [];

	if (nombre !== undefined) {
		fields.push("nombre = ?");
		values.push(nombre);
	}
	if (descripcion !== undefined) {
		fields.push("descripcion = ?");
		values.push(descripcion);
	}
	if (periodo !== undefined) {
		fields.push("periodo = ?");
		values.push(periodo);
	}
	if (monto !== undefined) {
		fields.push("monto = ?");
		values.push(monto);
	}
	if (estado !== undefined) {
		fields.push("estado = ?");
		values.push(estado);
	}
	if (fecha_vencimiento !== undefined) {
		fields.push("fecha_vencimiento = ?");
		values.push(fecha_vencimiento);
	}

	if (fields.length === 0) {
		return null;
	}

	values.push(idContrato);

	const query = `
		UPDATE alq_contrato
		SET ${fields.join(", ")}, actualizado_en = NOW()
		WHERE id_contrato = ?
	`;

	await pool.execute(query, values);

	const [rows] = await pool.execute(
		`SELECT
			id_contrato,
			nombre,
			descripcion,
			periodo,
			monto,
			CASE
				WHEN estado = 'Pagado' THEN 'Pagado'
				WHEN fecha_vencimiento IS NOT NULL AND fecha_vencimiento < CURDATE() THEN 'Vencido'
				ELSE estado
			END AS estado,
			fecha_vencimiento,
			creado_en,
			actualizado_en
		FROM alq_contrato
		WHERE id_contrato = ?`,
		[idContrato],
	);

	return rows[0] || null;
};

exports.deleteContratoController = async (idContrato) => {
	const [existing] = await pool.execute(
		"SELECT id_contrato FROM alq_contrato WHERE id_contrato = ? LIMIT 1",
		[idContrato],
	);

	if (!existing.length) {
		return { success: false };
	}

	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();
		await conn.execute("DELETE FROM alq_pago WHERE id_contrato = ?", [
			idContrato,
		]);
		await conn.execute("DELETE FROM alq_contrato WHERE id_contrato = ?", [
			idContrato,
		]);
		await conn.commit();
		return { success: true };
	} catch (error) {
		await conn.rollback();
		throw error;
	} finally {
		conn.release();
	}
};

// ==========================================
// PAGOS
// ==========================================

exports.listHistorialPagosAlquilerController = async (limit = 200) => {
	const safeLimit = sanitizeLimit(limit, 200, 1000);
	const query = `
		SELECT
			p.id_pago,
			p.id_contrato,
			c.nombre AS nombre_contrato,
			p.fecha_pago,
			p.monto,
			p.metodo,
			p.referencia,
			p.creado_en
		FROM alq_pago p
		INNER JOIN alq_contrato c ON c.id_contrato = p.id_contrato
		ORDER BY p.fecha_pago DESC
		LIMIT ${safeLimit}
	`;
	const [rows] = await pool.execute(query);
	return rows;
};

exports.listPagosContratoController = async (idContrato, limit = 200) => {
	const safeLimit = sanitizeLimit(limit, 200, 1000);
	const query = `
		SELECT
			p.id_pago,
			p.id_contrato,
			c.nombre AS nombre_contrato,
			p.fecha_pago,
			p.monto,
			p.metodo,
			p.referencia,
			p.creado_en
		FROM alq_pago p
		INNER JOIN alq_contrato c ON c.id_contrato = p.id_contrato
		WHERE p.id_contrato = ?
		ORDER BY p.fecha_pago DESC
		LIMIT ${safeLimit}
	`;
	const [rows] = await pool.execute(query, [idContrato]);
	return rows;
};

exports.registrarPagoAlquilerController = async (
	idContrato,
	payload,
	idUsuario,
) => {
	const { fecha_pago, fecha_proximo_pago, monto, metodo, referencia } = payload;

	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		const [contratos] = await conn.execute(
			"SELECT id_contrato, nombre FROM alq_contrato WHERE id_contrato = ? LIMIT 1",
			[idContrato],
		);
		if (!contratos.length) {
			const err = new Error("Contrato no encontrado");
			err.code = "CONTRATO_NOT_FOUND";
			throw err;
		}

		const idPago = crypto.randomUUID();
		const tasaDiaBcv = await getTodayBcvRate();
		const normalized = normalizeUsdAmounts({
			montoUsd: Number(monto),
			tasaBcv: tasaDiaBcv,
		});
		await conn.execute(
			`INSERT INTO alq_pago
				(id_pago, id_contrato, fecha_pago, monto, monto_usd, monto_bs, tasa_dia_bcv, metodo, referencia, id_usuario, creado_en)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
			[
				idPago,
				idContrato,
				fecha_pago,
				normalized.monto_usd,
				normalized.monto_usd,
				normalized.monto_bs,
				normalized.tasa_dia_bcv,
				metodo || "Transferencia",
				referencia || null,
				idUsuario,
			],
		);

		await conn.execute(
			`UPDATE alq_contrato
			SET fecha_vencimiento = ?, estado = 'Pagado', actualizado_en = NOW()
			WHERE id_contrato = ?`,
			[fecha_proximo_pago, idContrato],
		);

		await conn.execute(
			`INSERT INTO fac_movimiento
				(id_movimiento, tipo, fecha, monto, monto_usd, monto_bs, tasa_dia_bcv, descripcion, referencia, origen_modulo, origen_id, id_usuario, creado_en)
			 VALUES
				(UUID(), 'Egreso', ?, ?, ?, ?, ?, ?, ?, 'ALQ_PAGO', ?, ?, NOW())`,
			[
				fecha_pago,
				normalized.monto_usd,
				normalized.monto_usd,
				normalized.monto_bs,
				normalized.tasa_dia_bcv,
				`Pago alquiler - ${contratos[0].nombre || idContrato}`,
				referencia || idPago,
				idPago,
				idUsuario,
			],
		);

		await conn.commit();

		const [rows] = await pool.execute(
			`SELECT
				p.id_pago,
				p.id_contrato,
				c.nombre AS nombre_contrato,
				p.fecha_pago,
				p.monto,
				p.metodo,
				p.referencia,
				p.creado_en
			FROM alq_pago p
			INNER JOIN alq_contrato c ON c.id_contrato = p.id_contrato
			WHERE p.id_pago = ?`,
			[idPago],
		);

		return rows[0];
	} catch (error) {
		await conn.rollback();
		throw error;
	} finally {
		conn.release();
	}
};

exports.updatePagoAlquilerController = async (idPago, payload) => {
	const { fecha_pago, fecha_proximo_pago, monto, metodo, referencia } = payload;

	const fields = [];
	const values = [];

	if (fecha_pago !== undefined) {
		fields.push("fecha_pago = ?");
		values.push(fecha_pago);
	}
	if (monto !== undefined) {
		fields.push("monto = ?");
		values.push(monto);
	}
	if (metodo !== undefined) {
		fields.push("metodo = ?");
		values.push(metodo);
	}
	if (referencia !== undefined) {
		fields.push("referencia = ?");
		values.push(referencia);
	}

	if (fields.length === 0 && fecha_proximo_pago === undefined) {
		return null;
	}

	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		const [existing] = await conn.execute(
			"SELECT id_contrato, tasa_dia_bcv FROM alq_pago WHERE id_pago = ? LIMIT 1",
			[idPago],
		);
		if (!existing.length) {
			return null;
		}

		if (monto !== undefined) {
			let tasaPago = Number(existing[0].tasa_dia_bcv || 0);
			if (tasaPago <= 0) {
				tasaPago = await getTodayBcvRate();
			}
			const normalizedMonto = normalizeUsdAmounts({
				montoUsd: Number(monto),
				tasaBcv: tasaPago,
			});
			fields.push("monto_usd = ?");
			values.push(normalizedMonto.monto_usd);
			fields.push("monto_bs = ?");
			values.push(normalizedMonto.monto_bs);
			fields.push("tasa_dia_bcv = ?");
			values.push(normalizedMonto.tasa_dia_bcv);
		}

		if (fields.length > 0) {
			values.push(idPago);
			await conn.execute(
				`UPDATE alq_pago SET ${fields.join(", ")} WHERE id_pago = ?`,
				values,
			);
		}

		if (fecha_proximo_pago !== undefined) {
			await conn.execute(
				`UPDATE alq_contrato
				SET fecha_vencimiento = ?, estado = 'Pagado', actualizado_en = NOW()
				WHERE id_contrato = ?`,
				[fecha_proximo_pago, existing[0].id_contrato],
			);
		}

		const [pagoRows] = await conn.execute(
			`SELECT p.id_pago, p.fecha_pago, p.monto, p.monto_usd, p.monto_bs, p.tasa_dia_bcv, p.referencia, p.id_usuario, c.nombre AS nombre_contrato
			 FROM alq_pago p
			 INNER JOIN alq_contrato c ON c.id_contrato = p.id_contrato
			 WHERE p.id_pago = ?
			 LIMIT 1`,
			[idPago],
		);

		if (pagoRows.length > 0) {
			const pago = pagoRows[0];
			await conn.execute(
				`UPDATE fac_movimiento
				 SET fecha = ?, monto = ?, monto_usd = ?, monto_bs = ?, tasa_dia_bcv = ?, descripcion = ?, referencia = ?, id_usuario = ?
				 WHERE origen_modulo = 'ALQ_PAGO' AND origen_id = ?`,
				[
					pago.fecha_pago,
					Number(pago.monto_usd || pago.monto || 0),
					Number(pago.monto_usd || pago.monto || 0),
					Number(pago.monto_bs || pago.monto || 0),
					Number(pago.tasa_dia_bcv || 0),
					`Pago alquiler - ${pago.nombre_contrato || existing[0].id_contrato}`,
					pago.referencia || idPago,
					pago.id_usuario,
					idPago,
				],
			);
		}

		await conn.commit();

		const [rows] = await pool.execute(
			`SELECT
				p.id_pago,
				p.id_contrato,
				c.nombre AS nombre_contrato,
				p.fecha_pago,
				p.monto,
				p.metodo,
				p.referencia,
				p.creado_en
			FROM alq_pago p
			INNER JOIN alq_contrato c ON c.id_contrato = p.id_contrato
			WHERE p.id_pago = ?`,
			[idPago],
		);

		return rows[0] || null;
	} catch (error) {
		await conn.rollback();
		throw error;
	} finally {
		conn.release();
	}
};

exports.deletePagoAlquilerController = async (idPago) => {
	await pool.execute(
		"DELETE FROM fac_movimiento WHERE origen_modulo = 'ALQ_PAGO' AND origen_id = ?",
		[idPago],
	);

	const [result] = await pool.execute(
		"DELETE FROM alq_pago WHERE id_pago = ?",
		[idPago],
	);

	if (result.affectedRows === 0) {
		return { success: false };
	}

	return { success: true };
};
