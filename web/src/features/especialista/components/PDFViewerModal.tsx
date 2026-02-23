import { useEffect, useState } from "react";
import { getToken } from "../../../shared/utils/token";

type PDFViewerModalProps = {
	pdfUrl: string;
	onClose: () => void;
	fileName?: string;
};

const PDFViewerModal = ({ pdfUrl, onClose, fileName }: PDFViewerModalProps) => {
	const [blobUrl, setBlobUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Cargar el PDF como blob y mostrar en iframe con blob URL (evita X-Frame-Options en deploy: api vs app distinto origen)
	useEffect(() => {
		let objectUrl: string | null = null;
		const controller = new AbortController();

		async function load() {
			try {
				setError(null);
				const token = getToken();
				const headers: HeadersInit = {};
				if (token) headers["Authorization"] = `Bearer ${token}`;
				const response = await fetch(pdfUrl, { headers, signal: controller.signal });
				if (!response.ok) throw new Error("Error al cargar el PDF");
				const blob = await response.blob();
				objectUrl = window.URL.createObjectURL(blob);
				setBlobUrl(objectUrl);
			} catch (e) {
				if ((e as Error).name !== "AbortError") {
					setError("No se pudo cargar el PDF. Prueba descargarlo.");
				}
			} finally {
				setLoading(false);
			}
		}
		load();
		return () => {
			controller.abort();
			if (objectUrl) window.URL.revokeObjectURL(objectUrl);
			setBlobUrl(null);
		};
	}, [pdfUrl]);

	// Revocar blob URL al cerrar
	const handleClose = () => {
		if (blobUrl) window.URL.revokeObjectURL(blobUrl);
		setBlobUrl(null);
		onClose();
	};

	const handleDownload = async () => {
		try {
			const token = getToken();
			const headers: HeadersInit = {};
			if (token) headers["Authorization"] = `Bearer ${token}`;
			const response = await fetch(pdfUrl, { headers });
			if (!response.ok) throw new Error("Error al descargar el PDF");
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = fileName || `informe-${new Date().getTime()}.pdf`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (err) {
			console.error("Error al descargar PDF:", err);
			window.open(pdfUrl, "_blank");
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
			<div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-paper shadow-xl">
				<div className="flex-shrink-0 border-b border-mist bg-paper p-4">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold text-brand-900">Visualizar PDF</h2>
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
								onClick={handleClose}
								className="rounded-full p-2 text-brand-800 transition-colors hover:bg-cloud"
							>
								<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
					</div>
				</div>

				<div className="flex-1 overflow-hidden flex flex-col items-center justify-center bg-cloud/30">
					{loading && (
						<p className="text-sm text-brand-700">Cargando PDF...</p>
					)}
					{error && (
						<p className="text-sm text-red-600 px-4">{error}</p>
					)}
					{blobUrl && !loading && (
						<iframe
							src={blobUrl}
							className="h-full w-full flex-1"
							title="PDF Viewer"
						/>
					)}
				</div>
			</div>
		</div>
	);
};

export default PDFViewerModal;
