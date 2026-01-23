const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
	const authHeader = req.headers.authorization || "";
	const token = authHeader.startsWith("Bearer ")
		? authHeader.slice(7)
		: null;

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
		req.user = payload;
		return next();
	} catch (err) {
		return res.status(401).json({
			ok: false,
			message: "Token inválido",
		});
	}
};

module.exports = { authenticateToken };
