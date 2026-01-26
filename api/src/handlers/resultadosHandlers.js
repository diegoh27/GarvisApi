const {
	createOrUpdateResultadoController,
	listCitasSinResultadoController,
	listCitasAtendidasConResultadosController,
	deleteArchivoFromResultadoController,
} = require("../controllers/resultadosControllers");
const { uploadMulterFileToCloudinary } = require("../utils/uploadToCloudinary");
const multer = require("multer");

// Configurar multer para almacenar en memoria
const storage = multer.memoryStorage();
const upload = multer({
	storage,
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB máximo
	},
	fileFilter: (req, file, cb) => {
		// Permitir imágenes y PDFs
		const allowedMimes = [
			"image/jpeg",
			"image/jpg",
			"image/png",
			"image/webp",
			"application/pdf",
		];
		if (allowedMimes.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(
				new Error(
					"Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, WEBP) y PDFs."
				),
				false
			);
		}
	},
});

// Permitir múltiples archivos (hasta 10)
const uploadResultado = upload.array("archivos", 10);

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

		// Subir todos los archivos a Cloudinary
		const uploadPromises = req.files.map((file) =>
			uploadMulterFileToCloudinary(file, "garbis/resultados")
		);
		const results = await Promise.all(uploadPromises);
		const archivoUrls = results.map((result) => result.url);

		// Guardar las URLs como JSON array
		const archivoUrlsJson = JSON.stringify(archivoUrls);

		// Crear o actualizar resultado en la base de datos
		const data = await createOrUpdateResultadoController({
			id_cita,
			id_especialista: null, // Se obtendrá de la cita
			archivo_url: archivoUrlsJson, // Guardar como JSON array
			nombre: nombre || null,
		});

		return res.status(200).json({
			ok: true,
			message: data.updated
				? `Resultado actualizado exitosamente (${archivoUrls.length} archivo${archivoUrls.length > 1 ? 's' : ''})`
				: `Resultado subido exitosamente (${archivoUrls.length} archivo${archivoUrls.length > 1 ? 's' : ''})`,
			data: {
				...data,
				archivo_urls: archivoUrls, // Devolver como array para el frontend
			},
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
		console.error("Error al subir resultado:", error);
		return res.status(500).json({
			ok: false,
			message: error.message || "Error al subir el resultado",
		});
	}
};

const listCitasSinResultadoHandler = async (req, res) => {
	try {
		const data = await listCitasSinResultadoController();
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
		});

		return res.status(200).json({
			ok: true,
			message: `Archivo eliminado exitosamente. Quedan ${data.archivos_restantes} archivo${data.archivos_restantes !== 1 ? 's' : ''}.`,
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
		console.error("Error al eliminar archivo:", error);
		return res.status(500).json({
			ok: false,
			message: "Error interno del servidor al eliminar el archivo",
		});
	}
};

module.exports = {
	uploadResultado,
	uploadResultadoHandler,
	listCitasSinResultadoHandler,
	listCitasAtendidasConResultadosHandler,
	deleteArchivoFromResultadoHandler,
};
