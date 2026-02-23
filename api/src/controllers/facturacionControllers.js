const { pool } = require("../db");

const buildPeriodoResumen = ({
	ingresos,
	egresos,
	ingresoOperativo,
	egresoOperativo,
}) => {
	const ingresosValue = Number(ingresos || 0);
	const egresosValue = Number(egresos || 0);
	const ingresoOperativoValue = Number(ingresoOperativo ?? ingresosValue);
	const egresoOperativoValue = Number(egresoOperativo ?? egresosValue);
	const netoOperativo = ingresoOperativoValue - egresoOperativoValue;
	const margenOperativo =
		ingresoOperativoValue > 0
			? Number(((netoOperativo / ingresoOperativoValue) * 100).toFixed(2))
			: 0;

	return {
		ingresos: ingresosValue,
		egresos: egresosValue,
		balance: ingresosValue - egresosValue,
		ingreso_operativo: ingresoOperativoValue,
		egreso_operativo: egresoOperativoValue,
		neto_operativo: netoOperativo,
		margen_operativo: margenOperativo,
	};
};

const buildMovimientosFilters = ({
	tipo,
	origen_modulo,
	fecha_desde,
	fecha_hasta,
	q,
}) => {
	const where = [];
	const params = [];

	if (tipo && ["Ingreso", "Egreso"].includes(tipo)) {
		where.push("f.tipo = ?");
		params.push(tipo);
	}

	if (origen_modulo) {
		where.push("f.origen_modulo = ?");
		params.push(origen_modulo);
	}

	if (fecha_desde) {
		where.push("f.fecha >= ?");
		params.push(fecha_desde);
	}

	if (fecha_hasta) {
		where.push("f.fecha <= ?");
		params.push(fecha_hasta);
	}

	if (q && q.trim()) {
		where.push(
			"(LOWER(COALESCE(f.descripcion, '')) LIKE ? OR LOWER(COALESCE(f.referencia, '')) LIKE ? OR LOWER(COALESCE(f.origen_id, '')) LIKE ?)",
		);
		const term = `%${q.trim().toLowerCase()}%`;
		params.push(term, term, term);
	}

	const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
	return { whereSql, params };
};

exports.listMovimientosFacturacionController = async ({
	tipo,
	origen_modulo,
	fecha_desde,
	fecha_hasta,
	q,
	limit = 20,
	offset = 0,
}) => {
	const parsedLimit = Number.parseInt(limit, 10);
	const parsedOffset = Number.parseInt(offset, 10);
	const safeLimit =
		Number.isFinite(parsedLimit) && parsedLimit > 0
			? Math.min(parsedLimit, 200)
			: 20;
	const safeOffset =
		Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

	const { whereSql, params } = buildMovimientosFilters({
		tipo,
		origen_modulo,
		fecha_desde,
		fecha_hasta,
		q,
	});

	const query = `
		SELECT
			f.id_movimiento,
			f.tipo,
			f.fecha,
			CASE
				WHEN f.monto_usd IS NOT NULL AND f.monto_usd > 0 THEN f.monto_usd
				ELSE COALESCE(f.monto, 0)
			END AS monto,
			CASE
				WHEN f.monto_usd IS NOT NULL AND f.monto_usd > 0 THEN f.monto_usd
				ELSE COALESCE(f.monto, 0)
			END AS monto_total_dol,
			CASE
				WHEN f.monto_bs IS NOT NULL AND f.monto_bs > 0 THEN f.monto_bs
				WHEN f.tasa_dia_bcv IS NOT NULL AND f.tasa_dia_bcv > 0
					THEN ROUND((CASE WHEN f.monto_usd IS NOT NULL AND f.monto_usd > 0 THEN f.monto_usd ELSE COALESCE(f.monto, 0) END) * f.tasa_dia_bcv, 2)
				ELSE 0
			END AS monto_total_bs,
			CASE
				WHEN f.tasa_dia_bcv IS NOT NULL AND f.tasa_dia_bcv > 0 THEN f.tasa_dia_bcv
				ELSE 0
			END AS tasa_dia,
			f.monto_usd,
			f.monto_bs,
			f.tasa_dia_bcv,
			f.descripcion,
			f.referencia,
			f.origen_modulo,
			f.origen_id,
			c.id_cita,
			c.fecha_cita,
			eco.nombre AS eco_nombre,
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
				NULLIF(p_cita.cedula_pagador, ''),
				'Sin cédula'
			) AS paciente_cedula,
			COALESCE(NULLIF(cm.rif, ''), NULLIF(pac.rif, '')) AS paciente_rif,
			u_esp.nombre AS especialista_nombre,
			u_esp.apellido AS especialista_apellido,
			f.id_usuario,
			f.creado_en,
			u.nombre AS usuario_nombre,
			u.apellido AS usuario_apellido
		FROM fac_movimiento f
		LEFT JOIN pagos p_cita ON f.origen_modulo = 'CITA_PAGO' AND p_cita.id_pago = f.origen_id
		LEFT JOIN esp_comision ec ON f.origen_modulo = 'ESP_COMISION' AND ec.id_comision = f.origen_id
		LEFT JOIN cita c ON c.id_cita = COALESCE(p_cita.id_cita, ec.id_cita)
		LEFT JOIN eco eco ON eco.id_eco = c.id_eco
		LEFT JOIN usuario u_esp ON u_esp.id_usuario = c.id_especialista
		LEFT JOIN usuario u_paciente ON u_paciente.id_usuario = c.id_paciente
		LEFT JOIN paciente pac ON pac.id_paciente = c.id_paciente
		LEFT JOIN representado rep ON rep.id_representado = c.id_representado
		LEFT JOIN cita_mostrador cm ON cm.id_cita = c.id_cita
		LEFT JOIN usuario u ON u.id_usuario = f.id_usuario
		${whereSql}
		ORDER BY f.fecha DESC, f.creado_en DESC
		LIMIT ${safeLimit} OFFSET ${safeOffset}
	`;

	const [rows] = await pool.execute(query, params);

	const countQuery = `
		SELECT COUNT(*) AS total
		FROM fac_movimiento f
		${whereSql}
	`;
	const [countRows] = await pool.execute(countQuery, params);

	return {
		rows,
		total: countRows[0]?.total || 0,
		limit: safeLimit,
		offset: safeOffset,
	};
};

exports.getResumenFacturacionController = async () => {
	const query = `
		SELECT
			COALESCE(SUM(CASE WHEN f.fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND f.tipo = 'Ingreso' THEN CASE WHEN f.monto_usd IS NOT NULL AND f.monto_usd > 0 THEN f.monto_usd ELSE COALESCE(f.monto, 0) END ELSE 0 END), 0) AS semanal_ingresos,
			COALESCE(SUM(CASE WHEN f.fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND f.tipo = 'Egreso' THEN CASE WHEN f.monto_usd IS NOT NULL AND f.monto_usd > 0 THEN f.monto_usd ELSE COALESCE(f.monto, 0) END ELSE 0 END), 0) AS semanal_egresos,
			COALESCE(SUM(CASE WHEN f.fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND f.tipo = 'Ingreso' AND f.origen_modulo = 'CITA_PAGO' THEN CASE WHEN f.monto_usd IS NOT NULL AND f.monto_usd > 0 THEN f.monto_usd ELSE COALESCE(f.monto, 0) END ELSE 0 END), 0) AS semanal_ingreso_citas,
			COALESCE(SUM(CASE WHEN f.fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND f.tipo = 'Egreso' AND f.origen_modulo = 'ESP_COMISION' THEN CASE WHEN f.monto_usd IS NOT NULL AND f.monto_usd > 0 THEN f.monto_usd ELSE COALESCE(f.monto, 0) END ELSE 0 END), 0) AS semanal_egreso_comisiones,
			COALESCE(SUM(CASE WHEN f.fecha >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND f.tipo = 'Ingreso' THEN CASE WHEN f.monto_usd IS NOT NULL AND f.monto_usd > 0 THEN f.monto_usd ELSE COALESCE(f.monto, 0) END ELSE 0 END), 0) AS mensual_ingresos,
			COALESCE(SUM(CASE WHEN f.fecha >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND f.tipo = 'Egreso' THEN CASE WHEN f.monto_usd IS NOT NULL AND f.monto_usd > 0 THEN f.monto_usd ELSE COALESCE(f.monto, 0) END ELSE 0 END), 0) AS mensual_egresos,
			COALESCE(SUM(CASE WHEN f.fecha >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND f.tipo = 'Ingreso' AND f.origen_modulo = 'CITA_PAGO' THEN CASE WHEN f.monto_usd IS NOT NULL AND f.monto_usd > 0 THEN f.monto_usd ELSE COALESCE(f.monto, 0) END ELSE 0 END), 0) AS mensual_ingreso_citas,
			COALESCE(SUM(CASE WHEN f.fecha >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND f.tipo = 'Egreso' AND f.origen_modulo = 'ESP_COMISION' THEN CASE WHEN f.monto_usd IS NOT NULL AND f.monto_usd > 0 THEN f.monto_usd ELSE COALESCE(f.monto, 0) END ELSE 0 END), 0) AS mensual_egreso_comisiones,
			COALESCE(SUM(CASE WHEN YEAR(f.fecha) = YEAR(CURDATE()) AND f.tipo = 'Ingreso' THEN CASE WHEN f.monto_usd IS NOT NULL AND f.monto_usd > 0 THEN f.monto_usd ELSE COALESCE(f.monto, 0) END ELSE 0 END), 0) AS anual_ingresos,
			COALESCE(SUM(CASE WHEN YEAR(f.fecha) = YEAR(CURDATE()) AND f.tipo = 'Egreso' THEN CASE WHEN f.monto_usd IS NOT NULL AND f.monto_usd > 0 THEN f.monto_usd ELSE COALESCE(f.monto, 0) END ELSE 0 END), 0) AS anual_egresos,
			COALESCE(SUM(CASE WHEN YEAR(f.fecha) = YEAR(CURDATE()) AND f.tipo = 'Ingreso' AND f.origen_modulo = 'CITA_PAGO' THEN CASE WHEN f.monto_usd IS NOT NULL AND f.monto_usd > 0 THEN f.monto_usd ELSE COALESCE(f.monto, 0) END ELSE 0 END), 0) AS anual_ingreso_citas,
			COALESCE(SUM(CASE WHEN YEAR(f.fecha) = YEAR(CURDATE()) AND f.tipo = 'Egreso' AND f.origen_modulo = 'ESP_COMISION' THEN CASE WHEN f.monto_usd IS NOT NULL AND f.monto_usd > 0 THEN f.monto_usd ELSE COALESCE(f.monto, 0) END ELSE 0 END), 0) AS anual_egreso_comisiones
		FROM fac_movimiento f
	`;

	const [rows] = await pool.execute(query);
	const data = rows[0] || {};

	return {
		semanal: buildPeriodoResumen({
			ingresos: data.semanal_ingresos,
			egresos: data.semanal_egresos,
			ingresoOperativo: data.semanal_ingresos,
			egresoOperativo: data.semanal_egresos,
		}),
		mensual: buildPeriodoResumen({
			ingresos: data.mensual_ingresos,
			egresos: data.mensual_egresos,
			ingresoOperativo: data.mensual_ingresos,
			egresoOperativo: data.mensual_egresos,
		}),
		anual: buildPeriodoResumen({
			ingresos: data.anual_ingresos,
			egresos: data.anual_egresos,
			ingresoOperativo: data.anual_ingresos,
			egresoOperativo: data.anual_egresos,
		}),
	};
};

/**
 * Elimina un movimiento de facturación y, según origen_modulo, el registro origen en su tabla.
 * LEG_PAGO -> leg_pago; NOM_PAGO -> nom_pago; ALQ_PAGO -> alq_pago;
 * INV_COMPRA -> inv_producto_compra + ajuste stock; resto -> solo fac_movimiento.
 */
exports.deleteMovimientoFacturacionController = async (id_movimiento) => {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		const [movRows] = await conn.execute(
			"SELECT id_movimiento, origen_modulo, origen_id FROM fac_movimiento WHERE id_movimiento = ? LIMIT 1",
			[id_movimiento],
		);
		if (!movRows.length) {
			const err = new Error("Movimiento no encontrado");
			err.code = "MOVIMIENTO_NOT_FOUND";
			throw err;
		}
		const { origen_modulo, origen_id } = movRows[0];

		if (origen_id) {
			switch (origen_modulo) {
				case "LEG_PAGO":
					await conn.execute("DELETE FROM leg_pago WHERE id_pago = ?", [origen_id]);
					break;
				case "NOM_PAGO":
					await conn.execute("DELETE FROM nom_pago WHERE id_pago = ?", [origen_id]);
					break;
				case "ALQ_PAGO":
					await conn.execute("DELETE FROM alq_pago WHERE id_pago = ?", [origen_id]);
					break;
				case "INV_COMPRA": {
					const [compraRows] = await conn.execute(
						"SELECT id_compra, id_producto, cantidad FROM inv_producto_compra WHERE id_compra = ? LIMIT 1",
						[origen_id],
					);
					if (compraRows.length) {
						const { id_producto, cantidad } = compraRows[0];
						const cantidadNum = Number(cantidad);
						await conn.execute(
							"UPDATE inv_producto SET stock_actual = stock_actual - ?, actualizado_en = CURRENT_TIMESTAMP WHERE id_producto = ?",
							[cantidadNum, id_producto],
						);
						await conn.execute("DELETE FROM inv_producto_compra WHERE id_compra = ?", [origen_id]);
					}
					break;
				}
				case "CITA_PAGO": {
					// Revertir estado de pago de la cita para que no quede como "pagada" sin ingreso
					const [pagoRows] = await conn.execute(
						"SELECT id_cita FROM pagos WHERE id_pago = ? LIMIT 1",
						[origen_id],
					);
					if (pagoRows.length) {
						const id_cita = pagoRows[0].id_cita;
						await conn.execute("UPDATE cita SET estado_pago = 0 WHERE id_cita = ?", [id_cita]);
						await conn.execute("UPDATE pagos SET estado_pago = 0 WHERE id_pago = ?", [origen_id]);
					}
					break;
				}
				case "ESP_COMISION":
				case "INV_AJUSTE":
				case "AJUSTE":
				default:
					// Solo se elimina el movimiento de facturación más abajo
					break;
			}
		}

		await conn.execute("DELETE FROM fac_movimiento WHERE id_movimiento = ?", [id_movimiento]);
		await conn.commit();
		return { message: "Movimiento eliminado correctamente" };
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
};
