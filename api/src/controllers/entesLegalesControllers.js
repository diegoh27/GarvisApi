const { pool } = require("../db");
const crypto = require("crypto");

// ==========================================
// ENTES LEGALES
// ==========================================

/**
 * Lista solo los entes (sin obligaciones, con conteo)
 */
const listEntesSimpleController = async () => {
	const sql = `
		SELECT 
			e.id_ente,
			e.nombre,
			e.activo,
			e.creado_en,
			e.actualizado_en,
			COUNT(o.id_obligacion) as cant_obligaciones
		FROM leg_ente e
		LEFT JOIN leg_obligacion o ON e.id_ente = o.id_ente
		GROUP BY e.id_ente, e.nombre, e.activo, e.creado_en, e.actualizado_en
		ORDER BY e.nombre ASC
	`;
	const [rows] = await pool.execute(sql);
	return rows;
};

/**
 * Lista todos los entes legales (similar a listEntesSimpleController)
 */
const listEntesLegalesController = async () => {
	const sql = `
		SELECT 
			e.id_ente,
			e.nombre,
			e.activo,
			e.creado_en,
			e.actualizado_en,
			COUNT(o.id_obligacion) as cant_obligaciones
		FROM leg_ente e
		LEFT JOIN leg_obligacion o ON e.id_ente = o.id_ente
		GROUP BY e.id_ente, e.nombre, e.activo, e.creado_en, e.actualizado_en
		ORDER BY e.nombre ASC
	`;
	const [rows] = await pool.execute(sql);
	return rows;
};

/**
 * Obtiene un ente legal con sus obligaciones
 */
const getEnteLegalController = async (id_ente) => {
	const sql = `
		SELECT 
			e.id_ente,
			e.nombre,
			e.activo,
			e.creado_en,
			e.actualizado_en,
			o.id_obligacion,
			o.concepto,
			o.periodo,
			o.fecha_vencimiento,
			o.monto as valor,
			o.estado
		FROM leg_ente e
		LEFT JOIN leg_obligacion o ON e.id_ente = o.id_ente
		WHERE e.id_ente = ?
	`;
	const [rows] = await pool.execute(sql, [id_ente]);

	if (!rows.length) {
		const err = new Error("Ente legal no encontrado");
		err.code = "ENTE_NOT_FOUND";
		throw err;
	}

	// Tomar el primer row para los datos del ente
	const firstRow = rows[0];

	// Contar obligaciones
	const cant_obligaciones = rows.filter((r) => r.id_obligacion !== null).length;

	return {
		id_ente: firstRow.id_ente,
		nombre: firstRow.nombre,
		activo: firstRow.activo,
		cant_obligaciones,
		creado_en: firstRow.creado_en,
		actualizado_en: firstRow.actualizado_en,
	};
};

/**
 * Crea solo un ente legal (sin obligación)
 */
const createEnteLegalController = async ({ nombre_ente }) => {
	// Validar que no exista otro ente con el mismo nombre
	const nombreTrim = nombre_ente.trim().toUpperCase();
	const [existing] = await pool.execute(
		"SELECT id_ente FROM leg_ente WHERE UPPER(nombre) = ? LIMIT 1",
		[nombreTrim],
	);
	if (existing.length > 0) {
		const err = new Error("Ya existe un ente legal con ese nombre");
		err.code = "DUPLICATE_NAME";
		throw err;
	}

	const id_ente = crypto.randomUUID();

	await pool.execute("INSERT INTO leg_ente (id_ente, nombre) VALUES (?, ?)", [
		id_ente,
		nombre_ente.trim(),
	]);

	return {
		id_ente,
		nombre: nombre_ente.trim(),
		activo: 1,
		cant_obligaciones: 0,
		creado_en: new Date(),
		actualizado_en: null,
	};
};

/**
 * Actualiza solo el nombre del ente legal
 */
const updateEnteLegalController = async ({ id_ente, nombre_ente }) => {
	const [existing] = await pool.execute(
		"SELECT id_ente FROM leg_ente WHERE id_ente = ? LIMIT 1",
		[id_ente],
	);
	if (!existing.length) {
		const err = new Error("Ente legal no encontrado");
		err.code = "ENTE_NOT_FOUND";
		throw err;
	}

	// Validar que no exista otro ente con el mismo nombre
	const nombreTrim = nombre_ente.trim().toUpperCase();
	const [duplicate] = await pool.execute(
		"SELECT id_ente FROM leg_ente WHERE UPPER(nombre) = ? AND id_ente != ? LIMIT 1",
		[nombreTrim, id_ente],
	);
	if (duplicate.length > 0) {
		const err = new Error("Ya existe un ente legal con ese nombre");
		err.code = "DUPLICATE_NAME";
		throw err;
	}

	await pool.execute(
		"UPDATE leg_ente SET nombre = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id_ente = ?",
		[nombre_ente.trim(), id_ente],
	);

	// Retornar el ente actualizado con conteo de obligaciones
	const [updated] = await pool.execute(
		`SELECT 
			e.id_ente,
			e.nombre,
			e.activo,
			e.creado_en,
			e.actualizado_en,
			COUNT(o.id_obligacion) as cant_obligaciones
		FROM leg_ente e
		LEFT JOIN leg_obligacion o ON e.id_ente = o.id_ente
		WHERE e.id_ente = ?
		GROUP BY e.id_ente, e.nombre, e.activo, e.creado_en, e.actualizado_en`,
		[id_ente],
	);

	return updated[0];
};

/**
 * Elimina un ente legal y sus obligaciones
 */
const deleteEnteLegalController = async (id_ente) => {
	const [existing] = await pool.execute(
		"SELECT id_ente FROM leg_ente WHERE id_ente = ? LIMIT 1",
		[id_ente],
	);
	if (!existing.length) {
		const err = new Error("Ente legal no encontrado");
		err.code = "ENTE_NOT_FOUND";
		throw err;
	}

	try {
		// Eliminar obligaciones primero
		await pool.execute("DELETE FROM leg_obligacion WHERE id_ente = ?", [
			id_ente,
		]);

		// Luego eliminar ente
		await pool.execute("DELETE FROM leg_ente WHERE id_ente = ?", [id_ente]);

		return { success: true };
	} catch (error) {
		throw error;
	}
};

/**
 * Lista el historial de pagos de todos los entes legales
 */
const listHistorialPagosEntesController = async ({ limit = 200 } = {}) => {
	// Sanitizar limit para evitar inyección SQL
	const safeLimit = Math.max(1, Math.min(1000, parseInt(limit) || 200));

	const sql = `
		SELECT
			p.id_pago AS id_historial,
			e.id_ente,
			e.nombre AS nombre_ente,
			o.concepto,
			p.monto AS precio_unitario,
			p.fecha_pago AS fecha_ingreso,
			p.creado_en
		FROM leg_pago p
		INNER JOIN leg_obligacion o ON o.id_obligacion = p.id_obligacion
		INNER JOIN leg_ente e ON e.id_ente = o.id_ente
		ORDER BY p.fecha_pago DESC
		LIMIT ${safeLimit}
	`;

	const [rows] = await pool.execute(sql);
	return rows;
};

/**
 * Registra un pago de un ente legal y actualiza su próxima fecha de vencimiento
 */
const registrarPagoEnteLegalController = async ({
	id_ente,
	monto,
	fecha_pago,
	fecha_proxima_vencimiento,
	metodo,
	referencia,
	id_usuario,
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		const [obligaciones] = await conn.execute(
			`SELECT id_obligacion FROM leg_obligacion WHERE id_ente = ? ORDER BY creado_en DESC LIMIT 1`,
			[id_ente],
		);

		if (!obligaciones.length) {
			const err = new Error("Obligacion no encontrada para este ente");
			err.code = "OBLIGACION_NOT_FOUND";
			throw err;
		}

		const id_obligacion = obligaciones[0].id_obligacion;
		const id_pago = crypto.randomUUID();
		const metodoPago = metodo || "Transferencia";

		await conn.execute(
			`INSERT INTO leg_pago
			(id_pago, id_obligacion, fecha_pago, monto, metodo, referencia, id_usuario)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[
				id_pago,
				id_obligacion,
				fecha_pago,
				Number(monto),
				metodoPago,
				referencia || null,
				id_usuario,
			],
		);

		await conn.execute(
			`UPDATE leg_obligacion
			 SET estado = ?, fecha_vencimiento = ?, actualizado_en = CURRENT_TIMESTAMP
			 WHERE id_obligacion = ?`,
			["Pagado", fecha_proxima_vencimiento, id_obligacion],
		);

		await conn.commit();

		return {
			id_historial: id_pago,
			id_ente,
			precio_unitario: Number(monto),
			fecha_ingreso: fecha_pago,
			creado_en: new Date(),
			metodo: metodoPago,
			referencia: referencia || null,
			fecha_proxima_vencimiento,
		};
	} catch (error) {
		await conn.rollback();
		throw error;
	} finally {
		conn.release();
	}
};

/**
 * Elimina un registro de pago de ente legal (leg_pago) y su movimiento en facturación (fac_movimiento)
 */
const deletePagoEnteLegalController = async (id_pago) => {
	const [rows] = await pool.execute(
		"SELECT id_pago FROM leg_pago WHERE id_pago = ? LIMIT 1",
		[id_pago],
	);
	if (!rows.length) {
		const err = new Error("Pago no encontrado");
		err.code = "PAGO_NOT_FOUND";
		throw err;
	}
	// Eliminar primero el movimiento en facturación (origen_modulo = LEG_PAGO)
	await pool.execute(
		"DELETE FROM fac_movimiento WHERE origen_modulo = 'LEG_PAGO' AND origen_id = ?",
		[id_pago],
	);
	// Luego eliminar el pago
	await pool.execute("DELETE FROM leg_pago WHERE id_pago = ?", [id_pago]);
	return { message: "Pago eliminado correctamente" };
};

module.exports = {
	listEntesSimpleController,
	listEntesLegalesController,
	getEnteLegalController,
	createEnteLegalController,
	updateEnteLegalController,
	deleteEnteLegalController,
	listHistorialPagosEntesController,
	registrarPagoEnteLegalController,
	deletePagoEnteLegalController,
};
