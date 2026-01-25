import { getToken } from "../../../shared/utils/token";

type PDFViewerModalProps = {
	pdfUrl: string;
	onClose: () => void;
	fileName?: string;
};

const PDFViewerModal = ({ pdfUrl, onClose, fileName }: PDFViewerModalProps) => {
	// Obtener la URL base de la API
	const apiBaseUrl =
		import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
		"http://localhost:3001";

	// Obtener el token
	const token = getToken();

	// Usar proxy del backend para evitar problemas de CORS/autenticación
	// Para el iframe, necesitamos pasar el token como query param
	const proxyUrl = `${apiBaseUrl}/informes/pdf-proxy?cloudinaryUrl=${encodeURIComponent(
		pdfUrl
	)}${token ? `&token=${encodeURIComponent(token)}` : ""}`;

	// Función para descargar el PDF con el nombre correcto
	const handleDownload = async () => {
		try {
			// Usar el proxy para descargar (el token ya está en la URL)
			const response = await fetch(proxyUrl);

			if (!response.ok) {
				throw new Error("Error al descargar el PDF");
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = fileName || `informe-${new Date().getTime()}.pdf`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (error) {
			console.error("Error al descargar PDF:", error);
			// Fallback: intentar descargar directamente
			window.open(pdfUrl, "_blank");
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
			<div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-paper shadow-xl">
				{/* Header */}
				<div className="flex-shrink-0 border-b border-mist bg-paper p-4">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold text-brand-900">
							Visualizar PDF
						</h2>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={handleDownload}
								className="rounded-full border border-brand-700 bg-brand-700 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-brand-800"
							>
								Descargar
							</button>
							<button
								type="button"
								onClick={onClose}
								className="rounded-full p-2 text-brand-800 transition-colors hover:bg-cloud"
							>
								<svg
									className="h-5 w-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>
					</div>
				</div>

				{/* PDF Viewer */}
				<div className="flex-1 overflow-hidden">
					<iframe
						src={proxyUrl}
						className="h-full w-full"
						title="PDF Viewer"
					/>
				</div>
			</div>
		</div>
	);
};

export default PDFViewerModal;
