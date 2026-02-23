const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");

const DEFAULT_UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

const MIME_EXTENSION_MAP = {
	"image/jpeg": ".jpg",
	"image/jpg": ".jpg",
	"image/png": ".png",
	"image/webp": ".webp",
	"image/tiff": ".tiff",
	"image/bmp": ".bmp",
	"application/pdf": ".pdf",
	"application/dicom": ".dcm",
	"video/mp4": ".mp4",
	"video/avi": ".avi",
	"video/x-msvideo": ".avi",
	"video/quicktime": ".mov",
	"video/x-matroska": ".mkv",
	"application/zip": ".zip",
	"application/x-zip-compressed": ".zip",
	"application/x-zip": ".zip",
	// Fallback cuando el browser reporta el tipo genérico
	"application/octet-stream": "",
};

const sanitizeFolder = (folder = "") => {
	return folder
		.replace(/\\/g, "/")
		.split("/")
		.filter((segment) => segment && segment !== "..")
		.join("/");
};

const getUploadsDir = () => {
	return path.resolve(process.env.UPLOADS_DIR || DEFAULT_UPLOADS_DIR);
};

const buildPublicUrl = (relativePath) => {
	const baseUrl = (
		process.env.UPLOADS_BASE_URL ||
		process.env.BASE_URL_SERVER ||
		"http://localhost:3001"
	).replace(/\/+$/g, "");
	const normalizedPath = relativePath.replace(/\\/g, "/");
	return `${baseUrl}/${normalizedPath}`;
};

const resolveFileExtension = ({ originalName, mimeType, extension }) => {
	if (extension) {
		return extension.startsWith(".") ? extension : `.${extension}`;
	}

	const extFromName = originalName ? path.extname(originalName) : "";
	if (extFromName) {
		return extFromName;
	}

	return MIME_EXTENSION_MAP[mimeType] || "";
};

const buildTarget = (folder, options) => {
	const uploadsDir = getUploadsDir();
	const safeFolder = sanitizeFolder(folder);
	const extension = resolveFileExtension({
		originalName: options.originalName,
		mimeType: options.mimeType,
		extension: options.extension,
	});
	const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
	const relativePath = path.posix.join("uploads", safeFolder, fileName);
	const targetDir = path.join(uploadsDir, safeFolder);
	const filePath = path.join(targetDir, fileName);

	return {
		relativePath,
		targetDir,
		filePath,
	};
};

const moveFile = async (sourcePath, targetPath) => {
	try {
		await fs.rename(sourcePath, targetPath);
	} catch (error) {
		if (error && error.code === "EXDEV") {
			await fs.copyFile(sourcePath, targetPath);
			await fs.unlink(sourcePath);
			return;
		}
		throw error;
	}
};

/**
 * Guarda un buffer en el VPS y devuelve una URL publica.
 * @param {Buffer} fileBuffer
 * @param {string} folder
 * @param {object} options
 * @param {string} options.originalName
 * @param {string} options.mimeType
 * @param {string} options.extension
 * @returns {Promise<{url: string, public_id: string}>}
 */
const uploadBufferToLocal = async (
	fileBuffer,
	folder = "garbis",
	options = {},
) => {
	if (!fileBuffer) {
		throw new Error("Archivo invalido");
	}

	const { relativePath, targetDir, filePath } = buildTarget(folder, options);

	await fs.mkdir(targetDir, { recursive: true });
	await fs.writeFile(filePath, fileBuffer);

	return {
		url: buildPublicUrl(relativePath),
		public_id: relativePath,
	};
};

/**
 * Guarda un archivo de multer en el VPS.
 * @param {Express.Multer.File} file
 * @param {string} folder
 * @returns {Promise<{url: string, public_id: string}>}
 */
const uploadMulterFileToLocal = async (file, folder = "garbis") => {
	if (!file || (!file.buffer && !file.path)) {
		throw new Error("Archivo invalido");
	}

	const options = {
		originalName: file.originalname,
		mimeType: file.mimetype,
	};

	if (file.path) {
		const { relativePath, targetDir, filePath } = buildTarget(folder, options);
		await fs.mkdir(targetDir, { recursive: true });
		await moveFile(file.path, filePath);
		return {
			url: buildPublicUrl(relativePath),
			public_id: relativePath,
		};
	}

	return uploadBufferToLocal(file.buffer, folder, options);
};

/**
 * Elimina un archivo del disco a partir de su URL pública.
 * Retorna la ruta eliminada, o null si el archivo no existía.
 */
const deleteFileByPublicUrl = async (publicUrl) => {
	try {
		const normalized = /^https?:\/\//i.test(publicUrl)
			? publicUrl
			: `https://${publicUrl}`;
		const pathname = new URL(normalized).pathname; // /uploads/garbis/...
		const uploadsPrefix = "/uploads/";
		if (!pathname.startsWith(uploadsPrefix)) return null;
		const relPath = pathname.slice(uploadsPrefix.length);
		const filePath = path.join(getUploadsDir(), relPath);
		await fs.unlink(filePath);
		return filePath;
	} catch (e) {
		if (e.code === "ENOENT") return null; // ya no existía
		throw e;
	}
};

/**
 * Si la carpeta padre del archivo (cuyo nombre empieza con "cita_") queda vacía,
 * la elimina. Operación best-effort: nunca lanza excepción.
 */
const cleanupEmptyCitaFolder = async (publicUrl) => {
	try {
		const normalized = /^https?:\/\//i.test(publicUrl)
			? publicUrl
			: `https://${publicUrl}`;
		const pathname = new URL(normalized).pathname;
		const uploadsPrefix = "/uploads/";
		if (!pathname.startsWith(uploadsPrefix)) return;
		const relPath = pathname.slice(uploadsPrefix.length);
		const filePath = path.join(getUploadsDir(), relPath);
		const folderPath = path.dirname(filePath);
		if (!path.basename(folderPath).startsWith("cita_")) return;
		const entries = await fs.readdir(folderPath);
		if (entries.length === 0) {
			await fs.rmdir(folderPath);
		}
	} catch {
		// best-effort: no interrumpir el flujo principal
	}
};

module.exports = {
	uploadBufferToLocal,
	uploadMulterFileToLocal,
	buildPublicUrl,
	deleteFileByPublicUrl,
	cleanupEmptyCitaFolder,
	getUploadsDir,
};
