import { useState, useEffect } from "react";
import { X, ExternalLink, FileText, Image as ImageIcon, Download, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { useDeleteArchivoFromResultadoMutation } from "../../resultados/resultadosApi";

type VerResultadosModalProps = {
	archivos: string[];
	pacienteNombre: string;
	ecoNombre: string;
	idCita?: string;
	/** Si false, no se muestra el botón Quitar (solo lectura para paciente). Por defecto true. */
	permiteEliminar?: boolean;
	onClose: () => void;
	onArchivoDeleted?: () => void;
};

const VerResultadosModal = ({
	archivos: archivosIniciales,
	pacienteNombre,
	ecoNombre,
	idCita,
	permiteEliminar = true,
	onClose,
	onArchivoDeleted,
}: VerResultadosModalProps) => {
	const [archivos, setArchivos] = useState<string[]>(archivosIniciales);
	const [deleteArchivo, { isLoading: isDeleting }] = useDeleteArchivoFromResultadoMutation();

	useEffect(() => {
		setArchivos(archivosIniciales);
	}, [archivosIniciales]);

	const getFileType = (url: string): "image" | "pdf" | "unknown" => {
		const lowerUrl = url.toLowerCase();
		if (lowerUrl.includes("/raw/") || lowerUrl.includes(".pdf") || lowerUrl.includes("pdf")) {
			return "pdf";
		}
		if (
			lowerUrl.includes("/image/") ||
			lowerUrl.includes(".jpg") ||
			lowerUrl.includes(".jpeg") ||
			lowerUrl.includes(".png") ||
			lowerUrl.includes(".webp") ||
			lowerUrl.includes("image")
		) {
			return "image";
		}
		return "unknown";
	};

	const normalizeUrl = (url: string): string => {
		let validUrl = url.trim();

		// Si la URL no comienza con http:// o https://, agregar https://
		if (!validUrl.match(/^https?:\/\//i)) {
			validUrl = `https://${validUrl}`;
		}

		// Validar que sea una URL válida
		new URL(validUrl);
		return validUrl;
	};

	const handleOpenFile = (url: string) => {
		try {
			const validUrl = normalizeUrl(url);
			const fileType = getFileType(validUrl);

			// Para PDFs, usar Google Docs Viewer para visualizar en el navegador
			if (fileType === "pdf") {
				// Codificar la URL para Google Docs Viewer
				const encodedUrl = encodeURIComponent(validUrl);
				const viewerUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;

				// Abrir en nueva pestaña
				window.open(viewerUrl, "_blank", "noopener,noreferrer");
			} else {
				// Para imágenes y otros archivos, abrir directamente
				window.open(validUrl, "_blank", "noopener,noreferrer");
			}
		} catch (error) {
			console.error("URL inválida:", error);
			alert(`No se pudo abrir el archivo. URL inválida: ${url}`);
		}
	};

	const handleDownloadFile = async (url: string, index: number) => {
		try {
			const validUrl = normalizeUrl(url);
			const fileType = getFileType(validUrl);

			// Mostrar indicador de carga
			Swal.fire({
				title: "Descargando...",
				text: "Por favor espera",
				allowOutsideClick: false,
				didOpen: () => {
					Swal.showLoading();
				},
			});

			// Hacer fetch del archivo
			const response = await fetch(validUrl);
			if (!response.ok) {
				throw new Error(`Error al descargar el archivo: ${response.statusText}`);
			}

			// Obtener el arrayBuffer primero
			const arrayBuffer = await response.arrayBuffer();
			const contentType = response.headers.get("content-type") || "";

			// Determinar el tipo MIME y extensión
			let mimeType: string;
			let extension: string;

			if (fileType === "pdf") {
				mimeType = "application/pdf";
				extension = ".pdf";
			} else if (fileType === "image") {
				if (contentType.includes("png")) {
					mimeType = "image/png";
					extension = ".png";
				} else if (contentType.includes("jpeg") || contentType.includes("jpg")) {
					mimeType = "image/jpeg";
					extension = ".jpg";
				} else if (contentType.includes("webp")) {
					mimeType = "image/webp";
					extension = ".webp";
				} else {
					mimeType = "image/jpeg";
					extension = ".jpg";
				}
			} else {
				mimeType = contentType || "application/octet-stream";
				extension = "";
			}

			// Crear el nombre del archivo (sanitizar caracteres especiales)
			const sanitizeFileName = (name: string) => {
				return name
					.replace(/\s+/g, "_")
					.replace(/[^a-zA-Z0-9_\-]/g, "") // Remover caracteres especiales excepto guiones y guiones bajos
					.substring(0, 50); // Limitar longitud
			};

			const fileName = `resultado_${sanitizeFileName(pacienteNombre)}_${sanitizeFileName(ecoNombre)}_${index + 1}${extension}`;

			// Crear el File con el tipo MIME correcto (File tiene mejor soporte para download)
			const file = new File([arrayBuffer], fileName, { type: mimeType });

			// Crear un objeto URL del file
			const fileUrl = URL.createObjectURL(file);

			// Crear un enlace temporal para descargar
			const link = document.createElement("a");
			link.href = fileUrl;
			link.download = fileName;
			link.style.display = "none";

			// Agregar al DOM
			document.body.appendChild(link);

			// Usar un pequeño delay para asegurar que el DOM esté listo
			setTimeout(() => {
				link.click();
				document.body.removeChild(link);
				// Revocar el objeto URL después de un breve delay
				setTimeout(() => {
					URL.revokeObjectURL(fileUrl);
					Swal.close();
				}, 100);
			}, 10);
		} catch (error) {
			console.error("Error al descargar archivo:", error);
			Swal.fire({
				icon: "error",
				title: "Error",
				text: "No se pudo descargar el archivo. Intenta abrirlo directamente.",
			});
		}
	};

	const handleQuitarArchivo = async (url: string) => {
		if (!idCita) return;
		const confirmResult = await Swal.fire({
			title: "¿Quitar este archivo?",
			text: "Se eliminará del resultado de la cita. Esta acción no se puede deshacer.",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Sí, quitar",
			cancelButtonText: "Cancelar",
			confirmButtonColor: "#dc2626",
			cancelButtonColor: "#6b7280",
		});
		if (!confirmResult.isConfirmed) return;
		try {
			await deleteArchivo({ id_cita: idCita, archivo_url: url }).unwrap();
			const nuevosArchivos = archivos.filter(
				(u) => u !== url && u.trim() !== url.trim()
			);
			setArchivos(nuevosArchivos);
			await Swal.fire({
				icon: "success",
				title: "Archivo quitado",
				text: "El archivo ha sido eliminado del resultado.",
				timer: 2000,
				showConfirmButton: false,
			});
			onArchivoDeleted?.();
			if (nuevosArchivos.length === 0) setTimeout(() => onClose(), 500);
		} catch (err: unknown) {
			const msg =
				err &&
				typeof err === "object" &&
				"data" in err &&
				typeof (err as { data?: { message?: string } }).data?.message === "string"
					? (err as { data: { message: string } }).data.message
					: "No se pudo quitar el archivo.";
			Swal.fire({ icon: "error", title: "Error", text: msg });
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
			<div className="relative w-full max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-paper shadow-lg">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-mist bg-paper p-4">
					<div>
						<h2 className="text-lg font-semibold text-brand-900">
							Resultados disponibles
						</h2>
						<p className="text-xs text-brand-800 mt-1">
							{pacienteNombre} - {ecoNombre}
						</p>
					</div>
					<button
						onClick={onClose}
						className="rounded-lg p-1 text-brand-800 hover:bg-cloud"
						aria-label="Cerrar"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Content */}
				<div className="p-6">
					<p className="text-sm text-brand-800 mb-4">
						Se encontraron {archivos.length} archivo{archivos.length > 1 ? "s" : ""}. Haz clic en cada uno para abrirlo.
					</p>
					<div className="space-y-2">
						{archivos.map((url, index) => {
							const fileType = getFileType(url);
							return (
								<div
									key={index}
									className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-lg border border-mist bg-cloud p-4 hover:bg-brand-50 transition-colors"
								>
									<div className="flex items-center gap-3 flex-1 min-w-0">
										{fileType === "pdf" ? (
											<FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
										) : fileType === "image" ? (
											<ImageIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
										) : (
											<ExternalLink className="h-5 w-5 text-brand-600 flex-shrink-0" />
										)}
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-brand-900">
												Archivo {index + 1}
											</p>
											<p className="text-xs text-brand-600 truncate">
												{url.length > 60 ? `${url.substring(0, 60)}...` : url}
											</p>
										</div>
									</div>
									<div className="sm:ml-4 flex flex-wrap justify-end gap-2 flex-shrink-0">
										<button
											type="button"
											onClick={() => handleOpenFile(url)}
											className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper hover:bg-brand-800 transition-colors flex items-center gap-2"
											title="Abrir en nueva pestaña"
										>
											<ExternalLink className="h-4 w-4" />
											Abrir
										</button>
										<button
											type="button"
											onClick={() => handleDownloadFile(url, index)}
											className="rounded-lg border border-brand-700 bg-paper px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 transition-colors flex items-center gap-2"
											title="Descargar archivo"
										>
											<Download className="h-4 w-4" />
											Descargar
										</button>
										{idCita && permiteEliminar && (
											<button
												type="button"
												onClick={() => handleQuitarArchivo(url)}
												disabled={isDeleting}
												className="rounded-lg border border-red-500 bg-paper px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
												title="Quitar este archivo del resultado"
											>
												<Trash2 className="h-4 w-4" />
												Quitar
											</button>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Footer */}
				<div className="border-t border-mist bg-paper p-4 flex justify-end">
					<button
						onClick={onClose}
						className="rounded-lg border border-mist bg-paper px-4 py-2 text-sm font-medium text-brand-800 hover:bg-cloud transition-colors"
					>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	);
};

export default VerResultadosModal;
