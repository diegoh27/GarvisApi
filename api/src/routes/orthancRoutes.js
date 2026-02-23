const { Router } = require("express");
const {
	uploadDicomMulter,
	uploadDicomToOrthancHandler,
	getOhifViewerUrlHandler,
	downloadDicomStudyHandler,
	deleteDicomStudyHandler,
} = require("../handlers/orthancHandlers");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

const orthancRoutes = Router();

/**
 * POST /orthanc/upload
 * Recibe .dcm o .zip con DICOMs, los envía a Orthanc,
 * guarda study_uid en la tabla resultado.
 */
orthancRoutes.post(
	"/upload",
	authenticateToken,
	authorizeRoles("moderador", "admin", "especialista"),
	uploadDicomMulter,
	uploadDicomToOrthancHandler,
);

/**
 * GET /orthanc/study/:uid
 * Retorna la URL del viewer OHIF para un StudyInstanceUID dado.
 */
orthancRoutes.get(
	"/study/:uid",
	authenticateToken,
	getOhifViewerUrlHandler,
);

/**
 * GET /orthanc/study/:uid/download
 * Descarga el estudio DICOM como ZIP directamente desde Orthanc.
 */
orthancRoutes.get(
	"/study/:uid/download",
	authenticateToken,
	downloadDicomStudyHandler,
);

/**
 * DELETE /orthanc/study/:uid
 * Elimina un study de Orthanc y limpia study_uid en resultado.
 */
orthancRoutes.delete(
	"/study/:uid",
	authenticateToken,
	authorizeRoles("moderador", "admin", "especialista"),
	deleteDicomStudyHandler,
);

module.exports = orthancRoutes;
