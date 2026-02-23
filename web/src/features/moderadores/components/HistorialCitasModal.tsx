import { useState } from "react";
import { Check, X } from "lucide-react";
import type { CitaAtendidaConResultado } from "../../resultados/resultadosApi";
import { useGetCitaByIdQuery } from "../moderadoresApi";
import VerCitaModal from "./VerCitaModal";
import VerResultadosModal from "./VerResultadosModal";
import SubirResultadoModal from "../../especialista/components/SubirResultadoModal";
import Swal from "sweetalert2";
import { useUploadResultadoMutation } from "../../resultados/resultadosApi";

type HistorialCitasModalProps = {
	paciente: {
		id_paciente: string;
		nombre: string;
		apellido: string;
	};
	citas: CitaAtendidaConResultado[];
	formatFecha: (value: string) => string;
	formatHora: (value: string) => string;
	parseResultadoArchivo: (archivo: string | null | undefined) => string[];
	onClose: () => void;
	onRefetch: () => void;
};

const HistorialCitasModal = ({
	paciente,
	citas,
	formatFecha,
	formatHora,
	parseResultadoArchivo,
	onClose,
	onRefetch,
}: HistorialCitasModalProps) => {
	const [selectedCitaIdForView, setSelectedCitaIdForView] = useState<string | null>(null);
	const [selectedCitaForResultados, setSelectedCitaForResultados] = useState<{
		archivos: string[];
		pacienteNombre: string;
		ecoNombre: string;
		idCita: string;
	} | null>(null);
	const [selectedCitaForUpload, setSelectedCitaForUpload] = useState<CitaAtendidaConResultado | null>(null);
	const [uploadResultado, { isLoading: isUploading }] = useUploadResultadoMutation();

	const { data: citaData, isLoading: loadingCita, error: citaError } = useGetCitaByIdQuery(
		selectedCitaIdForView || "",
		{
			skip: !selectedCitaIdForView,
		}
	);

	const handleSubirResultado = async (id_cita: string, archivos: File[]) => {
		try {
			const cita = citas.find((c) => c.id_cita === id_cita);
			await uploadResultado({
				id_cita,
				archivos,
				nombre: cita
					? `${cita.paciente_nombre}_${cita.eco_nombre}_${cita.fecha_cita}`
					: undefined,
			}).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Resultados subidos",
				text: `Se subieron ${archivos.length} archivo${archivos.length > 1 ? "s" : ""} exitosamente.`,
				timer: 2000,
				showConfirmButton: false,
			});
			setSelectedCitaForUpload(null);
			// Refrescar datos
			await onRefetch();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudieron subir los resultados",
			});
		}
	};

	const fullName = `${paciente.nombre} ${paciente.apellido}`;

	return (
		<>
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
				<div className="relative w-full max-w-4xl max-h-[90vh] rounded-xl bg-paper shadow-lg flex flex-col">
					{/* Header */}
					<div className="flex items-center justify-between border-b border-mist p-4">
						<div>
							<h2 className="text-base font-semibold text-brand-900">
								Historial de citas - {fullName}
							</h2>
							<p className="text-xs text-brand-600 mt-1">
								{citas.length} cita{citas.length !== 1 ? "s" : ""} registrada{citas.length !== 1 ? "s" : ""}
							</p>
						</div>
						<button
							onClick={onClose}
							className="rounded-lg p-1 text-brand-800 hover:bg-cloud"
							aria-label="Cerrar"
						>
							<X className="h-4 w-4" />
						</button>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-y-auto p-4">
						{citas.length === 0 ? (
							<div className="text-center py-8 text-brand-600">
								No hay citas registradas para este paciente.
							</div>
						) : (
							<div className="space-y-3">
								{citas.map((cita) => {
									const archivos = parseResultadoArchivo(cita.resultado_archivo);
									const tieneResultado = archivos.length > 0;
									const especialistaFullName = `${cita.especialista_nombre} ${cita.especialista_apellido}`;

									return (
										<div
											key={cita.id_cita}
											className="rounded-lg border border-brand-200 bg-paper p-4"
										>
											<div className="space-y-4">
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-2 flex-wrap">
														<span className="rounded-full bg-brand-700 px-2 py-0.5 text-xs font-medium text-paper">
															{cita.eco_nombre}
														</span>
														{cita.id_representado ? (
															<span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800" title="Representado">
																<Check className="h-3.5 w-3.5" />
																Representado
															</span>
														) : (
															<span className="inline-flex items-center gap-0.5 rounded-full bg-cloud px-2 py-0.5 text-xs font-medium text-brand-700" title="No representado">
																<X className="h-3.5 w-3.5" />
																No representado
															</span>
														)}
														{tieneResultado && (
															<span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-medium text-paper">
																{archivos.length} archivo{archivos.length > 1 ? "s" : ""}
															</span>
														)}
													</div>
												</div>
												<div className="grid gap-2 text-sm text-brand-600 sm:grid-cols-2">
													<div>
														<span className="font-medium">Especialista:</span> {especialistaFullName}
													</div>
													<div>
														<span className="font-medium">Fecha y hora:</span> {formatFecha(cita.fecha_cita)}{" "}
														a las {formatHora(cita.hora_cita)}
													</div>
												</div>
												<div className="flex items-center gap-2 flex-wrap">
													<button
														type="button"
														onClick={() => setSelectedCitaIdForView(cita.id_cita)}
														className="rounded-lg border border-brand-700 bg-paper px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
													>
														Ver cita
													</button>
													{tieneResultado ? (
														<>
															<button
																type="button"
																onClick={() => {
																	setSelectedCitaForResultados({
																		archivos,
																		pacienteNombre: fullName,
																		ecoNombre: cita.eco_nombre,
																		idCita: cita.id_cita,
																	});
																}}
																className="rounded-lg border border-brand-700 bg-paper px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
															>
																Ver {archivos.length} resultado{archivos.length > 1 ? "s" : ""}
															</button>
															<button
																type="button"
																onClick={() => setSelectedCitaForUpload(cita)}
																className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-brand-800"
															>
																Subir más archivos
															</button>
														</>
													) : (
														<button
															type="button"
															onClick={() => setSelectedCitaForUpload(cita)}
															className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-brand-800"
														>
															Subir resultados
														</button>
													)}
												</div>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Modal para ver detalles de la cita */}
			{selectedCitaIdForView && (
				<VerCitaModal
					cita={loadingCita ? null : citaData || null}
					error={citaError ? "No se pudo cargar la información de la cita" : null}
					onClose={() => setSelectedCitaIdForView(null)}
				/>
			)}

			{/* Modal para ver resultados */}
			{selectedCitaForResultados && (
				<VerResultadosModal
					archivos={selectedCitaForResultados.archivos}
					pacienteNombre={selectedCitaForResultados.pacienteNombre}
					ecoNombre={selectedCitaForResultados.ecoNombre}
					idCita={selectedCitaForResultados.idCita}
					onClose={() => setSelectedCitaForResultados(null)}
					onArchivoDeleted={async () => {
						onRefetch();
					}}
				/>
			)}

			{/* Modal para subir resultados */}
			{selectedCitaForUpload && (
				<SubirResultadoModal
					cita={{
						id_cita: selectedCitaForUpload.id_cita,
						paciente_nombre: selectedCitaForUpload.paciente_nombre,
						paciente_apellido: selectedCitaForUpload.paciente_apellido,
						eco_nombre: selectedCitaForUpload.eco_nombre,
						fecha_cita: selectedCitaForUpload.fecha_cita,
					}}
					onClose={() => setSelectedCitaForUpload(null)}
					onUpload={handleSubirResultado}
					isUploading={isUploading}
				/>
			)}
		</>
	);
};

export default HistorialCitasModal;
