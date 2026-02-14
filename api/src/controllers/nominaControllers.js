const crypto = require("crypto");
const { pool } = require("../db");
const { getTodayBcvRate, normalizeUsdAmounts } = require("../utils/currency");

// ==========================================
// EMPLEADOS
// ==========================================

// Get all employees
exports.listEmpleadosController = async (limit = 20) => {
	const parsedLimit = Number.parseInt(limit, 10);
	const safeLimit =
		Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
	const query = `
    SELECT
      id_empleado,
      nombre,
      apellido,
      cedula,
      cargo,
      periodo,
      sueldo,
      estado,
			proximo_pago_manual,
			estatus_pago_manual,
			CASE
				WHEN EXISTS (
					SELECT 1
					FROM nom_pago p2
					WHERE p2.id_empleado = nom_empleado.id_empleado
				)
				THEN 'Pagada'
				ELSE COALESCE(estatus_pago_manual, 'Pendiente')
			END AS estatus_pago,
			CASE
				WHEN EXISTS (
					SELECT 1
					FROM nom_pago p2
					WHERE p2.id_empleado = nom_empleado.id_empleado
				)
				THEN (
					SELECT MAX(p.fecha_proximo_pago)
					FROM nom_pago p
					WHERE p.id_empleado = nom_empleado.id_empleado
				)
				ELSE proximo_pago_manual
			END AS proximo_pago,
      creado_en,
      actualizado_en
    FROM nom_empleado
    ORDER BY creado_en DESC
		LIMIT ${safeLimit}
  `;

	const [rows] = await pool.execute(query);
	return rows;
};

// Get employee by ID
exports.getEmpleadoController = async (idEmpleado) => {
	const query = `
    SELECT
      id_empleado,
      nombre,
      apellido,
      cedula,
      cargo,
      periodo,
      sueldo,
      estado,
			proximo_pago_manual,
			estatus_pago_manual,
			CASE
				WHEN EXISTS (
					SELECT 1
					FROM nom_pago p2
					WHERE p2.id_empleado = nom_empleado.id_empleado
				)
				THEN 'Pagada'
				ELSE COALESCE(estatus_pago_manual, 'Pendiente')
			END AS estatus_pago,
			CASE
				WHEN EXISTS (
					SELECT 1
					FROM nom_pago p2
					WHERE p2.id_empleado = nom_empleado.id_empleado
				)
				THEN (
					SELECT MAX(p.fecha_proximo_pago)
					FROM nom_pago p
					WHERE p.id_empleado = nom_empleado.id_empleado
				)
				ELSE proximo_pago_manual
			END AS proximo_pago,
      creado_en,
      actualizado_en
    FROM nom_empleado
    WHERE id_empleado = ?
  `;

	const [rows] = await pool.execute(query, [idEmpleado]);
	return rows[0] || null;
};

// Create employee
exports.createEmpleadoController = async (payload) => {
	const { nombre, apellido, cedula, cargo, periodo, sueldo } = payload;

	const idEmpleado = crypto.randomUUID();

	const query = `
    INSERT INTO nom_empleado
    (id_empleado, nombre, apellido, cedula, cargo, periodo, sueldo, creado_en)
		VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
  `;

	await pool.execute(query, [
		idEmpleado,
		nombre,
		apellido || null,
		cedula || null,
		cargo,
		periodo || "Quincenal",
		sueldo || 0,
	]);

	const [rows] = await pool.execute(
		`SELECT
			id_empleado,
			nombre,
			apellido,
			cedula,
			cargo,
			periodo,
			sueldo,
			estado,
			proximo_pago_manual,
			estatus_pago_manual,
			CASE
				WHEN EXISTS (
					SELECT 1
					FROM nom_pago p2
					WHERE p2.id_empleado = nom_empleado.id_empleado
				)
				THEN 'Pagada'
				ELSE COALESCE(estatus_pago_manual, 'Pendiente')
			END AS estatus_pago,
			CASE
				WHEN EXISTS (
					SELECT 1
					FROM nom_pago p2
					WHERE p2.id_empleado = nom_empleado.id_empleado
				)
				THEN (
					SELECT MAX(p.fecha_proximo_pago)
					FROM nom_pago p
					WHERE p.id_empleado = nom_empleado.id_empleado
				)
				ELSE proximo_pago_manual
			END AS proximo_pago,
			creado_en,
			actualizado_en
		FROM nom_empleado
		WHERE id_empleado = ?`,
		[idEmpleado],
	);

	return rows[0];
};

// Update employee
exports.updateEmpleadoController = async (idEmpleado, payload) => {
	const {
		nombre,
		apellido,
		cedula,
		cargo,
		periodo,
		sueldo,
		estado,
		proximo_pago_manual,
		estatus_pago_manual,
	} = payload;

	const fields = [];
	const values = [];
	let paramCount = 1;

	if (nombre !== undefined) {
		fields.push(`nombre = ?`);
		values.push(nombre);
		paramCount++;
	}
	if (apellido !== undefined) {
		fields.push(`apellido = ?`);
		values.push(apellido);
		paramCount++;
	}
	if (cedula !== undefined) {
		fields.push(`cedula = ?`);
		values.push(cedula);
		paramCount++;
	}
	if (cargo !== undefined) {
		fields.push(`cargo = ?`);
		values.push(cargo);
		paramCount++;
	}
	if (periodo !== undefined) {
		fields.push(`periodo = ?`);
		values.push(periodo);
		paramCount++;
	}
	if (sueldo !== undefined) {
		fields.push(`sueldo = ?`);
		values.push(sueldo);
		paramCount++;
	}
	if (estado !== undefined) {
		fields.push(`estado = ?`);
		values.push(estado);
		paramCount++;
	}
	if (proximo_pago_manual !== undefined) {
		fields.push(`proximo_pago_manual = ?`);
		values.push(proximo_pago_manual);
		paramCount++;
	}
	if (estatus_pago_manual !== undefined) {
		fields.push(`estatus_pago_manual = ?`);
		values.push(estatus_pago_manual);
		paramCount++;
	}

	if (fields.length === 0) {
		throw new Error("No fields to update");
	}

	values.push(idEmpleado);

	const query = `
		UPDATE nom_empleado
		SET ${fields.join(", ")}, actualizado_en = NOW()
		WHERE id_empleado = ?
	`;

	await pool.execute(query, values);

	const [rows] = await pool.execute(
		`SELECT
			id_empleado,
			nombre,
			apellido,
			cedula,
			cargo,
			periodo,
			sueldo,
			estado,
			proximo_pago_manual,
			estatus_pago_manual,
			CASE
				WHEN EXISTS (
					SELECT 1
					FROM nom_pago p2
					WHERE p2.id_empleado = nom_empleado.id_empleado
				)
				THEN 'Pagada'
				ELSE COALESCE(estatus_pago_manual, 'Pendiente')
			END AS estatus_pago,
			CASE
				WHEN EXISTS (
					SELECT 1
					FROM nom_pago p2
					WHERE p2.id_empleado = nom_empleado.id_empleado
				)
				THEN (
					SELECT MAX(p.fecha_proximo_pago)
					FROM nom_pago p
					WHERE p.id_empleado = nom_empleado.id_empleado
				)
				ELSE proximo_pago_manual
			END AS proximo_pago,
			creado_en,
			actualizado_en
		FROM nom_empleado
		WHERE id_empleado = ?`,
		[idEmpleado],
	);

	return rows[0] || null;
};

// Delete employee
exports.deleteEmpleadoController = async (idEmpleado) => {
	const query = `
		DELETE FROM nom_empleado
		WHERE id_empleado = ?
	`;

	const [result] = await pool.execute(query, [idEmpleado]);
	return result.affectedRows > 0 ? { success: true } : { success: false };
};

// ==========================================
// PAGOS
// ==========================================

// Get payment history
exports.listHistorialPagosNominaController = async (limit = 20) => {
	const parsedLimit = Number.parseInt(limit, 10);
	const safeLimit =
		Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
	const query = `
    SELECT
      p.id_pago,
      p.id_empleado,
      e.nombre AS nombre_empleado,
      e.apellido,
      e.cargo,
      p.monto,
      p.fecha_pago,
			p.fecha_proximo_pago,
      p.metodo,
      p.referencia,
      p.creado_en
    FROM nom_pago p
    INNER JOIN nom_empleado e ON e.id_empleado = p.id_empleado
    ORDER BY p.fecha_pago DESC
		LIMIT ${safeLimit}
  `;

	const [rows] = await pool.execute(query);
	return rows;
};

// Get payment history for specific employee
exports.listHistorialPagosEmpleadoController = async (
	idEmpleado,
	limit = 20,
) => {
	const parsedLimit = Number.parseInt(limit, 10);
	const safeLimit =
		Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
	const query = `
    SELECT
      p.id_pago,
      p.id_empleado,
      e.nombre AS nombre_empleado,
      e.apellido,
      e.cargo,
      p.monto,
      p.fecha_pago,
			p.fecha_proximo_pago,
      p.metodo,
      p.referencia,
      p.creado_en
    FROM nom_pago p
    INNER JOIN nom_empleado e ON e.id_empleado = p.id_empleado
		WHERE e.id_empleado = ?
		ORDER BY p.fecha_pago DESC
		LIMIT ${safeLimit}
  `;

	const [rows] = await pool.execute(query, [idEmpleado]);
	return rows;
};

// Register payment
exports.registrarPagoNominaController = async (
	idEmpleado,
	payload,
	idUsuario,
) => {
	const { fecha_pago, fecha_proximo_pago, monto, metodo, referencia } = payload;

	const idPago = crypto.randomUUID();
	const tasaDiaBcv = await getTodayBcvRate();
	const normalized = normalizeUsdAmounts({
		montoUsd: Number(monto),
		tasaBcv: tasaDiaBcv,
	});

	const query = `
    INSERT INTO nom_pago
    (id_pago, id_empleado, fecha_pago, fecha_proximo_pago, monto, monto_usd, monto_bs, tasa_dia_bcv, metodo, referencia, id_usuario, creado_en)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;

	await pool.execute(query, [
		idPago,
		idEmpleado,
		fecha_pago,
		fecha_proximo_pago,
		monto,
		normalized.monto_usd,
		normalized.monto_bs,
		normalized.tasa_dia_bcv,
		metodo || "Transferencia",
		referencia || null,
		idUsuario,
	]);

	const [empleadoRows] = await pool.execute(
		"SELECT nombre, apellido FROM nom_empleado WHERE id_empleado = ? LIMIT 1",
		[idEmpleado],
	);
	const nombreEmpleado =
		`${empleadoRows[0]?.nombre || ""} ${empleadoRows[0]?.apellido || ""}`.trim() ||
		"Empleado";

	await pool.execute(
		`INSERT INTO fac_movimiento
			(id_movimiento, tipo, fecha, monto, monto_usd, monto_bs, tasa_dia_bcv, descripcion, referencia, origen_modulo, origen_id, id_usuario, creado_en)
		 VALUES
			(UUID(), 'Egreso', ?, ?, ?, ?, ?, ?, ?, 'NOM_PAGO', ?, ?, NOW())`,
		[
			fecha_pago,
			normalized.monto_usd,
			normalized.monto_usd,
			normalized.monto_bs,
			normalized.tasa_dia_bcv,
			`Pago nómina - ${nombreEmpleado}`,
			referencia || idPago,
			idPago,
			idUsuario,
		],
	);

	const [rows] = await pool.execute(
		`SELECT
			id_pago,
			id_empleado,
			fecha_pago,
			fecha_proximo_pago,
			monto,
			metodo,
			referencia,
			creado_en
		FROM nom_pago
		WHERE id_pago = ?`,
		[idPago],
	);

	return rows[0];
};

// Update payment
exports.updatePagoNominaController = async (idPago, payload) => {
	const { fecha_pago, fecha_proximo_pago, monto, metodo, referencia } = payload;

	const [beforeRows] = await pool.execute(
		`SELECT p.id_pago, p.id_empleado, p.id_usuario, p.referencia, p.tasa_dia_bcv, e.nombre, e.apellido
		 FROM nom_pago p
		 INNER JOIN nom_empleado e ON e.id_empleado = p.id_empleado
		 WHERE p.id_pago = ?
		 LIMIT 1`,
		[idPago],
	);
	if (!beforeRows.length) {
		return null;
	}

	const fields = [];
	const values = [];
	let paramCount = 1;

	if (fecha_pago !== undefined) {
		fields.push(`fecha_pago = ?`);
		values.push(fecha_pago);
		paramCount++;
	}
	if (fecha_proximo_pago !== undefined) {
		fields.push(`fecha_proximo_pago = ?`);
		values.push(fecha_proximo_pago);
		paramCount++;
	}
	if (monto !== undefined) {
		fields.push(`monto = ?`);
		values.push(monto);
		let tasaPago = Number(beforeRows[0].tasa_dia_bcv || 0);
		if (tasaPago <= 0) {
			tasaPago = await getTodayBcvRate();
		}
		const normalizedMonto = normalizeUsdAmounts({
			montoUsd: Number(monto),
			tasaBcv: tasaPago,
		});
		fields.push(`monto_usd = ?`);
		values.push(normalizedMonto.monto_usd);
		fields.push(`monto_bs = ?`);
		values.push(normalizedMonto.monto_bs);
		fields.push(`tasa_dia_bcv = ?`);
		values.push(normalizedMonto.tasa_dia_bcv);
		paramCount++;
	}
	if (metodo !== undefined) {
		fields.push(`metodo = ?`);
		values.push(metodo);
		paramCount++;
	}
	if (referencia !== undefined) {
		fields.push(`referencia = ?`);
		values.push(referencia);
		paramCount++;
	}

	if (fields.length === 0) {
		throw new Error("No fields to update");
	}

	values.push(idPago);

	const query = `
		UPDATE nom_pago
		SET ${fields.join(", ")}
		WHERE id_pago = ?
	`;

	await pool.execute(query, values);

	const [rows] = await pool.execute(
		`SELECT
			id_pago,
			id_empleado,
			fecha_pago,
			fecha_proximo_pago,
			monto,
			monto_usd,
			monto_bs,
			tasa_dia_bcv,
			metodo,
			referencia,
			id_usuario,
			creado_en
		FROM nom_pago
		WHERE id_pago = ?`,
		[idPago],
	);

	if (rows[0]) {
		const pago = rows[0];
		const empleadoNombre =
			`${beforeRows[0].nombre || ""} ${beforeRows[0].apellido || ""}`.trim() ||
			"Empleado";
		await pool.execute(
			`UPDATE fac_movimiento
			 SET fecha = ?, monto = ?, monto_usd = ?, monto_bs = ?, tasa_dia_bcv = ?, descripcion = ?, referencia = ?, id_usuario = ?
			 WHERE origen_modulo = 'NOM_PAGO' AND origen_id = ?`,
			[
				pago.fecha_pago,
				Number(pago.monto_usd || pago.monto || 0),
				Number(pago.monto_usd || pago.monto || 0),
				Number(pago.monto_bs || pago.monto || 0),
				Number(pago.tasa_dia_bcv || 0),
				`Pago nómina - ${empleadoNombre}`,
				pago.referencia || idPago,
				pago.id_usuario,
				idPago,
			],
		);
	}

	return rows[0] || null;
};

// Delete payment
exports.deletePagoNominaController = async (idPago) => {
	await pool.execute(
		"DELETE FROM fac_movimiento WHERE origen_modulo = 'NOM_PAGO' AND origen_id = ?",
		[idPago],
	);

	const query = `
		DELETE FROM nom_pago
		WHERE id_pago = ?
	`;

	const [result] = await pool.execute(query, [idPago]);
	return result.affectedRows > 0 ? { success: true } : { success: false };
};
