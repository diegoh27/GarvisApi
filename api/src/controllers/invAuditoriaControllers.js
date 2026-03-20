const { pool } = require("../db");

const MODULOS = ["productos", "entes", "nomina", "alquiler", "comisiones", "facturacion"];

/**
 * Registra una acción en el auditoría de inventario.
 * No lanza errores para no afectar el flujo principal.
 * @param {Object} opts
 * @param {string} opts.modulo - productos | entes | nomina | alquiler | comisiones | facturacion
 * @param {string} opts.accion - Descripción legible de la acción (ej: "Descontó 2 unidades de Guantes por consumo")
 * @param {string} [opts.entidad_tipo] - producto, compra, ajuste, empleado, pago, etc.
 * @param {string} [opts.entidad_id] - ID de la entidad afectada
 * @param {string} [opts.id_usuario] - ID del usuario que realizó la acción
 * @param {string} [opts.usuario_nombre] - Nombre completo del usuario
 * @param {string} [opts.usuario_rol] - admin | moderador
 * @param {Object} [opts.detalles] - Objeto adicional (se guarda como JSON)
 */
async function logInventarioAccion(opts) {
	const {
		modulo,
		accion,
		entidad_tipo = null,
		entidad_id = null,
		id_usuario = null,
		usuario_nombre = null,
		usuario_rol = null,
		detalles = null,
	} = opts;

	if (!modulo || !accion) return;
	if (!MODULOS.includes(modulo)) return;

	const detallesJson = detalles != null ? JSON.stringify(detalles) : null;

	try {
		await pool.execute(
			`INSERT INTO inv_auditoria
			 (modulo, accion, entidad_tipo, entidad_id, id_usuario, usuario_nombre, usuario_rol, detalles)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				modulo,
				accion.substring(0, 500),
				entidad_tipo,
				entidad_id,
				id_usuario,
				usuario_nombre,
				usuario_rol,
				detallesJson,
			],
		);
	} catch (err) {
		console.error("[inv_auditoria] Error al registrar:", err.message);
	}
}

/**
 * Obtiene el nombre completo del usuario desde req.user
 */
function getUserDisplayFromReq(req) {
	const u = req?.user;
	if (!u) return null;
	const nombre = [u.nombre, u.apellido].filter(Boolean).join(" ").trim();
	return nombre || u.id;
}

/**
 * Helper para usar en handlers: extrae user de req y registra la acción.
 * Uso: logInventarioReq(req, "productos", "Descontó 2 unidades de Guantes por consumo", { entidad_tipo: "ajuste", entidad_id: "..." });
 */
async function logInventarioReq(req, modulo, accion, extra = {}) {
	const u = req?.user;
	await logInventarioAccion({
		modulo,
		accion,
		entidad_tipo: extra.entidad_tipo ?? null,
		entidad_id: extra.entidad_id ?? null,
		id_usuario: u?.id ?? null,
		usuario_nombre: getUserDisplayFromReq(req),
		usuario_rol: u?.rol ?? null,
		detalles: extra.detalles ?? null,
	});
}

/**
 * Lista el historial de auditoría de inventario.
 * @param {Object} opts - { modulo?, limit?, offset? }
 */
async function listInventarioAuditoriaController(opts = {}) {
	const { modulo, limit = 200, offset = 0 } = opts;

	let sql = `
		SELECT
			a.id,
			a.modulo,
			a.accion,
			a.entidad_tipo,
			a.entidad_id,
			a.id_usuario,
			COALESCE(
				CASE WHEN a.usuario_nombre REGEXP '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'
					THEN NULL
					ELSE NULLIF(TRIM(a.usuario_nombre), '')
				END,
				NULLIF(TRIM(CONCAT(IFNULL(u.nombre, ''), ' ', IFNULL(u.apellido, ''))), ''),
				a.id_usuario
			) AS usuario_nombre,
			a.usuario_rol,
			a.detalles,
			a.fecha
		FROM inv_auditoria a
		LEFT JOIN usuario u ON u.id_usuario = a.id_usuario
	`;
	const params = [];

	if (modulo && MODULOS.includes(modulo)) {
		sql += " WHERE a.modulo = ?";
		params.push(modulo);
	}

	// LIMIT/OFFSET interpolados (sanitizados) - mysql2 falla con placeholders aquí
	const limitNum = Math.min(Math.max(1, parseInt(Number(limit), 10) || 200), 500);
	const offsetNum = Math.max(0, parseInt(Number(offset), 10) || 0);
	sql += ` ORDER BY a.fecha DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

	const [rows] = params.length > 0
		? await pool.execute(sql, params)
		: await pool.query(sql);

	// COUNT para paginación
	const countSql = `SELECT COUNT(*) AS total FROM inv_auditoria a ${modulo && MODULOS.includes(modulo) ? "WHERE a.modulo = ?" : ""}`;
	const countParams = modulo && MODULOS.includes(modulo) ? [modulo] : [];
	const [countRows] = countParams.length > 0
		? await pool.execute(countSql, countParams)
		: await pool.query(countSql);

	return {
		rows,
		total: countRows?.[0]?.total ?? 0,
		limit: limitNum,
		offset: offsetNum,
	};
}

module.exports = {
	logInventarioAccion,
	logInventarioReq,
	getUserDisplayFromReq,
	listInventarioAuditoriaController,
	MODULOS,
};
