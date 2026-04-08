const multer = require("multer");
const { uploadMulterFileToLocal } = require("../utils/uploadToLocal");

// Configurar multer para almacenar en memoria (buffer)
const storage = multer.memoryStorage();

const upload = multer({
	storage,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB máximo general (para PDFs)
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
			// Validar tamaño específico según tipo
			const maxSize = getFileSizeLimit(file.mimetype);
			// Esta validación se hará después de recibir el archivo
			cb(null, true);
		} else {
			cb(
				new Error(
					"Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, WEBP) y PDFs.",
				),
				false,
			);
		}
	},
});

// Middleware para subir firma (imagen)
const uploadFirma = upload.single("firma");

// Middleware para subir informe PDF
const uploadInformePDF = upload.single("informe_pdf");

/**
 * Handler para subir firma
 */
const uploadFirmaHandler = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({
				ok: false,
				message: "No se proporcionó ningún archivo",
			});
		}

		// Verificar que sea una imagen
		if (!req.file.mimetype.startsWith("image/")) {
			return res.status(400).json({
				ok: false,
				message: "El archivo debe ser una imagen",
			});
		}

		// Validar tamaño máximo para imágenes (2MB)
		const maxSize = 2 * 1024 * 1024; // 2MB
		if (req.file.size > maxSize) {
			return res.status(400).json({
				ok: false,
				message: `La imagen es demasiado grande. Tamaño máximo: 2MB. Tamaño actual: ${(req.file.size / 1024 / 1024).toFixed(2)}MB`,
			});
		}

		// Guardar en VPS
		const result = await uploadMulterFileToLocal(
			req.file,
			"garbis/informes/firmas",
		);

		return res.status(200).json({
			ok: true,
			message: "Firma subida exitosamente",
			data: {
				url: result.url,
				public_id: result.public_id,
			},
		});
	} catch (error) {
		console.error("Error al subir firma:", error);
		return res.status(500).json({
			ok: false,
			message: error.message || "Error al subir la firma",
		});
	}
};

/**
 * Handler para subir informe PDF
 */
const uploadInformePDFHandler = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({
				ok: false,
				message: "No se proporcionó ningún archivo",
			});
		}

		// Verificar que sea un PDF
		if (req.file.mimetype !== "application/pdf") {
			return res.status(400).json({
				ok: false,
				message: "El archivo debe ser un PDF",
			});
		}

		// Validar tamaño máximo para PDFs (5MB)
		const maxSize = 5 * 1024 * 1024; // 5MB
		if (req.file.size > maxSize) {
			return res.status(400).json({
				ok: false,
				message: `El PDF es demasiado grande. Tamaño máximo: 5MB. Tamaño actual: ${(req.file.size / 1024 / 1024).toFixed(2)}MB`,
			});
		}

		// Guardar en VPS
		const result = await uploadMulterFileToLocal(
			req.file,
			"garbis/informes/pdfs",
		);

		return res.status(200).json({
			ok: true,
			message: "Informe PDF subido exitosamente",
			data: {
				url: result.url,
				public_id: result.public_id,
			},
		});
	} catch (error) {
		console.error("Error al subir informe PDF:", error);
		return res.status(500).json({
			ok: false,
			message: error.message || "Error al subir el informe PDF",
		});
	}
};

// Middleware para subir imagen de comprobante de pago (máximo 2MB, pero se comprime en frontend a 100-200KB)
const uploadComprobantePago = multer({
	storage,
	limits: {
		fileSize: 2 * 1024 * 1024, // 2MB máximo (después de compresión debería ser mucho menor)
	},
	fileFilter: (req, file, cb) => {
		// Solo permitir imágenes
		const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
		if (allowedMimes.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(
				new Error(
					"Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, WEBP).",
				),
				false,
			);
		}
	},
}).single("comprobante");

/**
 * Handler para subir comprobante de pago
 */
const uploadComprobantePagoHandler = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({
				ok: false,
				message: "No se proporcionó ningún archivo",
			});
		}

		// Verificar que sea una imagen
		if (!req.file.mimetype.startsWith("image/")) {
			return res.status(400).json({
				ok: false,
				message: "El archivo debe ser una imagen",
			});
		}

		// Validar tamaño máximo para imágenes de comprobante (2MB, pero debería venir comprimida a 100-200KB)
		const maxSize = 2 * 1024 * 1024; // 2MB
		if (req.file.size > maxSize) {
			return res.status(400).json({
				ok: false,
				message: `La imagen es demasiado grande. Tamaño máximo: 2MB. Tamaño actual: ${(req.file.size / 1024 / 1024).toFixed(2)}MB`,
			});
		}

		// Guardar en VPS
		const result = await uploadMulterFileToLocal(
			req.file,
			"garbis/pagos/comprobantes",
		);

		return res.status(200).json({
			ok: true,
			message: "Comprobante subido exitosamente",
			data: {
				url: result.url,
				public_id: result.public_id,
			},
		});
	} catch (error) {
		console.error("Error al subir comprobante:", error);
		return res.status(500).json({
			ok: false,
			message: error.message || "Error al subir el comprobante",
		});
	}
};

// Middleware para subir orden médica (máximo 2MB, pero se comprime en frontend a 100-200KB)
const uploadOrdenMedica = multer({
	storage,
	limits: {
		fileSize: 2 * 1024 * 1024, // 2MB máximo (después de compresión debería ser mucho menor)
	},
	fileFilter: (req, file, cb) => {
		// Solo permitir imágenes
		const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
		if (allowedMimes.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(
				new Error(
					"Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, WEBP).",
				),
				false,
			);
		}
	},
}).single("orden_medica");

/**
 * Handler para subir orden médica
 */
const uploadOrdenMedicaHandler = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({
				ok: false,
				message: "No se proporcionó ningún archivo",
			});
		}

		// Verificar que sea una imagen
		if (!req.file.mimetype.startsWith("image/")) {
			return res.status(400).json({
				ok: false,
				message: "El archivo debe ser una imagen",
			});
		}

		// Validar tamaño máximo para imágenes de orden médica (2MB, pero debería venir comprimida a 100-200KB)
		const maxSize = 2 * 1024 * 1024; // 2MB
		if (req.file.size > maxSize) {
			return res.status(400).json({
				ok: false,
				message: `La imagen es demasiado grande. Tamaño máximo: 2MB. Tamaño actual: ${(req.file.size / 1024 / 1024).toFixed(2)}MB`,
			});
		}

		// Guardar en VPS
		const result = await uploadMulterFileToLocal(
			req.file,
			"garbis/citas/ordenes-medicas",
		);

		return res.status(200).json({
			ok: true,
			message: "Orden médica subida exitosamente",
			data: {
				url: result.url,
				public_id: result.public_id,
			},
		});
	} catch (error) {
		console.error("Error al subir orden médica:", error);
		return res.status(500).json({
			ok: false,
			message: error.message || "Error al subir la orden médica",
		});
	}
};

// Middleware para subir icono de eco
const uploadIconoEco = multer({
	storage,
	limits: {
		fileSize: 2 * 1024 * 1024, // 2MB máximo
	},
	fileFilter: (req, file, cb) => {
		const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];
		if (allowedMimes.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(
				new Error(
					"Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, WEBP, SVG).",
				),
				false,
			);
		}
	},
}).single("icono");

/**
 * Handler para subir icono de eco
 */
const uploadIconoEcoHandler = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({
				ok: false,
				message: "No se proporcionó ningún archivo",
			});
		}

		if (!req.file.mimetype.startsWith("image/")) {
			return res.status(400).json({
				ok: false,
				message: "El archivo debe ser una imagen",
			});
		}

		const maxSize = 2 * 1024 * 1024; // 2MB
		if (req.file.size > maxSize) {
			return res.status(400).json({
				ok: false,
				message: `La imagen es demasiado grande. Tamaño máximo: 2MB. Tamaño actual: ${(req.file.size / 1024 / 1024).toFixed(2)}MB`,
			});
		}

		const result = await uploadMulterFileToLocal(
			req.file,
			"garbis/ecos/iconos",
		);

		return res.status(200).json({
			ok: true,
			message: "Ícono subido exitosamente",
			data: {
				url: result.url,
				public_id: result.public_id,
			},
		});
	} catch (error) {
		console.error("Error al subir ícono de eco:", error);
		return res.status(500).json({
			ok: false,
			message: error.message || "Error al subir el ícono de eco",
		});
	}
};

module.exports = {
	uploadFirma,
	uploadInformePDF,
	uploadComprobantePago,
	uploadOrdenMedica,
	uploadIconoEco,
	uploadFirmaHandler,
	uploadInformePDFHandler,
	uploadComprobantePagoHandler,
	uploadOrdenMedicaHandler,
	uploadIconoEcoHandler,
};
