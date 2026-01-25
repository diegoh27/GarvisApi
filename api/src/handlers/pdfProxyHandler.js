const axios = require("axios");

/**
 * Handler para servir PDFs desde Cloudinary como proxy
 * Esto evita problemas de CORS y autenticación
 */
const servePDFProxyHandler = async (req, res) => {
	try {
		const { cloudinaryUrl, token } = req.query;

		if (!cloudinaryUrl) {
			return res.status(400).json({
				ok: false,
				message: "cloudinaryUrl es requerido",
			});
		}

		// Validar que la URL sea de Cloudinary
		if (!cloudinaryUrl.includes("cloudinary.com")) {
			return res.status(400).json({
				ok: false,
				message: "URL inválida",
			});
		}

		// Verificar autenticación: primero intentar desde el middleware, luego desde query param
		let id_especialista = req.user?.id;
		
		// Si no hay usuario del middleware pero hay token en query, verificar el token
		if (!id_especialista && token) {
			const jwt = require("jsonwebtoken");
			try {
				const decoded = jwt.verify(token, process.env.JWT_SECRET);
				id_especialista = decoded.id;
			} catch (error) {
				// Token inválido, continuar sin autorización
			}
		}

		if (!id_especialista) {
			return res.status(401).json({
				ok: false,
				message: "No autorizado",
			});
		}

		// Descargar el PDF desde Cloudinary
		const response = await axios.get(cloudinaryUrl, {
			responseType: "stream",
			timeout: 30000, // 30 segundos
		});

		// Configurar headers para PDF
		res.setHeader("Content-Type", "application/pdf");
		res.setHeader(
			"Content-Disposition",
			`inline; filename="informe.pdf"`
		);
		res.setHeader("Cache-Control", "public, max-age=3600");

		// Pipe del stream al response
		response.data.pipe(res);
	} catch (error) {
		console.error("Error en servePDFProxyHandler:", error);
		if (error.response) {
			return res.status(error.response.status).json({
				ok: false,
				message: "Error al obtener el PDF desde Cloudinary",
			});
		}
		return res.status(500).json({
			ok: false,
			message: "Error interno al servir el PDF",
		});
	}
};

module.exports = { servePDFProxyHandler };
