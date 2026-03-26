const { pool } = require("../db");

/**
 * Lista el historial del kardex, ordenado cronológicamente inverso
 * Soporta filtros por id_producto y limit
 */
const listKardexController = async ({ id_producto, limit = 500 } = {}) => {
	const limitNum = Math.min(Math.max(1, parseInt(Number(limit), 10) || 500), 1000);
	
	let sql = `
		SELECT 
			k.id_kardex,
			k.id_producto,
			p.nombre AS producto_nombre,
			p.unidad_medida,
			k.tipo_movimiento,
			k.cantidad,
			k.stock_anterior,
			k.stock_posterior,
			k.referencia_tipo,
			k.referencia_id,
			k.observaciones,
			k.id_usuario,
			u.nombre AS usuario_nombre,
			u.apellido AS usuario_apellido,
			k.creado_en
		FROM inv_kardex k
		INNER JOIN inv_producto p ON p.id_producto = k.id_producto
		LEFT JOIN usuario u ON u.id_usuario = k.id_usuario
	`;
	
	const params = [];
	
	if (id_producto) {
		sql += ` WHERE k.id_producto = ?`;
		params.push(id_producto);
	}
	
	sql += ` ORDER BY k.creado_en DESC LIMIT ${limitNum}`;
	
	const [rows] = await pool.execute(sql, params);
	return rows;
};

module.exports = {
	listKardexController,
};
