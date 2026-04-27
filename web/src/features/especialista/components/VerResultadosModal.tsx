import { useState, useEffect } from "react";
import {
	X,
	ExternalLink,
	FileText,
	Image as ImageIcon,
	Download,
	Trash2,
	Stethoscope,
	Monitor,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import Swal from "sweetalert2";
import {
	useDeleteArchivoFromResultadoMutation,
	useDeleteDicomStudyMutation,
} from "../../resultados/resultadosApi";

const OHIF_BASE_URL =
	(import.meta as unknown as { env: Record<string, string> }).env
		?.VITE_OHIF_BASE_URL ?? "http://localhost:3000";

const API_URL = (
	(import.meta as unknown as { env: Record<string, string> }).env
		?.VITE_API_URL ?? "http://localhost:3001"
).replace(/\/$/, "");

type VerResultadosModalProps = {
	archivos: string[];
	studyUid?: string | null;
	pacienteNombre: string;
	ecoNombre: string;
	idCita?: string;
	permiteEliminar?: boolean;
	onClose: () => void;
	onArchivoDeleted?: () => void;
};

const VerResultadosModal = ({
	archivos: archivosIniciales,
	studyUid: studyUidInicial,
	pacienteNombre,
	ecoNombre,
	idCita,
	permiteEliminar = true,
	onClose,
	onArchivoDeleted,
}: VerResultadosModalProps) => {
	const [archivos, setArchivos] = useState<string[]>(archivosIniciales);
	const [studyUid, setStudyUid] = useState<string | null | undefined>(
		studyUidInicial,
	);
	const [showOhifViewer, setShowOhifViewer] = useState(false);
	const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);

	const [deleteArchivo, { isLoading: isDeletingFile }] =
		useDeleteArchivoFromResultadoMutation();
	const [deleteDicomStudy, { isLoading: isDeletingStudy }] =
		useDeleteDicomStudyMutation();

	const isDeleting = isDeletingFile || isDeletingStudy;

	useEffect(() => {
		setArchivos(archivosIniciales);
	}, [archivosIniciales]);

	useEffect(() => {
		setStudyUid(studyUidInicial);
	}, [studyUidInicial]);

	// initialHangingProtocolId=@ohif/mnGrid fuerza una grilla simple
	// que renderiza cualquier modalidad (CT, US, MR, etc.) sin reglas estrictas
	const ohifViewerUrl = studyUid
		? `${OHIF_BASE_URL}/viewer?StudyInstanceUIDs=${studyUid}&initialHangingProtocolId=%40ohif%2FmnGrid`
		: null;

	// ────────────────────────────────────────────────
	// Helpers de tipo de archivo
	// ────────────────────────────────────────────────
	const getFileType = (
		url: string,
	): "image" | "pdf" | "video" | "unknown" => {
		const lowerUrl = url.toLowerCase();
		if (/\.(pdf)(\?|$)/.test(lowerUrl) || lowerUrl.includes("/raw/"))
			return "pdf";
		if (
			/\.(jpg|jpeg|png|webp|bmp|tiff?)(\?|$)/.test(lowerUrl)
		)
			return "image";
		if (/\.(mp4|avi|mov|mkv)(\?|$)/.test(lowerUrl)) return "video";
		return "unknown";
	};

	const imageFiles = archivos.filter((url) => getFileType(url) === "image");

	const normalizeUrl = (url: string): string => {
		let v = url.trim();
		if (!v.match(/^https?:\/\//i)) v = `https://${v}`;
		new URL(v);
		return v;
	};

	// ────────────────────────────────────────────────
	// Acciones archivos locales
	// ────────────────────────────────────────────────
	const handleOpenFile = (url: string) => {
		try {
			const validUrl = normalizeUrl(url);
			const type = getFileType(validUrl);
			if (type === "pdf") {
				window.open(
					`https://docs.google.com/viewer?url=${encodeURIComponent(validUrl)}&embedded=true`,
					"_blank",
					"noopener,noreferrer",
				);
			} else {
				window.open(validUrl, "_blank", "noopener,noreferrer");
			}
		} catch {
			alert(`URL inválida: ${url}`);
		}
	};

	const handleDownloadFile = async (url: string, index: number) => {
		try {
			const validUrl = normalizeUrl(url);
			Swal.fire({
				title: "Descargando...",
				allowOutsideClick: false,
				didOpen: () => Swal.showLoading(),
			});

			const response = await fetch(validUrl);
			if (!response.ok) throw new Error(response.statusText);

			const arrayBuffer = await response.arrayBuffer();
			const contentType = response.headers.get("content-type") || "";
			const type = getFileType(validUrl);

			let mimeType = contentType || "application/octet-stream";
			let extension = "";
			if (type === "pdf") { mimeType = "application/pdf"; extension = ".pdf"; }
			else if (type === "image") {
				if (contentType.includes("png")) { mimeType = "image/png"; extension = ".png"; }
				else if (contentType.includes("webp")) { mimeType = "image/webp"; extension = ".webp"; }
				else { mimeType = "image/jpeg"; extension = ".jpg"; }
			}

			const sanitize = (s: string) =>
				s.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\-]/g, "").slice(0, 50);

			const fileName = `resultado_${sanitize(pacienteNombre)}_${sanitize(ecoNombre)}_${index + 1}${extension}`;
			const file = new File([arrayBuffer], fileName, { type: mimeType });
			const fileUrl = URL.createObjectURL(file);
			const link = document.createElement("a");
			link.href = fileUrl;
			link.download = fileName;
			link.style.display = "none";
			document.body.appendChild(link);
			setTimeout(() => {
				link.click();
				document.body.removeChild(link);
				setTimeout(() => { URL.revokeObjectURL(fileUrl); Swal.close(); }, 100);
			}, 10);
		} catch (error) {
			Swal.fire({ icon: "error", title: "Error", text: "No se pudo descargar el archivo." });
		}
	};

	const handleQuitarArchivo = async (url: string) => {
		if (!idCita) return;
		const confirmed = await Swal.fire({
			title: "¿Quitar este archivo?",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Sí, quitar",
			cancelButtonText: "Cancelar",
			confirmButtonColor: "#dc2626",
			cancelButtonColor: "#6b7280",
		});
		if (!confirmed.isConfirmed) return;
		try {
			await deleteArchivo({ id_cita: idCita, archivo_url: url }).unwrap();
			const nuevos = archivos.filter((u) => u !== url && u.trim() !== url.trim());
			setArchivos(nuevos);
			onArchivoDeleted?.();
			await Swal.fire({ icon: "success", title: "Archivo quitado", timer: 1500, showConfirmButton: false });
			if (nuevos.length === 0 && !studyUid) setTimeout(onClose, 500);
		} catch (err: unknown) {
			const msg =
				err && typeof err === "object" && "data" in err
					? (err as { data?: { message?: string } }).data?.message
					: undefined;
			Swal.fire({ icon: "error", title: "Error", text: msg || "No se pudo quitar el archivo." });
		}
	};

	// ────────────────────────────────────────────────
	// Acciones estudio DICOM
	// ────────────────────────────────────────────────
	const handleQuitarStudy = async () => {
		if (!idCita || !studyUid) return;
		const confirmed = await Swal.fire({
			title: "¿Eliminar estudio DICOM?",
			text: "Se eliminará el estudio del visor OHIF y de Orthanc. Esta acción no se puede deshacer.",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Sí, eliminar",
			cancelButtonText: "Cancelar",
			confirmButtonColor: "#dc2626",
			cancelButtonColor: "#6b7280",
		});
		if (!confirmed.isConfirmed) return;

		Swal.fire({ title: "Eliminando...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
		try {
			await deleteDicomStudy({ uid: studyUid, id_cita: idCita }).unwrap();
			setStudyUid(null);
			setShowOhifViewer(false);
			onArchivoDeleted?.();
			await Swal.fire({ icon: "success", title: "Estudio eliminado", timer: 1500, showConfirmButton: false });
			if (archivos.length === 0) setTimeout(onClose, 500);
		} catch {
			Swal.fire({ icon: "error", title: "Error", text: "No se pudo eliminar el estudio." });
		}
	};

	const handleEliminarTodos = async () => {
		if (!idCita) return;
		const tieneStudy = !!studyUid;
		const totalArchivos = archivos.length;
		const total = (tieneStudy ? 1 : 0) + totalArchivos;
		if (total === 0) return;

		const confirmed = await Swal.fire({
			title: "¿Eliminar todos los resultados?",
			html:
				total === 1
					? "Se eliminará el resultado seleccionado. Esta acción no se puede deshacer."
					: `Se eliminarán los <strong>${total}</strong> resultados (estudio DICOM y archivos). Esta acción no se puede deshacer.`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Sí, eliminar todos",
			cancelButtonText: "Cancelar",
			confirmButtonColor: "#dc2626",
			cancelButtonColor: "#6b7280",
		});
		if (!confirmed.isConfirmed) return;

		Swal.fire({
			title: "Eliminando...",
			html: total > 1 ? `0 / ${total}` : "",
			allowOutsideClick: false,
			didOpen: () => Swal.showLoading(),
		});

		let done = 0;
		const updateProgress = () => {
			done += 1;
			if (total > 1) {
				Swal.update({ html: `${done} / ${total}` });
			}
		};

		try {
			if (tieneStudy && studyUid) {
				await deleteDicomStudy({ uid: studyUid, id_cita: idCita }).unwrap();
				setStudyUid(null);
				setShowOhifViewer(false);
				updateProgress();
			}

			const BATCH = 10;
			for (let i = 0; i < archivos.length; i += BATCH) {
				const batch = archivos.slice(i, i + BATCH);
				await Promise.all(
					batch.map((url) =>
						deleteArchivo({ id_cita: idCita, archivo_url: url }).unwrap(),
					),
				);
				done += batch.length;
				if (total > 1) Swal.update({ html: `${done} / ${total}` });
			}
			setArchivos([]);

			onArchivoDeleted?.();
			await Swal.fire({
				icon: "success",
				title: "Todos eliminados",
				text: `Se eliminaron ${total} resultado${total !== 1 ? "s" : ""}.`,
				timer: 1500,
				showConfirmButton: false,
			});
			setTimeout(onClose, 300);
		} catch {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: "No se pudieron eliminar todos los resultados.",
			});
		}
	};

	const handleDownloadDicom = async () => {
		if (!studyUid) return;
		try {
			Swal.fire({ title: "Preparando descarga...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
			const token = localStorage.getItem("garvis_token");
			const response = await fetch(`${API_URL}/orthanc/study/${studyUid}/download`, {
				headers: token ? { Authorization: `Bearer ${token}` } : {},
			});
			if (!response.ok) throw new Error("Error al descargar");
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `estudio-dicom-${studyUid.slice(-8)}.zip`;
			link.style.display = "none";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			setTimeout(() => { URL.revokeObjectURL(url); Swal.close(); }, 100);
		} catch {
			Swal.fire({ icon: "error", title: "Error", text: "No se pudo descargar el estudio DICOM." });
		}
	};

	const totalItems = archivos.length + (studyUid ? 1 : 0);

	return (
		<>
			<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3 sm:p-4">
				<div className="relative flex flex-col w-full max-w-xl max-h-[90vh] rounded-2xl bg-paper shadow-xl overflow-hidden">
					{/* Header */}
					<div className="flex items-center justify-between border-b border-mist px-5 py-4 shrink-0">
						<div className="min-w-0">
							<h2 className="text-base font-semibold text-brand-900 leading-tight">
								Resultados disponibles
							</h2>
							<p className="text-sm text-brand-600 mt-0.5 truncate">
								{pacienteNombre} — {ecoNombre}
							</p>
						</div>
						<button
							onClick={onClose}
							className="ml-3 shrink-0 rounded-lg p-1.5 text-brand-600 hover:bg-cloud transition-colors"
						>
							<X className="h-5 w-5" />
						</button>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-y-auto px-5 py-4">
						<p className="text-sm text-brand-600 mb-3">
							Se encontraron{" "}
							<span className="font-semibold text-brand-900">{totalItems}</span>{" "}
							resultado{totalItems !== 1 ? "s" : ""}.
						</p>

						<div className="space-y-2">
							{/* ── Card estudio DICOM ─────────────────────────────────── */}
							{studyUid && (
								<div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-4">
									{/* Fila superior: icono + título */}
									<div className="flex items-center gap-3 min-w-0 mb-3">
										<div className="shrink-0 rounded-lg bg-purple-100 p-2">
											<Stethoscope className="h-5 w-5 text-purple-600" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-base font-semibold text-purple-900 leading-tight">
												Estudio DICOM — Visor OHIF
											</p>
											<p className="text-[11px] text-purple-500 font-mono truncate mt-0.5">
												{studyUid}
											</p>
										</div>
									</div>
									{/* Fila inferior: botones */}
									<div className="flex flex-wrap gap-2">
										<button
											type="button"
											onClick={() => setShowOhifViewer(true)}
											className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-base font-semibold text-white hover:bg-purple-700 transition-colors"
										>
											<Monitor className="h-4 w-4" />
											Abrir visor
										</button>
										<button
											type="button"
											onClick={handleDownloadDicom}
											className="flex items-center gap-1.5 rounded-lg border border-purple-300 bg-white px-4 py-2 text-base font-medium text-purple-600 hover:bg-purple-50 transition-colors"
										>
											<Download className="h-4 w-4" />
											Descargar
										</button>
										{ohifViewerUrl && (
											<a
												href={ohifViewerUrl}
												target="_blank"
												rel="noopener noreferrer"
												title="Abrir en nueva pestaña"
												className="flex items-center gap-1.5 rounded-lg border border-purple-300 bg-white px-3 py-2 text-base font-medium text-purple-600 hover:bg-purple-50 transition-colors"
											>
												<ExternalLink className="h-4 w-4" />
											</a>
										)}
										{idCita && permiteEliminar && (
											<button
												type="button"
												onClick={handleQuitarStudy}
												disabled={isDeleting}
												className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
											>
												<Trash2 className="h-4 w-4" />
												Quitar
											</button>
										)}
									</div>
								</div>
							)}

							{/* ── Cards archivos locales ─────────────────────────────── */}
							{archivos.map((url, index) => {
								const fileType = getFileType(url);
								const fileName = (() => {
									try {
										const decoded = decodeURIComponent(url.split("/").pop() || "");
										const withoutHash = decoded.replace(/^[a-f0-9]+-\d+-/, "");
										return withoutHash || `Archivo ${index + 1}`;
									} catch {
										return `Archivo ${index + 1}`;
									}
								})();
								return (
									<div
										key={index}
										className="rounded-xl border border-mist bg-cloud p-4 hover:bg-brand-50 transition-colors"
									>
										{/* Fila superior: icono + nombre */}
										<div className="flex items-center gap-3 min-w-0 mb-3">
											<div className="shrink-0">
												{fileType === "pdf" ? (
													<FileText className="h-5 w-5 text-red-500" />
												) : fileType === "image" ? (
													<ImageIcon className="h-5 w-5 text-blue-500" />
												) : (
													<ExternalLink className="h-5 w-5 text-brand-500" />
												)}
											</div>
											<p
												className="flex-1 text-base font-medium text-brand-900 truncate"
												title={fileName}
											>
												{fileName}
											</p>
										</div>
										{/* Fila inferior: botones */}
										<div className="flex flex-wrap gap-2">
											<button
												type="button"
												onClick={() => {
													if (fileType === "image") {
														const idx = imageFiles.indexOf(url);
														if (idx !== -1) {
															setPreviewImageIndex(idx);
														} else {
															handleOpenFile(url);
														}
													} else {
														handleOpenFile(url);
													}
												}}
												className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-base font-medium text-paper hover:bg-brand-800 transition-colors"
											>
												<ExternalLink className="h-4 w-4" />
												{fileType === "image" ? "Vista Previa" : "Abrir"}
											</button>
											<button
												type="button"
												onClick={() => handleDownloadFile(url, index)}
												className="flex items-center gap-1.5 rounded-lg border border-brand-300 bg-white px-4 py-2 text-base font-medium text-brand-700 hover:bg-brand-50 transition-colors"
											>
												<Download className="h-4 w-4" />
												Descargar
											</button>
											{idCita && permiteEliminar && (
												<button
													type="button"
													onClick={() => handleQuitarArchivo(url)}
													disabled={isDeleting}
													className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
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
					<div className="shrink-0 border-t border-mist px-5 py-3 flex justify-between items-center gap-2">
						<div>
							{idCita && permiteEliminar && totalItems > 0 && (
								<button
									type="button"
									onClick={handleEliminarTodos}
									disabled={isDeleting}
									className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 py-2 text-base font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
								>
									<Trash2 className="h-4 w-4" />
									Eliminar todos
								</button>
							)}
						</div>
						<button
							onClick={onClose}
							className="rounded-lg border border-mist bg-paper px-4 py-2 text-base font-medium text-brand-700 hover:bg-cloud transition-colors"
						>
							Cerrar
						</button>
					</div>
				</div>
			</div>

			{/* ── Overlay visor OHIF ─────────────────────────────────────── */}
			{showOhifViewer && ohifViewerUrl && (
				<div className="fixed inset-0 z-[80] flex flex-col bg-black">
					<div className="flex items-center justify-between bg-gray-900 px-4 py-3 shrink-0">
						<div className="flex items-center gap-2 text-white min-w-0">
							<Stethoscope className="h-4 w-4 text-purple-400 shrink-0" />
							<span className="text-base font-semibold truncate">
								{ecoNombre}
							</span>
							<span className="text-sm text-gray-400 font-mono ml-1 hidden sm:block truncate max-w-xs">
								{studyUid}
							</span>
						</div>
						<div className="flex items-center gap-1 shrink-0 ml-2">
							<a
								href={ohifViewerUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
							>
								<ExternalLink className="h-4 w-4" />
								<span className="hidden sm:inline">Nueva pestaña</span>
							</a>
							<button
								onClick={() => setShowOhifViewer(false)}
								className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
					</div>
					<iframe
						src={ohifViewerUrl}
						title="OHIF DICOM Viewer"
						className="flex-1 w-full border-0"
						allow="fullscreen *"
					/>
				</div>
			)}

			{/* ── Overlay Carrusel de Imágenes ─────────────────────────────────────── */}
			{previewImageIndex !== null && imageFiles.length > 0 && (
				<div className="fixed inset-0 z-[90] flex flex-col bg-black/50 backdrop-blur-md transition-opacity">
					<div className="flex items-center justify-between p-4 shrink-0">
						<div className="text-white min-w-0">
							<p className="text-sm font-medium opacity-70">
								Imagen {previewImageIndex + 1} de {imageFiles.length}
							</p>
						</div>
						<div className="flex items-center gap-3">
							<button
								onClick={() => handleDownloadFile(imageFiles[previewImageIndex], previewImageIndex)}
								className="rounded-full p-2 bg-white/10 text-white hover:bg-white/20 transition-colors"
								title="Descargar imagen"
							>
								<Download className="h-5 w-5" />
							</button>
							<button
								onClick={() => setPreviewImageIndex(null)}
								className="rounded-full p-2 bg-white/10 text-white hover:bg-white/20 transition-colors"
								title="Cerrar vista previa"
							>
								<X className="h-6 w-6" />
							</button>
						</div>
					</div>

					<div className="flex-1 overflow-hidden relative flex items-center justify-center p-4">
						<img
							src={normalizeUrl(imageFiles[previewImageIndex])}
							alt={`Vista previa ${previewImageIndex + 1}`}
							className="max-w-full max-h-full object-contain"
						/>
						
						{imageFiles.length > 1 && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									setPreviewImageIndex(prev => prev! > 0 ? prev! - 1 : imageFiles.length - 1);
								}}
								className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all backdrop-blur-sm"
								aria-label="Imagen anterior"
							>
								<ChevronLeft className="h-8 w-8" />
							</button>
						)}

						{imageFiles.length > 1 && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									setPreviewImageIndex(prev => prev! < imageFiles.length - 1 ? prev! + 1 : 0);
								}}
								className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all backdrop-blur-sm"
								aria-label="Siguiente imagen"
							>
								<ChevronRight className="h-8 w-8" />
							</button>
						)}
					</div>
				</div>
			)}
		</>
	);
};

export default VerResultadosModal;
