const { pool } = require("../db");

const sanitizeLimit = (limit, fallback = 200, max = 1000) => {
	const parsed = Number.parseInt(limit, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return Math.min(parsed, max);
};

// ==========================================
// COMISIONES - LISTADO
// ==========================================

exports.listComisionesController = async ({
	id_especialista,
	estado,
	limit = 200,
}) => {
	const safeLimit = sanitizeLimit(limit, 200, 1000);
	const filters = [];
	const params = [];

	if (id_especialista) {
		filters.push("ec.id_especialista = ?");
		params.push(id_especialista);
	}
	if (estado) {
		filters.push("ec.estado = ?");
		params.push(estado);
	}

	const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

	const sql = `
		SELECT
			ec.id_comision,
			ec.id_cita,
			ec.id_especialista,
			u.nombre AS especialista_nombre,
			u.apellido AS especialista_apellido,
			esp.id_especialidad,
			esp.porcentaje,
			ec.monto,
			ec.estado,
			ec.fecha_creacion,
			ec.fecha_pago,
			c.fecha_cita,
			c.hora_cita,
			eco.id_eco,
			eco.nombre AS eco_nombre,
			eco.precio AS eco_precio
		FROM esp_comision ec
		INNER JOIN especialista esp ON esp.id_especialista = ec.id_especialista
		INNER JOIN usuario u ON u.id_usuario = ec.id_especialista
		INNER JOIN cita c ON c.id_cita = ec.id_cita
		INNER JOIN eco eco ON eco.id_eco = c.id_eco
		${whereClause}
		ORDER BY ec.fecha_creacion DESC
		LIMIT ${safeLimit}
	`;

	const [rows] = await pool.execute(sql, params);
	return rows;
};

// ==========================================
// COMISIONES - GENERAR PENDIENTES
// ==========================================

exports.generarComisionesPendientesController = async ({ id_usuario }) => {
	const sql = `
		INSERT INTO esp_comision
			(id_comision, id_cita, id_especialista, porcentaje, monto, estado, fecha_creacion, fecha_pago, id_usuario)
		SELECT
			UUID(),
			c.id_cita,
			c.id_especialista,
			esp.porcentaje,
			ROUND(eco.precio * esp.porcentaje / 100, 2) AS monto,
			'Pendiente',
			NOW(),
			NULL,
			?
		FROM cita c
		INNER JOIN especialista esp ON esp.id_especialista = c.id_especialista
		INNER JOIN eco eco ON eco.id_eco = c.id_eco
		LEFT JOIN esp_comision ec ON ec.id_cita = c.id_cita
		WHERE c.estado_cita = 3
			AND c.estado_pago = 1
			AND ec.id_comision IS NULL
	`;

	const [result] = await pool.execute(sql, [id_usuario]);
	return { inserted: result.affectedRows };
};

// ==========================================
// COMISIONES - PAGAR
// ==========================================

exports.pagarComisionController = async ({ id_comision, id_usuario, fecha_pago }) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		const [rows] = await conn.execute(
			`SELECT
				ec.id_comision,
				ec.id_especialista,
				ec.monto,
				ec.estado,
				u.nombre AS especialista_nombre,
				u.apellido AS especialista_apellido
			FROM esp_comision ec
			INNER JOIN usuario u ON u.id_usuario = ec.id_especialista
			WHERE ec.id_comision = ?
			FOR UPDATE`,
			[id_comision],
		);

		if (!rows.length) {
			return null;
		}

		const comision = rows[0];
		if (comision.estado === "Pagada") {
			const err = new Error("Comision ya pagada");
			err.code = "ALREADY_PAID";
			throw err;
		}

		const fechaPagoValue = fecha_pago || new Date().toISOString().slice(0, 10);

		await conn.execute(
			`UPDATE esp_comision
			SET estado = 'Pagada', fecha_pago = ?, id_usuario = ?
			WHERE id_comision = ?`,
			[fechaPagoValue, id_usuario, id_comision],
		);

		await conn.execute(
			`INSERT INTO fac_movimiento
				(id_movimiento, tipo, fecha, monto, descripcion, referencia, origen_modulo, origen_id, id_usuario, creado_en)
			VALUES
				(UUID(), 'Egreso', ?, ?, ?, ?, 'ESP_COMISION', ?, ?, NOW())`,
			[
				fechaPagoValue,
				comision.monto,
				`Pago comision especialista ${comision.especialista_nombre} ${comision.especialista_apellido}`,
				id_comision,
				id_comision,
				id_usuario,
			],
		);

		await conn.commit();

		const [updatedRows] = await pool.execute(
			`SELECT
				ec.id_comision,
				ec.id_cita,
				ec.id_especialista,
				u.nombre AS especialista_nombre,
				u.apellido AS especialista_apellido,
				ec.porcentaje,
				ec.monto,
				ec.estado,
				ec.fecha_creacion,
				ec.fecha_pago
			FROM esp_comision ec
			INNER JOIN usuario u ON u.id_usuario = ec.id_especialista
			WHERE ec.id_comision = ?`,
			[id_comision],
		);

		return updatedRows[0] || null;
	} catch (error) {
		await conn.rollback();
		throw error;
	} finally {
		conn.release();
	}
};
