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

		// Validar que sea una URL http(s) válida (puede ser Cloudinary u otro host)
		try {
			const parsed = new URL(cloudinaryUrl);
			if (!["http:", "https:"].includes(parsed.protocol)) {
				return res.status(400).json({
					ok: false,
					message: "URL inválida",
				});
			}
		} catch {
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

		// Descargar el archivo desde Cloudinary (puede ser PDF o imagen: orden médica, informe, etc.)
		const response = await axios.get(cloudinaryUrl, {
			responseType: "stream",
			timeout: 30000, // 30 segundos
		});

		// Content-Type según la URL para que imágenes y PDFs se muestren correctamente
		const urlLower = cloudinaryUrl.toLowerCase();
		let contentType = "application/pdf";
		let filename = "documento.pdf";
		if (
			urlLower.includes("/image/") ||
			/\.(jpe?g|png|webp|gif)(\?|$)/i.test(urlLower)
		) {
			contentType = urlLower.includes("png")
				? "image/png"
				: urlLower.includes("webp")
					? "image/webp"
					: "image/jpeg";
			filename = "orden-medica.jpg";
		}

		res.setHeader("Content-Type", contentType);
		res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
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
