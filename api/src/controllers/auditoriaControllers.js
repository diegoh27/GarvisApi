const { pool } = require("../db");

/**
 * Obtiene los eventos de auditoría con filtros y paginación.
 * @param {object} filters - { usuarioId, metodo, estado, fechaDesde, fechaHasta, page, limit }
 */
const getEventosController = async (filters = {}) => {
	const {
		usuarioId,
		metodo,
		estado,
		fechaDesde,
		fechaHasta,
		page  = 1,
		limit = 10,
	} = filters;

	const limitNum  = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));
	const offsetNum = (Math.max(1, parseInt(String(page), 10) || 1) - 1) * limitNum;

	const conditions = [];
	const params     = [];

	if (usuarioId) {
		conditions.push("a.usuario_id = ?");
		params.push(String(usuarioId));
	}
	if (metodo) {
		conditions.push("a.metodo = ?");
		params.push(String(metodo).toUpperCase());
	}
	if (estado) {
		conditions.push("a.estado = ?");
		params.push(String(estado));
	}
	if (fechaDesde) {
		conditions.push("a.fecha >= ?");
		params.push(String(fechaDesde));
	}
	if (fechaHasta) {
		conditions.push("a.fecha <= ?");
		params.push(String(fechaHasta) + " 23:59:59");
	}

	const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

	const sqlData = `
		SELECT
			a.id,
			a.usuario_id,
			CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellido, '')) AS usuario_nombre,
			u.correo                                                        AS usuario_correo,
			a.usuario_rol,
			a.metodo,
			a.ruta,
			a.accion,
			a.estado_http,
			a.estado,
			a.ip,
			a.fecha
		FROM auditoria_eventos a
		LEFT JOIN usuario u ON u.id_usuario = a.usuario_id
		${where}
		ORDER BY a.fecha DESC
		LIMIT ${limitNum} OFFSET ${offsetNum}
	`;

	const sqlCount = `
		SELECT COUNT(*) AS total
		FROM auditoria_eventos a
		${where}
	`;

	const [rows]    = await pool.execute(sqlData, params);
	const [countRes] = await pool.execute(sqlCount, params);

	return {
		total:  Number(countRes[0]?.total ?? 0),
		page:   Math.max(1, parseInt(String(page), 10) || 1),
		limit:  limitNum,
		data:   rows,
	};
};

/**
 * Obtiene la lista de usuarios que han generado eventos (para el filtro desplegable).
 */
const getUsuariosConEventosController = async () => {
	const [rows] = await pool.execute(`
		SELECT DISTINCT
			a.usuario_id,
			CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellido, '')) AS usuario_nombre,
			u.correo AS usuario_correo,
			a.usuario_rol
		FROM auditoria_eventos a
		LEFT JOIN usuario u ON u.id_usuario = a.usuario_id
		WHERE a.usuario_id IS NOT NULL
		ORDER BY usuario_nombre
	`);
	return rows;
};

module.exports = { getEventosController, getUsuariosConEventosController };
