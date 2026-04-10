import { useMemo, useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import Swal from "sweetalert2";
import { useAuth, formatFechaLocal } from "../../../shared";
import { useLocation } from "react-router-dom";
import { useGetMisCitasQuery } from "../especialistaApi";
import { useGetMisInformesQuery } from "../informesApi";
import {
	useGetAllInformesQuery,
	useGetCitasAtendidasSinInformeQuery,
	useRecordarEspecialistaMutation,
} from "../../moderadores/moderadoresApi";
import InformeFormModal from "../components/InformeFormModal";
import PDFViewerModal from "../components/PDFViewerModal";
import VerCitaEspecialistaModal from "../components/VerCitaEspecialistaModal";
import type { CitaEspecialista } from "../types";

const getDateKey = (value: string | Date): string => {
	if (!value) return "";
	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}
	return value.includes("T") ? value.split("T")[0] : value;
};

const formatFecha = (value: string | Date) => formatFechaLocal(getDateKey(value) || String(value));

const formatHora = (value: string) => {
	const [hourValue, minuteValue] = value.split(":");
	const hour = Number(hourValue);
	const period = hour >= 12 ? "PM" : "AM";
	const normalized = ((hour + 11) % 12) + 1;
	return `${normalized}:${minuteValue} ${period}`;
};

const InformesPage = () => {
	const { user } = useAuth();
	const location = useLocation();
	const isEspecialista = user?.rol === "especialista";
	const isModerador = user?.rol === "moderador" || user?.rol === "admin";
	const [selectedCitaId, setSelectedCitaId] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [filtroEstado, setFiltroEstado] = useState<"todos" | "completado" | "pendiente">("todos");
	const [currentPageModPendientes, setCurrentPageModPendientes] = useState(1);
	const [currentPageModCompletados, setCurrentPageModCompletados] = useState(1);
	const [currentPageEspecialista, setCurrentPageEspecialista] = useState(1);
	const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
	const [pdfFileName, setPdfFileName] = useState<string | null>(null);
	const [selectedCitaForVer, setSelectedCitaForVer] = useState<{
		cita: CitaEspecialista & { informe?: any; tieneInforme: boolean };
		informePdfUrl: string | null;
		pacienteName: string;
	} | null>(null);
	const itemsPerPage = 5;

	// Si viene desde otra página con una cita seleccionada, abrir el modal
	useEffect(() => {
		const state = location.state as { selectedCitaId?: string } | null;
		if (state?.selectedCitaId) {
			setSelectedCitaId(state.selectedCitaId);
			// Limpiar el state para que no se abra de nuevo al navegar
			window.history.replaceState({}, document.title);
		}
	}, [location.state]);

	const { data: citas = [], isLoading: loadingCitas } = useGetMisCitasQuery(
		undefined,
		{
			skip: !isEspecialista,
		}
	);

	const { data: informes = [], isLoading: loadingInformes } =
		useGetMisInformesQuery(undefined, {
			skip: !isEspecialista,
		});

	// Para moderadores: obtener todos los informes completados
	const { data: allInformes = [], isLoading: loadingAllInformes } =
		useGetAllInformesQuery(undefined, {
			skip: !isModerador,
		});

	// Para moderadores: obtener citas atendidas sin informe
	const { data: citasPendientes = [], isLoading: loadingCitasPendientes } =
		useGetCitasAtendidasSinInformeQuery(undefined, {
			skip: !isModerador,
		});

	const [recordarEspecialista, { isLoading: isRecording }] = useRecordarEspecialistaMutation();

	// Crear un mapa de informes por id_cita para búsqueda rápida
	const informesMap = useMemo(() => {
		const map = new Map<string, typeof informes[0]>();
		informes.forEach((informe) => {
			map.set(informe.id_cita, informe);
		});
		return map;
	}, [informes]);

	// Filtrar solo citas atendidas (estado_cita = 3) y combinar con información de informes
	const citasConInformes = useMemo(() => {
		return citas
			.filter((cita) => Number(cita.estado_cita) === 3) // Solo citas atendidas
			.map((cita) => ({
				...cita,
				informe: informesMap.get(cita.id_cita) || null,
				tieneInforme: informesMap.has(cita.id_cita),
			}));
	}, [citas, informesMap]);

	// Filtrar citas por estado y búsqueda (incluyendo cédula) - para especialistas
	const filteredCitas = useMemo(() => {
		let items = citasConInformes;

		// Filtrar por estado
		if (filtroEstado === "completado") {
			items = items.filter((cita) => cita.tieneInforme);
		} else if (filtroEstado === "pendiente") {
			items = items.filter((cita) => !cita.tieneInforme);
		}

		// Filtrar por búsqueda (incluyendo cédula)
		const normalized = query.trim().toLowerCase();
		if (normalized) {
			items = items.filter((cita) => {
				const cedula = cita.paciente_cedula || "";
				const haystack = `${cita.paciente_nombre} ${cita.paciente_apellido} ${cedula} ${cita.eco_nombre} ${getDateKey(cita.fecha_cita)}`.toLowerCase();
				return haystack.includes(normalized);
			});
		}

		return items;
	}, [citasConInformes, filtroEstado, query]);

	// Paginación para especialistas
	const totalPagesEspecialista = Math.max(1, Math.ceil(filteredCitas.length / itemsPerPage));
	const paginatedCitas = useMemo(() => {
		const startIndex = (currentPageEspecialista - 1) * itemsPerPage;
		return filteredCitas.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredCitas, currentPageEspecialista, itemsPerPage]);

	// Resetear página cuando cambian los filtros (especialista)
	useEffect(() => {
		if (isEspecialista) {
			setCurrentPageEspecialista(1);
		}
	}, [filtroEstado, query, isEspecialista]);

	// Listas separadas para Moderador
	const filteredModPendientes = useMemo(() => {
		if (!isModerador) return [];
		let items = citasPendientes;
		const normalized = query.trim().toLowerCase();
		if (normalized) {
			items = items.filter((item) => {
				const cedula = (item as any).paciente_cedula || "";
				const haystack = `${item.paciente_nombre} ${item.paciente_apellido} ${cedula} ${(item as any).especialista_nombre || ""} ${(item as any).especialista_apellido || ""} ${item.eco_nombre} ${getDateKey((item as any).fecha_cita)}`.toLowerCase();
				return haystack.includes(normalized);
			});
		}
		return items;
	}, [citasPendientes, query, isModerador]);

	const filteredModCompletados = useMemo(() => {
		if (!isModerador) return [];
		let items = allInformes;
		const normalized = query.trim().toLowerCase();
		if (normalized) {
			items = items.filter((item) => {
				const cedula = (item as any).paciente_cedula || "";
				const haystack = `${item.paciente_nombre} ${item.paciente_apellido} ${cedula} ${(item as any).especialista_nombre || ""} ${(item as any).especialista_apellido || ""} ${item.eco_nombre} ${getDateKey((item as any).fecha_cita)}`.toLowerCase();
				return haystack.includes(normalized);
			});
		}
		return items;
	}, [allInformes, query, isModerador]);

	// Paginación para moderadores (pendientes)
	const totalPagesModPendientes = Math.max(1, Math.ceil(filteredModPendientes.length / itemsPerPage));
	const paginatedModPendientes = useMemo(() => {
		const startIndex = (currentPageModPendientes - 1) * itemsPerPage;
		return filteredModPendientes.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredModPendientes, currentPageModPendientes, itemsPerPage]);

	// Paginación para moderadores (completados)
	const totalPagesModCompletados = Math.max(1, Math.ceil(filteredModCompletados.length / itemsPerPage));
	const paginatedModCompletados = useMemo(() => {
		const startIndex = (currentPageModCompletados - 1) * itemsPerPage;
		return filteredModCompletados.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredModCompletados, currentPageModCompletados, itemsPerPage]);

	// Resetear página cuando cambia la búsqueda (moderador)
	useEffect(() => {
		if (isModerador) {
			setCurrentPageModPendientes(1);
			setCurrentPageModCompletados(1);
		}
	}, [query, isModerador]);

	// Si es moderador, mostrar todos los informes completados
	if (isModerador) {

		return (
			<div className="space-y-6">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold text-brand-900">Informes</h1>
					<p className="text-sm text-brand-800">
						Visualiza todos los informes completados por los especialistas.
					</p>
				</div>

				{/* Resumen */}
				<div className="grid gap-4 md:grid-cols-3">
					<div className="rounded-2xl bg-paper p-4 shadow-sm">
						<p className="text-xs font-semibold text-brand-800">
							Total de informes completados
						</p>
						<p className="mt-2 text-2xl font-semibold text-brand-900">
							{allInformes.length}
						</p>
					</div>
					<div className="rounded-2xl bg-paper p-4 shadow-sm">
						<p className="text-xs font-semibold text-brand-800">
							Citas pendientes de informe
						</p>
						<p className="mt-2 text-2xl font-semibold text-brand-900">
							{citasPendientes.length}
						</p>
					</div>
					<div className="rounded-2xl bg-paper p-4 shadow-sm">
						<p className="text-xs font-semibold text-brand-800">
							Total
						</p>
						<p className="mt-2 text-2xl font-semibold text-brand-900">
							{allInformes.length + citasPendientes.length}
						</p>
					</div>
				</div>

				{/* Buscador general */}
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
					<input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Buscar por nombre, cédula, especialista..."
						className="h-10 w-full rounded-full border border-mist bg-paper px-4 text-xs text-brand-900 outline-none focus:border-brand-700 shadow-sm sm:max-w-xs"
					/>
				</div>

				{/* Lista de citas pendientes */}
				<div className="rounded-2xl bg-paper p-6 shadow-sm">
					<h2 className="text-lg font-semibold text-brand-900 mb-4">
						Citas pendientes de informe
					</h2>

					{loadingCitasPendientes ? (
						<p className="mt-4 text-sm text-brand-800">Cargando citas pendientes...</p>
					) : (
						<>
							<div className="space-y-3">
								{paginatedModPendientes.length ? (
									paginatedModPendientes.map((item) => {
										const pacienteFullName = `${item.paciente_nombre} ${item.paciente_apellido}`;
										const especialistaFullName = `${(item as any).especialista_nombre} ${(item as any).especialista_apellido}`;

										return (
											<div
												key={item.id_cita}
												className="rounded-lg border border-paper-200 bg-paper p-4"
											>
												<div className="flex flex-col gap-4 md:grid md:grid-cols-5 md:items-center">
													<div className="flex flex-col">
														<div className="flex items-center gap-2 flex-wrap">
															<h3 className="font-semibold text-brand-900">
																{pacienteFullName}
															</h3>
															{(item as any).paciente_cedula && (
																<span className="text-xs text-brand-600">
																	({(item as any).paciente_cedula})
																</span>
															)}
														</div>
													</div>
													<div className="flex flex-col">
														<span className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider">Especialista</span>
														<p className="mt-1 text-sm text-brand-900">
															{especialistaFullName}
														</p>
													</div>
													<div className="flex flex-col">
														<span className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider">Estudio y Fecha</span>
														<p className="mt-1 text-sm text-brand-900">
															{item.eco_nombre} <br />
															<span className="text-xs text-brand-800">{formatFecha(item.fecha_cita)} · {formatHora(item.hora_cita)}</span>
														</p>
													</div>
													<div className="flex md:justify-center">
														<span className="inline-block rounded-full bg-yellow-500 px-2 py-1 text-[10px] text-paper">
															Pendiente
														</span>
													</div>
													<div className="flex justify-end lg:justify-start">
														<button
															type="button"
															disabled={isRecording}
															onClick={async () => {
																try {
																	await recordarEspecialista({ id_cita: item.id_cita }).unwrap();
																	Swal.fire({
																		title: "¡Recordatorio enviado!",
																		text: "El especialista ha recibido una notificación recordando que debe subir el informe.",
																		icon: "success",
																		confirmButtonColor: "#1C837F",
																	});
																} catch (err: any) {
																	Swal.fire({
																		title: "Error",
																		text: err?.data?.message || "No se pudo enviar el recordatorio",
																		icon: "error",
																		confirmButtonColor: "#1C837F",
																	});
																}
															}}
															className="rounded-full bg-brand-700 px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-paper transition-colors hover:bg-brand-800 disabled:opacity-50"
														>
															Recordar especialista
														</button>
													</div>
												</div>
											</div>
										);
									})
								) : (
									<p className="py-6 text-center text-sm text-brand-800">
										{query.trim()
											? "No se encontraron citas pendientes con ese criterio."
											: "No hay citas pendientes de informe."}
									</p>
								)}
							</div>

							{filteredModPendientes.length > itemsPerPage && (
								<div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-mist pt-4 sm:flex-row">
									<p className="text-xs text-brand-800">
										Mostrando {paginatedModPendientes.length > 0 ? (currentPageModPendientes - 1) * itemsPerPage + 1 : 0} -{" "}
										{Math.min(currentPageModPendientes * itemsPerPage, filteredModPendientes.length)} de{" "}
										{filteredModPendientes.length}
									</p>
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => setCurrentPageModPendientes((prev) => Math.max(1, prev - 1))}
											disabled={currentPageModPendientes === 1}
											className="rounded-full border border-mist bg-paper px-3 py-1.5 text-xs text-brand-800 transition-colors hover:bg-cloud disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Anterior
										</button>
										<span className="text-xs text-brand-800">
											Página {currentPageModPendientes} de {totalPagesModPendientes}
										</span>
										<button
											type="button"
											onClick={() => setCurrentPageModPendientes((prev) => Math.min(totalPagesModPendientes, prev + 1))}
											disabled={currentPageModPendientes >= totalPagesModPendientes}
											className="rounded-full border border-mist bg-paper px-3 py-1.5 text-xs text-brand-800 transition-colors hover:bg-cloud disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Siguiente
										</button>
									</div>
								</div>
							)}
						</>
					)}
				</div>

				{/* Historial de informes completados */}
				<div className="rounded-2xl bg-paper p-6 shadow-sm">
					<h2 className="text-lg font-semibold text-brand-900 mb-4">
						Historial de informes
					</h2>

					{loadingAllInformes ? (
						<p className="mt-4 text-sm text-brand-800">Cargando informes completados...</p>
					) : (
						<>
							<div className="space-y-3">
								{paginatedModCompletados.length ? (
									paginatedModCompletados.map((item) => {
										const pacienteFullName = `${item.paciente_nombre} ${item.paciente_apellido}`;
										const especialistaFullName = `${(item as any).especialista_nombre} ${(item as any).especialista_apellido}`;
										const informe = item as typeof allInformes[0];

										return (
											<div
												key={informe.id_informe}
												className="rounded-lg border border-brand-200 bg-brand-50/30 p-4"
											>
												<div className="flex flex-col gap-4 md:grid md:grid-cols-5 md:items-center">
													<div className="flex flex-col">
														<div className="flex items-center gap-2 flex-wrap">
															<h3 className="font-semibold text-brand-900">
																{pacienteFullName}
															</h3>
															{(item as any).paciente_cedula && (
																<span className="text-xs text-brand-600">
																	({(item as any).paciente_cedula})
																</span>
															)}
														</div>
													</div>
													<div className="flex flex-col">
														<span className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider">Especialista</span>
														<p className="mt-1 text-sm text-brand-900">
															{especialistaFullName}
														</p>
													</div>
													<div className="flex flex-col">
														<span className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider">Estudio y Fecha</span>
														<p className="mt-1 text-sm text-brand-900">
															{item.eco_nombre} <br />
															<span className="text-xs text-brand-800">{formatFecha(item.fecha_cita)} · {formatHora(item.hora_cita)}</span>
														</p>
													</div>
													<div className="flex md:justify-center">
														<span className="inline-block rounded-full bg-brand-700 px-2 py-1 text-[10px] text-paper">
															Informe completo
														</span>
													</div>
													<div className="flex md:justify-end">
														{informe.informe_pdf_url ? (
															<button
																type="button"
																onClick={() => {
																	const fileName = `Informe-${pacienteFullName}-${item.fecha_cita}.pdf`.replace(/\s+/g, "-");
																	setPdfFileName(fileName);
																	setPdfViewerUrl(informe.informe_pdf_url!);
																}}
																className="rounded-full border border-brand-700 bg-paper px-4 py-2 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50"
															>
																Ver PDF
															</button>
														) : null}
													</div>
												</div>
											</div>
										);
									})
								) : (
									<p className="py-6 text-center text-sm text-brand-800">
										{query.trim()
											? "No se encontraron informes completados con ese criterio."
											: "No hay informes completados."}
									</p>
								)}
							</div>

							{filteredModCompletados.length > itemsPerPage && (
								<div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-mist pt-4 sm:flex-row">
									<p className="text-xs text-brand-800">
										Mostrando {paginatedModCompletados.length > 0 ? (currentPageModCompletados - 1) * itemsPerPage + 1 : 0} -{" "}
										{Math.min(currentPageModCompletados * itemsPerPage, filteredModCompletados.length)} de{" "}
										{filteredModCompletados.length}
									</p>
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => setCurrentPageModCompletados((prev) => Math.max(1, prev - 1))}
											disabled={currentPageModCompletados === 1}
											className="rounded-full border border-mist bg-paper px-3 py-1.5 text-xs text-brand-800 transition-colors hover:bg-cloud disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Anterior
										</button>
										<span className="text-xs text-brand-800">
											Página {currentPageModCompletados} de {totalPagesModCompletados}
										</span>
										<button
											type="button"
											onClick={() => setCurrentPageModCompletados((prev) => Math.min(totalPagesModCompletados, prev + 1))}
											disabled={currentPageModCompletados >= totalPagesModCompletados}
											className="rounded-full border border-mist bg-paper px-3 py-1.5 text-xs text-brand-800 transition-colors hover:bg-cloud disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Siguiente
										</button>
									</div>
								</div>
							)}
						</>
					)}
				</div>

				{pdfViewerUrl && (
					<PDFViewerModal
						pdfUrl={pdfViewerUrl}
						fileName={pdfFileName || undefined}
						onClose={() => {
							setPdfViewerUrl(null);
							setPdfFileName(null);
						}}
					/>
				)}
			</div>
		);
	}

	if (!isEspecialista) {
		return (
			<div className="space-y-6">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold text-brand-900">Informes</h1>
					<p className="text-sm text-brand-800">
						Gestión de informes disponible para especialistas y moderadores.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h1 className="text-4xl font-bold text-brand-900">Informes</h1>
				<p className="max-w-2xl text-base leading-relaxed text-brand-800 md:text-lg">
					Genera y gestiona informes médicos. Solo se muestran citas que han sido atendidas.
				</p>
			</div>

			{/* Resumen */}
			<div className="grid gap-4 md:grid-cols-3">
				<div className="rounded-2xl bg-paper p-4 shadow-sm">
					<p className="text-xs font-semibold text-brand-800">
						Citas atendidas
					</p>
					<p className="mt-2 text-2xl font-semibold text-brand-900">
						{citasConInformes.length}
					</p>
				</div>
				<div className="rounded-2xl bg-paper p-4 shadow-sm">
					<p className="text-xs font-semibold text-brand-800">
						Informes completados
					</p>
					<p className="mt-2 text-2xl font-semibold text-brand-900">
						{informes.length}
					</p>
				</div>
				<div className="rounded-2xl bg-paper p-4 shadow-sm">
					<p className="text-xs font-semibold text-brand-800">
						Pendientes de informe
					</p>
					<p className="mt-2 text-2xl font-semibold text-brand-900">
						{citasConInformes.length - informes.length}
					</p>
				</div>
			</div>

			{/* Lista de citas */}
			<div className="rounded-2xl bg-paper p-6 shadow-sm">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 className="text-base font-semibold text-brand-900">
							Listado de citas atendidas
						</h2>
						<p className="text-xs text-brand-800">
							Busca por nombre, cédula, eco o fecha. Haz click en una cita para crear o ver su informe.
						</p>
					</div>
					<div className="flex flex-col gap-2 sm:flex-row">
						<select
							value={filtroEstado}
							onChange={(e) => setFiltroEstado(e.target.value as "todos" | "completado" | "pendiente")}
							className="h-10 rounded-full border border-mist bg-cloud px-4 text-xs text-brand-900 outline-none focus:border-brand-700"
						>
							<option value="todos">Todos</option>
							<option value="completado">Completados</option>
							<option value="pendiente">Pendientes</option>
						</select>
						<input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Buscar por nombre, cédula..."
							className="h-10 rounded-full border border-mist bg-cloud px-4 text-xs text-brand-900 outline-none focus:border-brand-700"
						/>
					</div>
				</div>

				{loadingCitas || loadingInformes ? (
					<p className="mt-4 text-sm text-brand-800">Cargando citas...</p>
				) : (
					<>
						<div className="mt-4 space-y-3">
							{paginatedCitas.length ? (
								paginatedCitas.map((cita) => {
									const fullName = `${cita.paciente_nombre} ${cita.paciente_apellido}`;
									const tieneInforme = cita.tieneInforme;
									return (
										<div
											key={cita.id_cita}
											className="cursor-pointer rounded-lg border border-mist bg-cloud p-4 transition-colors hover:border-brand-700 hover:bg-mint/10"
											onClick={() => setSelectedCitaId(cita.id_cita)}
										>
											<div className="flex items-center justify-between">
												<div className="flex-1">
													<div className="flex items-center gap-2 flex-wrap">
														<h3 className="font-semibold text-brand-900">
															{fullName}
														</h3>
														{cita.id_representado ? (
															<span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700" title="Representado">
																<Check className="h-3 w-3" /> Representado
															</span>
														) : (
															<span className="inline-flex items-center gap-0.5 rounded-full bg-brand-200 px-2 py-0.5 text-xs font-medium text-brand-600" title="No representado">
																<X className="h-3 w-3" /> No representado
															</span>
														)}
														{tieneInforme ? (
															<span className="rounded-full bg-brand-700 px-2 py-1 text-[10px] text-paper">
																Con informe
															</span>
														) : (
															<span className="rounded-full bg-cloud px-2 py-1 text-[10px] text-brand-800">
																Sin informe
															</span>
														)}
													</div>
													<p className="mt-1 text-xs text-brand-800">
														{cita.eco_nombre} · {formatFecha(cita.fecha_cita)} ·{" "}
														{formatHora(cita.hora_cita)}
													</p>
												</div>
												<div className="ml-4 flex gap-2 flex-shrink-0">
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															setSelectedCitaForVer({
																cita,
																informePdfUrl: cita.informe?.informe_pdf_url ?? null,
																pacienteName: fullName,
															});
														}}
														className="rounded-full border border-brand-700 bg-paper px-4 py-2 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50"
													>
														Ver cita
													</button>
													{tieneInforme && cita.informe?.informe_pdf_url ? (
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																const fileName = `Informe-${fullName}-${cita.fecha_cita}.pdf`.replace(/\s+/g, "-");
																setPdfFileName(fileName);
																setPdfViewerUrl(cita.informe!.informe_pdf_url!);
															}}
															className="rounded-full bg-brand-700 px-4 py-2 text-xs font-medium text-paper transition-colors hover:bg-brand-800"
														>
															Ver PDF
														</button>
													) : null}
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															setSelectedCitaId(cita.id_cita);
														}}
														className="rounded-full border border-mint px-4 py-2 text-xs font-medium text-brand-800 transition-colors hover:border-brand-700 hover:bg-mint/20"
													>
														{tieneInforme ? "Editar informe" : "Crear informe"}
													</button>
												</div>
											</div>
										</div>
									);
								})
							) : (
								<p className="py-6 text-center text-sm text-brand-800">
									{query.trim() || filtroEstado !== "todos"
										? "No se encontraron resultados con ese criterio."
										: "No hay citas para mostrar."}
								</p>
							)}
						</div>

						{/* Paginación */}
						{filteredCitas.length > itemsPerPage && (
							<div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-mist pt-4 sm:flex-row">
								<p className="text-xs text-brand-800">
									Mostrando {paginatedCitas.length > 0 ? (currentPageEspecialista - 1) * itemsPerPage + 1 : 0} -{" "}
									{Math.min(currentPageEspecialista * itemsPerPage, filteredCitas.length)} de{" "}
									{filteredCitas.length} items
								</p>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => setCurrentPageEspecialista((prev) => Math.max(1, prev - 1))}
										disabled={currentPageEspecialista === 1}
										className="rounded-full border border-mist bg-paper px-3 py-1.5 text-xs text-brand-800 transition-colors hover:bg-cloud disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Anterior
									</button>
									<span className="text-xs text-brand-800">
										Página {currentPageEspecialista} de {totalPagesEspecialista}
									</span>
									<button
										type="button"
										onClick={() => setCurrentPageEspecialista((prev) => Math.min(totalPagesEspecialista, prev + 1))}
										disabled={currentPageEspecialista >= totalPagesEspecialista}
										className="rounded-full border border-mist bg-paper px-3 py-1.5 text-xs text-brand-800 transition-colors hover:bg-cloud disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Siguiente
									</button>
								</div>
							</div>
						)}
					</>
				)}
			</div>

			{/* Modal de formulario de informe */}
			{selectedCitaId && (
				<InformeFormModal
					cita={citasConInformes.find((c) => c.id_cita === selectedCitaId)!}
					onClose={() => setSelectedCitaId(null)}
					onSuccess={() => {
						setSelectedCitaId(null);
						// Los datos se actualizarán automáticamente gracias a RTK Query
					}}
				/>
			)}
			{selectedCitaForVer && (
				<VerCitaEspecialistaModal
					citaFromList={selectedCitaForVer.cita}
					informePdfUrl={selectedCitaForVer.informePdfUrl}
					pacienteName={selectedCitaForVer.pacienteName}
					onClose={() => setSelectedCitaForVer(null)}
					onVerPdf={(url, fileName) => {
						setPdfViewerUrl(url);
						setPdfFileName(fileName);
						setSelectedCitaForVer(null);
					}}
				/>
			)}
			{pdfViewerUrl && (
				<PDFViewerModal
					pdfUrl={pdfViewerUrl}
					fileName={pdfFileName || undefined}
					onClose={() => {
						setPdfViewerUrl(null);
						setPdfFileName(null);
					}}
				/>
			)}
		</div>
	);
};

export default InformesPage;
