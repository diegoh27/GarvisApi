import { useState, useRef, useEffect } from "react";
import { X, Upload, Trash2, Image as ImageIcon, FileText } from "lucide-react";
import Swal from "sweetalert2";

type SubirResultadoModalProps = {
	cita: {
		id_cita: string;
		paciente_nombre: string;
		paciente_apellido: string;
		eco_nombre: string;
		fecha_cita: string;
	};
	onClose: () => void;
	onUpload: (id_cita: string, archivos: File[]) => Promise<void>;
	isUploading?: boolean;
};

const SubirResultadoModal = ({
	cita,
	onClose,
	onUpload,
	isUploading = false,
}: SubirResultadoModalProps) => {
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [previewUrls, setPreviewUrls] = useState<Map<number, string>>(new Map());
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		const validFiles = files.filter((file) => {
			const isValidType =
				file.type.startsWith("image/") || file.type === "application/pdf";
			if (!isValidType) {
				Swal.fire({
					icon: "warning",
					title: "Tipo de archivo no válido",
					text: "Solo se permiten imágenes (JPEG, PNG, WEBP) y PDFs.",
					timer: 2000,
				});
				return false;
			}
			if (file.size > 10 * 1024 * 1024) {
				Swal.fire({
					icon: "warning",
					title: "Archivo muy grande",
					text: "El tamaño máximo por archivo es 10MB.",
					timer: 2000,
				});
				return false;
			}
			return true;
		});

		// Crear URLs de preview para imágenes y PDFs
		const newPreviewUrls = new Map(previewUrls);
		validFiles.forEach((file, idx) => {
			const actualIndex = selectedFiles.length + idx;
			if (file.type.startsWith("image/") || file.type === "application/pdf") {
				newPreviewUrls.set(actualIndex, URL.createObjectURL(file));
			}
		});

		setSelectedFiles((prev) => [...prev, ...validFiles]);
		setPreviewUrls(newPreviewUrls);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const removeFile = (index: number) => {
		// Limpiar URL de preview si existe
		const urlToRevoke = previewUrls.get(index);
		if (urlToRevoke) {
			URL.revokeObjectURL(urlToRevoke);
		}
		
		// Actualizar archivos y URLs de preview
		setSelectedFiles((prev) => {
			const newFiles = prev.filter((_, i) => i !== index);
			// Recrear map de previews con índices actualizados
			const newPreviewUrls = new Map<number, string>();
			newFiles.forEach((file, newIdx) => {
				// Los archivos antes del índice removido mantienen su índice
				// Los archivos después del índice removido se mueven un índice hacia atrás
				const oldIndex = newIdx < index ? newIdx : newIdx + 1;
				const oldUrl = previewUrls.get(oldIndex);
				if (oldUrl && (file.type.startsWith("image/") || file.type === "application/pdf")) {
					newPreviewUrls.set(newIdx, oldUrl);
				}
			});
			setPreviewUrls(newPreviewUrls);
			return newFiles;
		});
	};

	const handleUpload = async () => {
		if (selectedFiles.length === 0) {
			Swal.fire({
				icon: "warning",
				title: "Archivos requeridos",
				text: "Por favor selecciona al menos un archivo para subir.",
			});
			return;
		}

		await onUpload(cita.id_cita, selectedFiles);
		// Limpiar URLs de preview
		previewUrls.forEach((url) => URL.revokeObjectURL(url));
		setPreviewUrls(new Map());
		setSelectedFiles([]);
	};

	// Limpiar URLs de preview cuando el componente se desmonte
	useEffect(() => {
		return () => {
			previewUrls.forEach((url) => URL.revokeObjectURL(url));
		};
	}, []);

	// Limpiar cuando se cierra el modal
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
		if (file.type === "application/pdf") {
			return <FileText className="h-5 w-5 text-red-500" />;
		}
		return <ImageIcon className="h-5 w-5 text-blue-500" />;
	};

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
							{cita.paciente_nombre} {cita.paciente_apellido} - {cita.eco_nombre}
						</p>
					</div>
					<button
						onClick={handleClose}
						className="rounded-lg p-1 text-brand-800 hover:bg-cloud"
						aria-label="Cerrar"
						disabled={isUploading}
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Content */}
				<div className="p-6 space-y-4">
					<div>
						<label className="block text-sm font-semibold text-brand-900 mb-2">
							Seleccionar archivo(s) (máximo 10)
						</label>
						<input
							ref={fileInputRef}
							type="file"
							multiple
							accept="image/*,application/pdf"
							onChange={handleFileSelect}
							disabled={isUploading || selectedFiles.length >= 10}
							className="w-full rounded-lg border border-mist bg-cloud px-3 py-2 text-sm text-brand-900 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-paper file:hover:bg-brand-800 disabled:opacity-50"
						/>
						<p className="text-xs text-brand-800 mt-1">
							Formatos permitidos: JPEG, PNG, WEBP, PDF. Máximo 10MB por archivo.
						</p>
					</div>

					{/* Lista de archivos seleccionados con preview */}
					{selectedFiles.length > 0 && (
						<div className="space-y-2">
							<p className="text-sm font-semibold text-brand-900">
								Archivos seleccionados ({selectedFiles.length})
							</p>
							<div className="space-y-3 max-h-96 overflow-y-auto">
								{selectedFiles.map((file, index) => {
									const isImage = file.type.startsWith("image/");
									const isPDF = file.type === "application/pdf";
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
													aria-label="Eliminar archivo"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</div>
											{/* Preview de imagen */}
											{isImage && previewUrl && (
												<div className="mt-2 rounded-lg border border-mist overflow-hidden bg-white">
													<img
														src={previewUrl}
														alt={`Preview ${file.name}`}
														className="w-full h-auto max-h-48 object-contain"
														onError={(e) => {
															(e.target as HTMLImageElement).style.display = "none";
														}}
													/>
												</div>
											)}
											{/* Preview de PDF */}
											{isPDF && previewUrl && (
												<div className="mt-2 rounded-lg border border-mist overflow-hidden bg-white">
													<iframe
														src={`${previewUrl}#toolbar=0`}
														title={`Preview ${file.name}`}
														className="w-full h-64"
														style={{ border: "none" }}
													/>
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
