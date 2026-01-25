const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

/**
 * Sube un archivo buffer a Cloudinary
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} folder - Carpeta en Cloudinary (ej: "informes/firmas", "informes/pdfs")
 * @param {string} resourceType - Tipo de recurso: "image", "raw", "auto"
 * @returns {Promise<{url: string, public_id: string}>}
 */
const uploadBufferToCloudinary = async (
	fileBuffer,
	folder = "garvis",
	resourceType = "auto",
	options = {}
) => {
	return new Promise((resolve, reject) => {
		const uploadOptions = {
			folder,
			resource_type: resourceType,
			use_filename: true,
			unique_filename: true,
			access_mode: "public", // Hacer el archivo público para que sea accesible sin autenticación
			type: "upload", // Asegurar que se suba como upload (no como fetch)
			...options,
		};

		const uploadStream = cloudinary.uploader.upload_stream(
			uploadOptions,
			(error, result) => {
				if (error) {
					reject(error);
				} else {
					// Para PDFs, asegurar que la URL tenga extensión .pdf y parámetros para visualización
					let url = result.secure_url;
					if (resourceType === "raw" && !url.includes(".pdf")) {
						// Agregar extensión .pdf si no la tiene
						url = url.replace(/\.[^.]*$/, ".pdf");
					}
					// Agregar parámetro para forzar visualización en navegador (no descarga)
					if (resourceType === "raw") {
						// Cloudinary con raw type puede necesitar parámetros adicionales
						// Pero mejor manejarlo en el frontend
					}
					resolve({
						url,
						public_id: result.public_id,
					});
				}
			}
		);

		// Convertir buffer a stream
		const bufferStream = new Readable();
		bufferStream.push(fileBuffer);
		bufferStream.push(null);
		bufferStream.pipe(uploadStream);
	});
};

/**
 * Sube un archivo desde multer a Cloudinary
 * @param {Express.Multer.File} file - Archivo de multer
 * @param {string} folder - Carpeta en Cloudinary
 * @returns {Promise<{url: string, public_id: string}>}
 */
const uploadMulterFileToCloudinary = async (file, folder = "garvis") => {
	if (!file || !file.buffer) {
		throw new Error("Archivo inválido");
	}

	// Determinar resource_type basado en el mimetype
	let resourceType = "auto";
	if (file.mimetype.startsWith("image/")) {
		resourceType = "image";
	} else if (file.mimetype === "application/pdf") {
		resourceType = "raw";
	}

	return uploadBufferToCloudinary(file.buffer, folder, resourceType);
};

module.exports = {
	uploadBufferToCloudinary,
	uploadMulterFileToCloudinary,
};
