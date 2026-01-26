import { useState } from "react";
import Swal from "sweetalert2";
import { PageShell } from "../../../shared";
import {
	useGetCitasSinResultadoQuery,
	useUploadResultadoMutation,
} from "../resultadosApi";
import type { CitaSinResultado } from "../resultadosApi";

const formatFecha = (value: string) => {
	if (!value) return "";
	const dateKey = value.includes("T") ? value.split("T")[0] : value.slice(0, 10);
	const date = new Date(`${dateKey}T00:00:00`);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString("es-VE", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
};

const formatHora = (value: string) => {
	if (!value) return "";
	const [hourStr, minuteStr = "00"] = value.split(":");
	const hour = Number(hourStr);
	if (Number.isNaN(hour)) return value;
	const period = hour >= 12 ? "PM" : "AM";
	const hour12 = hour % 12 === 0 ? 12 : hour % 12;
	return `${hour12}:${minuteStr} ${period}`;
};

const ResultadosPage = () => {
	const { data: citas = [], isLoading, refetch } =
		useGetCitasSinResultadoQuery();
	const [uploadResultado, { isLoading: isUploading }] =
		useUploadResultadoMutation();
	const [selectedCita, setSelectedCita] = useState<string | null>(null);
	const [uploadingFiles, setUploadingFiles] = useState<
		Record<string, File[]>
	>({});

	const handleFileChange = (id_cita: string, files: FileList | null) => {
		if (!files) return;
		const fileArray = Array.from(files);
		// Validar archivos
		const validFiles = fileArray.filter((file) => {
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

		if (validFiles.length > 0) {
			setUploadingFiles((prev) => ({ ...prev, [id_cita]: validFiles }));
		}
	};

	const removeFile = (id_cita: string, index: number) => {
		setUploadingFiles((prev) => {
			const files = prev[id_cita] || [];
			const newFiles = files.filter((_, i) => i !== index);
			if (newFiles.length === 0) {
				const updated = { ...prev };
				delete updated[id_cita];
				return updated;
			}
			return { ...prev, [id_cita]: newFiles };
		});
	};

	const handleUpload = async (cita: CitaSinResultado) => {
		const files = uploadingFiles[cita.id_cita];
		if (!files || files.length === 0) {
			Swal.fire({
				icon: "warning",
				title: "Archivos requeridos",
				text: "Por favor selecciona al menos un archivo para subir.",
			});
			return;
		}

		try {
			setSelectedCita(cita.id_cita);
			await uploadResultado({
				id_cita: cita.id_cita,
				archivos: files,
				nombre: `${cita.paciente_nombre}_${cita.eco_nombre}_${cita.fecha_cita}`,
			}).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Resultados subidos",
				text: `Se subieron ${files.length} archivo${files.length > 1 ? "s" : ""} exitosamente.`,
				timer: 2000,
				showConfirmButton: false,
			});
			setUploadingFiles((prev) => {
				const newFiles = { ...prev };
				delete newFiles[cita.id_cita];
				return newFiles;
			});
			refetch();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudieron subir los resultados",
			});
		} finally {
			setSelectedCita(null);
		}
	};

	return (
		<PageShell
			title="Subir resultados"
			description="Subir archivos de resultados (ecos) para citas atendidas."
		>
			<div className="space-y-4">
				{isLoading ? (
					<div className="text-center py-8 text-brand-600">
						Cargando citas sin resultado...
					</div>
				) : citas.length === 0 ? (
					<div className="rounded-lg border border-brand-200 bg-paper p-8 text-center">
						<p className="text-brand-600">
							No hay citas atendidas sin resultado.
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{citas.map((cita: CitaSinResultado) => (
							<div
								key={cita.id_cita}
								className="rounded-lg border border-brand-200 bg-paper p-4"
							>
								<div className="space-y-4">
									<div className="flex items-center gap-2">
										<h3 className="font-semibold text-brand-900">
											{cita.paciente_nombre} {cita.paciente_apellido}
										</h3>
										<span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-paper">
											{cita.eco_nombre}
										</span>
									</div>
									<div className="space-y-1 text-sm text-brand-600">
										<div>
											<span className="font-medium">Especialista:</span>{" "}
											{cita.especialista_nombre} {cita.especialista_apellido}
										</div>
										<div>
											<span className="font-medium">Fecha y hora:</span>{" "}
											{formatFecha(cita.fecha_cita)} a las{" "}
											{formatHora(cita.hora_cita)}
										</div>
									</div>
									<div className="space-y-3">
										<div>
											<label className="mb-1 block text-sm font-medium text-brand-700">
												Archivos (PDF o imágenes) - Máximo 10
											</label>
											<input
												type="file"
												multiple
												accept="image/*,application/pdf"
												onChange={(e) => {
													handleFileChange(cita.id_cita, e.target.files);
												}}
												disabled={
													isUploading && selectedCita === cita.id_cita ||
													(uploadingFiles[cita.id_cita]?.length || 0) >= 10
												}
												className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-sm text-brand-900 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-paper file:hover:bg-brand-800 disabled:opacity-50"
											/>
											<p className="text-xs text-brand-800 mt-1">
												Formatos permitidos: JPEG, PNG, WEBP, PDF. Máximo 10MB por archivo.
											</p>
										</div>
										{uploadingFiles[cita.id_cita] && uploadingFiles[cita.id_cita].length > 0 && (
											<div className="space-y-2">
												<p className="text-sm font-semibold text-brand-900">
													Archivos seleccionados ({uploadingFiles[cita.id_cita].length})
												</p>
												<div className="space-y-2 max-h-40 overflow-y-auto">
													{uploadingFiles[cita.id_cita].map((file, index) => (
														<div
															key={index}
															className="flex items-center justify-between rounded-lg border border-mist bg-cloud p-2"
														>
															<div className="flex-1 min-w-0">
																<p className="text-sm font-medium text-brand-900 truncate">
																	{file.name}
																</p>
																<p className="text-xs text-brand-800">
																	{file.size < 1024
																		? `${file.size} B`
																		: file.size < 1024 * 1024
																			? `${(file.size / 1024).toFixed(1)} KB`
																			: `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
																</p>
															</div>
															<button
																type="button"
																onClick={() => removeFile(cita.id_cita, index)}
																disabled={isUploading && selectedCita === cita.id_cita}
																className="ml-2 rounded-lg p-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
															>
																✕
															</button>
														</div>
													))}
												</div>
											</div>
										)}
										<button
											onClick={() => handleUpload(cita)}
											disabled={
												isUploading ||
												selectedCita === cita.id_cita ||
												!uploadingFiles[cita.id_cita] ||
												uploadingFiles[cita.id_cita].length === 0
											}
											className="w-full rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-brand-800 disabled:opacity-50"
										>
											{isUploading && selectedCita === cita.id_cita
												? "Subiendo..."
												: `Subir ${uploadingFiles[cita.id_cita]?.length || 0} resultado${(uploadingFiles[cita.id_cita]?.length || 0) > 1 ? "s" : ""}`}
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</PageShell>
	);
};

export default ResultadosPage;
