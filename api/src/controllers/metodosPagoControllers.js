const { pool } = require("../db");
const crypto = require("crypto");

const listMetodosPagoController = async ({ soloActivos = false } = {}) => {
	const filters = [];
	const params = [];

	if (soloActivos) {
		filters.push("m.activo = 1");
	}

	const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
	const sql = `
		SELECT
			m.id_metodo_pago,
			m.nombre,
			m.banco_codigo,
			m.banco_nombre,
			m.tipo_pago,
			m.moneda,
			m.titular_nombre,
			m.titular_identificacion,
			m.correo,
			m.telefono,
			m.numero_cuenta,
			m.imagen_url,
			m.activo,
			m.creado_por,
			m.creado_en,
			m.actualizado_en,
			u.nombre AS creado_por_nombre,
			u.apellido AS creado_por_apellido
		FROM metodos_pago m
		INNER JOIN usuario u ON u.id_usuario = m.creado_por
		${where}
		ORDER BY m.activo DESC, m.creado_en DESC
	`;

	const [rows] = await pool.execute(sql, params);
	return rows;
};

const createMetodoPagoController = async ({
	nombre,
	banco_codigo,
	banco_nombre,
	tipo_pago,
	moneda,
	titular_nombre,
	titular_identificacion,
	correo,
	telefono,
	numero_cuenta,
	imagen_url,
	creado_por,
}) => {
	const id_metodo_pago = crypto.randomUUID();

	await pool.execute(
		`INSERT INTO metodos_pago
			(id_metodo_pago, nombre, banco_codigo, banco_nombre, tipo_pago, moneda, titular_nombre, titular_identificacion, correo, telefono, numero_cuenta, imagen_url, activo, creado_por)
		 VALUES
			(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
		[
			id_metodo_pago,
			nombre,
			banco_codigo,
			banco_nombre,
			tipo_pago,
			moneda,
			titular_nombre || null,
			titular_identificacion || null,
			correo || null,
			telefono || null,
			numero_cuenta || null,
			imagen_url,
			creado_por,
		],
	);

	const [rows] = await pool.execute(
		`SELECT
			id_metodo_pago,
			nombre,
			banco_codigo,
			banco_nombre,
			tipo_pago,
			moneda,
			titular_nombre,
			titular_identificacion,
			correo,
			telefono,
			numero_cuenta,
			imagen_url,
			activo,
			creado_por,
			creado_en,
			actualizado_en
		 FROM metodos_pago
		 WHERE id_metodo_pago = ?
		 LIMIT 1`,
		[id_metodo_pago],
	);

	return rows[0];
};

const getMetodoPagoByIdController = async (id_metodo_pago) => {
	const [rows] = await pool.execute(
		`SELECT
			id_metodo_pago,
			nombre,
			banco_codigo,
			banco_nombre,
			tipo_pago,
			moneda,
			titular_nombre,
			titular_identificacion,
			correo,
			telefono,
			numero_cuenta,
			imagen_url,
			activo,
			creado_por,
			creado_en,
			actualizado_en
		 FROM metodos_pago
		 WHERE id_metodo_pago = ?
		 LIMIT 1`,
		[id_metodo_pago],
	);

	return rows[0] || null;
};

const updateMetodoPagoController = async ({
	id_metodo_pago,
	nombre,
	banco_codigo,
	banco_nombre,
	tipo_pago,
	moneda,
	titular_nombre,
	titular_identificacion,
	correo,
	telefono,
	numero_cuenta,
	imagen_url,
}) => {
	const [result] = await pool.execute(
		`UPDATE metodos_pago
		 SET nombre = ?,
			 banco_codigo = ?,
			 banco_nombre = ?,
			 tipo_pago = ?,
			 moneda = ?,
			 titular_nombre = ?,
			 titular_identificacion = ?,
			 correo = ?,
			 telefono = ?,
			 numero_cuenta = ?,
			 imagen_url = ?,
			 actualizado_en = CURRENT_TIMESTAMP
		 WHERE id_metodo_pago = ?`,
		[
			nombre,
			banco_codigo,
			banco_nombre,
			tipo_pago,
			moneda,
			titular_nombre || null,
			titular_identificacion || null,
			correo || null,
			telefono || null,
			numero_cuenta || null,
			imagen_url,
			id_metodo_pago,
		],
	);

	if (!result.affectedRows) {
		const err = new Error("Método de pago no encontrado");
		err.code = "METODO_PAGO_NOT_FOUND";
		throw err;
	}

	return getMetodoPagoByIdController(id_metodo_pago);
};

const updateEstadoMetodoPagoController = async ({ id_metodo_pago, activo }) => {
	const [result] = await pool.execute(
		`UPDATE metodos_pago
		 SET activo = ?, actualizado_en = CURRENT_TIMESTAMP
		 WHERE id_metodo_pago = ?`,
		[activo ? 1 : 0, id_metodo_pago],
	);

	if (!result.affectedRows) {
		const err = new Error("Método de pago no encontrado");
		err.code = "METODO_PAGO_NOT_FOUND";
		throw err;
	}

	const [rows] = await pool.execute(
		`SELECT
			id_metodo_pago,
			nombre,
			banco_codigo,
			banco_nombre,
			tipo_pago,
			moneda,
			titular_nombre,
			titular_identificacion,
			correo,
			telefono,
			numero_cuenta,
			imagen_url,
			activo,
			creado_por,
			creado_en,
			actualizado_en
		 FROM metodos_pago
		 WHERE id_metodo_pago = ?
		 LIMIT 1`,
		[id_metodo_pago],
	);

	return rows[0];
};

const deleteMetodoPagoController = async (id_metodo_pago) => {
	const [result] = await pool.execute(
		"DELETE FROM metodos_pago WHERE id_metodo_pago = ?",
		[id_metodo_pago],
	);

	if (!result.affectedRows) {
		const err = new Error("Método de pago no encontrado");
		err.code = "METODO_PAGO_NOT_FOUND";
		throw err;
	}
};

module.exports = {
	listMetodosPagoController,
	createMetodoPagoController,
	getMetodoPagoByIdController,
	updateMetodoPagoController,
	updateEstadoMetodoPagoController,
	deleteMetodoPagoController,
};
