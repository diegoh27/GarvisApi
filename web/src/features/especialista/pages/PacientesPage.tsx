import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { PageShell, useAuth, formatFechaLocal } from "../../../shared";
import type { CitaEspecialista } from "../types";
import { useGetMisCitasQuery, useMarcarAtendidaMutation } from "../especialistaApi";
import { useGetMisInformesQuery } from "../informesApi";
import ContactoModal, {
	type ContactoPaciente,
} from "../components/ContactoModal";
import HistorialModal from "../components/HistorialModal";
import PDFViewerModal from "../components/PDFViewerModal";
import VerCitaEspecialistaModal from "../components/VerCitaEspecialistaModal";

const estadoCitaLabel: Record<number, string> = {
	0: "Pendiente",
	1: "Confirmada",
	2: "Cancelada",
	3: "Atendida",
};

const estadoResultadoLabel: Record<number, string> = {
	0: "Pendiente",
	1: "Vacío",
	2: "Con resultados",
};

const getEstadoCitaClasses = (estado: number) => {
	if (estado === 2) return "bg-red-50 text-red-600 border border-red-200"; // Cancelada
	if (estado === 0) return "bg-amber-50 text-amber-700 border border-amber-200"; // Pendiente
	return "bg-cloud text-brand-800 border border-brand-200"; // Atendida / Confirmada
};

const getEstadoPagoClasses = (estado: number) => {
	if (estado === 2) return "bg-red-50 text-red-600 border border-red-200"; // Negado
	if (estado === 0) return "bg-amber-50 text-amber-700 border border-amber-200"; // Pendiente
	return "bg-emerald-50 text-emerald-700 border border-emerald-200"; // Pagado
};

const getResultadosInfo = (cita: CitaEspecialista, archivosLength: number) => {
	if (cita.estado_cita === 2 || cita.estado_pago !== 1) {
		return { label: "N/A", classes: "bg-slate-100 text-slate-500 border border-slate-200" };
	}
	if (archivosLength > 0) {
		return { label: "Subido", classes: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
	}
	return { label: "Pendiente", classes: "bg-amber-50 text-amber-700 border border-amber-200" };
};

const getDateKey = (value: string | Date): string => {
	if (!value) return "";
	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}
	return value.includes("T") ? value.split("T")[0] : value;
};

const formatHora = (value: string) => {
	const [hourValue, minuteValue] = value.split(":");
	const hour = Number(hourValue);
	const period = hour >= 12 ? "PM" : "AM";
	const normalized = ((hour + 11) % 12) + 1;
	return `${normalized}:${minuteValue} ${period}`;
};

const formatFecha = (value: string | Date) => formatFechaLocal(getDateKey(value) || String(value));

const getEstadoCitaLabel = (cita: CitaEspecialista) =>
	estadoCitaLabel[cita.estado_cita] ?? `Estado ${cita.estado_cita}`;


const PacientesPage = () => {
	const { user, token } = useAuth();
	const isEspecialista = user?.rol === "especialista";
	const shouldFetch = isEspecialista && !!token;
	const [error] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [estado, setEstado] = useState("todos");
	const [filtroResultado, setFiltroResultado] = useState("todos"); // "todos", "sin-resultado", "con-resultado"
	const [currentPage, setCurrentPage] = useState(1);
	const [citasPage, setCitasPage] = useState(1);
	const [citasHistorialPage, setCitasHistorialPage] = useState(1);
	const [selectedPaciente, setSelectedPaciente] = useState<{
		id: string;
		name: string;
	} | null>(null);
	/** Cita desde la que se abrió "Ver historial"; se marcará como atendida al abrir si aplica */
	const [citaParaMarcarAtendida, setCitaParaMarcarAtendida] = useState<CitaEspecialista | null>(null);
	const [selectedCitaParaVer, setSelectedCitaParaVer] = useState<{
		cita: CitaEspecialista;
		informePdfUrl: string | null;
	} | null>(null);
	const [contactoPaciente, setContactoPaciente] =
		useState<ContactoPaciente | null>(null);
	const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
	const [pdfFileName, setPdfFileName] = useState<string | null>(null);
	const [marcarAtendida] = useMarcarAtendidaMutation();
	const { data: rawCitas = [], isFetching: loading } = useGetMisCitasQuery(
		undefined,
		{
			skip: !shouldFetch,
		},
	);
	const { data: informes = [] } = useGetMisInformesQuery(undefined, {
		skip: !shouldFetch,
	});

	// Crear mapa de informes por id_cita
	const informesMap = useMemo(() => {
		const map = new Map<string, typeof informes[0]>();
		informes.forEach((informe) => {
			map.set(informe.id_cita, informe);
		});
		return map;
	}, [informes]);
	const citas = useMemo(
		() =>
			rawCitas.map((cita) => ({
				...cita,
				estado_pago: Number(cita.estado_pago),
				estado_cita: Number(cita.estado_cita),
			})),
		[rawCitas],
	);


	const getResultadoLabel = (cita: CitaEspecialista) =>
		cita.resultado_estado !== null && cita.resultado_estado !== undefined
			? estadoResultadoLabel[cita.resultado_estado] ??
			`Estado ${cita.resultado_estado}`
			: "Pendiente";

	const handleAtenderCita = async (cita: CitaEspecialista) => {
		if (cita.estado_pago !== 1) {
			await Swal.fire({
				title: "Pago pendiente",
				text: "No puedes marcar esta cita hasta que el pago sea aprobado.",
				icon: "info",
				confirmButtonText: "Entendido",
				confirmButtonColor: "#1C837F",
			});
			return;
		}
		if (cita.estado_cita === 3) {
			await Swal.fire({
				title: "Cita ya atendida",
				icon: "info",
				confirmButtonText: "Listo",
				confirmButtonColor: "#1C837F",
			});
			return;
		}
		if (cita.estado_cita === 2) {
			await Swal.fire({
				title: "Cita cancelada",
				text: "No puedes marcar como atendida una cita cancelada.",
				icon: "info",
				confirmButtonText: "Entendido",
				confirmButtonColor: "#1C837F",
			});
			return;
		}
		const today = new Date().toISOString().slice(0, 10);
		if (getDateKey(cita.fecha_cita) > today) {
			await Swal.fire({
				title: "Aún no puedes marcar esta cita",
				text: "Solo puedes marcar como atendida cuando llegue el día.",
				icon: "info",
				confirmButtonText: "Entendido",
				confirmButtonColor: "#1C837F",
			});
			return;
		}
		const confirmResult = await Swal.fire({
			title: "¿Marcar cita como atendida?",
			text: "Esta acción confirma que el paciente fue atendido.",
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Sí, atender",
			cancelButtonText: "No",
			confirmButtonColor: "#1C837F",
			cancelButtonColor: "#9FD8E1",
		});
		if (!confirmResult.isConfirmed) return;
		try {
			await marcarAtendida(cita.id_cita).unwrap();
		} catch (err) {
			await Swal.fire({
				title: "No se pudo marcar",
				text: (err as Error).message ?? "No se pudo marcar como atendida la cita.",
				icon: "error",
				confirmButtonText: "Entendido",
				confirmButtonColor: "#1C837F",
			});
		}
	};

	// Función para parsear el archivo (puede ser string simple o JSON array)
	const parseResultadoArchivo = (archivo: string | null | undefined): string[] => {
		if (!archivo) return [];
		try {
			const parsed = JSON.parse(archivo);
			const urls = Array.isArray(parsed) ? parsed : [archivo];
			// Validar y corregir URLs que no tengan protocolo
			return urls.map((url) => {
				if (!url) return url;
				const trimmedUrl = url.trim();
				if (!trimmedUrl.match(/^https?:\/\//i)) {
					return `https://${trimmedUrl}`;
				}
				return trimmedUrl;
			});
		} catch {
			// Si no es JSON, tratar como string simple
			const trimmedUrl = archivo.trim();
			if (!trimmedUrl.match(/^https?:\/\//i)) {
				return [`https://${trimmedUrl}`];
			}
			return [trimmedUrl];
		}
	};

	const filteredCitas = useMemo(() => {
		const normalized = query.trim().toLowerCase();
		const today = new Date().toISOString().slice(0, 10);
		const filtered = citas.filter((cita) => {
			const citaDateKey = getDateKey(cita.fecha_cita);
			let matchesEstado = true;
			switch (estado) {
				case "atendidas":
					matchesEstado = cita.estado_cita === 3;
					break;
				case "confirmadas":
					matchesEstado = cita.estado_cita === 1 && citaDateKey >= today;
					break;
				case "pendientes":
					matchesEstado = cita.estado_cita === 0;
					break;
				case "canceladas":
					matchesEstado = cita.estado_cita === 2;
					break;
				default:
					matchesEstado = true;
			}

			// Filtro por resultado
			let matchesResultado = true;
			if (filtroResultado === "sin-resultado") {
				matchesResultado = !cita.resultado_archivo || cita.resultado_archivo === "" || cita.resultado_archivo === "[]";
			} else if (filtroResultado === "con-resultado") {
				const archivos = parseResultadoArchivo(cita.resultado_archivo);
				matchesResultado = archivos.length > 0;
			}

			if (!normalized) return matchesEstado && matchesResultado;
			const haystack =
				`${cita.paciente_nombre} ${cita.paciente_apellido} ${cita.eco_nombre} ${citaDateKey}`.toLowerCase();
			return matchesEstado && matchesResultado && haystack.includes(normalized);
		});

		// Ordenar por fecha más reciente primero (descendente)
		return filtered.sort((a, b) => {
			const dateA = new Date(`${getDateKey(a.fecha_cita)}T${a.hora_cita}`).getTime();
			const dateB = new Date(`${getDateKey(b.fecha_cita)}T${b.hora_cita}`).getTime();
			return dateB - dateA; // Más reciente primero
		});
	}, [citas, estado, query, filtroResultado]);

	// Izquierda: agrupar por paciente desde TODAS las citas (sin filtros)
	const citasOrdenadas = useMemo(() => {
		return [...citas].sort((a, b) => {
			const dateA = new Date(`${getDateKey(a.fecha_cita)}T${a.hora_cita}`).getTime();
			const dateB = new Date(`${getDateKey(b.fecha_cita)}T${b.hora_cita}`).getTime();
			return dateB - dateA;
		});
	}, [citas]);

	const pacientesAgrupados = useMemo(() => {
		const seen = new Set<string>();
		const result: CitaEspecialista[] = [];
		for (const cita of citasOrdenadas) {
			if (!seen.has(cita.id_paciente)) {
				seen.add(cita.id_paciente);
				result.push(cita);
			}
		}
		return result;
	}, [citasOrdenadas]);

	// Paginación izquierda (pacientes): 5 por página
	const itemsPerPage = 5;
	const totalPages = Math.max(1, Math.ceil(pacientesAgrupados.length / itemsPerPage));
	const paginatedPacientes = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return pacientesAgrupados.slice(startIndex, startIndex + itemsPerPage);
	}, [pacientesAgrupados, currentPage, itemsPerPage]);

	const citasPorAtenderArr = useMemo(() => {
		return filteredCitas.filter(c => (c.estado_cita === 0 || c.estado_cita === 1) && c.estado_pago !== 2);
	}, [filteredCitas]);

	const citasHistorialArr = useMemo(() => {
		return filteredCitas.filter(c => c.estado_cita === 2 || c.estado_cita === 3 || c.estado_pago === 2);
	}, [filteredCitas]);

	useEffect(() => {
		setCitasPage(1);
		setCitasHistorialPage(1);
	}, [estado, query, filtroResultado]);



	const historialPaciente = useMemo(() => {
		if (!selectedPaciente) return [];
		return citas.filter((cita) => cita.id_paciente === selectedPaciente.id);
	}, [citas, selectedPaciente]);

	const renderCitasTable = (listaCitas: CitaEspecialista[], pageState: number, setPageState: (val: number | ((prev: number) => number)) => void) => {
		const itemsPerPage = 10;
		const totalPages = Math.max(1, Math.ceil(listaCitas.length / itemsPerPage));
		const paginated = listaCitas.slice((pageState - 1) * itemsPerPage, pageState * itemsPerPage);

		return (
			<div className="mt-4 flex flex-col flex-1 min-h-0">
				<div className="overflow-auto flex-1 min-h-0">
					<table className="w-full text-left text-xs text-brand-800">
						<thead>
							<tr className="border-b border-mist text-[11px] uppercase text-brand-700">
								<th className="px-2 py-2 whitespace-nowrap">Fecha</th>
								<th className="px-2 py-2 whitespace-nowrap">Hora</th>
								<th className="px-2 py-2 whitespace-nowrap">Paciente</th>
								<th className="px-2 py-2 whitespace-nowrap">Eco</th>
								<th className="px-2 py-2 text-center whitespace-nowrap">Resultados</th>
								<th className="px-2 py-2 text-center whitespace-nowrap">Estado</th>
								<th className="px-2 py-2 text-center whitespace-nowrap">Pago</th>
								<th className="px-2 py-2 text-center whitespace-nowrap">Cita</th>
								<th className="px-2 py-2 text-center whitespace-nowrap">Atender</th>
								<th className="px-2 py-2 text-center whitespace-nowrap">Historial</th>
							</tr>
						</thead>
						<tbody>
							{paginated.length > 0 ? (
								paginated.map((cita) => {
									const fullName = `${cita.paciente_nombre ?? ""} ${cita.paciente_apellido ?? ""}`.trim();
									return (
										<tr key={cita.id_cita} className="border-b border-mist/70">
											<td className="px-2 py-2 whitespace-nowrap">{formatFecha(cita.fecha_cita)}</td>
											<td className="px-2 py-2 whitespace-nowrap">{formatHora(cita.hora_cita)}</td>
											<td className="px-2 py-2 font-medium text-brand-900">{fullName || "—"}</td>
											<td className="px-2 py-2">{cita.eco_nombre}</td>
											<td className="px-2 py-2 text-center">
												<span className={`rounded-full px-2 py-0.5 text-[11px] ${getResultadosInfo(cita, parseResultadoArchivo(cita.resultado_archivo).length).classes}`}>
													{getResultadosInfo(cita, parseResultadoArchivo(cita.resultado_archivo).length).label}
												</span>
											</td>
											<td className="px-2 py-2 text-center">
												<span className={`rounded-full px-2 py-0.5 text-[11px] ${getEstadoCitaClasses(cita.estado_cita)}`}>
													{getEstadoCitaLabel(cita)}
												</span>
											</td>
											<td className="px-2 py-2 text-center">
												<span className={`rounded-full px-2 py-0.5 text-[11px] ${getEstadoPagoClasses(cita.estado_pago)}`}>
													{cita.estado_pago === 1 ? "Pagado" : cita.estado_pago === 0 ? "Pendiente" : "Negado"}
												</span>
											</td>
											<td className="px-2 py-2 text-center">
												<button
													type="button"
													onClick={() =>
														setSelectedCitaParaVer({
															cita,
															informePdfUrl: informesMap.get(cita.id_cita)?.informe_pdf_url ?? null,
														})
													}
													className="rounded-full border border-mint px-2 py-0.5 text-[11px] text-brand-800 hover:bg-cloud"
												>
													Ver
												</button>
											</td>
											<td className="px-2 py-2 text-center">
												{cita.estado_cita === 3 ? (
													<span className="rounded-full bg-cloud px-2 py-0.5 text-[11px] text-brand-800">
														Atendida
													</span>
												) : (
													<button
														type="button"
														disabled={cita.estado_cita === 2 || cita.estado_pago === 2}
														onClick={() => handleAtenderCita(cita)}
														className="rounded-full border border-mint px-2 py-0.5 text-[11px] text-brand-800 hover:bg-cloud disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 disabled:hover:bg-slate-100"
													>
														Atender
													</button>
												)}
											</td>
											<td className="px-2 py-2 text-center">
												<button
													type="button"
													onClick={() => {
														setSelectedPaciente({ id: cita.id_paciente, name: fullName || "Paciente" });
														setCitaParaMarcarAtendida(cita);
													}}
													className="rounded-full border border-mint px-2 py-0.5 text-[11px] text-brand-800 hover:bg-cloud"
												>
													Ver historial
												</button>
											</td>
										</tr>
									);
								})
							) : (
								<tr>
									<td colSpan={10} className="px-2 py-6 text-center text-sm text-brand-800">
										No hay citas que coincidan con los filtros.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
				{listaCitas.length > 0 && (
					<div className="mt-4 shrink-0 flex items-center justify-between border-t border-mist pt-4">
						<div className="text-xs text-brand-800">
							Mostrando {(pageState - 1) * itemsPerPage + 1} -{" "}
							{Math.min(pageState * itemsPerPage, listaCitas.length)} de{" "}
							{listaCitas.length} citas
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setPageState((p) => Math.max(1, p - 1))}
								disabled={pageState === 1}
								className="rounded-full border border-mist bg-paper px-3 py-1.5 text-xs text-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Anterior
							</button>
							<span className="text-xs text-brand-800">
								Página {pageState} de {totalPages}
							</span>
							<button
								type="button"
								onClick={() => setPageState((p) => Math.min(totalPages, p + 1))}
								disabled={pageState === totalPages}
								className="rounded-full border border-mist bg-paper px-3 py-1.5 text-xs text-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Siguiente
							</button>
						</div>
					</div>
				)}
			</div>
		);
	};

	if (!isEspecialista) {
		return (
			<PageShell
				title="Pacientes"
				description="Gestión de pacientes disponible para especialistas."
			/>
		);
	}

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h1 className="text-4xl font-bold text-brand-900">Pacientes</h1>
				<p className="max-w-2xl text-base leading-relaxed text-brand-800 md:text-lg">
					Historial de pacientes atendidos y acceso a sus órdenes.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<div className="rounded-2xl bg-paper p-4 shadow-sm">
					<p className="text-xs font-semibold text-brand-800">
						Pacientes por atender
					</p>
					<p className="mt-2 text-2xl font-semibold text-brand-900">
						{citas.filter((cita) => cita.estado_cita === 0 || cita.estado_cita === 1).length}
					</p>
				</div>
				<div className="rounded-2xl bg-paper p-4 shadow-sm">
					<p className="text-xs font-semibold text-brand-800">Citas registradas</p>
					<p className="mt-2 text-2xl font-semibold text-brand-900">
						{citas.length}
					</p>
				</div>
				<div className="rounded-2xl bg-paper p-4 shadow-sm">
					<p className="text-xs font-semibold text-brand-800">
						Resultados pendientes
					</p>
					<p className="mt-2 text-2xl font-semibold text-brand-900">
						{citas.filter((cita) => {
							const archivos = parseResultadoArchivo(cita.resultado_archivo);
							return archivos.length === 0 && cita.estado_cita !== 2 && cita.estado_pago === 1;
						}).length}
					</p>
				</div>
			</div>

			{/* Altura fija: mismo tamaño siempre (no se achica en página 2, 3, etc.) */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:grid-rows-[32rem] lg:min-h-[32rem]">
				{/* Columna izquierda: Listado de pacientes (sin filtros) */}
				<div className="rounded-2xl bg-paper p-6 shadow-sm flex flex-col min-w-0 lg:h-[32rem] lg:min-h-[32rem] lg:max-h-[32rem] lg:overflow-hidden">
					<div className="shrink-0">
						<h2 className="text-base font-semibold text-brand-900">
							Listado de pacientes
						</h2>
						<p className="text-xs text-brand-800 mt-0.5">
							Pacientes con citas registradas.
						</p>
					</div>

					{loading ? (
						<p className="mt-4 text-sm text-brand-800">Cargando pacientes...</p>
					) : error ? (
						<p className="mt-4 text-sm text-brand-900">{error}</p>
					) : (
						<>
							{/* Lista con filas que reparten el espacio: primero arriba, último abajo */}
							<div className="mt-4 hidden sm:flex flex-col flex-1 min-h-0 border border-mist/50 rounded-xl overflow-hidden">
								{/* Cabecera */}
								<div className="grid grid-cols-[1fr_5rem_6rem] gap-1 shrink-0 border-b border-mist bg-cloud/50 px-3 py-2 text-[11px] font-semibold uppercase text-brand-700">
									<div className="truncate">Paciente</div>
									<div className="text-center">Contacto</div>
									<div className="text-center">Historial</div>
								</div>
								{/* Filas que ocupan todo el alto disponible por igual (primero arriba, último abajo) */}
								<div className="flex-1 flex flex-col min-h-0">
									{paginatedPacientes.length ? (
										paginatedPacientes.map((cita) => {
											const fullName = `${cita.paciente_nombre} ${cita.paciente_apellido}`;
											return (
												<div
													key={cita.id_cita}
													className="grid grid-cols-[1fr_5rem_6rem] gap-1 flex-1 min-h-[3.5rem] items-center border-b border-mist/70 px-3 py-2 text-brand-800"
												>
													<div className="font-semibold text-brand-900 truncate text-sm" title={fullName}>
														{fullName}
													</div>
													<div className="flex justify-center">
														<button
															type="button"
															onClick={() =>
																setContactoPaciente({
																	name: fullName,
																	telefono: cita.paciente_telefono,
																	cedula: cita.paciente_cedula,
																	correo: cita.paciente_correo,
																	tipo_sangre: cita.paciente_tipo_sangre,
																	contacto_nombre:
																		cita.paciente_contacto_nombre,
																	contacto_telefono:
																		cita.paciente_contacto_telefono,
																})
															}
															className="rounded-full border border-mint px-2.5 py-1 text-xs text-brand-800 shrink-0"
														>
															Ver
														</button>
													</div>
													<div className="flex justify-center">
														<button
															type="button"
															onClick={() => {
																setSelectedPaciente({
																	id: cita.id_paciente,
																	name: fullName,
																});
																setCitaParaMarcarAtendida(cita);
															}}
															className="rounded-full border border-mint px-2.5 py-1 text-xs text-brand-800 shrink-0"
														>
															Ver historial
														</button>
													</div>
												</div>
											);
										})
									) : (
										<div className="flex-1 flex items-center justify-center px-3 py-6 text-sm text-brand-800">
											No hay registros para mostrar.
										</div>
									)}
								</div>
							</div>

							{/* Versión cards - solo móvil */}
							<div className="mt-4 space-y-3 sm:hidden">
								{paginatedPacientes.length ? (
									paginatedPacientes.map((cita) => {
										const fullName = `${cita.paciente_nombre} ${cita.paciente_apellido}`;
										return (
											<div
												key={cita.id_cita}
												className="rounded-2xl border border-brand-200 bg-paper p-4"
											>
												<p className="text-sm font-semibold text-brand-900">
													{fullName}
												</p>
												<div className="mt-3 flex flex-wrap gap-2 text-[11px] text-brand-800">
													<button
														type="button"
														onClick={() =>
															setContactoPaciente({
																name: fullName,
																telefono: cita.paciente_telefono,
																cedula: cita.paciente_cedula,
																correo: cita.paciente_correo,
																tipo_sangre: cita.paciente_tipo_sangre,
																contacto_nombre:
																	cita.paciente_contacto_nombre,
																contacto_telefono:
																	cita.paciente_contacto_telefono,
															})
														}
														className="rounded-full border border-mint px-3 py-1 text-[11px] text-brand-800"
													>
														Contacto
													</button>
													<button
														type="button"
														onClick={() => {
															setSelectedPaciente({
																id: cita.id_paciente,
																name: fullName,
															});
															setCitaParaMarcarAtendida(cita);
														}}
														className="rounded-full border border-mint px-3 py-1 text-[11px] text-brand-800"
													>
														Ver historial
													</button>
												</div>
											</div>
										);
									})
								) : (
									<div className="rounded-2xl border border-brand-200 bg-paper p-6 text-center text-sm text-brand-800">
										No hay registros para mostrar.
									</div>
								)}
							</div>
						</>
					)}

					{/* Paginación izquierda */}
					{pacientesAgrupados.length > 0 && (
						<div className="mt-4 shrink-0 flex items-center justify-between border-t border-mist pt-4">
							<div className="text-xs text-brand-800">
								Mostrando {paginatedPacientes.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} -{" "}
								{Math.min(currentPage * itemsPerPage, pacientesAgrupados.length)} de{" "}
								{pacientesAgrupados.length} pacientes
							</div>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
									disabled={currentPage === 1}
									className="rounded-full border border-mist bg-paper px-3 py-1.5 text-xs text-brand-800 transition-colors hover:bg-cloud disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Anterior
								</button>
								<span className="text-xs text-brand-800">
									Página {currentPage} de {totalPages}
								</span>
								<button
									type="button"
									onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
									disabled={currentPage === totalPages}
									className="rounded-full border border-mist bg-paper px-3 py-1.5 text-xs text-brand-800 transition-colors hover:bg-cloud disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Siguiente
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Columna derecha: Citas por atender (con búsqueda y filtros) */}
				<div className="rounded-2xl bg-paper p-6 shadow-sm flex flex-col min-w-0 lg:h-[32rem] lg:min-h-[32rem] lg:max-h-[32rem] lg:overflow-hidden">
					<div className="shrink-0">
						<h2 className="text-base font-semibold text-brand-900">
							Citas por atender
						</h2>
						<p className="text-xs text-brand-800 mt-0.5">
							Busca por nombre, eco o fecha. Filtra por estado y resultados.
						</p>
					</div>
					<div className="mt-3 shrink-0 flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
						<input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Buscar paciente, eco o fecha"
							className="h-10 rounded-full border border-mist bg-cloud px-4 text-xs text-brand-900 outline-none focus:border-brand-700 flex-1 min-w-0 sm:max-w-xs"
						/>
						<select
							value={estado}
							onChange={(e) => setEstado(e.target.value)}
							className="h-10 rounded-full border border-mist bg-cloud px-4 text-xs text-brand-900 outline-none focus:border-brand-700"
						>
							<option value="todos">Todos</option>
							<option value="confirmadas">Confirmadas (por atender)</option>
							<option value="pendientes">Pendientes</option>
						</select>
						<select
							value={filtroResultado}
							onChange={(e) => setFiltroResultado(e.target.value)}
							className="h-10 rounded-full border border-mist bg-cloud px-4 text-xs text-brand-900 outline-none focus:border-brand-700"
						>
							<option value="todos">Todos los resultados</option>
							<option value="sin-resultado">Sin resultados</option>
							<option value="con-resultado">Con resultados</option>
						</select>
					</div>

					{loading ? (
						<p className="mt-4 text-sm text-brand-800">Cargando citas...</p>
					) : (
						renderCitasTable(citasPorAtenderArr, citasPage, setCitasPage)
					)}
				</div>
			</div>

			{/* Nueva sección: Historial de citas (Atendidas, Canceladas, Negadas) */}
			<div className="rounded-2xl bg-paper p-6 shadow-sm flex flex-col min-w-0 h-[32rem] min-h-[32rem] max-h-[32rem] overflow-hidden">
				<div className="shrink-0">
					<h2 className="text-base font-semibold text-brand-900">
						Historial de citas
					</h2>
					<p className="text-xs text-brand-800 mt-0.5">
						Registro de citas que ya fueron atendidas o que han sido canceladas/negadas.
					</p>
				</div>
				{loading ? (
					<p className="mt-4 text-sm text-brand-800">Cargando historial...</p>
				) : (
					renderCitasTable(citasHistorialArr, citasHistorialPage, setCitasHistorialPage)
				)}
			</div>

			{selectedPaciente ? (
				<HistorialModal
					paciente={selectedPaciente}
					citas={historialPaciente}
					citaParaMarcarAtendida={citaParaMarcarAtendida}
					informesMap={informesMap}
					formatFecha={formatFecha}
					formatHora={formatHora}
					getEstadoLabel={getEstadoCitaLabel}
					getResultadoLabel={getResultadoLabel}
					onVerPdf={(url, fileName) => {
						setPdfFileName(fileName);
						setPdfViewerUrl(url);
					}}
					onDownload={() => { }}
					onClose={() => {
						setSelectedPaciente(null);
						setCitaParaMarcarAtendida(null);
					}}
				/>
			) : null}

			{contactoPaciente ? (
				<ContactoModal
					contactoPaciente={contactoPaciente}
					onClose={() => setContactoPaciente(null)}
				/>
			) : null}
			{selectedCitaParaVer ? (
				<VerCitaEspecialistaModal
					citaFromList={selectedCitaParaVer.cita}
					informePdfUrl={selectedCitaParaVer.informePdfUrl}
					pacienteName={`${selectedCitaParaVer.cita.paciente_nombre ?? ""} ${selectedCitaParaVer.cita.paciente_apellido ?? ""}`.trim() || "Paciente"}
					onClose={() => setSelectedCitaParaVer(null)}
					onVerPdf={(url, fileName) => {
						setPdfFileName(fileName);
						setPdfViewerUrl(url);
					}}
				/>
			) : null}
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

export default PacientesPage;
