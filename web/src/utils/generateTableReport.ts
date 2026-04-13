import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportParams {
	title: string;               // e.g. "HISTORIAL DE COMPRAS"
	subtitle?: string;           // e.g. "No. 2347BG8F", "Date. February 14th 2021"
	reportInfo?: { label: string; value: string }[]; // Detalles en "Bill to."
	extraInfo?: { label: string; value: string }[];  // Detalles en "Payment Method."
	tableHeaders: string[];
	tableData: (string | number)[][];
	total?: string;              // Grand Total (bottom of table)
	filename?: string;
}

export const generateTableReport = async ({
	title,
	subtitle,
	reportInfo,
	extraInfo,
	tableHeaders,
	tableData,
	total,
	filename,
}: ReportParams) => {
	const doc = new jsPDF();
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();

	// Color corporativo: turquesa brillante (mint/teal)
	const primaryColor: [number, number, number] = [8, 85, 76]; // #08554c
	const textColor: [number, number, number] = [100, 116, 139]; // Slate 500
	const darkTextColor: [number, number, number] = [51, 65, 85]; // Slate 700

	// ==========================================
	// 4. TABLA DE RESULTADOS
	// ==========================================
	autoTable(doc, {
		startY: 105,
		theme: "plain",
		head: [tableHeaders],
		body: tableData,
		margin: { left: 15, right: 15, bottom: total ? 95 : 75, top: 105 },
		headStyles: {
			fillColor: primaryColor,
			textColor: [255, 255, 255],
			fontStyle: "bold",
			fontSize: 9,
			cellPadding: 3,
			halign: "center",
		},
		bodyStyles: {
			textColor: darkTextColor,
			fontSize: 8,
			cellPadding: 4,
			halign: "center", // centered body looks cleaner like the example
		},
		alternateRowStyles: {
			fillColor: [215, 239, 235], // Light green alternate rows like example
		},
		willDrawCell: (hookData) => {
			// Esquinas redondeadas artificiales - AutoTable no soporta radios directos, pero
			// podemos redondear toda la cabecera pintando un rectangulo por debajo de ella.
			// Debido a las limitaciones de jsPDF, mantendremos el fill estandar.
			if (hookData.row.section === 'head' && hookData.column.index === 0) {
				// Para futura personalizacion si se requiere
			}
		}
	});

	let finalY = (doc as any).lastAutoTable.finalY + 5;

	// Total bottom-right area (Under table)
	if (total) {
		doc.setDrawColor(...primaryColor);
		doc.setLineWidth(0.5);
		doc.line(pageWidth / 1.5, finalY, pageWidth - 15, finalY);

		finalY += 8;
		doc.setTextColor(...primaryColor);
		doc.setFont("helvetica", "bold");
		doc.setFontSize(10);
		doc.text("Grand Total", pageWidth / 1.5, finalY);

		doc.setTextColor(...primaryColor);
		doc.text(total, pageWidth - 15, finalY, { align: "right" });

		finalY += 5;
		doc.line(pageWidth / 1.5, finalY, pageWidth - 15, finalY);
	}

	// ==========================================
	// 5. HEADER Y FOOTER EN CADA PÁGINA
	// ==========================================
	const pageCount = (doc as any).internal.getNumberOfPages();
	for (let i = 1; i <= pageCount; i++) {
		doc.setPage(i);
		
		// ─ TOP HEADER ─
		doc.setFillColor(...primaryColor);
		doc.rect(0, 20, 140, 50, "F");

		doc.setTextColor(255, 255, 255);
		doc.setFont("helvetica", "bold");
		doc.setFontSize(14);
		doc.text("ULTRASONIDO INTEGRAL GARBIS", 15, 35);
		doc.setTextColor(255, 255, 255);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(12);
		doc.text("Centro Médico Especializado", 15, 40);
		doc.setTextColor(255, 255, 255);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(10);
		doc.text("Rif: V-15890040-0", 15, 45);

		doc.setFont("helvetica", "normal");
		doc.setFontSize(10);
		doc.text(subtitle || `Fecha: ${new Date().toLocaleDateString("es-VE")}`, 15, 54);

		doc.setDrawColor(255, 255, 255);
		doc.setLineWidth(0.5);
		doc.line(15, 58, 40, 58);

		doc.addImage("/logo.png", "PNG", pageWidth - 60, 35, 45, 15);

		let detailsY = 80;

		if (reportInfo && reportInfo.length > 0) {
			doc.setTextColor(...primaryColor);
			doc.setFont("helvetica", "bold");
			doc.setFontSize(10);
			doc.text(title.toUpperCase(), 15, detailsY);
			doc.setFont("helvetica", "normal");
			doc.setFontSize(8);

			let currentY = detailsY + 6;
			reportInfo.forEach(info => {
				doc.setTextColor(...textColor);
				doc.text(info.label, 15, currentY);
				doc.text(`:   ${info.value}`, 34, currentY);
				currentY += 6;
			});
		}

		if (extraInfo && extraInfo.length > 0) {
			doc.setTextColor(...primaryColor);
			doc.setFont("helvetica", "bold");
			doc.setFontSize(10);
			doc.text("Información Adicional.", pageWidth - 15, detailsY, { align: "right" });

			doc.setFont("helvetica", "normal");
			doc.setFontSize(8);

			let currentY = detailsY + 8;
			extraInfo.forEach(info => {
				doc.setTextColor(...textColor);
				doc.text(info.value, pageWidth - 15, currentY, { align: "right" });
				currentY += 6;
			});
		}
		
		// ─ BOTTOM FOOTER ─
		let footerY = pageHeight - 50;

		doc.setTextColor(...textColor);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(8);
		doc.text("Atentamente,", 15, footerY - 15);
		doc.text("Administración de Sistema Garbis", 15, footerY - 10);

		// Columna Contacto
		doc.setTextColor(...primaryColor);
		doc.setFont("helvetica", "bold");
		doc.setFontSize(10);
		doc.text("Contacto.", 15, footerY + 5);

		doc.setFont("helvetica", "normal");
		doc.setFontSize(8);
		doc.setTextColor(...textColor);
		doc.text("Teléfono", 15, footerY + 12);
		doc.text(`: 04165439172    `, 26, footerY + 12);
		doc.text("Dirección", 15, footerY + 18);
		doc.text(`:  Av. 02 Casa Nro 06 Urb. Caña de Azúcar, Aragua, 2105`, 26, footerY + 18);

		// Columna Términos
		doc.setTextColor(...primaryColor);
		doc.setFont("helvetica", "bold");
		doc.setFontSize(10);
		doc.text("Términos o Condiciones.", pageWidth / 2, footerY + 5);

		doc.setTextColor(...textColor);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(8);
		const terminosStr = "Este archivo emite comprobantes oficiales del sistema Garbis.\nNo posee valor para auditoría fiscal externa por sí solo.";
		doc.text(terminosStr, pageWidth / 2, footerY + 12);

		// Línea verde gruesa al puro fondo a la derecha como decoración
		doc.setFillColor(...primaryColor);
		doc.rect(pageWidth - 70, pageHeight - 15, 70, 15, "F");
	}

	doc.save(filename || `Garbis_Report_${Date.now()}.pdf`);
};
