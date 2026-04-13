const { Router } = require("express");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");
const {
	listInformesHandler,
	getInformeByCitaHandler,
	createOrUpdateInformeHandler,
	listAllInformesHandler,
	listCitasAtendidasSinInformeHandler,
	recordarEspecialistaHandler,
} = require("../handlers/informesHandlers");
const {
	uploadFirma,
	uploadInformePDF,
	uploadFirmaHandler,
	uploadInformePDFHandler,
} = require("../handlers/uploadHandlers");

const informesRoutes = Router();

// Ruta para moderadores: listar todos los informes completados
informesRoutes.get(
	"/todos",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	listAllInformesHandler,
);

// Ruta para moderadores: listar citas atendidas sin informe
informesRoutes.get(
	"/pendientes",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	listCitasAtendidasSinInformeHandler,
);

// Ruta para moderadores: recordar al especialista
informesRoutes.post(
	"/pendientes/:id_cita/recordar",
	authenticateToken,
	authorizeRoles("moderador", "admin"),
	recordarEspecialistaHandler,
);

// Rutas que requieren autenticación y rol especialista
informesRoutes.use(authenticateToken);
informesRoutes.use(authorizeRoles("especialista"));

// Listar todos los informes del especialista
informesRoutes.get("/", listInformesHandler);

// Obtener informe por id_cita
informesRoutes.get("/cita/:id_cita", getInformeByCitaHandler);

// Crear o actualizar informe
informesRoutes.post("/", createOrUpdateInformeHandler);

// Subir firma (imagen)
informesRoutes.post("/upload/firma", uploadFirma, uploadFirmaHandler);

// Subir informe PDF
informesRoutes.post("/upload/pdf", uploadInformePDF, uploadInformePDFHandler);

module.exports = informesRoutes;
