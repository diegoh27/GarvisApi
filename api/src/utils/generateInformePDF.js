const PDFDocument = require("pdfkit");
const { uploadBufferToCloudinary } = require("./uploadToCloudinary");

/**
 * Genera un PDF del informe médico y lo sube a Cloudinary
 * @param {Object} datos - Datos del informe
 * @param {string} datos.reseña - Reseña del estudio
 * @param {string} datos.recomendaciones - Recomendaciones
 * @param {Object} datos.paciente - Datos del paciente
 * @param {Object} datos.especialista - Datos del especialista
 * @param {Object} datos.cita - Datos de la cita
 * @param {string} datos.ecoUrl - URL del eco en Cloudinary
 * @returns {Promise<{url: string, public_id: string}>}
 */
const generateInformePDF = async (datos) => {
	return new Promise((resolve, reject) => {
		try {
			const doc = new PDFDocument({
				size: "LETTER",
				margins: { top: 50, bottom: 50, left: 50, right: 50 },
			});

			const chunks = [];
			doc.on("data", (chunk) => chunks.push(chunk));
			doc.on("end", async () => {
				try {
					const buffer = Buffer.concat(chunks);
					const result = await uploadBufferToCloudinary(
						buffer,
						"garbis/informes/pdfs",
						"raw",
						{
							// Forzar formato PDF y nombre con extensión
							format: "pdf",
							resource_type: "raw",
							access_mode: "public", // Asegurar que sea público
							type: "upload", // Asegurar que se suba como upload
						}
					);
					resolve(result);
				} catch (error) {
					reject(error);
				}
			});
			doc.on("error", reject);

			// Encabezado
			doc
				.fontSize(20)
				.font("Helvetica-Bold")
				.text("Ultrasonido Garbis", { align: "center" })
				.moveDown(0.5)
				.fontSize(14)
				.font("Helvetica")
				.text("Maracay, estado Aragua", { align: "center" })
				.moveDown(2);

			// Línea separadora
			doc
				.moveTo(50, doc.y)
				.lineTo(562, doc.y)
				.stroke()
				.moveDown(1.5);

			// Título del informe
			doc
				.fontSize(16)
				.font("Helvetica-Bold")
				.text("INFORME MÉDICO", { align: "center" })
				.moveDown(1.5);

			// Datos del paciente
			doc
				.fontSize(12)
				.font("Helvetica-Bold")
				.text("DATOS DEL PACIENTE", { underline: true })
				.moveDown(0.5)
				.font("Helvetica")
				.text(`Nombre: ${datos.paciente.nombre} ${datos.paciente.apellido}`)
				.text(`Cédula: ${datos.paciente.cedula || "N/A"}`)
				.text(`Teléfono: ${datos.paciente.telefono || "N/A"}`)
				.moveDown(1);

			// Datos del especialista
			doc
				.font("Helvetica-Bold")
				.text("ESPECIALISTA", { underline: true })
				.moveDown(0.5)
				.font("Helvetica")
				.text(
					`Dr./Dra. ${datos.especialista.nombre} ${datos.especialista.apellido}`
				)
				.text(`Cédula: ${datos.especialista.cedula || "N/A"}`)
				.moveDown(1);

			// Datos de la cita
			doc
				.font("Helvetica-Bold")
				.text("INFORMACIÓN DE LA CITA", { underline: true })
				.moveDown(0.5)
				.font("Helvetica")
				.text(`Fecha: ${datos.cita.fecha_cita}`)
				.text(`Hora: ${datos.cita.hora_cita}`)
				.text(`Tipo de estudio: ${datos.cita.eco_nombre}`)
				.moveDown(1);

			// Reseña
			doc
				.font("Helvetica-Bold")
				.text("RESEÑA", { underline: true })
				.moveDown(0.5)
				.font("Helvetica")
				.text(datos.reseña || "No especificado", {
					align: "justify",
					paragraphGap: 5,
				})
				.moveDown(1);

			// Recomendaciones
			if (datos.recomendaciones) {
				doc
					.font("Helvetica-Bold")
					.text("RECOMENDACIONES", { underline: true })
					.moveDown(0.5)
					.font("Helvetica")
					.text(datos.recomendaciones, {
						align: "justify",
						paragraphGap: 5,
					})
					.moveDown(1);
			}

			// Link del eco (resultado)
			console.log("🔍 Verificando ecoUrl en PDF:", datos.ecoUrl);
			console.log("🔍 Tipo de ecoUrl:", typeof datos.ecoUrl);
			
			if (datos.ecoUrl && typeof datos.ecoUrl === "string") {
				// Limpiar espacios en blanco
				const ecoUrlClean = datos.ecoUrl.trim();
				
				// Verificar si es una URL válida (http:// o https://)
				const isUrl =
					ecoUrlClean.startsWith("http://") ||
					ecoUrlClean.startsWith("https://");
				
				console.log("🔍 ecoUrl limpio:", ecoUrlClean);
				console.log("🔍 Longitud:", ecoUrlClean.length);
				console.log("🔍 ¿Es URL válida?:", isUrl);
				
				if (isUrl && ecoUrlClean.length > 0) {
					doc
						.font("Helvetica-Bold")
						.text("ARCHIVO DEL ESTUDIO (ECO)", { underline: true })
						.moveDown(0.5)
						.font("Helvetica")
						.text("Puede descargar el archivo del estudio desde el siguiente enlace:")
						.moveDown(0.3)
						.fillColor("blue")
						.text(ecoUrlClean, { link: ecoUrlClean })
						.fillColor("black")
						.moveDown(1);
					console.log("✅ Link del eco agregado al PDF exitosamente");
				} else {
					console.log("⚠️  ecoUrl no es una URL válida (debe empezar con http:// o https://)");
					console.log("⚠️  Valor recibido:", ecoUrlClean);
				}
			} else {
				console.log("⚠️  No hay ecoUrl en los datos o no es un string");
				console.log("⚠️  Valor:", datos.ecoUrl);
			}

			// Pie de página
			const pageHeight = doc.page.height;
			const pageWidth = doc.page.width;
			doc
				.fontSize(10)
				.font("Helvetica")
				.text(
					`Generado el ${new Date().toLocaleDateString("es-VE", {
						year: "numeric",
						month: "long",
						day: "numeric",
					})}`,
					50,
					pageHeight - 80,
					{ align: "center", width: pageWidth - 100 }
				);

			doc.end();
		} catch (error) {
			reject(error);
		}
	});
};

module.exports = { generateInformePDF };
