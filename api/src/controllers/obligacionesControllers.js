const { pool } = require("../db");
const crypto = require("crypto");

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
			`SELECT id_obligacion, id_ente FROM leg_obligacion WHERE id_obligacion = ?`,
			[id_obligacion],
		);

		if (!obligaciones.length) {
			const err = new Error("Obligación no encontrada");
			err.code = "OBLIGACION_NOT_FOUND";
			throw err;
		}

		const id_pago = crypto.randomUUID();

		// Insertar el pago
		await conn.execute(
			`INSERT INTO leg_pago
			(id_pago, id_obligacion, fecha_pago, monto, metodo, referencia, id_usuario)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[
				id_pago,
				id_obligacion,
				fecha_pago,
				Number(monto),
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

module.exports = {
	listObligacionesController,
	getObligacionController,
	createObligacionController,
	updateObligacionController,
	deleteObligacionController,
	registrarPagoObligacionController,
};
