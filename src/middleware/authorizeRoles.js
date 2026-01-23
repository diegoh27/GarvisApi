const authorizeRoles = (...roles) => {
	return (req, res, next) => {
		if (!req.user?.rol) {
			return res.status(403).json({
				ok: false,
				message: "Rol no encontrado en el token",
			});
		}
		if (!roles.includes(req.user.rol)) {
			return res.status(403).json({
				ok: false,
				message: "No autorizado",
			});
		}
		return next();
	};
};

module.exports = { authorizeRoles };
