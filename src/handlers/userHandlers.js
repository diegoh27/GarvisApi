const { userCreateController } = require("../controllers/usersControllers");

const userCreateHandler = (req, res) => {
	const obj = req.body;
	const result = userCreateController(obj);

	return res.status(200).json({
		message: "Usuario recibido",
		result,
	});
};

const prueba = (req, res) => {
	res.send("Ruta de prueba");
};

module.exports = { userCreateHandler, prueba };
