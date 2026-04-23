import { useState, useMemo, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import {
	Check,
	X,
	Filter,
	Download,
	ChevronLeft,
	ChevronRight,
	FileText,
	TrendingUp,
	History,
	Clock3,
	CheckCircle2,
	CheckCheck,
	AlertCircle,
	CalendarClock,
	CalendarDays,
	Ban,
	ScanLine,
	UserRound,
	IdCard,
	Phone,
} from "lucide-react";
import { PageShell, formatFechaCortaLocal, formatVES, parseCedulaDisplay } from "../../../shared";
import {
	useGetCitasPendientesPagoQuery,
	useGetVerificacionPagosKpiQuery,
	useUpdateEstadoPagoMutation,
	useCancelCitaMutation,
} from "../../citas/citasApi";
import type { CitaPendientePago } from "../../citas/citasApi";
import { useGetPagoByCitaQuery, useGetCitaByIdQuery } from "../../moderadores/moderadoresApi";
import VerPagoModal from "../../moderadores/components/VerPagoModal";
import VerCitaModal from "../../moderadores/components/VerCitaModal";
import PosponerCitaModal from "../../moderadores/components/PosponerCitaModal";
import RechazarPagoModal from "../../moderadores/components/RechazarPagoModal";

const formatHora = (value: string) => {
	if (!value) return "";
	const [hourStr, minuteStr = "00"] = value.split(":");
	const hour = Number(hourStr);
	if (Number.isNaN(hour)) return value;
	const period = hour >= 12 ? "PM" : "AM";
	const hour12 = hour % 12 === 0 ? 12 : hour % 12;
	return `${hour12}:${minuteStr} ${period}`;
};

const inicialesPaciente = (nombre: string, apellido: string) => {
	const a = nombre?.trim()?.[0] ?? "";
	const b = apellido?.trim()?.[0] ?? "";
	const s = `${a}${b}`.toUpperCase();
	return s || "?";
};

const formatFechaHoraCelda = (fecha: string, hora: string) => {
	const d = formatFechaCortaLocal(fecha);
	const h = formatHora(hora);
	if (!d || d === "—") return h || "—";
	return h ? `${d}, ${h}` : d;
};

const avatarToneForRow = (i: number) => {
	const tones = [
		"bg-brand-100 text-brand-800",
		"bg-accent/20 text-brand-800",
		"bg-cloud text-brand-900",
		"bg-mist text-brand-800",
	];
	return tones[i % tones.length]!;
};

const etiquetaMetodoPago = (raw: string | null | undefined) => {
	if (!raw) return null;
	const map: Record<string, string> = {
		Transferencia: "Transferencia",
		PagoMovil: "Pago Móvil",
		Efectivo: "Efectivo",
		Zelle: "Zelle",
		Otro: "Otro",
		Binance: "Binance",
		PayPal: "PayPal",
		EfectivoBs: "Efectivo Bs",
		EfectivoUSD: "Efectivo USD",
	};
	return map[raw] ?? raw;
};

const pillMetodoClass = (raw: string | null | undefined) => {
	if (!raw) return "bg-slate-100 text-slate-600";
	const zelle = raw === "Zelle";
	if (zelle) return "bg-sky-100 text-sky-800";
	if (raw === "PagoMovil") return "bg-slate-100 text-slate-700";
	return "bg-slate-100 text-slate-600";
};

const montoListaDesdeApi = (value: number | string | null | undefined) => {
	if (value === null || value === undefined || value === "") return null;
	const n = typeof value === "string" ? parseFloat(value) : value;
	if (Number.isNaN(n)) return null;
	return formatVES(n);
};

const cedulaParaLista = (raw: string | null | undefined) => {
	const s = String(raw ?? "").trim();
	if (!s) return "—";
	const { tipo, numero } = parseCedulaDisplay(s);
	if (!numero) return s;
	return `${tipo}-${numero}`;
};

const PagosPage = () => {
	const { data: citas = [], isLoading, refetch } = useGetCitasPendientesPagoQuery();
	const { data: kpiData, isLoading: kpiLoading } = useGetVerificacionPagosKpiQuery();
	const [updateEstadoPago, { isLoading: isUpdating }] = useUpdateEstadoPagoMutation();
	const [cancelCita] = useCancelCitaMutation();
	const [selectedCita, setSelectedCita] = useState<string | null>(null);
	const [selectedCitaId, setSelectedCitaId] = useState<string | null>(null);
	const [selectedCitaIdForVerificar, setSelectedCitaIdForVerificar] = useState<string | null>(null);
	const [selectedCitaIdForView, setSelectedCitaIdForView] = useState<string | null>(null);
	const [selectedCitaForPosponer, setSelectedCitaForPosponer] = useState<CitaPendientePago | null>(null);
	const [citaToReject, setCitaToReject] = useState<{ id_cita: string; nombre: string } | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [query, setQuery] = useState("");
	const itemsPerPage = 5;

	// Obtener datos del pago cuando se selecciona una cita
	const {
		data: pagoData,
		isLoading: loadingPago,
		error: pagoError,
	} = useGetPagoByCitaQuery(selectedCitaId || "", {
		skip: !selectedCitaId,
	});

	// Obtener datos completos de la cita cuando se selecciona para ver
	const {
		data: citaData,
		isLoading: loadingCita,
		error: citaError,
	} = useGetCitaByIdQuery(selectedCitaIdForView || "", {
		skip: !selectedCitaIdForView,
	});

	// Filtrar citas según búsqueda (la API ya devuelve solo pendientes ordenados por fecha más vieja primero)
	const filteredCitas = useMemo(() => {
		let citasFiltradas = citas;

		// Filtro por búsqueda
		if (query.trim()) {
			const searchLower = query.toLowerCase().trim();
			citasFiltradas = citasFiltradas.filter((cita) => {
				const fullName = `${cita.paciente_nombre} ${cita.paciente_apellido}`.toLowerCase();
				const especialistaFullName = `${cita.especialista_nombre} ${cita.especialista_apellido}`.toLowerCase();
				return (
					fullName.includes(searchLower) ||
					cita.paciente_nombre.toLowerCase().includes(searchLower) ||
					cita.paciente_apellido.toLowerCase().includes(searchLower) ||
					cita.paciente_cedula.toLowerCase().includes(searchLower) ||
					cita.paciente_telefono.toLowerCase().includes(searchLower) ||
					especialistaFullName.includes(searchLower) ||
					cita.especialista_nombre.toLowerCase().includes(searchLower) ||
					cita.especialista_apellido.toLowerCase().includes(searchLower) ||
					cita.eco_nombre.toLowerCase().includes(searchLower)
				);
			});
		}

		return citasFiltradas;
	}, [citas, query]);

	// Paginación
	const totalPages = Math.max(1, Math.ceil(filteredCitas.length / itemsPerPage));
	const paginatedCitas = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return filteredCitas.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredCitas, currentPage, itemsPerPage]);

	// Resetear a página 1 cuando cambian los datos o la búsqueda
	useEffect(() => {
		setCurrentPage(1);
	}, [citas.length, query]);

	const handleAprobarPago = async (id_cita: string): Promise<boolean> => {
		const confirmResult = await Swal.fire({
			title: "¿Aprobar pago y confirmar cita?",
			text: "Esta acción confirmará el pago y aprobará la cita. ¿Estás seguro?",
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Sí, aprobar",
			cancelButtonText: "Cancelar",
			confirmButtonColor: "#1C837F",
			cancelButtonColor: "#9FD8E1",
		});

		if (!confirmResult.isConfirmed) return false;

		try {
			await updateEstadoPago({ id_cita, estado_pago: 1 }).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Pago aprobado",
				text: "La cita ha sido confirmada exitosamente.",
				timer: 2000,
				showConfirmButton: false,
			});
			refetch();
			return true;
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudo aprobar el pago",
			});
			return false;
		}
	};

	const handleRechazarPago = async (id_cita: string): Promise<boolean> => {
		// Buscar nombre del paciente para mostrar en el modal
		const cita = citas.find(c => c.id_cita === id_cita);
		const nombrePaciente = cita
			? `${cita.paciente_nombre ?? ""} ${cita.paciente_apellido ?? ""}`.trim()
			: undefined;

		// Abrir modal para ingresar motivo de rechazo
		setCitaToReject({ id_cita, nombre: nombrePaciente || "" });
		return false; // No cerrar modales todavía
	};

	const handleConfirmRechazar = async (motivo: string) => {
		if (!citaToReject) return;

		try {
			await updateEstadoPago({
				id_cita: citaToReject.id_cita,
				estado_pago: 2,
				motivo_rechazo: motivo
			}).unwrap();

			setCitaToReject(null);
			setSelectedCitaId(null);
			setSelectedCitaIdForVerificar(null);

			await Swal.fire({
				icon: "success",
				title: "Pago rechazado",
				text: "El pago ha sido rechazado y el paciente ha sido notificado.",
				timer: 2500,
				showConfirmButton: false,
			});

			refetch();
		} catch (error: any) {
			setCitaToReject(null);
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudo rechazar el pago",
			});
		}
	};

	const handleCancelarCita = async (id: string, pacienteNombre: string) => {
		const confirmResult = await Swal.fire({
			title: "¿Cancelar cita?",
			text: `Esta acción cancelará la cita del paciente ${pacienteNombre}. ¿Estás seguro?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Sí, cancelar",
			cancelButtonText: "No",
			confirmButtonColor: "#dc2626",
			cancelButtonColor: "#9FD8E1",
		});

		if (!confirmResult.isConfirmed) return;

		try {
			await cancelCita(id).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Cita cancelada",
				text: "La cita ha sido cancelada exitosamente.",
				timer: 2000,
				showConfirmButton: false,
			});
			refetch();
		} catch (err: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: err?.data?.message || "No se pudo cancelar la cita",
			});
		}
	};

	const getEstadoPagoLabel = (estado: number) => {
		switch (estado) {
			case 0:
				return "Pendiente";
			case 1:
				return "Verificado";
			case 2:
				return "Rechazado";
			default:
				return "Desconocido";
		}
	};

	const getEstadoPagoListaStyles = (estado: number) => {
		switch (estado) {
			case 0:
				return { dot: "bg-yellow-400", text: "text-yellow-600" };
			case 1:
				return { dot: "bg-brand-800", text: "text-brand-800" };
			case 2:
				return { dot: "bg-red-600", text: "text-red-600" };
			default:
				return { dot: "bg-slate-400", text: "text-slate-600" };
		}
	};

	const searchInputRef = useRef<HTMLInputElement>(null);

	const kpiPendientes = isLoading ? "—" : String(filteredCitas.length);
	const kpiVerificadosHoy =
		kpiLoading ? "—" : String(kpiData?.verificados_hoy ?? 0);

	return (
		<PageShell hideHeader>
			<div className="mx-auto max-w-7xl space-y-10">
				<div className="space-y-2">
					<h2 className="font-headline text-3xl font-extrabold tracking-tight text-brand-900">
						Verificación de Pagos
					</h2>
					<p className="max-w-2xl text-slate-500">
						Monitorea y valida las transacciones recibidas. Asegura la conciliación bancaria diaria de los
						servicios clínicos prestados.
					</p>
				</div>

				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div className="rounded-xl border border-slate-100 bg-paper p-6 shadow-sm border-l-4 border-l-yellow-400">
						<div className="flex items-start justify-between">
							<div>
								<p className="text-base font-medium text-slate-500">Pendientes de Verificación</p>
								<p className="mt-2 font-headline text-4xl font-extrabold text-brand-900">{kpiPendientes}</p>
							</div>
							<div className="rounded-lg bg-yellow-50 p-3 text-yellow-600">
								<Clock3 className="h-6 w-6" strokeWidth={2} />
							</div>
						</div>
						<p className="mt-4 flex items-center gap-1 text-sm text-slate-400">
							<TrendingUp className="h-3.5 w-3.5 shrink-0" />
							Citas web con pago pendiente de revisar
						</p>
					</div>
					<div className="rounded-xl border border-slate-100 bg-paper p-6 shadow-sm border-l-4 border-l-brand-800">
						<div className="flex items-start justify-between">
							<div>
								<p className="text-base font-medium text-slate-500">Verificados Hoy</p>
								<p className="mt-2 font-headline text-4xl font-extrabold text-brand-900">
									{kpiVerificadosHoy}
								</p>
							</div>
							<div className="rounded-lg bg-brand-100 p-3 text-brand-800">
								<CheckCircle2 className="h-6 w-6" strokeWidth={2} />
							</div>
						</div>
						<p className="mt-4 flex items-start gap-1 text-sm text-slate-400">
							<History className="mt-0.5 h-3.5 w-3.5 shrink-0" />
							<span>
								Pagos web con gestión registrada hoy (aprobar, rechazar, cancelar cita o posponer).
							</span>
						</p>
					</div>
				</div>

				<div className="overflow-hidden rounded-xl border border-slate-100 bg-paper shadow-sm">
					<div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
						<h3 className="font-headline text-lg font-bold text-brand-900">Pagos Recientes</h3>
						<div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row sm:items-center sm:justify-end">
							<div className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
								<span className="text-slate-400" aria-hidden>
									<Filter className="h-4 w-4" />
								</span>
								<input
									ref={searchInputRef}
									type="text"
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									placeholder="Buscar por nombre, apellido, cédula, teléfono, especialista o eco..."
									className="font-body w-full border-none bg-transparent text-base text-brand-900 outline-none ring-0 placeholder:text-slate-400"
								/>
							</div>
							<div className="flex shrink-0 gap-2">
								<button
									type="button"
									onClick={() => searchInputRef.current?.focus()}
									className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-brand-800 transition-colors hover:bg-slate-50"
								>
									<Filter className="h-4 w-4" />
									Filtrar
								</button>
								<button
									type="button"
									disabled
									title="Próximamente"
									className="flex cursor-not-allowed items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-slate-400 opacity-70"
								>
									<Download className="h-4 w-4" />
									Exportar
								</button>
							</div>
						</div>
					</div>

					{isLoading ? (
						<div className="py-12 text-center text-slate-600">Cargando pagos pendientes...</div>
					) : filteredCitas.length === 0 ? (
						<div className="px-6 py-12 text-center text-slate-600">
							{query.trim()
								? "No se encontraron citas pendientes con los criterios de búsqueda."
								: "No hay pagos pendientes de verificar."}
						</div>
					) : (
						<>
							<div className="overflow-x-auto">
								<table className="w-full text-left">
									<thead>
										<tr className="bg-slate-50 text-sm font-semibold uppercase tracking-wider text-slate-500">
											<th className="px-6 py-4 text-center">Paciente</th>
											<th className="px-4 py-4 text-center">Fecha / Hora</th>
											<th className="px-4 py-4 text-center">Método</th>
											<th className="px-4 py-4 text-center">Monto</th>
											<th className="px-4 py-4 text-center">Comprobante</th>
											<th className="px-4 py-4 text-center">Estado</th>
											<th className="px-4 py-4 text-center">Cita</th>
											<th className="px-6 py-4 text-center">Acciones</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100 text-base">
										{paginatedCitas.map((cita: CitaPendientePago, rowIndex: number) => {
											const est = getEstadoPagoListaStyles(cita.estado_pago);
											const openPagoModal = () => {
												setSelectedCitaId(cita.id_cita);
												setSelectedCitaIdForVerificar(cita.estado_pago === 0 ? cita.id_cita : null);
											};
											const montoTxt = montoListaDesdeApi(cita.pago_monto);
											const metodoTxt = etiquetaMetodoPago(cita.pago_metodo);
											const puedePosponerOCancelar =
												cita.estado_cita !== 2 && cita.estado_cita !== 3;
											const puedeCancelar = puedePosponerOCancelar && cita.estado_pago !== 1;
											return (
												<tr key={cita.id_cita} className="transition-colors hover:bg-slate-50/50">
													<td className="px-6 py-5 pl-8 align-top">
														<div className="flex items-start gap-3">
															<div
																className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarToneForRow(rowIndex)}`}
															>
																{inicialesPaciente(cita.paciente_nombre, cita.paciente_apellido)}
															</div>
															<div className="min-w-0">
																<p className="font-semibold text-brand-900">
																	{cita.paciente_nombre} {cita.paciente_apellido}
																</p>
																<div className="mt-2 space-y-1.5 text-sm text-slate-600">
																	<div className="flex items-start gap-2">
																		<ScanLine
																			className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-700/70"
																			strokeWidth={2}
																			aria-hidden
																		/>
																		<span>{cita.eco_nombre}</span>
																	</div>
																	<div className="flex items-start gap-2">
																		<UserRound
																			className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-700/70"
																			strokeWidth={2}
																			aria-hidden
																		/>
																		<span>
																			<span className="sr-only">Especialista: </span>
																			{cita.especialista_nombre} {cita.especialista_apellido}
																		</span>
																	</div>
																	<div className="flex items-start gap-2">
																		<IdCard
																			className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-700/70"
																			strokeWidth={2}
																			aria-hidden
																		/>
																		<span>
																			<span className="sr-only">Cédula: </span>
																			{cedulaParaLista(cita.paciente_cedula)}
																		</span>
																	</div>
																	<div className="flex items-start gap-2">
																		<Phone
																			className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-700/70"
																			strokeWidth={2}
																			aria-hidden
																		/>
																		<span>
																			<span className="sr-only">Teléfono: </span>
																			{cita.paciente_telefono || "—"}
																		</span>
																	</div>
																</div>
															</div>
														</div>
													</td>
													<td className="whitespace-nowrap px-4 py-5 align-middle text-slate-600">
														{formatFechaHoraCelda(cita.fecha_cita, cita.hora_cita)}
													</td>
													<td className="px-4 py-5 align-middle">
														{metodoTxt ? (
															<span
																className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold ${pillMetodoClass(cita.pago_metodo)}`}
															>
																{metodoTxt}
															</span>
														) : (
															<span className="text-base text-slate-400" title="Sin método en el registro de pago">
																—
															</span>
														)}
													</td>
													<td className="px-4 py-5 align-middle font-bold text-brand-900">
														{montoTxt ?? (
															<span className="font-normal text-slate-400" title="Sin monto en el registro de pago">
																—
															</span>
														)}
													</td>
													<td className="px-4 py-5 align-middle text-center">
														<button
															type="button"
															onClick={openPagoModal}
															className="group mx-auto flex items-center justify-center gap-1 text-brand-800 hover:underline"
														>
															<FileText className="h-[18px] w-[18px] shrink-0" />
															<span className="text-sm">
																{cita.estado_pago === 0 ? "Verificar pago" : "Ver pago"}
															</span>
														</button>
													</td>
													<td className="px-4 py-5 align-middle">
														<div className={`flex items-center gap-2 font-medium ${est.text}`}>
															<span className={`h-2 w-2 shrink-0 rounded-full ${est.dot}`} />
															{getEstadoPagoLabel(cita.estado_pago)}
														</div>
													</td>
													<td className="px-4 py-5 align-middle text-center">
														<button
															type="button"
															onClick={() => setSelectedCitaIdForView(cita.id_cita)}
															className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-brand-100 hover:text-brand-800"
															aria-label="Ver cita"
															title="Ver cita"
														>
															<CalendarDays className="h-5 w-5" strokeWidth={2} />
														</button>
													</td>
													<td className="px-6 py-5 pr-8 text-right align-middle">
														<div className="flex flex-col items-end gap-2">
															{cita.estado_pago === 0 ? (
																<>
																	<div className="flex items-center justify-end gap-1">
																		<button
																			type="button"
																			disabled={isUpdating}
																			onClick={openPagoModal}
																			className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-brand-100 hover:text-brand-800 active:scale-95 disabled:opacity-50"
																			aria-label="Ver detalles y aprobar pago"
																			title="Ver detalles del pago"
																		>
																			<Check className="h-5 w-5" strokeWidth={2.5} />
																		</button>
																		<button
																			type="button"
																			disabled={isUpdating}
																			onClick={() => handleRechazarPago(cita.id_cita)}
																			className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:opacity-50"
																			aria-label="Rechazar pago"
																			title="Rechazar pago"
																		>
																			<X className="h-5 w-5" strokeWidth={2.5} />
																		</button>
																	</div>
																	{puedePosponerOCancelar && (
																		<div className="flex items-center justify-end gap-1">
																			{puedePosponerOCancelar && (
																				<button
																					type="button"
																					onClick={() => setSelectedCitaForPosponer(cita)}
																					className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-amber-50 hover:text-amber-700 active:scale-95"
																					aria-label="Posponer cita"
																					title="Posponer cita"
																				>
																					<CalendarClock className="h-5 w-5" strokeWidth={2} />
																				</button>
																			)}
																			{puedeCancelar && (
																				<button
																					type="button"
																					onClick={() =>
																						handleCancelarCita(
																							cita.id_cita,
																							`${cita.paciente_nombre} ${cita.paciente_apellido}`,
																						)
																					}
																					className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-red-50 hover:text-red-700 active:scale-95"
																					aria-label="Cancelar cita"
																					title="Cancelar cita"
																				>
																					<Ban className="h-5 w-5" strokeWidth={2} />
																				</button>
																			)}
																		</div>
																	)}
																</>
															) : cita.estado_pago === 1 ? (
																<div className="flex justify-end opacity-30">
																	<CheckCheck className="h-5 w-5 text-slate-400" aria-hidden />
																</div>
															) : (
																<div className="flex justify-end opacity-30">
																	<AlertCircle className="h-5 w-5 text-slate-400" aria-hidden />
																</div>
															)}
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>

							{filteredCitas.length > 0 && filteredCitas.length <= itemsPerPage && (
								<div className="border-t border-slate-100 p-6 text-base text-slate-500">
									Mostrando {filteredCitas.length} de {filteredCitas.length} pagos pendientes
								</div>
							)}
							{filteredCitas.length > itemsPerPage && (
								<div className="flex flex-col gap-4 border-t border-slate-100 p-6 text-base text-slate-500 sm:flex-row sm:items-center sm:justify-between">
									<p>
										Mostrando {paginatedCitas.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
										{Math.min(currentPage * itemsPerPage, filteredCitas.length)} de {filteredCitas.length}{" "}
										pagos pendientes
									</p>
									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
											disabled={currentPage === 1}
											className="flex h-8 w-8 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
											aria-label="Página anterior"
										>
											<ChevronLeft className="h-5 w-5" />
										</button>
										{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
											<button
												key={page}
												type="button"
												onClick={() => setCurrentPage(page)}
												className={`flex h-8 min-w-[2rem] items-center justify-center rounded px-1 text-base font-medium ${
													page === currentPage
														? "bg-brand-800 text-white"
														: "text-slate-700 hover:bg-slate-100"
												}`}
											>
												{page}
											</button>
										))}
										<button
											type="button"
											onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
											disabled={currentPage === totalPages}
											className="flex h-8 w-8 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
											aria-label="Página siguiente"
										>
											<ChevronRight className="h-5 w-5" />
										</button>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>

			{/* Modal de ver cita */}
			{selectedCitaIdForView && (
				<VerCitaModal
					cita={loadingCita ? null : citaData || null}
					error={citaError ? "No se pudo cargar la información de la cita" : null}
					onClose={() => setSelectedCitaIdForView(null)}
				/>
			)}

			{/* Modal de ver pago / verificar pago */}
			{selectedCitaId && (
				<VerPagoModal
					pago={loadingPago ? null : pagoData || null}
					error={pagoError ? "No se pudo cargar la información del pago" : null}
					onClose={() => {
						setSelectedCitaId(null);
						setSelectedCitaIdForVerificar(null);
					}}
					showAcciones={!!selectedCitaIdForVerificar}
					id_cita={selectedCitaId}
					onAprobar={(id_cita) => {
						handleAprobarPago(id_cita).then((ok) => {
							if (ok) {
								setSelectedCitaId(null);
								setSelectedCitaIdForVerificar(null);
							}
						});
					}}
					onRechazar={(id_cita) => {
						handleRechazarPago(id_cita).then((ok) => {
							if (ok) {
								setSelectedCitaId(null);
								setSelectedCitaIdForVerificar(null);
							}
						});
					}}
					isUpdating={isUpdating}
				/>
			)}

			{/* Modal de posponer cita */}
			{selectedCitaForPosponer && (
				<PosponerCitaModal
					cita={selectedCitaForPosponer}
					onClose={() => setSelectedCitaForPosponer(null)}
					onSuccess={() => {
						refetch();
						setSelectedCitaForPosponer(null);
					}}
				/>
			)}

			{/* Modal de rechazar pago */}
			{citaToReject && (
				<RechazarPagoModal
					onClose={() => setCitaToReject(null)}
					onConfirm={handleConfirmRechazar}
					isLoading={isUpdating}
					nombrePaciente={citaToReject.nombre}
				/>
			)}
		</PageShell>
	);
};

export default PagosPage;
