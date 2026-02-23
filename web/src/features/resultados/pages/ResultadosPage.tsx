import { useState, useMemo } from "react";
import Swal from "sweetalert2";
import { FileText, Receipt, Calendar, FileCheck, Download, Eye, Upload } from "lucide-react";
import { PageShell, useAuth, formatFechaLocal } from "../../../shared";
import { useGetCitasSinResultadoQuery, useUploadResultadoMutation } from "../resultadosApi";
import type { CitaSinResultado } from "../resultadosApi";
import SubirResultadoModal from "../../especialista/components/SubirResultadoModal";
import { useGetMisCitasCompletasQuery } from "../../citas/citasApi";
import type { CitaPacienteCompleta } from "../../citas/citasApi";
import { useGetCitaByIdQuery, useGetPagoByCitaQuery } from "../../moderadores/moderadoresApi";
import VerCitaModal from "../../moderadores/components/VerCitaModal";
import VerPagoModal from "../../moderadores/components/VerPagoModal";
import VerResultadosModal from "../../especialista/components/VerResultadosModal";
import PDFViewerModal from "../../especialista/components/PDFViewerModal";

const formatFecha = (value: string) => (value ? formatFechaLocal(value) : "");

const formatHora = (value: string) => {
	if (!value) return "";
	const [hourStr, minuteStr = "00"] = value.split(":");
	const hour = Number(hourStr);
	if (Number.isNaN(hour)) return value;
	const period = hour >= 12 ? "PM" : "AM";
	const hour12 = hour % 12 === 0 ? 12 : hour % 12;
	return `${hour12}:${minuteStr} ${period}`;
};

// Función para parsear el archivo (puede ser string simple o JSON array)
const parseResultadoArchivo = (archivo: string | null | undefined): string[] => {
	if (!archivo) return [];
	try {
		const parsed = JSON.parse(archivo);
		const urls = Array.isArray(parsed) ? parsed : [archivo];
		return urls.map((url) => {
			if (!url) return url;
			const trimmedUrl = url.trim();
			if (!trimmedUrl.match(/^https?:\/\//i)) {
				return `https://${trimmedUrl}`;
			}
			return trimmedUrl;
		});
	} catch {
		const trimmedUrl = archivo.trim();
		if (!trimmedUrl.match(/^https?:\/\//i)) {
			return [`https://${trimmedUrl}`];
		}
		return [trimmedUrl];
	}
};

const ResultadosPage = () => {
	const { user } = useAuth();
	const isPaciente = user?.rol === "paciente";
	const [query, setQuery] = useState("");

	// Para pacientes: obtener todas sus citas con información completa
	const {
		data: misCitas = [],
		isLoading: isLoadingCitas,
		refetch: refetchCitas,
	} = useGetMisCitasCompletasQuery(undefined, {
		skip: !isPaciente,
	});

	// Para moderadores/admin: obtener citas sin resultado para subir
	const { data: citas = [], isLoading: isLoadingCitasAdmin, refetch: refetchCitasAdmin } =
		useGetCitasSinResultadoQuery(undefined, {
			skip: isPaciente,
		});

	const [uploadResultado, { isLoading: isUploading }] =
		useUploadResultadoMutation();
	const [selectedCitaForUpload, setSelectedCitaForUpload] =
		useState<CitaSinResultado | null>(null);

	// Estados para modales
	const [selectedCitaIdForView, setSelectedCitaIdForView] = useState<string | null>(null);
	const [selectedCitaForPago, setSelectedCitaForPago] = useState<string | null>(null);
	const [selectedCitaForResultados, setSelectedCitaForResultados] = useState<{
		archivos: string[];
		studyUid?: string | null;
		pacienteNombre: string;
		ecoNombre: string;
		idCita: string;
	} | null>(null);
	const [selectedInforme, setSelectedInforme] = useState<{
		pdfUrl: string;
		ecoNombre: string;
	} | null>(null);

	// Obtener datos completos de la cita cuando se selecciona para ver
	const {
		data: citaData,
		isLoading: loadingCita,
		error: citaError,
	} = useGetCitaByIdQuery(selectedCitaIdForView || "", {
		skip: !selectedCitaIdForView,
	});

	// Obtener datos del pago cuando se selecciona una cita
	const {
		data: pagoData,
		isLoading: loadingPago,
		error: pagoError,
	} = useGetPagoByCitaQuery(selectedCitaForPago || "", {
		skip: !selectedCitaForPago,
	});

	const isLoading = isPaciente ? isLoadingCitas : isLoadingCitasAdmin;
	const refetch = isPaciente ? refetchCitas : refetchCitasAdmin;

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
			refetch();
		} catch (error: unknown) {
			const msg =
				error &&
				typeof error === "object" &&
				"data" in error &&
				typeof (error as { data?: { message?: string } }).data?.message === "string"
					? (error as { data: { message: string } }).data.message
					: "No se pudieron subir los resultados";
			Swal.fire({ icon: "error", title: "Error", text: msg });
		}
	};

	const handleViewOrdenMedica = (orden: string | null) => {
		if (!orden) {
			Swal.fire({
				icon: "warning",
				title: "Sin orden médica",
				text: "Esta cita no tiene orden médica disponible.",
			});
			return;
		}
		window.open(orden, "_blank", "noopener,noreferrer");
	};

	const getEstadoCitaLabel = (estado: number) => {
		switch (estado) {
			case 0:
				return "Pendiente";
			case 1:
				return "Confirmada";
			case 2:
				return "Cancelada";
			case 3:
				return "Atendida";
			default:
				return "Desconocido";
		}
	};

	const getEstadoCitaColor = (estado: number) => {
		switch (estado) {
			case 0:
				return "bg-amber-400 text-brand-900";
			case 1:
				return "bg-blue-500 text-paper";
			case 2:
				return "bg-red-500 text-paper";
			case 3:
				return "bg-green-500 text-paper";
			default:
				return "bg-cloud text-brand-800";
		}
	};

	const getEstadoPagoLabel = (estado: number) => {
		switch (estado) {
			case 0:
				return "Pendiente";
			case 1:
				return "Pagado";
			case 2:
				return "Rechazado";
			default:
				return "Sin pago";
		}
	};

	const getEstadoPagoColor = (estado: number) => {
		switch (estado) {
			case 0:
				return "bg-amber-400 text-brand-900";
			case 1:
				return "bg-brand-700 text-paper";
			case 2:
				return "bg-red-500 text-paper";
			default:
				return "bg-cloud text-brand-800";
		}
	};

	// Vista para pacientes: ver todas sus citas
	if (isPaciente) {
		return (
			<PageShell
				title="Mis citas"
				description="Consulta todas tus citas y accede a pagos, detalles, informes, resultados y órdenes."
			>
				<div className="space-y-4">
					{isLoading ? (
						<div className="text-center py-8 text-brand-600">
							Cargando citas...
						</div>
					) : misCitas.length === 0 ? (
						<div className="rounded-lg border border-brand-200 bg-paper p-8 text-center">
							<p className="text-brand-600">
								No tienes citas registradas.
							</p>
						</div>
					) : (
						<div className="space-y-3">
							{misCitas.map((cita: CitaPacienteCompleta) => {
							const archivos = parseResultadoArchivo(cita.resultado_archivo);
							const tieneDicom = !!cita.resultado_study_uid;
							const tieneResultado = archivos.length > 0 || tieneDicom;
							const totalResultados = archivos.length + (tieneDicom ? 1 : 0);
							const tieneInforme = cita.id_informe !== null && cita.informe_pdf_url !== null;
							const tienePago = cita.id_pago !== null;
							const tieneOrden = cita.orden !== null && cita.orden !== "";
							const especialistaFullName = `${cita.especialista_nombre} ${cita.especialista_apellido}`;
							const pacienteFullName = `${cita.paciente_nombre} ${cita.paciente_apellido}`;

								return (
									<div
										key={cita.id_cita}
										className="rounded-lg border border-brand-200 bg-paper p-4"
									>
										<div className="space-y-4">
											<div className="flex items-center gap-2 flex-wrap">
												<span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-paper">
													{cita.eco_nombre}
												</span>
												<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getEstadoCitaColor(cita.estado_cita)}`}>
													{getEstadoCitaLabel(cita.estado_cita)}
												</span>
												<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getEstadoPagoColor(cita.estado_pago)}`}>
													{getEstadoPagoLabel(cita.estado_pago)}
												</span>
										{archivos.length > 0 && (
												<span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-medium text-paper">
													{archivos.length} archivo{archivos.length > 1 ? "s" : ""}
												</span>
											)}
											{tieneDicom && (
												<span className="rounded-full bg-purple-500 px-2 py-0.5 text-xs font-medium text-paper">
													DICOM
												</span>
											)}
												{tieneInforme && (
													<span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-medium text-paper">
														Con informe
													</span>
												)}
											</div>
											<div className="space-y-1 text-sm text-brand-600">
												<div>
													<span className="font-medium">Especialista:</span> {especialistaFullName}
												</div>
												<div>
													<span className="font-medium">Fecha y hora:</span> {formatFecha(cita.fecha_cita)} a las{" "}
													{formatHora(cita.hora_cita)}
												</div>
											</div>
											<div className="flex items-center gap-2 flex-wrap">
												<button
													type="button"
													onClick={() => setSelectedCitaIdForView(cita.id_cita)}
													className="rounded-lg border border-brand-700 bg-paper px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 flex items-center gap-2"
												>
													<Calendar className="h-4 w-4" />
													Ver detalles
												</button>
												{tienePago && (
													<button
														type="button"
														onClick={() => setSelectedCitaForPago(cita.id_cita)}
														className="rounded-lg border border-brand-700 bg-paper px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 flex items-center gap-2"
													>
														<Receipt className="h-4 w-4" />
														Ver pago
													</button>
												)}
												{tieneInforme ? (
													<button
														type="button"
														onClick={() => setSelectedInforme({ pdfUrl: cita.informe_pdf_url || "", ecoNombre: cita.eco_nombre })}
														className="rounded-lg border border-blue-500 bg-paper px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 flex items-center gap-2"
													>
														<FileText className="h-4 w-4" />
														Ver informe
													</button>
												) : (
													<span className="rounded-lg border border-brand-200 bg-cloud px-4 py-2 text-sm font-medium text-brand-600">
														Sin informe
													</span>
												)}
												{tieneResultado ? (
													<button
														type="button"
														onClick={() => {
															setSelectedCitaForResultados({
																archivos,
																studyUid: cita.resultado_study_uid,
																pacienteNombre: pacienteFullName,
																ecoNombre: cita.eco_nombre,
																idCita: cita.id_cita,
															});
														}}
														className="rounded-lg border border-emerald-500 bg-paper px-4 py-2 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-50 flex items-center gap-2"
													>
														<FileCheck className="h-4 w-4" />
														Ver {totalResultados} resultado{totalResultados !== 1 ? "s" : ""}
													</button>
												) : (
													<span className="rounded-lg border border-brand-200 bg-cloud px-4 py-2 text-sm font-medium text-brand-600">
														Sin resultado
													</span>
												)}
												{tieneOrden ? (
													<button
														type="button"
														onClick={() => handleViewOrdenMedica(cita.orden)}
														className="rounded-lg border border-brand-700 bg-paper px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 flex items-center gap-2"
													>
														<Eye className="h-4 w-4" />
														Ver orden médica
													</button>
												) : (
													<span className="rounded-lg border border-brand-200 bg-cloud px-4 py-2 text-sm font-medium text-brand-600">
														Sin orden médica
													</span>
												)}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Modal para ver detalles de la cita */}
				{selectedCitaIdForView && (
					<VerCitaModal
						cita={loadingCita ? null : citaData || null}
						error={citaError ? "No se pudo cargar la información de la cita" : null}
						onClose={() => setSelectedCitaIdForView(null)}
					/>
				)}

				{/* Modal para ver pago */}
				{selectedCitaForPago && (
					<VerPagoModal
						pago={loadingPago ? null : pagoData || null}
						error={pagoError ? "No se pudo cargar la información del pago" : null}
						onClose={() => setSelectedCitaForPago(null)}
					/>
				)}

				{/* Modal para ver resultados */}
				{selectedCitaForResultados && (
			<VerResultadosModal
					archivos={selectedCitaForResultados.archivos}
					studyUid={selectedCitaForResultados.studyUid}
					pacienteNombre={selectedCitaForResultados.pacienteNombre}
					ecoNombre={selectedCitaForResultados.ecoNombre}
					idCita={selectedCitaForResultados.idCita}
					onClose={() => setSelectedCitaForResultados(null)}
				/>
				)}

				{/* Modal para visualizar PDF del informe */}
				{selectedInforme && (
					<PDFViewerModal
						pdfUrl={selectedInforme.pdfUrl}
						onClose={() => setSelectedInforme(null)}
						fileName={`informe-${selectedInforme.ecoNombre}.pdf`}
					/>
				)}
			</PageShell>
		);
	}

	// Filtrar citas por búsqueda (solo para moderadores/admin)
	const filteredCitas = useMemo(() => {
		if (!query.trim()) return citas;
		const searchLower = query.toLowerCase().trim();
		return citas.filter((cita: CitaSinResultado) => {
			const fullName = `${cita.paciente_nombre} ${cita.paciente_apellido}`.toLowerCase();
			const especialistaFullName = `${cita.especialista_nombre} ${cita.especialista_apellido}`.toLowerCase();
			return (
				fullName.includes(searchLower) ||
				cita.paciente_nombre.toLowerCase().includes(searchLower) ||
				cita.paciente_apellido.toLowerCase().includes(searchLower) ||
				especialistaFullName.includes(searchLower) ||
				cita.especialista_nombre.toLowerCase().includes(searchLower) ||
				cita.especialista_apellido.toLowerCase().includes(searchLower) ||
				cita.eco_nombre.toLowerCase().includes(searchLower)
			);
		});
	}, [citas, query]);

	// Vista para moderadores/admin: subir resultados
	return (
		<PageShell
			title="Subir resultados"
			description="Subir archivos de resultados (ecos) para citas atendidas."
		>
			<div className="space-y-4">
				{/* Barra de búsqueda */}
				<div className="rounded-lg border border-brand-300 bg-paper p-4">
					<input
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Buscar por nombre, apellido, especialista o eco..."
						className="h-10 w-full rounded-lg border border-brand-300 bg-cloud px-4 text-sm text-brand-900 outline-none focus:border-brand-700"
					/>
				</div>

				{isLoading ? (
					<div className="text-center py-8 text-brand-600">
						Cargando citas sin resultado...
					</div>
				) : filteredCitas.length === 0 ? (
					<div className="rounded-lg border border-brand-200 bg-paper p-8 text-center">
						<p className="text-brand-600">
							{query.trim() ? "No se encontraron citas con los criterios de búsqueda." : "No hay citas atendidas sin resultado."}
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{filteredCitas.map((cita: CitaSinResultado) => (
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
									<button
										type="button"
										onClick={() => setSelectedCitaForUpload(cita)}
										disabled={isUploading}
										className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-brand-800 disabled:opacity-50"
									>
										<Upload className="h-4 w-4" />
										Subir resultado
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Modal para subir resultado (misma lógica que en Todas las citas: DICOM/ZIP/RAR van a Orthanc en un solo envío) */}
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
					onSuccess={refetch}
					isUploading={isUploading}
				/>
			)}
		</PageShell>
	);
};

export default ResultadosPage;
