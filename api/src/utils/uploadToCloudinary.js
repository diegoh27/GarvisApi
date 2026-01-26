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
	folder = "garbis",
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
					// Asegurar que siempre usamos secure_url (https://)
					let url = result.secure_url || result.url;
					
					// Validar que la URL sea completa y válida
					if (!url || typeof url !== 'string') {
						reject(new Error("Cloudinary no devolvió una URL válida"));
						return;
					}
					
					// Asegurar que la URL siempre tenga el protocolo https://
					if (!url.startsWith("http://") && !url.startsWith("https://")) {
						url = `https://${url}`;
					}
					
					// Para PDFs con resource_type "raw", Cloudinary puede devolver URLs sin extensión
					// Verificar que la URL sea válida y completa
					try {
						new URL(url);
					} catch (error) {
						reject(new Error(`URL de Cloudinary inválida: ${url}`));
						return;
					}
					
					// Para PDFs, asegurar que la URL tenga extensión .pdf si es necesario
					// Pero solo si realmente es un PDF y no tiene extensión
					if (resourceType === "raw" && !url.includes(".pdf") && !url.includes("/raw/")) {
						// Si la URL no tiene extensión y es raw, puede ser un PDF
						// Cloudinary maneja esto automáticamente, pero podemos agregar .pdf al final si falta
						if (!url.match(/\.(pdf|jpg|jpeg|png|webp|gif)/i)) {
							url = `${url}.pdf`;
						}
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
const uploadMulterFileToCloudinary = async (file, folder = "garbis") => {
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
