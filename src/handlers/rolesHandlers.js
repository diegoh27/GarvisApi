const {
	listRolesController,
	getRolePermissionsController,
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

module.exports = {
	listRolesHandler,
	rolePermissionsHandler,
};
