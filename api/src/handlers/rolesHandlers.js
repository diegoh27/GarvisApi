const {
	listRolesController,
	getRolePermissionsController,
	getPermisosInventarioController,
	updatePermisosInventarioModeradorController,
	getPermisosMenuModeradorController,
	updatePermisosMenuModeradorController,
} = require("../controllers/rolesControllers");

const listRolesHandler = async (req, res) => {
	try {
		const data = await listRolesController();
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

const rolePermissionsHandler = async (req, res) => {
	try {
		const data = getRolePermissionsController();
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

/** GET /roles/permisos-inventario - Devuelve permisos de inventario según rol (admin/moderador). */
const getPermisosInventarioHandler = async (req, res) => {
	try {
		const rol = req.user?.rol;
		if (!rol || !["admin", "moderador"].includes(rol)) {
			return res.status(403).json({
				ok: false,
				message: "No autorizado",
			});
		}
		const data = await getPermisosInventarioController(rol);
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

/** GET /roles/permisos-inventario-moderador - Solo admin. Devuelve permisos guardados para moderador (para pantalla de config). */
const getPermisosInventarioModeradorHandler = async (req, res) => {
	try {
		const data = await getPermisosInventarioController("moderador");
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

/** PUT /roles/permisos-inventario-moderador - Solo admin. Actualiza permisos de inventario del moderador. */
const updatePermisosInventarioModeradorHandler = async (req, res) => {
	try {
		const payload = req.body || {};
		const data = await updatePermisosInventarioModeradorController(payload);
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

/** GET /roles/permisos-menu - Solo moderador: visibilidad de ítems del menú (misma fila que configura el admin). */
const getPermisosMenuHandler = async (req, res) => {
	try {
		const rol = req.user?.rol;
		if (rol !== "moderador") {
			return res.status(403).json({
				ok: false,
				message: "No autorizado",
			});
		}
		const data = await getPermisosMenuModeradorController("moderador");
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

/** GET /roles/permisos-menu-moderador - Solo admin (pantalla de configuración). */
const getPermisosMenuModeradorHandler = async (req, res) => {
	try {
		const data = await getPermisosMenuModeradorController("moderador");
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

/** PUT /roles/permisos-menu-moderador - Solo admin. */
const updatePermisosMenuModeradorHandler = async (req, res) => {
	try {
		const payload = req.body || {};
		const data = await updatePermisosMenuModeradorController(payload);
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			ok: false,
			message: "Error interno",
		});
	}
};

module.exports = {
	listRolesHandler,
	rolePermissionsHandler,
	getPermisosInventarioHandler,
	getPermisosInventarioModeradorHandler,
	updatePermisosInventarioModeradorHandler,
	getPermisosMenuHandler,
	getPermisosMenuModeradorHandler,
	updatePermisosMenuModeradorHandler,
};
