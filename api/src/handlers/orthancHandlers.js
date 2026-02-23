/**
 * orthancHandlers.js
 *
 * Maneja la integración con Orthanc PACS:
 *   POST /orthanc/upload   → recibe .dcm o .zip con DICOMs,
 *                            los envía a Orthanc, guarda study_uid en resultado
 *   GET  /orthanc/study/:uid → devuelve la URL del viewer OHIF para ese study
 */

const axios = require("axios");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const unzipper = require("unzipper");
const { pool } = require("../db");
const {
	createOrUpdateResultadoWithStudyController,
} = require("../controllers/resultadosControllers");

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────
const ORTHANC_URL = process.env.ORTHANC_URL || "http://localhost:8042";
const OHIF_BASE_URL = process.env.OHIF_BASE_URL || "http://localhost:3000";

// Cliente axios con autenticación básica hacia Orthanc.
// En local Orthanc no tiene auth (ORTHANC_ADMIN_USER vacío → sin header).
// En producción se pasan las credenciales via .env.
const ORTHANC_USER = process.env.ORTHANC_ADMIN_USER || "";
const ORTHANC_PASS = process.env.ORTHANC_ADMIN_PASS || "";
const orthancClient = axios.create({
	baseURL: ORTHANC_URL,
	...(ORTHANC_USER ? { auth: { username: ORTHANC_USER, password: ORTHANC_PASS } } : {}),
});

// Directorio temporal para archivos recibidos
const tmpDir = path.join(__dirname, "..", "..", "uploads", "_tmp_orthanc");
fs.mkdirSync(tmpDir, { recursive: true });

// ─────────────────────────────────────────────
// Multer — guarda en disco (evita RAM en archivos grandes)
// ─────────────────────────────────────────────
const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, tmpDir),
	filename: (_req, _file, cb) => {
		const ext = path.extname(_file.originalname) || ".tmp";
		cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
	},
});

const isAllowedForOrthanc = (file) => {
	const ext = path.extname(file.originalname).toLowerCase();
	return (
		ext === ".dcm" ||
		ext === ".dicom" ||
		ext === ".zip" ||
		ext === ".rar" ||
		file.mimetype === "application/dicom" ||
		file.mimetype === "application/zip" ||
		file.mimetype === "application/x-zip-compressed" ||
		file.mimetype === "application/x-rar-compressed" ||
		file.mimetype === "application/rar" ||
		file.mimetype === "application/vnd.rar" ||
		file.mimetype === "application/octet-stream"
	);
};

const upload = multer({
	storage,
	limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB
	fileFilter: (_req, file, cb) => {
		if (isAllowedForOrthanc(file)) {
			cb(null, true);
		} else {
			cb(
				new Error(
					"Solo se permiten archivos DICOM (.dcm) o ZIP con DICOMs para el visor.",
				),
				false,
			);
		}
	},
});

// Middleware exportado para usar en la ruta
const uploadDicomMulter = upload.array("archivos");

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Envía un archivo DICOM a Orthanc y retorna el objeto de respuesta.
 * @param {string} filePath  Ruta absoluta al archivo .dcm
 * @returns {Promise<object>} Respuesta de POST /instances
 */
const sendInstanceToOrthanc = async (filePath) => {
	const buffer = await fsp.readFile(filePath);
	const response = await orthancClient.post("/instances", buffer, {
		headers: { "Content-Type": "application/dicom" },
		maxBodyLength: Infinity,
		maxContentLength: Infinity,
	});
	return response.data;
};

/**
 * Dado el ID de un study en Orthanc, obtiene el StudyInstanceUID DICOM.
 * @param {string} orthancStudyId  ID interno de Orthanc (GUID)
 * @returns {Promise<string>}
 */
const getStudyInstanceUID = async (orthancStudyId) => {
	const response = await orthancClient.get(`/studies/${orthancStudyId}`);
	return response.data?.MainDicomTags?.StudyInstanceUID || null;
};

/**
 * Extrae todos los .dcm de un ZIP y los sube a Orthanc.
 * Retorna el conjunto de StudyInstanceUIDs encontrados.
 * @param {string} zipPath
 * @returns {Promise<Set<string>>}
 */
const uploadZipToOrthanc = async (zipPath) => {
	const studyUids = new Set();
	const extractDir = path.join(tmpDir, `extract_${Date.now()}`);
	await fsp.mkdir(extractDir, { recursive: true });

	try {
		const directory = await unzipper.Open.file(zipPath);

		for (const entry of directory.files) {
			if (entry.type === "Directory") continue;

			const baseName = path.basename(entry.path);
			if (baseName.startsWith(".") || entry.path.includes("__MACOSX")) continue;

			const ext = path.extname(baseName).toLowerCase();
			if (ext !== ".dcm" && ext !== ".dicom") continue;

			const dcmPath = path.join(extractDir, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
			const buffer = await entry.buffer();
			await fsp.writeFile(dcmPath, buffer);

			try {
				const instanceData = await sendInstanceToOrthanc(dcmPath);
				if (instanceData?.ParentStudy) {
					const uid = await getStudyInstanceUID(instanceData.ParentStudy);
					if (uid) studyUids.add(uid);
				}
			} catch (err) {
				console.warn(`No se pudo subir ${baseName} a Orthanc:`, err.message);
			} finally {
				await fsp.unlink(dcmPath).catch(() => {});
			}
		}
	} finally {
		// Limpiar directorio de extracción
		await fsp.rm(extractDir, { recursive: true, force: true }).catch(() => {});
	}

	return studyUids;
};

/**
 * Extrae todos los .dcm de un RAR y los sube a Orthanc.
 * @param {string} rarPath
 * @returns {Promise<Set<string>>}
 */
const uploadRarToOrthanc = async (rarPath) => {
	const studyUids = new Set();
	let Unrar;
	try {
		Unrar = require("node-unrar-js");
	} catch {
		throw new Error("node-unrar-js no está instalado. Instálalo con: npm install node-unrar-js");
	}

	const extractDir = path.join(tmpDir, `extract_rar_${Date.now()}`);
	await fsp.mkdir(extractDir, { recursive: true });

	try {
		const buf = await fsp.readFile(rarPath);
		const extractor = await Unrar.createExtractorFromData({ data: buf });
		const { files } = extractor.extract();

		for (const file of files) {
			if (file.fileHeader.flags.directory) continue;

			const baseName = path.basename(file.fileHeader.name);
			const ext = path.extname(baseName).toLowerCase();
			if (ext !== ".dcm" && ext !== ".dicom") continue;

			const dcmPath = path.join(extractDir, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
			await fsp.writeFile(dcmPath, file.extraction);

			try {
				const instanceData = await sendInstanceToOrthanc(dcmPath);
				if (instanceData?.ParentStudy) {
					const uid = await getStudyInstanceUID(instanceData.ParentStudy);
					if (uid) studyUids.add(uid);
				}
			} catch (err) {
				console.warn(`No se pudo subir ${baseName} a Orthanc:`, err.message);
			} finally {
				await fsp.unlink(dcmPath).catch(() => {});
			}
		}
	} finally {
		await fsp.rm(extractDir, { recursive: true, force: true }).catch(() => {});
	}

	return studyUids;
};

// ─────────────────────────────────────────────
// Handler principal: POST /orthanc/upload
// ─────────────────────────────────────────────
const uploadDicomToOrthancHandler = async (req, res) => {
	const tempFiles = [...(req.files || [])];

	try {
		const { id_cita, nombre } = req.body;

		if (!id_cita) {
			return res.status(400).json({ ok: false, message: "id_cita es requerido" });
		}
		if (!req.files || req.files.length === 0) {
			return res.status(400).json({ ok: false, message: "No se proporcionó ningún archivo" });
		}

		const allStudyUids = new Set();

		for (const file of req.files) {
			const ext = path.extname(file.originalname).toLowerCase();

			if (ext === ".zip") {
				const uids = await uploadZipToOrthanc(file.path);
				uids.forEach((uid) => allStudyUids.add(uid));
			} else if (ext === ".rar") {
				const uids = await uploadRarToOrthanc(file.path);
				uids.forEach((uid) => allStudyUids.add(uid));
			} else {
				// .dcm directo
				const instanceData = await sendInstanceToOrthanc(file.path);
				if (instanceData?.ParentStudy) {
					const uid = await getStudyInstanceUID(instanceData.ParentStudy);
					if (uid) allStudyUids.add(uid);
				}
			}
		}

		if (allStudyUids.size === 0) {
			return res.status(422).json({
				ok: false,
				message:
					"No se encontraron imágenes DICOM válidas en los archivos enviados.",
			});
		}

		// Por convención clínica, todos los DCMs de una cita deben ser del mismo study.
		// Tomamos el primer UID. Si hay más de uno se loguea advertencia.
		const studyUid = [...allStudyUids][0];
		if (allStudyUids.size > 1) {
			console.warn(
				`[Orthanc] La cita ${id_cita} tiene ${allStudyUids.size} studies; se usará el primero: ${studyUid}`,
			);
		}

		// Guardar study_uid en la tabla resultado
		const data = await createOrUpdateResultadoWithStudyController({
			id_cita,
			study_uid: studyUid,
			nombre: nombre || null,
			id_usuario_actual: req.user?.id,
			rol: req.user?.rol,
		});

		return res.status(200).json({
			ok: true,
			message: data.updated
				? "Estudio DICOM actualizado en el visor"
				: "Estudio DICOM subido correctamente",
			data: {
				...data,
				study_uid: studyUid,
				ohif_url: `${OHIF_BASE_URL}/viewer?StudyInstanceUIDs=${studyUid}&initialHangingProtocolId=%40ohif%2FmnGrid`,
			},
		});
	} catch (error) {
		if (error?.code === "NOT_FOUND") {
			return res.status(404).json({ ok: false, message: error.message });
		}
		if (error?.code === "INVALID_STATE") {
			return res.status(409).json({ ok: false, message: error.message });
		}
		if (error?.code === "FORBIDDEN") {
			return res.status(403).json({ ok: false, message: error.message });
		}
		console.error("[Orthanc] Error al subir DICOM:", error.message);
		return res.status(500).json({
			ok: false,
			message: error.message || "Error al enviar el estudio a Orthanc",
		});
	} finally {
		// Limpiar archivos temporales subidos por multer
		for (const file of tempFiles) {
			await fsp.unlink(file.path).catch(() => {});
		}
	}
};

// ─────────────────────────────────────────────
// Handler: GET /orthanc/study/:uid
// ─────────────────────────────────────────────
const getOhifViewerUrlHandler = async (req, res) => {
	try {
		const { uid } = req.params;
		if (!uid) {
			return res.status(400).json({ ok: false, message: "uid es requerido" });
		}

		const ohifUrl = `${OHIF_BASE_URL}/viewer?StudyInstanceUIDs=${uid}&initialHangingProtocolId=%40ohif%2FmnGrid`;
		return res.status(200).json({
			ok: true,
			data: { study_uid: uid, ohif_url: ohifUrl },
		});
	} catch (error) {
		console.error("[Orthanc] Error:", error);
		return res.status(500).json({ ok: false, message: "Error interno" });
	}
};

// ─────────────────────────────────────────────
// Handler: GET /orthanc/study/:uid/download
// Descarga el study como ZIP desde Orthanc
// ─────────────────────────────────────────────
const downloadDicomStudyHandler = async (req, res) => {
	try {
		const { uid } = req.params;
		if (!uid) {
			return res.status(400).json({ ok: false, message: "uid es requerido" });
		}

		// Buscar el ID interno de Orthanc a partir del StudyInstanceUID
		const lookupRes = await orthancClient.post("/tools/find", {
			Level: "Study",
			Query: { StudyInstanceUID: uid },
		});

		const orthancIds = lookupRes.data || [];
		if (orthancIds.length === 0) {
			return res.status(404).json({ ok: false, message: "Estudio no encontrado en Orthanc" });
		}

		const orthancId = orthancIds[0];
		const fileName = `estudio-dicom-${uid.slice(-12)}.zip`;

		// Hacer streaming del archivo ZIP desde Orthanc hacia el cliente
		const archiveRes = await orthancClient.get(`/studies/${orthancId}/archive`, {
			responseType: "stream",
		});

		res.setHeader("Content-Type", "application/zip");
		res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

		archiveRes.data.pipe(res);
	} catch (error) {
		console.error("[Orthanc] Error al descargar study:", error.message);
		if (!res.headersSent) {
			return res.status(500).json({ ok: false, message: "Error al descargar el estudio" });
		}
	}
};

// ─────────────────────────────────────────────
// Handler: DELETE /orthanc/study/:uid
// Elimina el study de Orthanc y limpia study_uid del resultado
// ─────────────────────────────────────────────
const deleteDicomStudyHandler = async (req, res) => {
	try {
		const { uid } = req.params;
		const { id_cita } = req.body;

		if (!uid || !id_cita) {
			return res
				.status(400)
				.json({ ok: false, message: "uid e id_cita son requeridos" });
		}

		// Buscar el study en Orthanc por StudyInstanceUID
		try {
			const lookupRes = await orthancClient.post("/tools/find", {
				Level: "Study",
				Query: { StudyInstanceUID: uid },
			});

			const orthancStudyIds = lookupRes.data || [];
			for (const orthancId of orthancStudyIds) {
				await orthancClient.delete(`/studies/${orthancId}`);
			}
		} catch (orthancErr) {
			console.warn(
				"[Orthanc] No se pudo eliminar de Orthanc:",
				orthancErr.message,
			);
		}

		// Limpiar study_uid en la BD
		const conn = await pool.getConnection();
		try {
			await conn.execute(
				"UPDATE resultado SET study_uid = NULL, estado_resultado = CASE WHEN (archivo IS NULL OR archivo = '' OR archivo = '[]') THEN 1 ELSE estado_resultado END WHERE id_cita = ?",
				[id_cita],
			);
		} finally {
			conn.release();
		}

		return res
			.status(200)
			.json({ ok: true, message: "Estudio DICOM eliminado del visor" });
	} catch (error) {
		console.error("[Orthanc] Error al eliminar study:", error);
		return res.status(500).json({ ok: false, message: "Error interno" });
	}
};

module.exports = {
	uploadDicomMulter,
	uploadDicomToOrthancHandler,
	getOhifViewerUrlHandler,
	downloadDicomStudyHandler,
	deleteDicomStudyHandler,
};
