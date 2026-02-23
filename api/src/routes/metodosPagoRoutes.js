const { Router } = require("express");
const multer = require("multer");
const {
	listMetodosPagoHandler,
	listMetodosPagoDisponiblesHandler,
	createMetodoPagoHandler,
	updateMetodoPagoHandler,
	updateEstadoMetodoPagoHandler,
	deleteMetodoPagoHandler,
} = require("../handlers/metodosPagoHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const metodosPagoRoutes = Router();

const uploadMetodoPagoImagen = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 2 * 1024 * 1024,
	},
	fileFilter: (_req, file, cb) => {
		const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
		if (!allowedMimes.includes(file.mimetype)) {
			cb(new Error("Solo se permiten imágenes JPG, PNG o WEBP"));
			return;
		}
		cb(null, true);
	},
}).single("imagen");

metodosPagoRoutes.use(authenticateToken);
metodosPagoRoutes.get("/disponibles", listMetodosPagoDisponiblesHandler);
metodosPagoRoutes.use(authorizeRoles("admin"));

metodosPagoRoutes.get("/", listMetodosPagoHandler);
metodosPagoRoutes.post("/", uploadMetodoPagoImagen, createMetodoPagoHandler);
metodosPagoRoutes.put("/:id", uploadMetodoPagoImagen, updateMetodoPagoHandler);
metodosPagoRoutes.patch("/:id/estado", updateEstadoMetodoPagoHandler);
metodosPagoRoutes.delete("/:id", deleteMetodoPagoHandler);

module.exports = metodosPagoRoutes;
