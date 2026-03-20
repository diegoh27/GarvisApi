const PDFDocument = require("pdfkit");
const { uploadBufferToLocal } = require("./uploadToLocal");
const path = require("path");
const fs = require("fs");
const SVGtoPDF = require("svg-to-pdfkit");

/**
 * Genera un PDF del informe médico
 */
const generateInformePDF = async (datos) => {
	return new Promise((resolve, reject) => {
		try {
			// Configuramos el documento (Letter = 612 x 792)
			const doc = new PDFDocument({
				size: "LETTER",
				margins: { top: 40, bottom: 40, left: 190, right: 30 },
				bufferPages: true,
			});

			const chunks = [];
			doc.on("data", (chunk) => chunks.push(chunk));
			doc.on("end", async () => {
				try {
					const buffer = Buffer.concat(chunks);
					const result = await uploadBufferToLocal(
						buffer,
						"garbis/informes/pdfs",
						{ extension: ".pdf" }
					);
					resolve(result);
				} catch (error) {
					reject(error);
				}
			});
			doc.on("error", reject);

			const logoPath = path.join(__dirname, "../../../web/public/logo.svg");
			const brandColor = "#115e59"; // Verde estilo factura
			const textColor = "#1f2937";
			const subTextColor = "#4b5563";
			const sidebarWidth = 170;
			
			const drawSidebar = () => {
				// Sidebar background
				doc.rect(0, 0, 170, 792).fill(brandColor);
				
				// Logo and Company Name
				if (fs.existsSync(logoPath)) {
					// Draw white circle or rectangle if needed, or just logo
					doc.image(logoPath, 55, 40, { width: 60 });
				}
				doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(14)
				   .text("ULTRASONIDO", 20, 110, { width: 130, align: "center" })
				   .text("GARBIS", 20, 125, { width: 130, align: "center" });
				   
				doc.font("Helvetica").fontSize(9)
				   .text("Centro Médico Especializado", 20, 145, { width: 130, align: "center" });

				// Sidebar Bottom info
				doc.font("Helvetica-Bold").fontSize(10)
				   .text("CONTACTO", 20, 680, { width: 130, align: "left" })
				   .font("Helvetica").fontSize(9)
				   .text("Tel: (0414) XXXXXXX", 20, 695)
				   .text("contacto@garbis.com", 20, 710)
				   .text("Maracay, Estado Aragua", 20, 725)
				   .text("RIF: J-XXXXXXXX-X", 20, 740);
				
				// Reset fill color for main content
				doc.fillColor(textColor);
			};

			// Listen to page additions to redraw the sidebar
			doc.on('pageAdded', () => {
				drawSidebar();
			});

			// Draw sidebar on first page
			drawSidebar();

			// =============================
			// CONTENIDO DERECHO (ESTILO INVOICE)
			// =============================
			const rightMargin = 40;
			const contentX = sidebarWidth + rightMargin;
			const textWidth = 612 - contentX - rightMargin;

			doc.font("Helvetica-Bold").fontSize(26).fillColor(textColor)
			   .text("INFORME", contentX, 50, { align: "right", width: textWidth })
			   .fillColor(brandColor)
			   .text("MÉDICO", contentX, 76, { align: "right", width: textWidth });
			
			// Línea divisoria superior
			doc.rect(contentX, 110, textWidth, 2).fill(brandColor);

			const titular = datos.usuarioQueAgendo || datos.paciente;
			const esRepresentado = !!datos.representado;
			const nombrePaciente = esRepresentado 
				? [datos.representado.nombre, datos.representado.apellido].filter(Boolean).join(" ") 
				: `${datos.paciente.nombre} ${datos.paciente.apellido}`;
			const cedulaPaciente = esRepresentado ? datos.representado.cedula : datos.paciente.cedula;

			// Bloque de datos (Como "Invoice To")
			doc.font("Helvetica-Bold").fontSize(10).fillColor(subTextColor)
			   .text("PACIENTE", contentX, 130);
			doc.font("Helvetica-Bold").fontSize(16).fillColor(textColor)
			   .text(nombrePaciente || "N/A", contentX, 145);
			doc.font("Helvetica").fontSize(10).fillColor(subTextColor)
			   .text(`C.I: ${cedulaPaciente || "N/A"}`, contentX, 165);
			if (esRepresentado && datos.representado.fecha_nacimiento) {
				doc.text(`Nac:: ${datos.representado.fecha_nacimiento}`, contentX, 180);
			} else if (!esRepresentado && datos.paciente.telefono) {
				doc.text(`Tlf: ${datos.paciente.telefono}`, contentX, 180);
			}

			// Cuadro de Cita Info (Línea central)
			doc.font("Helvetica-Bold").fontSize(9).fillColor(subTextColor)
			   .text("Fecha:", contentX + textWidth - 120, 130)
			   .font("Helvetica-Bold").fillColor(textColor)
			   .text(datos.cita.fecha_cita, contentX + textWidth - 80, 130)
			   
			   .font("Helvetica-Bold").fillColor(subTextColor)
			   .text("Hora:", contentX + textWidth - 120, 145)
			   .font("Helvetica-Bold").fillColor(textColor)
			   .text(datos.cita.hora_cita, contentX + textWidth - 80, 145)

			   .font("Helvetica-Bold").fillColor(subTextColor)
			   .text("Estudio:", contentX + textWidth - 120, 160)
			   .font("Helvetica-Bold").fillColor(textColor)
			   .text(datos.cita.eco_nombre, contentX + textWidth - 80, 160);

			// =============================
			// RESULTADOS (Estilo Tabla)
			// =============================
			doc.y = 220;
			
			// Encabezado verde de "Tabla"
			doc.rect(contentX, doc.y, textWidth, 20).fill(brandColor);
			doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10)
			   .text("HALLAZGOS CLÍNICOS", contentX + 10, doc.y + 6);
			
			doc.y += 28;
			
			// Contenido Resultado
			doc.fillColor(textColor).font("Helvetica").fontSize(10)
			   .text(datos.reseña || "No hay hallazgos registrados para este estudio.", contentX + 5, doc.y, {
				   width: textWidth - 10,
				   align: "justify",
				   paragraphGap: 5,
				   lineGap: 4
			   });

			doc.moveDown(2);

			if (datos.recomendaciones && datos.recomendaciones.trim().length > 0) {
				const beforeRectY = doc.y;
				doc.rect(contentX, beforeRectY, textWidth, 20).fill(brandColor);
				doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10)
				   .text("RECOMENDACIONES", contentX + 10, beforeRectY + 6);
				
				doc.y = beforeRectY + 28;
				doc.fillColor(textColor).font("Helvetica").fontSize(10)
				   .text(datos.recomendaciones, contentX + 5, doc.y, {
					   width: textWidth - 10,
					   align: "justify",
					   paragraphGap: 5,
					   lineGap: 4
				   });
			}

			// =============================
			// IMÁGENES
			// =============================
			if (datos.ecoUrl && typeof datos.ecoUrl === "string") {
				const ecoUrlClean = datos.ecoUrl.trim();
				if (ecoUrlClean.startsWith("http://") || ecoUrlClean.startsWith("https://")) {
					doc.moveDown(2);
					const linkY = doc.y;
					doc.rect(contentX, linkY, textWidth, 30).fill("#f3f4f6");
					doc.fillColor(subTextColor).fontSize(9).font("Helvetica-Bold")
					   .text("Archivo Adjunto:", contentX + 10, linkY + 10)
					   .fillColor("#2563eb").font("Helvetica")
					   .text("Haz clic aquí para visualizar las imágenes ecográficas", contentX + 100, linkY + 10, { link: ecoUrlClean, underline: true });
				}
			}

			// =============================
			// TOTAL / FIRMA (ESTILO INVOICE MANAGER)
			// =============================
			const pageHeight = 792;
			let currentFinalY = doc.y;

			// Validar si requiere una página extra para los Footer
			if (currentFinalY > pageHeight - 120) {
				doc.addPage();
				currentFinalY = 60;
			}

			const bottomAreaY = pageHeight - 110;
			
			// Línea divisoria abajo
			doc.rect(contentX, bottomAreaY, textWidth, 1).fill("#e5e7eb");

			// "Total/Subtotal" style Médico
			doc.fillColor(textColor).fontSize(14).font("Helvetica-Bold")
			   .text("AUTENTICIDAD", contentX, bottomAreaY + 15);
			doc.fillColor(subTextColor).fontSize(9).font("Helvetica")
			   .text("Informe validado en Garbis", contentX, bottomAreaY + 35);
			
			// Manager Signature
			doc.rect(contentX + textWidth - 160, bottomAreaY + 10, 160, 40).fill("#e5e7eb");
			
			// Signature Line
			doc.rect(contentX + textWidth - 150, bottomAreaY + 65, 140, 1).fill(subTextColor);
			
			// Médico Name
			doc.fillColor(textColor).fontSize(11).font("Helvetica-Bold")
			   .text(`${datos.especialista.nombre} ${datos.especialista.apellido}`, contentX + textWidth - 160, bottomAreaY + 72, { align: "center", width: 160 });
			
			doc.fillColor("#ffffff");
			
			// Botón de Médico Tratante insertado en el fondo
			doc.rect(contentX + textWidth - 130, bottomAreaY + 88, 100, 12).fill(subTextColor);
			doc.fillColor("#ffffff").fontSize(7).font("Helvetica-Bold")
			   .text("MÉDICO TRATANTE", contentX + textWidth - 130, bottomAreaY + 91, { align: "center", width: 100 });
			   
			// Footer text
			doc.fillColor(subTextColor).fontSize(8).font("Helvetica")
			   .text("www.garbis.com", contentX, pageHeight - 20)
			   .text("Este documento sirve como resultado final de evaluación médica.", contentX + textWidth - 250, pageHeight - 20, { align: "right", width: 250 });

			doc.end();
		} catch (error) {
			reject(error);
		}
	});
};

module.exports = { generateInformePDF };
