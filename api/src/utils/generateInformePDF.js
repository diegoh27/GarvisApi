const pdfmake = require("pdfmake");
const { uploadBufferToLocal } = require("./uploadToLocal");
const path = require("path");
const fs = require("fs");

// ─── Fonts (usar las fuentes embebidas de PDFKit) ───────────────────────
pdfmake.setFonts({
	Helvetica: {
		normal: "Helvetica",
		bold: "Helvetica-Bold",
		italics: "Helvetica-Oblique",
		bolditalics: "Helvetica-BoldOblique",
	},
});

// Desactivar warnings de URL policy (no usamos URLs externos)
pdfmake.setUrlAccessPolicy(() => false);

// ─── Logo ─── Extraer imagen PNG ─────────────────────
const logoPath = path.join(__dirname, "../../../web/public/logo.png");
let logoDataUri = null;
try {
	if (fs.existsSync(logoPath)) {
		const base64 = fs.readFileSync(logoPath).toString("base64");
		logoDataUri = "data:image/png;base64," + base64;
	}
} catch (_) {
	/* logo no disponible */
}

// ─── Constantes ─────────────────────────────────────────────────────────
const BRAND = "#115e59";
const TEXT = "#1f2937";
const SUB_TEXT = "#4b5563";
const WHITE = "#ffffff";
const SIDEBAR_W = 130;

// ─── Utilidad para limpiar texto ────────────────────────────────────────
function sanitize(txt) {
	if (!txt) return "";
	return txt.replace(/(\r?\n\s*){3,}/g, "\n\n").trim();
}

// ═══════════════════════════════════════════════════════════════════════
//  FUNCIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════
const generateInformePDF = async (datos) => {
	// ── Datos del paciente ──
	const esRep = !!datos.representado;
	const nombrePaciente = esRep
		? [datos.representado.nombre, datos.representado.apellido]
			.filter(Boolean).join(" ")
		: `${datos.paciente.nombre} ${datos.paciente.apellido}`;
	const cedulaPaciente = esRep
		? datos.representado.cedula
		: datos.paciente.cedula;

	const reseña = sanitize(datos.reseña) || "No hay hallazgos registrados para este estudio.";
	const recomendaciones = sanitize(datos.recomendaciones);

	// ─── Contenido principal ────────────────────────────────────────
	const content = [];

	// ── MEMBRETE INSTITUCIONAL ──────────────────────────────────────
	content.push({
		columns: [
			{
				width: "*",
				stack: [
					{ text: "ULTRASONIDO INTEGRAL GARBIS", fontSize: 16, bold: true, color: BRAND, font: "Helvetica", margin: [0, 0, 0, 0], },
					{
						columns: [
							{ text: "CENTRO MÉDICO ESPECIALIZADO", fontSize: 8, bold: true, color: TEXT, width: "auto" },
						],
						margin: [0, 3, 0, 0],
					},
					{ text: "Rif: V-15890040-0", fontSize: 8, color: SUB_TEXT, width: "auto" },
				],
				margin: [0, 4, 0, 0],
			},
			...(logoDataUri
				? [{ image: logoDataUri, width: 80, alignment: "right", margin: [0, -10, 0, 0] }]
				: []),
		],
		margin: [0, 0, 0, 4],
	});

	// Línea verde gruesa del membrete
	content.push({
		canvas: [{ type: "line", x1: 0, y1: 0, x2: 412, y2: 0, lineWidth: 3, lineColor: BRAND }],
		margin: [0, 0, 0, 14],
	});

	// Título del reporte
	content.push({
		columns: [
			{
				width: "*",
				stack: [
					{ text: "INFORME MÉDICO", fontSize: 18, bold: true, color: BRAND, alignment: "center" },
				],
			},
		],
		margin: [0, 0, 0, 10],
	});

	// Línea divisoria bajo el título
	content.push({
		canvas: [{ type: "line", x1: 0, y1: 0, x2: 412, y2: 0, lineWidth: 1, lineColor: "#e5e7eb" }],
		margin: [0, 0, 0, 15],
	});

	// Bloque paciente + datos cita
	const patientStack = [
		{ text: "PACIENTE:", fontSize: 10, bold: true, color: SUB_TEXT, margin: [0, 0, 0, 5] },
		{ text: nombrePaciente || "N/A", fontSize: 16, bold: true, color: TEXT, margin: [0, 0, 0, 5] },
		{ text: `C.I: ${cedulaPaciente || "N/A"}`, fontSize: 10, color: SUB_TEXT, margin: [0, 0, 0, 5] },
	];
	if (esRep && datos.representado.fecha_nacimiento) {
		patientStack.push({ text: `Nac: ${datos.representado.fecha_nacimiento}`, fontSize: 10, color: SUB_TEXT });
	} else if (!esRep && datos.paciente.telefono) {
		patientStack.push({ text: `Tlf: ${datos.paciente.telefono}`, fontSize: 10, color: SUB_TEXT });
	}

	const citaFields = [
		["Fecha:", datos.cita.fecha_cita || ""],
		["Hora:", datos.cita.hora_cita || ""],
		["Estudio:", datos.cita.eco_nombre || ""],
	];
	const citaStack = citaFields.map(([label, value]) => ({
		columns: [
			{ text: label, width: 50, fontSize: 12, bold: true, color: SUB_TEXT, margin: [0, 0, 0, 5] },
			{ text: value, width: "*", fontSize: 12, bold: true, color: TEXT, margin: [0, 0, 0, 5] },
		],
	}));

	content.push({
		columns: [
			{ width: "*", stack: patientStack },
			{ width: 150, stack: citaStack },
		],
		margin: [0, 0, 0, 20],
	});

	// ── HALLAZGOS CLÍNICOS ──
	content.push({
		table: {
			widths: ["*"], body: [[{
				text: "HALLAZGOS CLÍNICOS", fontSize: 10, bold: true,
				color: WHITE, fillColor: BRAND, margin: [8, 4, 0, 4],
			}]]
		},
		layout: "noBorders",
		margin: [0, 0, 0, 8],
	});

	content.push({
		text: reseña, fontSize: 10, color: TEXT,
		alignment: "justify", lineHeight: 1.4, margin: [5, 0, 5, 15],
	});

	// ── RECOMENDACIONES ──
	if (recomendaciones) {
		content.push({
			table: {
				widths: ["*"], body: [[{
					text: "RECOMENDACIONES", fontSize: 10, bold: true,
					color: WHITE, fillColor: BRAND, margin: [8, 4, 0, 4],
				}]]
			},
			layout: "noBorders",
			margin: [0, 0, 0, 8],
		});

		content.push({
			text: recomendaciones, fontSize: 10, color: TEXT,
			alignment: "justify", lineHeight: 1.4, margin: [5, 0, 5, 15],
		});
	}

	// ── ENLACE ECO ──
	if (datos.ecoUrl && typeof datos.ecoUrl === "string" && datos.ecoUrl.trim().startsWith("http")) {
		const url = datos.ecoUrl.trim();
		content.push({
			table: {
				widths: ["*"], body: [[{
					columns: [
						{ text: "Archivo Adjunto: ", fontSize: 9, bold: true, color: SUB_TEXT, width: "auto" },
						{ text: "Haz clic aquí para visualizar las imágenes ecográficas", fontSize: 9, color: "#2563eb", link: url, decoration: "underline", width: "*" },
					],
					fillColor: "#f3f4f6", margin: [8, 6, 8, 6],
				}]]
			},
			layout: "noBorders",
			margin: [0, 5, 0, 20],
		});
	}

	// ── FIRMA / AUTENTICIDAD ──
	content.push({
		canvas: [{ type: "line", x1: 0, y1: 0, x2: 412, y2: 0, lineWidth: 1, lineColor: "#e5e7eb" }],
		margin: [0, 20, 0, 10],
	});

	content.push({
		columns: [
			{
				width: "*",
				stack: [
					{ text: "AUTENTICIDAD", fontSize: 14, bold: true, color: TEXT },
					{ text: "Informe validado en Garbis", fontSize: 9, color: SUB_TEXT, margin: [0, 5, 0, 0] },
				],
			},
			{
				width: 160,
				stack: [
					{ canvas: [{ type: "rect", x: 0, y: 0, w: 160, h: 40, color: "#e5e7eb" }], margin: [0, 0, 0, 20] },
					{ canvas: [{ type: "line", x1: 10, y1: 0, x2: 150, y2: 0, lineWidth: 1, lineColor: SUB_TEXT }], margin: [0, 0, 0, 3] },
					{ text: `${datos.especialista.nombre} ${datos.especialista.apellido}`, fontSize: 11, bold: true, color: TEXT, alignment: "center" },
					{
						table: {
							widths: [100], body: [[{
								text: "MÉDICO TRATANTE", fontSize: 7, bold: true,
								color: WHITE, fillColor: SUB_TEXT, alignment: "center", margin: [0, 1, 0, 1],
							}]]
						},
						layout: "noBorders", alignment: "center", margin: [30, 3, 30, 0],
					},
				],
			},
		],
	});

	// ─── SIDEBAR (fondo, se pinta en CADA página automáticamente) ────
	function buildBackground(_currentPage, pageSize) {
		const items = [
			{ canvas: [{ type: "rect", x: 0, y: 0, w: SIDEBAR_W, h: pageSize.height, color: BRAND }] },
		];

		items.push({ text: "ULTRASONIDO", fontSize: 14, bold: true, color: WHITE, alignment: "center", absolutePosition: { x: 20, y: 110 }, width: 130 });
		items.push({ text: "GARBIS", fontSize: 14, bold: true, color: WHITE, alignment: "center", absolutePosition: { x: 20, y: 128 }, width: 130 });
		items.push({ text: "Centro Médico Especializado", fontSize: 9, color: WHITE, alignment: "center", absolutePosition: { x: 20, y: 148 }, width: 130 });

		items.push({
			stack: [
				{ text: "CONTACTO", fontSize: 10, bold: true, color: WHITE },
				{ text: "Tlf: 0416-543-91-72", fontSize: 9, color: WHITE, margin: [0, 8, 0, 3] },
				{ text: "Av. 02 Casa Nro 06 Urb. ", fontSize: 9, color: WHITE, margin: [0, 0, 0, 3] },
				{ text: "Caña de Azúcar, Aragua, ", fontSize: 9, color: WHITE, margin: [0, 0, 0, 3] },
				{ text: "Código postal: 2105", fontSize: 9, color: WHITE, margin: [0, 0, 0, 3] },
			],
			absolutePosition: { x: 20, y: pageSize.height - 110 },
		});

		return items;
	}

	// ─── PIE DE PÁGINA ──────────────────────────────────────────────
	function buildFooter() {
		return {
			columns: [
				{ text: "www.garbis.online", fontSize: 8, color: SUB_TEXT, alignment: "center" },
			],
			margin: [SIDEBAR_W + 40, 0, 40, 0],
		};
	}

	// ─── DEFINICIÓN DEL DOCUMENTO ───────────────────────────────────
	const docDefinition = {
		pageSize: "LETTER",
		pageMargins: [SIDEBAR_W + 40, 30, 40, 50],
		defaultStyle: { font: "Helvetica" },
		background: buildBackground,
		footer: buildFooter,
		content,
	};

	// ─── GENERAR PDF Y SUBIR ────────────────────────────────────────
	const pdfDoc = pdfmake.createPdf(docDefinition);
	const buffer = await pdfDoc.getBuffer();
	const result = await uploadBufferToLocal(buffer, "garbis/informes/pdfs", { extension: ".pdf" });
	return result;
};

module.exports = { generateInformePDF };
