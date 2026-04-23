import { useState, useMemo, useRef } from "react";
import Swal from "sweetalert2";
import {
	ArrowRight,
	Calendar,
	CheckCircle2,
	Eye,
	FileCheck,
	FileText,
	Image as ImageIcon,
	Receipt,
	Search,
	CloudUpload,
} from "lucide-react";
import { PageShell, useAuth, formatFechaLocal } from "../../../shared";
import {
	useGetCitasSinResultadoQuery,
	useGetCitasAtendidasConResultadosQuery,
	useUploadResultadoMutation,
} from "../resultadosApi";
import type { CitaSinResultado, CitaAtendidaConResultado } from "../resultadosApi";
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

const fileLabelFromUrl = (url: string): string => {
	try {
		const u = url.split("?")[0];
		const seg = u.split("/").filter(Boolean).pop() || "archivo";
		return decodeURIComponent(seg);
	} catch {
		return "archivo";
	}
};

const getResultadoDateMs = (c: any) => {
	if (c.resultado_fecha_emision) {
		const ms = new Date(c.resultado_fecha_emision).getTime();
		if (!Number.isNaN(ms)) return ms;
	}
	const t = c.hora_cita && c.hora_cita.length >= 5 ? c.hora_cita.slice(0, 5) : "00:00";
	const raw = `${c.fecha_cita}T${t}:00`;
	const ms = new Date(raw).getTime();
	return Number.isNaN(ms) ? 0 : ms;
};

const estadoResultadoBadge = (estado: number | null): string => {
	if (estado === null || estado === undefined) return "Enviado";
	switch (estado) {
		case 0:
			return "Pendiente";
		case 1:
			return "En proceso";
		case 2:
			return "Verificado";
		default:
			return `Estado ${estado}`;
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

	const {
		data: citasConResultado = [],
		isLoading: isLoadingCitasConResultado,
		refetch: refetchCitasConResultado,
	} = useGetCitasAtendidasConResultadosQuery(undefined, {
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
	const searchInputRef = useRef<HTMLInputElement>(null);

	const filteredCitas = useMemo(() => {
		if (isPaciente) return citas;
		if (!query.trim()) return citas;
		const searchLower = query.toLowerCase().trim();
		return citas.filter((cita: CitaSinResultado) => {
			const fullName = `${cita.paciente_nombre} ${cita.paciente_apellido}`.toLowerCase();
			const especialistaFullName =
				`${cita.especialista_nombre} ${cita.especialista_apellido}`.toLowerCase();
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
	}, [citas, query, isPaciente]);

	const citasConArchivoOModal = useMemo(() => {
		if (isPaciente) return [];
		return citasConResultado.filter((c) => {
			const arch = parseResultadoArchivo(c.resultado_archivo);
			return arch.length > 0 || !!c.resultado_study_uid;
		});
	}, [citasConResultado, isPaciente]);

	const recentActivity = useMemo(() => {
		const threeDaysAgo = new Date();
		threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
		threeDaysAgo.setHours(0, 0, 0, 0);
		const cutoffMs = threeDaysAgo.getTime();

		return [...citasConArchivoOModal]
			.filter((c) => getResultadoDateMs(c) >= cutoffMs)
			.sort((a, b) => getResultadoDateMs(b) - getResultadoDateMs(a))
			.slice(0, 10);
	}, [citasConArchivoOModal]);

	const historialOrdenado = useMemo(() => {
		return [...citasConArchivoOModal].sort(
			(a, b) => getResultadoDateMs(b) - getResultadoDateMs(a)
		);
	}, [citasConArchivoOModal]);

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
			void refetchCitasConResultado();
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
												<span className="rounded-full bg-accent px-2 py-0.5 text-sm font-medium text-paper">
													{cita.eco_nombre}
												</span>
												<span className={`rounded-full px-2 py-0.5 text-sm font-medium ${getEstadoCitaColor(cita.estado_cita)}`}>
													{getEstadoCitaLabel(cita.estado_cita)}
												</span>
												<span className={`rounded-full px-2 py-0.5 text-sm font-medium ${getEstadoPagoColor(cita.estado_pago)}`}>
													{getEstadoPagoLabel(cita.estado_pago)}
												</span>
										{archivos.length > 0 && (
												<span className="rounded-full bg-emerald-500 px-2 py-0.5 text-sm font-medium text-paper">
													{archivos.length} archivo{archivos.length > 1 ? "s" : ""}
												</span>
											)}
											{tieneDicom && (
												<span className="rounded-full bg-purple-500 px-2 py-0.5 text-sm font-medium text-paper">
													DICOM
												</span>
											)}
												{tieneInforme && (
													<span className="rounded-full bg-blue-500 px-2 py-0.5 text-sm font-medium text-paper">
														Con informe
													</span>
												)}
											</div>
											<div className="space-y-1 text-base text-brand-600">
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
													className="rounded-lg border border-brand-700 bg-paper px-4 py-2 text-base font-medium text-brand-700 transition-colors hover:bg-brand-50 flex items-center gap-2"
												>
													<Calendar className="h-4 w-4" />
													Ver detalles
												</button>
												{tienePago && (
													<button
														type="button"
														onClick={() => setSelectedCitaForPago(cita.id_cita)}
														className="rounded-lg border border-brand-700 bg-paper px-4 py-2 text-base font-medium text-brand-700 transition-colors hover:bg-brand-50 flex items-center gap-2"
													>
														<Receipt className="h-4 w-4" />
														Ver pago
													</button>
												)}
												{tieneInforme ? (
													<button
														type="button"
														onClick={() => setSelectedInforme({ pdfUrl: cita.informe_pdf_url || "", ecoNombre: cita.eco_nombre })}
														className="rounded-lg border border-blue-500 bg-paper px-4 py-2 text-base font-medium text-blue-600 transition-colors hover:bg-blue-50 flex items-center gap-2"
													>
														<FileText className="h-4 w-4" />
														Ver informe
													</button>
												) : (
													<span className="rounded-lg border border-brand-200 bg-cloud px-4 py-2 text-base font-medium text-brand-600">
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
														className="rounded-lg border border-emerald-500 bg-paper px-4 py-2 text-base font-medium text-emerald-600 transition-colors hover:bg-emerald-50 flex items-center gap-2"
													>
														<FileCheck className="h-4 w-4" />
														Ver {totalResultados} resultado{totalResultados !== 1 ? "s" : ""}
													</button>
												) : (
													<span className="rounded-lg border border-brand-200 bg-cloud px-4 py-2 text-base font-medium text-brand-600">
														Sin resultado
													</span>
												)}
												{tieneOrden ? (
													<button
														type="button"
														onClick={() => handleViewOrdenMedica(cita.orden)}
														className="rounded-lg border border-brand-700 bg-paper px-4 py-2 text-base font-medium text-brand-700 transition-colors hover:bg-brand-50 flex items-center gap-2"
													>
														<Eye className="h-4 w-4" />
														Ver orden médica
													</button>
												) : (
													<span className="rounded-lg border border-brand-200 bg-cloud px-4 py-2 text-base font-medium text-brand-600">
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

	// Vista para moderadores/admin: subir resultados
	const openVerResultadosHistorial = (cita: CitaAtendidaConResultado) => {
		const archivos = parseResultadoArchivo(cita.resultado_archivo);
		setSelectedCitaForResultados({
			archivos,
			studyUid: cita.resultado_study_uid,
			pacienteNombre: `${cita.paciente_nombre} ${cita.paciente_apellido}`,
			ecoNombre: cita.eco_nombre,
			idCita: cita.id_cita,
		});
	};

	const activityTimeLabel = (cita: CitaAtendidaConResultado) => {
		const d = new Date(getResultadoDateMs(cita));
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const y = new Date(d);
		y.setHours(0, 0, 0, 0);
		const diffDays = Math.round((today.getTime() - y.getTime()) / (24 * 60 * 60 * 1000));
		if (diffDays === 0) {
			const hrs = d.getHours();
			const mins = d.getMinutes().toString().padStart(2, '0');
			const ampm = hrs >= 12 ? 'PM' : 'AM';
			const h12 = hrs % 12 || 12;
			return `${h12}:${mins} ${ampm}`;
		}
		if (diffDays === 1) return "Ayer";
		const day = d.getDate().toString().padStart(2, '0');
		const month = (d.getMonth() + 1).toString().padStart(2, '0');
		const year = d.getFullYear();
		return `${day}/${month}/${year}`;
	};

	return (
		<PageShell title="Subir resultados" hideHeader>
			<div className="space-y-8">
				<header className="space-y-2">
					<h2 className="font-headline text-3xl font-extrabold tracking-tight text-brand-900 md:text-4xl">
						Subir resultados
					</h2>
					<p className="max-w-2xl text-base leading-relaxed text-brand-800 md:text-lg">
						Puede subir los resultados de los ecosonogramas de forma segura aquí.
					</p>
				</header>

				<div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
					{/* Columna izquierda ~65% */}
					<section className="space-y-4 lg:col-span-8">
						<div className="relative">
							<Search
								className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
								aria-hidden
							/>
							<input
								ref={searchInputRef}
								id="resultados-busqueda"
								type="text"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Buscar por nombre, apellido, especialista o eco..."
								className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-base text-brand-900 shadow-sm outline-none ring-[#006965]/20 placeholder:text-slate-400 focus:border-[#006965]/30 focus:ring-2"
							/>
						</div>

						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<h3 className="font-headline flex flex-wrap items-center gap-2 text-xl font-bold text-brand-900">
								Pacientes con resultados pendientes
								<span className="rounded-full bg-[#1c837f] px-2.5 py-0.5 text-sm font-bold text-white">
									{filteredCitas.length}
								</span>
							</h3>
						</div>

						{isLoading ? (
							<div className="rounded-2xl border border-slate-100 bg-white py-16 text-center text-slate-600 shadow-sm">
								Cargando citas sin resultado...
							</div>
						) : filteredCitas.length === 0 ? (
							<div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
								<p className="text-slate-600">
									{query.trim()
										? "No se encontraron citas con los criterios de búsqueda."
										: "No hay citas atendidas sin resultado."}
								</p>
							</div>
						) : (
							<div className="space-y-4">
								{filteredCitas.map((cita: CitaSinResultado) => {
									const iniciales =
										`${(cita.paciente_nombre?.[0] ?? "").toUpperCase()}${(cita.paciente_apellido?.[0] ?? "").toUpperCase()}` ||
										"?";
									return (
										<div
											key={cita.id_cita}
											className="group flex flex-col gap-4 rounded-2xl border border-transparent bg-white p-5 shadow-sm transition-all hover:border-[#006965]/15 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
										>
											<div className="flex min-w-0 flex-1 items-center gap-5">
												<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-100 font-headline text-lg font-bold text-slate-500">
													{iniciales}
												</div>
												<div className="min-w-0">
													<h4 className="truncate font-headline text-lg font-bold text-brand-900">
														{cita.paciente_nombre} {cita.paciente_apellido}
													</h4>
													<div className="mt-1 flex flex-wrap items-center gap-2">
														<span className="inline-flex rounded bg-teal-100/90 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#006965]">
															{cita.eco_nombre}
														</span>
														<span className="text-[11px] text-slate-400">
															• Ref: #{cita.id_cita.slice(0, 8)}
														</span>
													</div>
													<p className="mt-1 text-sm text-slate-500">
														{cita.especialista_nombre} {cita.especialista_apellido} ·{" "}
														{formatFecha(cita.fecha_cita)} {formatHora(cita.hora_cita)}
													</p>
												</div>
											</div>
											<button
												type="button"
												onClick={() => setSelectedCitaForUpload(cita)}
												disabled={isUploading}
												className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1c837f] px-6 py-3 text-base font-semibold text-white shadow-lg shadow-[#006965]/20 transition-all hover:bg-[#006965] active:scale-[0.98] disabled:opacity-50"
											>
												<CloudUpload className="h-5 w-5" aria-hidden />
												Subir resultado
											</button>
										</div>
									);
								})}
							</div>
						)}
					</section>

					{/* Columna derecha ~35% */}
					<aside className="lg:col-span-4">
						<div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
							<div className="mb-6 flex items-center justify-between">
								<h3 className="font-headline text-lg font-extrabold text-brand-900">
									Actividad reciente
								</h3>
								<span className="h-2 w-2 animate-pulse rounded-full bg-[#006965]" aria-hidden />
							</div>
							{isLoadingCitasConResultado ? (
								<p className="py-6 text-center text-base text-slate-500">Cargando actividad…</p>
							) : recentActivity.length === 0 ? (
								<p className="py-6 text-center text-base text-slate-500">
									Aún no hay cargas recientes.
								</p>
							) : (
								<div className="relative space-y-8 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-slate-100">
									{recentActivity.map((cita) => {
										const archivos = parseResultadoArchivo(cita.resultado_archivo);
										const nombreArchivo =
											archivos.length > 0
												? fileLabelFromUrl(archivos[0])
												: cita.resultado_study_uid
													? "Estudio DICOM"
													: "Resultado";
										return (
											<div key={cita.id_cita} className="relative flex gap-4">
												<div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#006965]/20 bg-white shadow-sm">
													<CheckCircle2 className="h-4 w-4 text-[#006965]" aria-hidden />
												</div>
												<div className="min-w-0 flex-1 pb-1">
													<div className="mb-1 flex items-start justify-between gap-2">
														<p className="truncate text-base font-bold text-brand-900">{nombreArchivo}</p>
														<span className="shrink-0 text-[10px] font-medium text-slate-400">
															{activityTimeLabel(cita)}
														</span>
													</div>
													<p className="mb-2 text-sm text-slate-600">
														Paciente:{" "}
														<span className="font-semibold text-brand-900">
															{cita.paciente_nombre} {cita.paciente_apellido}
														</span>
													</p>
													<span className="inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
														Exitoso
													</span>
												</div>
											</div>
										);
									})}
								</div>
							)}
							<button
								type="button"
								onClick={() =>
									document.getElementById("historial-resultados")?.scrollIntoView({
										behavior: "smooth",
										block: "start",
									})
								}
								className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-[#006965]/15 py-3 text-sm font-bold uppercase tracking-widest text-[#006965] transition-all hover:bg-[#006965]/5"
							>
								Ver historial completo
								<ArrowRight className="h-4 w-4" aria-hidden />
							</button>
						</div>
					</aside>
				</div>

				{/* Historial de resultados */}
				<section id="historial-resultados" className="scroll-mt-8">
					<div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
						<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<h3 className="font-headline text-xl font-extrabold text-brand-900">
								Historial de resultados
							</h3>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => searchInputRef.current?.focus()}
									className="rounded-lg bg-slate-50 p-2 text-slate-500 transition-colors hover:bg-slate-100"
									title="Filtrar búsqueda"
									aria-label="Enfocar búsqueda"
								>
									<Search className="h-5 w-5" />
								</button>
							</div>
						</div>
						{isLoadingCitasConResultado ? (
							<p className="py-10 text-center text-slate-500">Cargando historial…</p>
						) : historialOrdenado.length === 0 ? (
							<p className="py-10 text-center text-slate-500">
								No hay resultados registrados en el historial.
							</p>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full min-w-[640px] text-left">
									<thead>
										<tr className="border-b border-slate-100">
											<th className="pb-4 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
												Archivo / estudio
											</th>
											<th className="pb-4 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
												Paciente
											</th>
											<th className="pb-4 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
												Fecha de subida
											</th>
											<th className="pb-4 text-center text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
												Estado
											</th>
											<th className="pb-4 text-right text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
												Acciones
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-50">
										{historialOrdenado.map((cita) => {
											const archivos = parseResultadoArchivo(cita.resultado_archivo);
											const principal = archivos[0];
											const etiqueta = principal
												? fileLabelFromUrl(principal)
												: cita.resultado_study_uid
													? "Estudio DICOM"
													: "—";
											const esPdf =
												principal?.toLowerCase().includes(".pdf") ?? false;
											return (
												<tr key={cita.id_cita} className="group transition-colors hover:bg-slate-50/80">
													<td className="py-5">
														<div className="flex items-center gap-3">
															<div
																className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${esPdf ? "bg-red-50" : "bg-sky-50"}`}
															>
																{esPdf ? (
																	<FileText className="h-5 w-5 text-red-400" aria-hidden />
																) : (
																	<ImageIcon className="h-5 w-5 text-sky-500" aria-hidden />
																)}
															</div>
															<div className="min-w-0">
																<p className="truncate text-base font-bold text-brand-900">{etiqueta}</p>
																<p className="text-[10px] text-slate-400">
																	{cita.eco_nombre}
																	{archivos.length > 1 ? ` · +${archivos.length - 1}` : ""}
																</p>
															</div>
														</div>
													</td>
													<td className="py-5">
														<p className="text-base font-semibold text-brand-900">
															{cita.paciente_nombre} {cita.paciente_apellido}
														</p>
														<p className="text-[10px] text-slate-400">ID: #{cita.id_cita.slice(0, 8)}</p>
													</td>
													<td className="py-5">
														<p className="text-base text-slate-700">{formatFecha(cita.fecha_cita)}</p>
														<p className="text-[10px] text-slate-400">{formatHora(cita.hora_cita)}</p>
													</td>
													<td className="py-5">
														<div className="flex justify-center">
															<span className="rounded-full bg-[#006965]/10 px-3 py-1 text-[10px] font-bold text-[#006965]">
																{estadoResultadoBadge(cita.resultado_estado)}
															</span>
														</div>
													</td>
													<td className="py-5 text-right">
														<button
															type="button"
															onClick={() => openVerResultadosHistorial(cita)}
															className="inline-flex p-2 text-slate-400 transition-colors hover:text-[#006965]"
															aria-label="Ver resultados"
														>
															<Eye className="h-5 w-5" />
														</button>

													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</section>
			</div>

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
					onSuccess={() => {
						refetch();
						void refetchCitasConResultado();
					}}
					isUploading={isUploading}
				/>
			)}

			{selectedCitaForResultados && (
				<VerResultadosModal
					archivos={selectedCitaForResultados.archivos}
					studyUid={selectedCitaForResultados.studyUid}
					pacienteNombre={selectedCitaForResultados.pacienteNombre}
					ecoNombre={selectedCitaForResultados.ecoNombre}
					idCita={selectedCitaForResultados.idCita}
					onClose={() => setSelectedCitaForResultados(null)}
					onArchivoDeleted={async () => {
						await refetch();
						await refetchCitasConResultado();
					}}
				/>
			)}
		</PageShell>
	);
};

export default ResultadosPage;
