const { pool } = require("../db");
const { getTodayBcvRate, normalizeUsdAmounts } = require("../utils/currency");

const formatFechaCorta = (value) => {
	if (!value) return "N/A";
	if (value instanceof Date) {
		const yyyy = value.getFullYear();
		const mm = String(value.getMonth() + 1).padStart(2, "0");
		const dd = String(value.getDate()).padStart(2, "0");
		return `${dd}/${mm}/${yyyy}`;
	}
	const asText = String(value);
	if (/^\d{4}-\d{2}-\d{2}/.test(asText)) {
		const [yyyy, mm, dd] = asText.slice(0, 10).split("-");
		return `${dd}/${mm}/${yyyy}`;
	}
	return asText;
};

const buildCitaContexto = ({
	eco_nombre,
	paciente_nombre,
	paciente_cedula,
	especialista_nombre,
	especialista_apellido,
	fecha_cita,
}) => {
	const eco = eco_nombre || "N/A";
	const paciente = paciente_nombre || "N/A";
	const cedula = paciente_cedula || "N/A";
	const especialista =
		`${especialista_nombre || ""} ${especialista_apellido || ""}`.trim() || "N/A";
	const fecha = formatFechaCorta(fecha_cita);
	return `Eco: ${eco} · Paciente: ${paciente} (${cedula}) · Esp: ${especialista} · Cita: ${fecha}`;
};

const buildComisionDescripcion = ({
	eco_nombre,
	paciente_nombre,
	paciente_cedula,
	especialista_nombre,
	especialista_apellido,
	fecha_cita,
	metodo,
}) => {
	const contexto = buildCitaContexto({
		eco_nombre,
		paciente_nombre,
		paciente_cedula,
		especialista_nombre,
		especialista_apellido,
		fecha_cita,
	});
	const metodoPart = metodo ? ` (metodo: ${metodo})` : "";
	return `Pago comisión especialista · ${contexto}${metodoPart}`;
};

const buildIngresoCitaDescripcion = ({
	eco_nombre,
	paciente_nombre,
	paciente_cedula,
	especialista_nombre,
	especialista_apellido,
	fecha_cita,
	metodo,
}) => {
	const contexto = buildCitaContexto({
		eco_nombre,
		paciente_nombre,
		paciente_cedula,
		especialista_nombre,
		especialista_apellido,
		fecha_cita,
	});
	const metodoPart = metodo ? ` (metodo: ${metodo})` : "";
	return `Ingreso neto cita · ${contexto}${metodoPart}`;
};

const sanitizeLimit = (limit, fallback = 200, max = 1000) => {
	const parsed = Number.parseInt(limit, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return Math.min(parsed, max);
};

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

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
			COALESCE(
				NULLIF(TRIM(CONCAT(cm.nombre, ' ', cm.apellido)), ''),
				NULLIF(TRIM(CONCAT(rep.nombre, ' ', rep.apellido)), ''),
				NULLIF(TRIM(CONCAT(u_paciente.nombre, ' ', u_paciente.apellido)), ''),
				NULLIF(u_paciente.nombre, ''),
				'Sin nombre'
			) AS paciente_nombre,
			COALESCE(
				NULLIF(cm.cedula, ''),
				NULLIF(rep.cedula, ''),
				NULLIF(u_paciente.cedula, ''),
				NULLIF(pag.cedula_pagador, ''),
				'Sin cédula'
			) AS paciente_cedula,
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
			eco.precio AS eco_precio,
			fm.referencia AS referencia_pago,
			fm.descripcion AS descripcion_pago
		FROM esp_comision ec
		INNER JOIN especialista esp ON esp.id_especialista = ec.id_especialista
		INNER JOIN usuario u ON u.id_usuario = ec.id_especialista
		INNER JOIN cita c ON c.id_cita = ec.id_cita
		LEFT JOIN representado rep ON rep.id_representado = c.id_representado
		INNER JOIN usuario u_paciente ON u_paciente.id_usuario = c.id_paciente
		LEFT JOIN cita_mostrador cm ON cm.id_cita = c.id_cita
		LEFT JOIN pagos pag ON pag.id_cita = c.id_cita
		INNER JOIN eco eco ON eco.id_eco = c.id_eco
		LEFT JOIN fac_movimiento fm ON fm.origen_modulo = 'ESP_COMISION' AND fm.origen_id = ec.id_comision
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
			ROUND((eco.precio * esp.porcentaje) / 100, 2) AS monto,
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

exports.pagarComisionController = async ({
	id_comision,
	id_usuario,
	fecha_pago,
	metodo,
	referencia,
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		const [rows] = await conn.execute(
			`SELECT
				ec.id_comision,
				ec.id_cita,
				ec.id_especialista,
				ec.porcentaje,
				ec.monto,
				ec.estado,
				c.fecha_cita,
				eco.nombre AS eco_nombre,
				eco.precio AS eco_precio,
				p.id_pago,
				p.metodo AS pago_metodo,
				p.referencia AS pago_referencia,
				COALESCE(
					NULLIF(TRIM(CONCAT(cm.nombre, ' ', cm.apellido)), ''),
					NULLIF(TRIM(CONCAT(rep.nombre, ' ', rep.apellido)), ''),
					NULLIF(TRIM(CONCAT(u_paciente.nombre, ' ', u_paciente.apellido)), ''),
					NULLIF(u_paciente.nombre, ''),
					'Sin nombre'
				) AS paciente_nombre,
				COALESCE(
					NULLIF(cm.cedula, ''),
					NULLIF(rep.cedula, ''),
					NULLIF(u_paciente.cedula, ''),
					NULLIF(p.cedula_pagador, ''),
					'Sin cédula'
				) AS paciente_cedula,
				u.nombre AS especialista_nombre,
				u.apellido AS especialista_apellido
			FROM esp_comision ec
			INNER JOIN cita c ON c.id_cita = ec.id_cita
			INNER JOIN eco eco ON eco.id_eco = c.id_eco
			LEFT JOIN pagos p ON p.id_cita = ec.id_cita
			LEFT JOIN representado rep ON rep.id_representado = c.id_representado
			INNER JOIN usuario u_paciente ON u_paciente.id_usuario = c.id_paciente
			LEFT JOIN cita_mostrador cm ON cm.id_cita = c.id_cita
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
		const metodoFinal = metodo || comision.pago_metodo || null;
		const descripcion = buildComisionDescripcion({
			eco_nombre: comision.eco_nombre,
			paciente_nombre: comision.paciente_nombre,
			paciente_cedula: comision.paciente_cedula,
			especialista_nombre: comision.especialista_nombre,
			especialista_apellido: comision.especialista_apellido,
			fecha_cita: comision.fecha_cita,
			metodo: metodoFinal,
		});
		const descripcionIngreso = buildIngresoCitaDescripcion({
			eco_nombre: comision.eco_nombre,
			paciente_nombre: comision.paciente_nombre,
			paciente_cedula: comision.paciente_cedula,
			especialista_nombre: comision.especialista_nombre,
			especialista_apellido: comision.especialista_apellido,
			fecha_cita: comision.fecha_cita,
			metodo: metodoFinal,
		});
		const referenciaValue = referencia || comision.pago_referencia || id_comision;
		const tasaDia = await getTodayBcvRate();

		const montoComisionUsd = round2(Number(comision.monto || 0));
		const montoIngresoUsd = round2(
			Math.max(0, Number(comision.eco_precio || 0) - montoComisionUsd),
		);

		const normalizedEgreso = normalizeUsdAmounts({
			montoUsd: montoComisionUsd,
			tasaBcv: tasaDia,
		});
		const normalizedIngreso = normalizeUsdAmounts({
			montoUsd: montoIngresoUsd,
			tasaBcv: tasaDia,
		});

		await conn.execute(
			`UPDATE esp_comision
			SET estado = 'Pagada', fecha_pago = ?, id_usuario = ?
			WHERE id_comision = ?`,
			[fechaPagoValue, id_usuario, id_comision],
		);

		await conn.execute(
			`INSERT INTO fac_movimiento
				(id_movimiento, tipo, fecha, monto, monto_usd, monto_bs, tasa_dia_bcv, descripcion, referencia, origen_modulo, origen_id, id_usuario, creado_en)
			VALUES
				(UUID(), 'Egreso', ?, ?, ?, ?, ?, ?, ?, 'ESP_COMISION', ?, ?, NOW())`,
			[
				fechaPagoValue,
				normalizedEgreso.monto_usd,
				normalizedEgreso.monto_usd,
				normalizedEgreso.monto_bs,
				normalizedEgreso.tasa_dia_bcv,
				descripcion,
				referenciaValue,
				id_comision,
				id_usuario,
			],
		);

		if (comision.id_pago) {
			const [ingresoRows] = await conn.execute(
				`SELECT id_movimiento
				 FROM fac_movimiento
				 WHERE origen_modulo = 'CITA_PAGO' AND origen_id = ?
				 LIMIT 1`,
				[comision.id_pago],
			);

			if (!ingresoRows.length) {
				await conn.execute(
					`INSERT INTO fac_movimiento
						(id_movimiento, tipo, fecha, monto, monto_usd, monto_bs, tasa_dia_bcv, descripcion, referencia, origen_modulo, origen_id, id_usuario, creado_en)
					 VALUES
						(UUID(), 'Ingreso', ?, ?, ?, ?, ?, ?, ?, 'CITA_PAGO', ?, ?, NOW())`,
					[
						fechaPagoValue,
						normalizedIngreso.monto_usd,
						normalizedIngreso.monto_usd,
						normalizedIngreso.monto_bs,
						normalizedIngreso.tasa_dia_bcv,
						descripcionIngreso,
						referenciaValue,
						comision.id_pago,
						id_usuario,
					],
				);
			}
		}

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

// ==========================================
// COMISIONES - EDITAR PAGO
// ==========================================

exports.editarPagoComisionController = async ({
	id_comision,
	id_usuario,
	fecha_pago,
	metodo,
	referencia,
}) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		const [rows] = await conn.execute(
			`SELECT
				ec.id_comision,
				ec.id_cita,
				ec.id_especialista,
				ec.porcentaje,
				ec.monto,
				ec.estado,
				c.fecha_cita,
				eco.nombre AS eco_nombre,
				eco.precio AS eco_precio,
				p.id_pago,
				p.metodo AS pago_metodo,
				p.referencia AS pago_referencia,
				COALESCE(
					NULLIF(TRIM(CONCAT(cm.nombre, ' ', cm.apellido)), ''),
					NULLIF(TRIM(CONCAT(rep.nombre, ' ', rep.apellido)), ''),
					NULLIF(TRIM(CONCAT(u_paciente.nombre, ' ', u_paciente.apellido)), ''),
					NULLIF(u_paciente.nombre, ''),
					'Sin nombre'
				) AS paciente_nombre,
				COALESCE(
					NULLIF(cm.cedula, ''),
					NULLIF(rep.cedula, ''),
					NULLIF(u_paciente.cedula, ''),
					NULLIF(p.cedula_pagador, ''),
					'Sin cédula'
				) AS paciente_cedula,
				u.nombre AS especialista_nombre,
				u.apellido AS especialista_apellido
			FROM esp_comision ec
			INNER JOIN cita c ON c.id_cita = ec.id_cita
			INNER JOIN eco eco ON eco.id_eco = c.id_eco
			LEFT JOIN pagos p ON p.id_cita = ec.id_cita
			LEFT JOIN representado rep ON rep.id_representado = c.id_representado
			INNER JOIN usuario u_paciente ON u_paciente.id_usuario = c.id_paciente
			LEFT JOIN cita_mostrador cm ON cm.id_cita = c.id_cita
			INNER JOIN usuario u ON u.id_usuario = ec.id_especialista
			WHERE ec.id_comision = ?
			FOR UPDATE`,
			[id_comision],
		);

		if (!rows.length) {
			return null;
		}

		const comision = rows[0];
		if (comision.estado !== "Pagada") {
			const err = new Error("Solo se pueden editar pagos ya registrados");
			err.code = "INVALID_STATE";
			throw err;
		}

		const fechaPagoValue = fecha_pago || new Date().toISOString().slice(0, 10);
		const metodoFinal = metodo || comision.pago_metodo || null;
		const descripcion = buildComisionDescripcion({
			eco_nombre: comision.eco_nombre,
			paciente_nombre: comision.paciente_nombre,
			paciente_cedula: comision.paciente_cedula,
			especialista_nombre: comision.especialista_nombre,
			especialista_apellido: comision.especialista_apellido,
			fecha_cita: comision.fecha_cita,
			metodo: metodoFinal,
		});
		const descripcionIngreso = buildIngresoCitaDescripcion({
			eco_nombre: comision.eco_nombre,
			paciente_nombre: comision.paciente_nombre,
			paciente_cedula: comision.paciente_cedula,
			especialista_nombre: comision.especialista_nombre,
			especialista_apellido: comision.especialista_apellido,
			fecha_cita: comision.fecha_cita,
			metodo: metodoFinal,
		});
		const referenciaValue = referencia || comision.pago_referencia || id_comision;
		const [movRows] = await conn.execute(
			`SELECT tasa_dia_bcv
			 FROM fac_movimiento
			 WHERE origen_modulo = 'ESP_COMISION' AND origen_id = ?
			 LIMIT 1`,
			[id_comision],
		);

		let tasaDia = Number(movRows[0]?.tasa_dia_bcv || 0);
		if (tasaDia <= 0) {
			tasaDia = await getTodayBcvRate();
		}

		const montoComisionUsd = round2(Number(comision.monto || 0));
		const montoIngresoUsd = round2(
			Math.max(0, Number(comision.eco_precio || 0) - montoComisionUsd),
		);

		const normalizedEgreso = normalizeUsdAmounts({
			montoUsd: montoComisionUsd,
			tasaBcv: tasaDia,
		});
		const normalizedIngreso = normalizeUsdAmounts({
			montoUsd: montoIngresoUsd,
			tasaBcv: tasaDia,
		});

		await conn.execute(
			`UPDATE esp_comision
			SET fecha_pago = ?, id_usuario = ?
			WHERE id_comision = ?`,
			[fechaPagoValue, id_usuario, id_comision],
		);

		await conn.execute(
			`UPDATE fac_movimiento
			SET fecha = ?, monto = ?, monto_usd = ?, monto_bs = ?, tasa_dia_bcv = ?, descripcion = ?, referencia = ?, id_usuario = ?
			WHERE origen_modulo = 'ESP_COMISION' AND origen_id = ?`,
			[
				fechaPagoValue,
				normalizedEgreso.monto_usd,
				normalizedEgreso.monto_usd,
				normalizedEgreso.monto_bs,
				normalizedEgreso.tasa_dia_bcv,
				descripcion,
				referenciaValue,
				id_usuario,
				id_comision,
			],
		);

		if (comision.id_pago) {
			const [ingresoRows] = await conn.execute(
				`SELECT id_movimiento
				 FROM fac_movimiento
				 WHERE origen_modulo = 'CITA_PAGO' AND origen_id = ?
				 LIMIT 1`,
				[comision.id_pago],
			);

			if (ingresoRows.length) {
				await conn.execute(
					`UPDATE fac_movimiento
					 SET fecha = ?, monto = ?, monto_usd = ?, monto_bs = ?, tasa_dia_bcv = ?, descripcion = ?, referencia = ?, id_usuario = ?
					 WHERE origen_modulo = 'CITA_PAGO' AND origen_id = ?`,
					[
						fechaPagoValue,
						normalizedIngreso.monto_usd,
						normalizedIngreso.monto_usd,
						normalizedIngreso.monto_bs,
						normalizedIngreso.tasa_dia_bcv,
						descripcionIngreso,
						referenciaValue,
						id_usuario,
						comision.id_pago,
					],
				);
			} else {
				await conn.execute(
					`INSERT INTO fac_movimiento
						(id_movimiento, tipo, fecha, monto, monto_usd, monto_bs, tasa_dia_bcv, descripcion, referencia, origen_modulo, origen_id, id_usuario, creado_en)
					 VALUES
						(UUID(), 'Ingreso', ?, ?, ?, ?, ?, ?, ?, 'CITA_PAGO', ?, ?, NOW())`,
					[
						fechaPagoValue,
						normalizedIngreso.monto_usd,
						normalizedIngreso.monto_usd,
						normalizedIngreso.monto_bs,
						normalizedIngreso.tasa_dia_bcv,
						descripcionIngreso,
						referenciaValue,
						comision.id_pago,
						id_usuario,
					],
				);
			}
		}

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
