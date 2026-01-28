import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { PageShell, useAuth } from "../../../shared";
import type { CitaEspecialista } from "../types";
import {
	useGetMisCitasQuery,
	useMarcarAtendidaMutation,
} from "../especialistaApi";
import { useGetMisInformesQuery } from "../informesApi";
import { useNavigate } from "react-router-dom";
import ContactoModal, {
	type ContactoPaciente,
} from "../components/ContactoModal";
import HistorialModal from "../components/HistorialModal";
import PDFViewerModal from "../components/PDFViewerModal";
import SubirResultadoModal from "../components/SubirResultadoModal";
import VerResultadosModal from "../components/VerResultadosModal";

const estadoCitaLabel: Record<number, string> = {
	0: "Pendiente",
	1: "Confirmada",
	2: "Cancelada",
	3: "Atendida",
};

const estadoPagoLabel: Record<number, string> = {
	0: "Pendiente",
	1: "Pagado",
};

const estadoResultadoLabel: Record<number, string> = {
	0: "Pendiente",
	1: "Vacío",
	2: "Con resultados",
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

const formatFecha = (value: string | Date) => {
	const dateKey = getDateKey(value);
	const date = new Date(`${dateKey}T00:00:00`);
	if (Number.isNaN(date.getTime())) return String(value);
	return date.toLocaleDateString("es-VE", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
};

const getEstadoCitaLabel = (cita: CitaEspecialista) =>
	estadoCitaLabel[cita.estado_cita] ?? `Estado ${cita.estado_cita}`;

const isLikelyUrl = (value: string) =>
	/^https?:\/\//i.test(value) || value.startsWith("data:");

const PacientesPage = () => {
	const { user, token } = useAuth();
	const navigate = useNavigate();
	const isEspecialista = user?.rol === "especialista";
	const shouldFetch = isEspecialista && !!token;
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [estado, setEstado] = useState("todos");
	const [filtroResultado, setFiltroResultado] = useState("todos"); // "todos", "sin-resultado", "con-resultado"
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedPaciente, setSelectedPaciente] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [contactoPaciente, setContactoPaciente] =
		useState<ContactoPaciente | null>(null);
	const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
	const [pdfFileName, setPdfFileName] = useState<string | null>(null);
	const [selectedCitaForResultados, setSelectedCitaForResultados] = useState<{
		archivos: string[];
		pacienteNombre: string;
		ecoNombre: string;
		idCita: string;
	} | null>(null);

	const { data: rawCitas = [], isFetching: loading } = useGetMisCitasQuery(
		undefined,
		{
			skip: !shouldFetch,
		},
	);
	const { data: informes = [] } = useGetMisInformesQuery(undefined, {
		skip: !shouldFetch,
	});
	const [marcarAtendida] = useMarcarAtendidaMutation();

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

	const handleViewOrdenMedica = (orden: string | null) => {
		if (!orden) return;
		if (isLikelyUrl(orden)) {
			window.open(orden, "_blank", "noopener,noreferrer");
			return;
		}
		// Si no es una URL, intentar abrirla como URL de todas formas
		window.open(orden, "_blank", "noopener,noreferrer");
	};

	const getResultadoLabel = (cita: CitaEspecialista) =>
		cita.resultado_estado !== null && cita.resultado_estado !== undefined
			? estadoResultadoLabel[cita.resultado_estado] ??
			`Estado ${cita.resultado_estado}`
			: "Pendiente";

	const handleMarcarAtendida = async (cita: CitaEspecialista) => {
		if (cita.estado_pago === 0) {
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
		const citaDateKey = getDateKey(cita.fecha_cita);
		if (citaDateKey > today) {
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
				// Si la URL no tiene protocolo pero parece ser de Cloudinary, agregar https://
				if (!trimmedUrl.match(/^https?:\/\//i) && trimmedUrl.includes("cloudinary")) {
					return `https://${trimmedUrl}`;
				}
				return trimmedUrl;
			});
		} catch {
			// Si no es JSON, tratar como string simple
			const trimmedUrl = archivo.trim();
			if (!trimmedUrl.match(/^https?:\/\//i) && trimmedUrl.includes("cloudinary")) {
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

	// Agrupar por paciente: una fila por paciente usando su cita más reciente
	const pacientesAgrupados = useMemo(() => {
		const seen = new Set<string>();
		const result: CitaEspecialista[] = [];

		for (const cita of filteredCitas) {
			if (!seen.has(cita.id_paciente)) {
				seen.add(cita.id_paciente);
				result.push(cita); // filteredCitas ya está ordenado por fecha desc, así que esta es la última cita
			}
		}

		return result;
	}, [filteredCitas]);

	// Paginación: máximo 5 pacientes por página
	const itemsPerPage = 5;
	const totalPages = Math.max(1, Math.ceil(pacientesAgrupados.length / itemsPerPage));
	const paginatedPacientes = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return pacientesAgrupados.slice(startIndex, startIndex + itemsPerPage);
	}, [pacientesAgrupados, currentPage, itemsPerPage]);

	// Resetear a página 1 cuando cambia el filtro o la búsqueda
	useEffect(() => {
		setCurrentPage(1);
	}, [estado, query, filtroResultado]);

	const pacientesAtendidos = useMemo(() => {
		const ids = new Set(citas.map((cita) => cita.id_paciente));
		return ids.size;
	}, [citas]);

	const historialPaciente = useMemo(() => {
		if (!selectedPaciente) return [];
		return citas.filter((cita) => cita.id_paciente === selectedPaciente.id);
	}, [citas, selectedPaciente]);

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
				<h1 className="text-2xl font-semibold text-brand-900">Pacientes</h1>
				<p className="text-sm text-brand-800">
					Historial de pacientes atendidos y acceso a sus órdenes.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<div className="rounded-2xl bg-paper p-4 shadow-sm">
					<p className="text-xs font-semibold text-brand-800">
						Pacientes atendidos
					</p>
					<p className="mt-2 text-2xl font-semibold text-brand-900">
						{pacientesAtendidos}
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
						Resultados disponibles
					</p>
					<p className="mt-2 text-2xl font-semibold text-brand-900">
						{citas.filter((cita) => {
							const archivos = parseResultadoArchivo(cita.resultado_archivo);
							return archivos.length > 0;
						}).length}
					</p>
				</div>
			</div>

			<div className="rounded-2xl bg-paper p-6 shadow-sm">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 className="text-base font-semibold text-brand-900">
							Listado de pacientes atendidos
						</h2>
						<p className="text-xs text-brand-800">
							Busca por nombre, eco o fecha.
						</p>
					</div>
					<div className="flex flex-col gap-2 sm:flex-row">
						<input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Buscar paciente"
							className="h-10 rounded-full border border-mist bg-cloud px-4 text-xs text-brand-900 outline-none focus:border-brand-700"
						/>
						<select
							value={estado}
							onChange={(event) => setEstado(event.target.value)}
							className="h-10 rounded-full border border-mist bg-cloud px-4 text-xs text-brand-900 outline-none focus:border-brand-700"
						>
							<option value="todos">Todos</option>
							<option value="atendidas">Atendidas</option>
							<option value="confirmadas">Confirmadas (por atender)</option>
							<option value="pendientes">Pendientes</option>
							<option value="canceladas">Canceladas</option>
						</select>
						<select
							value={filtroResultado}
							onChange={(event) => setFiltroResultado(event.target.value)}
							className="h-10 rounded-full border border-mist bg-cloud px-4 text-xs text-brand-900 outline-none focus:border-brand-700"
						>
							<option value="todos">Todos los resultados</option>
							<option value="sin-resultado">Sin resultados</option>
							<option value="con-resultado">Con resultados</option>
						</select>
					</div>
				</div>

				{loading ? (
					<p className="mt-4 text-sm text-brand-800">Cargando pacientes...</p>
				) : error ? (
					<p className="mt-4 text-sm text-brand-900">{error}</p>
				) : (
					<>
						{/* Versión tabla - solo en pantallas medianas en adelante */}
						<div className="mt-4 hidden overflow-x-auto sm:block">
							<table className="w-full text-left text-xs text-brand-800">
								<thead>
									<tr className="border-b border-mist text-[11px] uppercase text-brand-700">
										<th className="px-3 py-2">Paciente</th>
										<th className="px-3 py-2">Eco</th>
										<th className="px-3 py-2">Fecha</th>
										<th className="px-3 py-2">Hora</th>
										<th className="px-3 py-2">Estado</th>
										<th className="px-3 py-2">Pago</th>
										<th className="px-3 py-2 text-center">Orden Médica</th>
										<th className="px-3 py-2 text-center">Resultado</th>
										<th className="px-3 py-2 text-center">Informe</th>
										<th className="px-3 py-2 text-center">Contacto</th>
										<th className="px-3 py-2 text-center">Historial</th>
									</tr>
								</thead>
								<tbody>
									{paginatedPacientes.length ? (
										paginatedPacientes.map((cita) => {
											const fullName = `${cita.paciente_nombre} ${cita.paciente_apellido}`;
											const estadoLabel = getEstadoCitaLabel(cita);
											const pagoLabel =
												estadoPagoLabel[cita.estado_pago] ??
												`Pago ${cita.estado_pago}`;
											const resultadoLabel = getResultadoLabel(cita);
											const todayKey = new Date().toISOString().slice(0, 10);
											const citaDateKey = getDateKey(cita.fecha_cita);
											const showAtenderButton =
												cita.estado_cita === 1 && citaDateKey <= todayKey;
											return (
												<tr
													key={cita.id_cita}
													className="border-b border-mist/70"
												>
													<td className="px-3 py-3 font-semibold text-brand-900">
														{fullName}
													</td>
													<td className="px-3 py-3">{cita.eco_nombre}</td>
													<td className="px-3 py-3">
														{formatFecha(cita.fecha_cita)}
													</td>
													<td className="px-3 py-3">
														{formatHora(cita.hora_cita)}
													</td>
													<td className="px-3 py-3">
														<div className="flex flex-col items-center gap-2">
															<span className="rounded-full bg-cloud px-3 py-1 text-[11px] text-brand-800">
																{estadoLabel}
															</span>
															{showAtenderButton ? (
																<button
																	type="button"
																	onClick={() => handleMarcarAtendida(cita)}
																	className="rounded-full border border-mint px-3 py-1 text-[11px] text-brand-800"
																>
																	Marcar atendida
																</button>
															) : null}
														</div>
													</td>
													<td className="px-3 py-3">
														<span className="rounded-full bg-cloud px-3 py-1 text-[11px] text-brand-800">
															{pagoLabel}
														</span>
													</td>
													<td className="px-3 py-3 text-center">
														<button
															type="button"
															disabled={!cita.orden}
															onClick={() => handleViewOrdenMedica(cita.orden)}
															className="rounded-full bg-brand-700 px-3 py-1 text-[11px] text-paper disabled:opacity-50"
														>
															Ver
														</button>
													</td>
													<td className="px-3 py-3 text-center">
														{(() => {
															const archivos = parseResultadoArchivo(cita.resultado_archivo);
															if (archivos.length > 0) {
																return (
																	archivos.length === 1 ? (
																		<button
																			type="button"
																			onClick={() =>
																				handleDownload(
																					archivos[0],
																					`${fullName}-${cita.fecha_cita}-resultado`,
																				)
																			}
																			className="rounded-full bg-brand-700 px-3 py-1 text-[11px] text-paper hover:bg-brand-800"
																		>
																			Ver resultado
																		</button>
																	) : (
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
																			className="rounded-full bg-brand-700 px-3 py-1 text-[11px] text-paper hover:bg-brand-800"
																		>
																			Ver {archivos.length} resultados
																		</button>
																	)
																);
															}
															return (
																<span className="rounded-full bg-cloud px-3 py-1 text-[11px] text-brand-800">
																	{resultadoLabel}
																</span>
															);
														})()}
													</td>
													<td className="px-3 py-3 text-center">
														{(() => {
															const informe = informesMap.get(cita.id_cita);
															if (informe?.informe_pdf_url) {
																return (
																	<button
																		type="button"
																		onClick={(e) => {
																			e.stopPropagation();
																			const fullName = `${cita.paciente_nombre} ${cita.paciente_apellido}`;
																			const fileName = `Informe-${fullName}-${cita.fecha_cita}.pdf`.replace(/\s+/g, "-");
																			setPdfFileName(fileName);
																			setPdfViewerUrl(informe.informe_pdf_url!);
																		}}
																		className="rounded-full bg-brand-700 px-3 py-1 text-[11px] text-paper"
																	>
																		Ver PDF
																	</button>
																);
															}
															if (cita.estado_cita === 3) {
																return (
																	<button
																		type="button"
																		onClick={() => {
																			navigate("/informes", {
																				state: { selectedCitaId: cita.id_cita },
																			});
																		}}
																		className="rounded-full border border-brand-700 bg-brand-700 px-3 py-1 text-[11px] text-paper transition-colors hover:bg-brand-800"
																	>
																		Llenar
																	</button>
																);
															}
															return (
																<span className="rounded-full bg-cloud px-3 py-1 text-[11px] text-brand-800">
																	Pendiente
																</span>
															);
														})()}
													</td>
													<td className="px-3 py-3 text-center">
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
															Ver
														</button>
													</td>
													<td className="px-3 py-3 text-center">
														<button
															type="button"
															onClick={() =>
																setSelectedPaciente({
																	id: cita.id_paciente,
																	name: fullName,
																})
															}
															className="rounded-full border border-mint px-3 py-1 text-[11px] text-brand-800"
														>
															Ver historial
														</button>
													</td>
												</tr>
											);
										})
									) : (
										<tr>
											<td
												colSpan={11}
												className="px-3 py-6 text-center text-sm text-brand-800"
											>
												No hay registros para mostrar.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>

						{/* Versión cards - solo móvil */}
						<div className="mt-4 space-y-3 sm:hidden">
							{paginatedPacientes.length ? (
								paginatedPacientes.map((cita) => {
									const fullName = `${cita.paciente_nombre} ${cita.paciente_apellido}`;
									const estadoLabel = getEstadoCitaLabel(cita);
									const pagoLabel =
										estadoPagoLabel[cita.estado_pago] ?? `Pago ${cita.estado_pago}`;
									const resultadoLabel = getResultadoLabel(cita);
									const todayKey = new Date().toISOString().slice(0, 10);
									const citaDateKey = getDateKey(cita.fecha_cita);
									const showAtenderButton =
										cita.estado_cita === 1 && citaDateKey <= todayKey;

									const archivos = parseResultadoArchivo(cita.resultado_archivo);
									const informe = informesMap.get(cita.id_cita);

									return (
										<div
											key={cita.id_cita}
											className="rounded-2xl border border-brand-200 bg-paper p-4"
										>
											<div className="flex items-start justify-between gap-3">
												<div className="space-y-1">
													<p className="text-sm font-semibold text-brand-900">
														{fullName}
													</p>
													<p className="text-xs text-brand-700">
														<span className="font-medium">Eco:</span>{" "}
														{cita.eco_nombre}
													</p>
													<p className="text-xs text-brand-700">
														<span className="font-medium">Fecha:</span>{" "}
														{formatFecha(cita.fecha_cita)} a las{" "}
														{formatHora(cita.hora_cita)}
													</p>
												</div>
												<div className="flex flex-col items-end gap-1">
													<span className="rounded-full bg-cloud px-3 py-1 text-[11px] text-brand-800">
														{estadoLabel}
													</span>
													<span className="rounded-full bg-cloud px-3 py-1 text-[11px] text-brand-800">
														{pagoLabel}
													</span>
												</div>
											</div>

											<div className="mt-3 space-y-2 text-[11px] text-brand-800">
												<div className="flex items-center justify-between">
													<span className="font-medium">Orden médica</span>
													<button
														type="button"
														disabled={!cita.orden}
														onClick={() => handleViewOrdenMedica(cita.orden)}
														className="rounded-full bg-brand-700 px-3 py-1 text-[11px] text-paper disabled:opacity-50"
													>
														Ver
													</button>
												</div>

												<div className="flex items-center justify-between">
													<span className="font-medium">Resultado</span>
													{archivos.length > 0 ? (
														archivos.length === 1 ? (
															<button
																type="button"
																onClick={() =>
																	handleDownload(
																		archivos[0],
																		`${fullName}-${cita.fecha_cita}-resultado`,
																	)
																}
																className="rounded-full bg-brand-700 px-3 py-1 text-[11px] text-paper hover:bg-brand-800"
															>
																Ver resultado
															</button>
														) : (
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
																className="rounded-full bg-brand-700 px-3 py-1 text-[11px] text-paper hover:bg-brand-800"
															>
																Ver {archivos.length} resultados
															</button>
														)
													) : (
														<span className="rounded-full bg-cloud px-3 py-1 text-[11px] text-brand-800">
															{resultadoLabel}
														</span>
													)}
												</div>

												<div className="flex items-center justify-between">
													<span className="font-medium">Informe</span>
													{informe?.informe_pdf_url ? (
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																const fileName = `Informe-${fullName}-${cita.fecha_cita}.pdf`.replace(
																	/\s+/g,
																	"-",
																);
																setPdfFileName(fileName);
																setPdfViewerUrl(informe.informe_pdf_url!);
															}}
															className="rounded-full bg-brand-700 px-3 py-1 text-[11px] text-paper"
														>
															Ver PDF
														</button>
													) : cita.estado_cita === 3 ? (
														<button
															type="button"
															onClick={() => {
																navigate("/informes", {
																	state: { selectedCitaId: cita.id_cita },
																});
															}}
															className="rounded-full border border-brand-700 bg-brand-700 px-3 py-1 text-[11px] text-paper transition-colors hover:bg-brand-800"
														>
															Llenar
														</button>
													) : (
														<span className="rounded-full bg-cloud px-3 py-1 text-[11px] text-brand-800">
															Pendiente
														</span>
													)}
												</div>

												<div className="flex items-center justify-between">
													<span className="font-medium">Contacto</span>
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
														Ver
													</button>
												</div>

												<div className="flex items-center justify-between">
													<span className="font-medium">Historial</span>
													<button
														type="button"
														onClick={() =>
															setSelectedPaciente({
																id: cita.id_paciente,
																name: fullName,
															})
														}
														className="rounded-full border border-mint px-3 py-1 text-[11px] text-brand-800"
													>
														Ver historial
													</button>
												</div>

												{showAtenderButton && (
													<div className="pt-2">
														<button
															type="button"
															onClick={() => handleMarcarAtendida(cita)}
															className="w-full rounded-full border border-mint px-3 py-1 text-[11px] text-brand-800"
														>
															Marcar atendida
														</button>
													</div>
												)}
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

				{/* Paginación */}
				{pacientesAgrupados.length > 0 && (
					<div className="mt-4 flex items-center justify-between border-t border-mist pt-4">
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

			{selectedPaciente ? (
				<HistorialModal
					paciente={selectedPaciente}
					citas={historialPaciente}
					formatFecha={formatFecha}
					formatHora={formatHora}
					getEstadoLabel={getEstadoCitaLabel}
					getResultadoLabel={getResultadoLabel}
					onDownload={() => { }} // Ya no se usa, pero se mantiene para compatibilidad
					onClose={() => setSelectedPaciente(null)}
				/>
			) : null}

			{contactoPaciente ? (
				<ContactoModal
					contactoPaciente={contactoPaciente}
					onClose={() => setContactoPaciente(null)}
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
			{selectedCitaForResultados && (
				<VerResultadosModal
					archivos={selectedCitaForResultados.archivos}
					pacienteNombre={selectedCitaForResultados.pacienteNombre}
					ecoNombre={selectedCitaForResultados.ecoNombre}
					idCita={selectedCitaForResultados.idCita}
					onClose={() => setSelectedCitaForResultados(null)}
				/>
			)}
		</div>
	);
};

export default PacientesPage;
