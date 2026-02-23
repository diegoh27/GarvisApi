const jwt = require("jsonwebtoken");
const { pool } = require("../db");

const authenticateToken = async (req, res, next) => {
	const authHeader = req.headers.authorization || "";
	const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

	if (!token) {
		return res.status(401).json({
			ok: false,
			message: "Token requerido",
		});
	}

	if (!process.env.JWT_SECRET) {
		return res.status(500).json({
			ok: false,
			message: "JWT_SECRET no configurado",
		});
	}

	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET);
		const userId = payload?.id || payload?.id_usuario || null;
		if (!userId) {
			return res.status(401).json({
				ok: false,
				message: "Token inválido",
			});
		}

		const [rows] = await pool.execute(
			`SELECT u.id_usuario, r.nombre AS rol
			 FROM usuario u
			 INNER JOIN roles r ON r.id_rol = u.id_rol
			 WHERE u.id_usuario = ? AND u.activo = 1
			 LIMIT 1`,
			[userId],
		);

		if (!rows.length) {
			return res.status(401).json({
				ok: false,
				message: "Sesión inválida o expirada. Inicia sesión nuevamente",
			});
		}

		req.user = {
			...payload,
			id: rows[0].id_usuario,
			id_usuario: rows[0].id_usuario,
			rol: rows[0].rol,
		};
		return next();
	} catch (err) {
		return res.status(401).json({
			ok: false,
			message: "Token inválido",
		});
	}
};

module.exports = { authenticateToken };
