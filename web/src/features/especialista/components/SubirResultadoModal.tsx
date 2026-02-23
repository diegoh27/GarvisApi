import { useState, useRef, useEffect } from "react";
import {
	X,
	Upload,
	Trash2,
	Image as ImageIcon,
	FileText,
	Stethoscope,
	Video,
	FolderArchive,
} from "lucide-react";
import Swal from "sweetalert2";
import {
	useUploadResultadoMutation,
	useUploadDicomToOrthancMutation,
} from "../../resultados/resultadosApi";

type SubirResultadoModalProps = {
	cita: {
		id_cita: string;
		paciente_nombre: string;
		paciente_apellido: string;
		eco_nombre: string;
		fecha_cita: string;
	};
	onClose: () => void;
	/**
	 * Callback legacy para archivos no-DICOM.
	 * Si no se provee, el modal usa uploadResultado internamente.
	 */
	onUpload?: (id_cita: string, archivos: File[]) => Promise<void>;
	/** Llamado al terminar cualquier upload exitoso */
	onSuccess?: () => void;
	isUploading?: boolean;
};

// ─────────────────────────────────────────────
// Helpers de tipo de archivo
// ─────────────────────────────────────────────
const ALLOWED_EXTENSIONS = new Set([
	".jpg", ".jpeg", ".png", ".webp", ".tiff", ".tif", ".bmp",
	".pdf",
	".dcm", ".dicom",
	".mp4", ".avi", ".mov", ".mkv",
	".zip", ".rar",
]);

const getFileExt = (name: string) => {
	const m = name.match(/\.[^.]+$/);
	return m ? m[0].toLowerCase() : "";
};

const isDicomFile = (file: File) =>
	file.type === "application/dicom" || /\.(dcm|dicom)$/i.test(file.name);

const isZipFile = (file: File) =>
	file.type === "application/zip" ||
	file.type === "application/x-zip-compressed" ||
	/\.zip$/i.test(file.name);

const isVideoFile = (file: File) =>
	file.type.startsWith("video/") || /\.(mp4|avi|mov|mkv)$/i.test(file.name);

const isRarFile = (file: File) =>
	/\.rar$/i.test(file.name) ||
	file.type === "application/x-rar-compressed" ||
	file.type === "application/rar";

/**
 * Los archivos DICOM, ZIP y RAR van a Orthanc.
 * Se asume que contienen archivos DICOM (.dcm).
 */
const goesToOrthanc = (file: File) =>
	isDicomFile(file) || isZipFile(file) || isRarFile(file);

const isAllowedFile = (file: File) =>
	file.type.startsWith("image/") ||
	file.type === "application/pdf" ||
	isDicomFile(file) ||
	isVideoFile(file) ||
	isZipFile(file) ||
	isRarFile(file) ||
	ALLOWED_EXTENSIONS.has(getFileExt(file.name));

// ─────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────
const SubirResultadoModal = ({
	cita,
	onClose,
	onUpload,
	onSuccess,
	isUploading: externalUploading = false,
}: SubirResultadoModalProps) => {
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [previewUrls, setPreviewUrls] = useState<Map<number, string>>(
		new Map(),
	);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [uploadResultado, { isLoading: isUploadingLocal }] =
		useUploadResultadoMutation();
	const [uploadDicomToOrthanc, { isLoading: isUploadingDicom }] =
		useUploadDicomToOrthancMutation();

	const isUploading =
		externalUploading || isUploadingLocal || isUploadingDicom;

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		const validFiles = files.filter((file) => {
			if (!isAllowedFile(file)) {
				Swal.fire({
					icon: "warning",
					title: "Tipo de archivo no válido",
					text: "Se permiten imágenes, PDF, DICOM (.dcm), videos (MP4, AVI, MOV) y comprimidos (ZIP, RAR).",
					timer: 2500,
				});
				return false;
			}
			return true;
		});

		const newPreviewUrls = new Map(previewUrls);
		validFiles.forEach((file, idx) => {
			const actualIndex = selectedFiles.length + idx;
			if (file.type.startsWith("image/") || file.type === "application/pdf") {
				newPreviewUrls.set(actualIndex, URL.createObjectURL(file));
			}
		});

		setSelectedFiles((prev) => [...prev, ...validFiles]);
		setPreviewUrls(newPreviewUrls);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const removeFile = (index: number) => {
		const urlToRevoke = previewUrls.get(index);
		if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);

		setSelectedFiles((prev) => {
			const newFiles = prev.filter((_, i) => i !== index);
			const newMap = new Map<number, string>();
			newFiles.forEach((file, newIdx) => {
				const oldIdx = newIdx < index ? newIdx : newIdx + 1;
				const oldUrl = previewUrls.get(oldIdx);
				if (
					oldUrl &&
					(file.type.startsWith("image/") || file.type === "application/pdf")
				) {
					newMap.set(newIdx, oldUrl);
				}
			});
			setPreviewUrls(newMap);
			return newFiles;
		});
	};

	const handleUpload = async () => {
		if (selectedFiles.length === 0) {
			Swal.fire({
				icon: "warning",
				title: "Archivos requeridos",
				text: "Por favor selecciona al menos un archivo.",
			});
			return;
		}

		// Separar: DICOM/ZIP → Orthanc, resto → uploads local
		const dicomFiles = selectedFiles.filter(goesToOrthanc);
		const regularFiles = selectedFiles.filter((f) => !goesToOrthanc(f));

		try {
			// ── DICOM a Orthanc ──────────────────────────────────────────────
			if (dicomFiles.length > 0) {
				await uploadDicomToOrthanc({
					id_cita: cita.id_cita,
					archivos: dicomFiles,
				}).unwrap();
			}

			// ── Archivos regulares ───────────────────────────────────────────
			if (regularFiles.length > 0) {
				if (onUpload) {
					// Callback heredado del padre
					await onUpload(cita.id_cita, regularFiles);
				} else {
					await uploadResultado({
						id_cita: cita.id_cita,
						archivos: regularFiles,
					}).unwrap();
				}
			}

			// Limpiar previews
			previewUrls.forEach((url) => URL.revokeObjectURL(url));
			setPreviewUrls(new Map());
			setSelectedFiles([]);

			await Swal.fire({
				icon: "success",
				title: "Resultado subido",
				text:
					dicomFiles.length > 0
						? "El estudio DICOM ya está disponible en el visor OHIF."
						: "Los archivos se subieron correctamente.",
				timer: 2000,
				showConfirmButton: false,
			});

			onSuccess?.();
			onClose();
		} catch (err: unknown) {
			const msg =
				err &&
				typeof err === "object" &&
				"data" in err &&
				typeof (err as { data?: { message?: string } }).data?.message ===
					"string"
					? (err as { data: { message: string } }).data.message
					: "Error al subir los archivos.";
			Swal.fire({ icon: "error", title: "Error", text: msg });
		}
	};

	useEffect(() => {
		return () => {
			previewUrls.forEach((url) => URL.revokeObjectURL(url));
		};
	}, []);

	const handleClose = () => {
		previewUrls.forEach((url) => URL.revokeObjectURL(url));
		setPreviewUrls(new Map());
		setSelectedFiles([]);
		onClose();
	};

	const formatFileSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	const getFileIcon = (file: File) => {
		if (isDicomFile(file))
			return <Stethoscope className="h-5 w-5 text-purple-500" />;
		if (isVideoFile(file))
			return <Video className="h-5 w-5 text-orange-500" />;
		if (isZipFile(file) || isRarFile(file))
			return <FolderArchive className="h-5 w-5 text-yellow-600" />;
		if (file.type === "application/pdf")
			return <FileText className="h-5 w-5 text-red-500" />;
		return <ImageIcon className="h-5 w-5 text-blue-500" />;
	};

	// Indicar si algún archivo seleccionado va a Orthanc
	const hasDicomOrZip = selectedFiles.some(goesToOrthanc);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-paper shadow-lg">
				{/* Header */}
				<div className="sticky top-0 z-10 flex items-center justify-between border-b border-mist bg-paper p-4">
					<div>
						<h2 className="text-lg font-semibold text-brand-900">
							Subir resultados
						</h2>
						<p className="text-xs text-brand-800 mt-1">
							{cita.paciente_nombre} {cita.paciente_apellido} -{" "}
							{cita.eco_nombre}
						</p>
					</div>
					<button
						onClick={handleClose}
						className="rounded-lg p-1 text-brand-800 hover:bg-cloud"
						disabled={isUploading}
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Content */}
				<div className="p-6 space-y-4">
					{/* Info OHIF */}
					{hasDicomOrZip && (
						<div className="flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50 p-3">
							<Stethoscope className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
							<p className="text-sm text-purple-800">
								Los archivos <strong>DICOM (.dcm)</strong> y{" "}
								<strong>ZIP</strong> se enviarán a <strong>Orthanc</strong> y
								podrán visualizarse con el visor <strong>OHIF</strong>.
							</p>
						</div>
					)}

					<div>
						<label className="block text-sm font-semibold text-brand-900 mb-2">
							Seleccionar archivo(s)
						</label>
						<input
							ref={fileInputRef}
							type="file"
							multiple
							accept=".jpg,.jpeg,.png,.webp,.tiff,.tif,.bmp,.pdf,.dcm,.dicom,.mp4,.avi,.mov,.mkv,.zip,.rar"
							onChange={handleFileSelect}
							disabled={isUploading}
							className="w-full rounded-lg border border-mist bg-cloud px-3 py-2 text-sm text-brand-900 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-paper file:hover:bg-brand-800 disabled:opacity-50"
						/>
						<p className="text-xs text-brand-800 mt-1">
							Imágenes (JPEG, PNG, WEBP, TIFF), PDF, DICOM (.dcm), Videos
							(MP4, AVI, MOV, MKV), ZIP/RAR.
						</p>
					</div>

					{selectedFiles.length > 0 && (
						<div className="space-y-2">
							<p className="text-sm font-semibold text-brand-900">
								Archivos seleccionados ({selectedFiles.length})
							</p>
							<div className="space-y-3 max-h-96 overflow-y-auto">
								{selectedFiles.map((file, index) => {
									const isImage = file.type.startsWith("image/");
									const isPDF = file.type === "application/pdf";
									const isDicom = isDicomFile(file);
									const isVideo = isVideoFile(file);
									const isZip = isZipFile(file) || isRarFile(file);
									const previewUrl = previewUrls.get(index) || null;

									return (
										<div
											key={index}
											className="rounded-lg border border-mist bg-cloud p-3 space-y-2"
										>
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-3 flex-1 min-w-0">
													{getFileIcon(file)}
													<div className="flex-1 min-w-0">
														<p className="text-sm font-medium text-brand-900 truncate">
															{file.name}
														</p>
														<p className="text-xs text-brand-800">
															{formatFileSize(file.size)}
														</p>
													</div>
												</div>
												<button
													onClick={() => removeFile(index)}
													disabled={isUploading}
													className="ml-2 rounded-lg p-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</div>

											{isImage && previewUrl && (
												<img
													src={previewUrl}
													alt={`Preview ${file.name}`}
													className="w-full h-auto max-h-48 object-contain rounded-lg border border-mist"
												/>
											)}
											{isPDF && previewUrl && (
												<iframe
													src={`${previewUrl}#toolbar=0`}
													title={`Preview ${file.name}`}
													className="w-full h-64 rounded-lg border border-mist"
													style={{ border: "none" }}
												/>
											)}
											{isDicom && (
												<div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2">
													<Stethoscope className="h-4 w-4 text-purple-600 flex-shrink-0" />
													<p className="text-xs text-purple-700">
														DICOM — se enviará a Orthanc y se visualizará con OHIF.
													</p>
												</div>
											)}
											{isVideo && (
												<div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
													<Video className="h-4 w-4 text-orange-600 flex-shrink-0" />
													<p className="text-xs text-orange-700">
														Video — se descargará o abrirá en el reproductor.
													</p>
												</div>
											)}
											{isZip && isDicomFile(file) === false && (
												<div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2">
													<FolderArchive className="h-4 w-4 text-yellow-700 flex-shrink-0" />
													<p className="text-xs text-yellow-700">
														ZIP — se extraerán los DICOM y se enviarán a Orthanc.
													</p>
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="sticky bottom-0 border-t border-mist bg-paper p-4 flex justify-end gap-2">
					<button
						onClick={handleClose}
						disabled={isUploading}
						className="rounded-lg border border-mist bg-paper px-4 py-2 text-sm font-medium text-brand-800 hover:bg-cloud disabled:opacity-50"
					>
						Cancelar
					</button>
					<button
						onClick={handleUpload}
						disabled={isUploading || selectedFiles.length === 0}
						className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper hover:bg-brand-800 disabled:opacity-50 flex items-center gap-2"
					>
						{isUploading ? (
							<>
								<span className="animate-spin">⏳</span>
								Subiendo...
							</>
						) : (
							<>
								<Upload className="h-4 w-4" />
								Subir {selectedFiles.length > 0 && `(${selectedFiles.length})`}
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
};

export default SubirResultadoModal;
