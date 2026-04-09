const { pool } = require("../db");
const crypto = require("crypto");

const listNotificacionesByUsuarioController = async ({
	id_usuario,
	solo_no_leidas = false,
	limit = 50,
}) => {
	const params = [id_usuario];
	let sql = `
    SELECT id_notificacion, titulo, mensaje, tipo, leida, fecha_creacion
    FROM notificacion
    WHERE id_usuario = ?
  `;

	if (solo_no_leidas) {
		sql += " AND leida = 0";
	}

	sql += " ORDER BY fecha_creacion DESC";

	// LIMIT doesn't work well with placeholders in MySQL prepared statements
	if (limit) {
		const limitValue = Math.max(1, Math.min(1000, Number(limit))); // Safety: clamp between 1-1000
		sql += ` LIMIT ${limitValue}`;
	}

	const [rows] = await pool.execute(sql, params);
	return rows;
};

const markNotificacionLeidaController = async ({
	id_notificacion,
	id_usuario,
}) => {
	const [result] = await pool.execute(
		`UPDATE notificacion SET leida = 1 WHERE id_notificacion = ? AND id_usuario = ?`,
		[id_notificacion, id_usuario],
	);
	return result.affectedRows > 0;
};

const markTodasNotificacionesLeidasController = async ({
	id_usuario,
}) => {
	const [result] = await pool.execute(
		`UPDATE notificacion SET leida = 1 WHERE id_usuario = ? AND leida = 0`,
		[id_usuario],
	);
	return result.affectedRows >= 0;
};

const createNotificacionController = async ({
	id_usuario,
	titulo,
	mensaje,
	tipo,
}) => {
	const id_notificacion = crypto.randomUUID();
	await pool.execute(
		`INSERT INTO notificacion (id_notificacion, id_usuario, titulo, mensaje, tipo, leida)
     VALUES (?, ?, ?, ?, ?, 0)`,
		[id_notificacion, id_usuario, titulo, mensaje, tipo],
	);
	return id_notificacion;
};

module.exports = {
	listNotificacionesByUsuarioController,
	markNotificacionLeidaController,
	markTodasNotificacionesLeidasController,
	createNotificacionController,
};
