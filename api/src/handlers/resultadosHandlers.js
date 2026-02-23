const {
	createOrUpdateResultadoController,
	listCitasSinResultadoController,
	listCitasAtendidasConResultadosController,
	listResultadosByPacienteController,
	deleteArchivoFromResultadoController,
} = require("../controllers/resultadosControllers");
const {
	uploadMulterFileToLocal,
	buildPublicUrl,
	deleteFileByPublicUrl,
	cleanupEmptyCitaFolder,
	getUploadsDir,
} = require("../utils/uploadToLocal");
const unzipper = require("unzipper");
const { createExtractorFromFile } = require("node-unrar-js");
const fs = require("fs");
const fsp = require("fs/promises");
const multer = require("multer");
const path = require("path");

const tmpDir = path.join(__dirname, "..", "..", "uploads", "_tmp");
fs.mkdirSync(tmpDir, { recursive: true });

const cleanupTempFiles = async (files = []) => {
	const deletePromises = files
		.map((file) => file?.path)
		.filter(Boolean)
		.map((filePath) => fs.promises.unlink(filePath).catch(() => null));
	await Promise.all(deletePromises);
};

// Configurar multer para almacenar en disco (evita usar RAM en archivos grandes)
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, tmpDir);
	},
	filename: (req, file, cb) => {
		const extension = path.extname(file.originalname) || "";
		cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
	},
});
const DICOM_EXTENSIONS = [".dcm", ".dicom", ".DCM", ".DICOM"];

// Extensiones válidas para extraer de un ZIP
const VALID_ZIP_EXTENSIONS = new Set([
	".jpg", ".jpeg", ".png", ".webp", ".tiff", ".tif", ".bmp",
	".pdf", ".dcm", ".dicom", ".mp4", ".avi", ".mov", ".mkv",
]);

/**
 * Extrae un ZIP al directorio de la cita:
 *   uploads/garbis/resultados/cita_{id_cita}/
 * Retorna array de URLs públicas de los archivos extraídos.
 */
const extractZipToCitaFolder = async (zipPath, id_cita) => {
	const citaFolderRel = path.join("garbis", "resultados", `cita_${id_cita}`);
	const targetDir = path.join(getUploadsDir(), citaFolderRel);
	await fsp.mkdir(targetDir, { recursive: true });

	const urls = [];
	const directory = await unzipper.Open.file(zipPath);

	for (const entry of directory.files) {
		if (entry.type === "Directory") continue;

		const baseName = path.basename(entry.path);
		// Ignorar archivos de metadatos de macOS y archivos ocultos
		if (baseName.startsWith(".") || entry.path.includes("__MACOSX")) continue;

		const ext = path.extname(baseName).toLowerCase();
		if (!VALID_ZIP_EXTENSIONS.has(ext)) continue;

		const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
		const filePath = path.join(targetDir, uniqueName);

		const buffer = await entry.buffer();
		await fsp.writeFile(filePath, buffer);

		const relativePath = path.posix.join(
			"uploads", "garbis", "resultados", `cita_${id_cita}`, uniqueName,
		);
		urls.push(buildPublicUrl(relativePath));
	}

	return urls;
};

/**
 * Extrae un RAR al directorio de la cita:
 *   uploads/garbis/resultados/cita_{id_cita}/
 * Retorna array de URLs públicas de los archivos extraídos.
 */
const extractRarToCitaFolder = async (rarPath, id_cita) => {
	const citaFolderRel = path.join("garbis", "resultados", `cita_${id_cita}`);
	const targetDir = path.join(getUploadsDir(), citaFolderRel);
	await fsp.mkdir(targetDir, { recursive: true });

	const urls = [];

	// node-unrar-js necesita leer el archivo como Buffer
	const wasmBinary = await fsp.readFile(
		require.resolve("node-unrar-js/esm/js/unrar.wasm"),
	).catch(() => null); // si no está disponible, será undefined

	const extractorOptions = wasmBinary
		? { wasmBinary, filepath: rarPath, targetPath: targetDir }
		: { filepath: rarPath, targetPath: targetDir };

	const extractor = await createExtractorFromFile(extractorOptions);
	const list = extractor.extract();

	for (const file of list.files) {
		if (file.fileHeader.flags.directory) continue;

		const baseName = path.basename(file.fileHeader.name);
		if (baseName.startsWith(".")) continue;

		const ext = path.extname(baseName).toLowerCase();
		if (!VALID_ZIP_EXTENSIONS.has(ext)) continue;

		// node-unrar-js extrae directamente a targetDir; renombramos para evitar colisiones
		const extractedPath = path.join(targetDir, file.fileHeader.name.replace(/\\/g, "/").split("/").pop() ?? baseName);
		const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
		const finalPath = path.join(targetDir, uniqueName);

		try {
			await fsp.rename(extractedPath, finalPath);
		} catch {
			// Si rename falla (ej. path anidado), buscar en targetDir
			const entries = await fsp.readdir(targetDir);
			const match = entries.find((e) => e.endsWith(ext) && e !== path.basename(finalPath));
			if (match) await fsp.rename(path.join(targetDir, match), finalPath);
			else continue;
		}

		const relativePath = path.posix.join(
			"uploads", "garbis", "resultados", `cita_${id_cita}`, uniqueName,
		);
		urls.push(buildPublicUrl(relativePath));
	}

	return urls;
};

const isDicomFile = (file) => {
	if (file.mimetype === "application/dicom") return true;
	const ext = path.extname(file.originalname || "").toLowerCase();
	return DICOM_EXTENSIONS.map((e) => e.toLowerCase()).includes(ext);
};

const ALLOWED_MIME_TYPES = new Set([
	// Imágenes
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
	"image/tiff",
	"image/bmp",
	// Documentos
	"application/pdf",
	// DICOM
	"application/dicom",
	// Videos (ecografías grabadas)
	"video/mp4",
	"video/avi",
	"video/x-msvideo",
	"video/quicktime",
	"video/x-matroska",
	// ZIP y RAR (para múltiples archivos agrupados)
	"application/zip",
	"application/x-zip-compressed",
	"application/x-zip",
	"application/x-rar-compressed",
	"application/rar",
	"application/vnd.rar",
	// Fallback: algunos navegadores reportan DICOM/RAR/otros como octet-stream
	"application/octet-stream",
]);

const ALLOWED_EXTENSIONS = new Set([
	".jpg", ".jpeg", ".png", ".webp", ".tiff", ".tif", ".bmp",
	".pdf",
	".dcm", ".dicom",
	".mp4", ".avi", ".mov", ".mkv",
	".zip",
	".rar",
]);

const isRarFile = (file) => {
	const mime = file.mimetype;
	const ext = path.extname(file.originalname || "").toLowerCase();
	return (
		mime === "application/x-rar-compressed" ||
		mime === "application/rar" ||
		mime === "application/vnd.rar" ||
		ext === ".rar" ||
		ext === ".r00"
	);
};

const isZipFile = (file) => {
	const mime = file.mimetype;
	const ext = path.extname(file.originalname || "").toLowerCase();
	return (
		mime === "application/zip" ||
		mime === "application/x-zip-compressed" ||
		mime === "application/x-zip" ||
		ext === ".zip"
	);
};

const isAllowedFile = (file) => {
	if (isDicomFile(file)) return true;
	if (ALLOWED_MIME_TYPES.has(file.mimetype)) return true;
	const ext = path.extname(file.originalname || "").toLowerCase();
	return ALLOWED_EXTENSIONS.has(ext);
};

const upload = multer({
	storage,
	limits: {
		fileSize: 2 * 1024 * 1024 * 1024, // 2 GB por archivo
	},
	fileFilter: (req, file, cb) => {
		if (isAllowedFile(file)) {
			cb(null, true);
		} else {
			cb(
				new Error(
					"Tipo de archivo no permitido. Se permiten imágenes, PDF, DICOM, videos, ZIP y RAR.",
				),
				false,
			);
		}
	},
});

// Sin límite fijo de cantidad de archivos
const uploadResultado = upload.array("archivos");

const uploadResultadoHandler = async (req, res) => {
	try {
		const { id_cita, nombre } = req.body;

		if (!id_cita) {
			return res.status(400).json({
				ok: false,
				message: "id_cita es requerido",
			});
		}

		if (!req.files || req.files.length === 0) {
			return res.status(400).json({
				ok: false,
				message: "No se proporcionó ningún archivo",
			});
		}

		// Todos los archivos van a uploads/garbis/resultados/cita_{id_cita}/
		const citaFolder = `garbis/resultados/cita_${id_cita}`;
		const archivoUrls = [];

		for (const file of req.files) {
			if (isZipFile(file)) {
				// Extraer ZIP a la carpeta de la cita
				const extracted = await extractZipToCitaFolder(file.path, id_cita);
				archivoUrls.push(...extracted);
				// Eliminar el archivo comprimido temporal
				await fsp.unlink(file.path).catch(() => {});
			} else if (isRarFile(file)) {
				// Extraer RAR a la carpeta de la cita
				const extracted = await extractRarToCitaFolder(file.path, id_cita);
				archivoUrls.push(...extracted);
				// Eliminar el archivo comprimido temporal
				await fsp.unlink(file.path).catch(() => {});
			} else {
				// Archivo normal: mover a la carpeta de la cita
				const result = await uploadMulterFileToLocal(file, citaFolder);
				archivoUrls.push(result.url);
			}
		}

		if (archivoUrls.length === 0) {
			return res.status(400).json({
				ok: false,
				message: "No se pudo procesar ningún archivo (el comprimido puede estar vacío o contener tipos no permitidos).",
			});
		}

		// Guardar las URLs como JSON array
		const archivoUrlsJson = JSON.stringify(archivoUrls);

		// Crear o actualizar resultado en la base de datos (si es especialista, solo sus citas)
		const data = await createOrUpdateResultadoController({
			id_cita,
			id_especialista: null, // Se obtendrá de la cita
			archivo_url: archivoUrlsJson, // Guardar como JSON array
			nombre: nombre || null,
			id_usuario_actual: req.user?.id,
			rol: req.user?.rol,
		});

		const count = archivoUrls.length;
		return res.status(200).json({
			ok: true,
			message: data.updated
				? `Resultado actualizado exitosamente (${count} archivo${count > 1 ? "s" : ""})`
				: `Resultado subido exitosamente (${count} archivo${count > 1 ? "s" : ""})`,
			data: {
				...data,
				archivo_urls: archivoUrls,
			},
		});
	} catch (error) {
		// Limpiar archivos temporales que no fueron procesados
		await cleanupTempFiles(
			(req.files || []).filter(
				(f) => !isZipFile(f) && !isRarFile(f), // ZIP y RAR se eliminan dentro del loop
			),
		);
		if (error?.code === "NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: error.message,
			});
		}
		if (error?.code === "INVALID_STATE") {
			return res.status(409).json({
				ok: false,
				message: error.message,
			});
		}
		if (error?.code === "FORBIDDEN") {
			return res.status(403).json({
				ok: false,
				message: error.message,
			});
		}
		console.error("Error al subir resultado:", error);
		return res.status(500).json({
			ok: false,
			message: error.message || "Error al subir el resultado",
		});
	}
};

const listCitasSinResultadoHandler = async (req, res) => {
	try {
		// Si es especialista, pasar su ID para filtrar solo sus citas
		const id_especialista =
			req.user.rol === "especialista" ? req.user.id : null;
		const data = await listCitasSinResultadoController(id_especialista);
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

const listCitasAtendidasConResultadosHandler = async (req, res) => {
	try {
		const data = await listCitasAtendidasConResultadosController();
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

const deleteArchivoFromResultadoHandler = async (req, res) => {
	try {
		const { id_cita } = req.params;
		const { archivo_url } = req.body;

		if (!id_cita) {
			return res.status(400).json({
				ok: false,
				message: "id_cita es requerido",
			});
		}

		if (!archivo_url) {
			return res.status(400).json({
				ok: false,
				message: "archivo_url es requerido",
			});
		}

		const data = await deleteArchivoFromResultadoController({
			id_cita,
			archivoUrl: archivo_url,
			id_usuario_actual: req.user?.id,
			rol: req.user?.rol,
		});

		// Eliminar el archivo físico del disco y limpiar carpeta si queda vacía
		try {
			await deleteFileByPublicUrl(archivo_url);
			await cleanupEmptyCitaFolder(archivo_url);
		} catch (cleanupErr) {
			// No fallar el request si el archivo físico ya no existe
			console.warn("No se pudo eliminar archivo físico:", cleanupErr.message);
		}

		return res.status(200).json({
			ok: true,
			message: `Archivo eliminado exitosamente. Quedan ${data.archivos_restantes} archivo${data.archivos_restantes !== 1 ? "s" : ""}.`,
			data,
		});
	} catch (error) {
		if (error?.code === "NOT_FOUND") {
			return res.status(404).json({
				ok: false,
				message: error.message,
			});
		}
		if (error?.code === "INVALID_STATE") {
			return res.status(409).json({
				ok: false,
				message: error.message,
			});
		}
		if (error?.code === "FORBIDDEN") {
			return res.status(403).json({
				ok: false,
				message: error.message,
			});
		}
		console.error("Error al eliminar archivo:", error);
		return res.status(500).json({
			ok: false,
			message: "Error interno del servidor al eliminar el archivo",
		});
	}
};

const listResultadosByPacienteHandler = async (req, res) => {
	try {
		const id_paciente = req.user.id;
		const data = await listResultadosByPacienteController(id_paciente);
		return res.status(200).json({
			ok: true,
			data,
		});
	} catch (error) {
		console.error("Error al obtener resultados del paciente:", error);
		return res.status(500).json({
			ok: false,
			message: "Error interno del servidor",
		});
	}
};

module.exports = {
	uploadResultado,
	uploadResultadoHandler,
	listCitasSinResultadoHandler,
	listCitasAtendidasConResultadosHandler,
	listResultadosByPacienteHandler,
	deleteArchivoFromResultadoHandler,
};
