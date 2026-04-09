import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuth } from "../../../shared";
import { useGetCitasPendientesPagoQuery, useUpdateEstadoPagoMutation } from "../../citas/citasApi";
import type { CitaPendientePago } from "../../citas/citasApi";
import { useGetCitasByFechaQuery } from "../../moderadores/moderadoresApi";
import { useGetResumenFacturacionQuery } from "../../inventario/api/facturacionApi";
import {
	useGetDisponibilidadAdminQuery,
	useAprobarDisponibilidadMutation,
	useRechazarDisponibilidadMutation,
	useAprobarSolicitudMacroMutation,
	useRechazarSolicitudMacroMutation,
	type DisponibilidadPendiente,
	type DisponibilidadSolicitudMacro,
} from "../../disponibilidad/disponibilidadApi";
import {
	useGetProductosQuery,
	useGetObligacionesQuery,
	useGetContratosQuery,
} from "../../inventario/api";
import { useGetEmpleadosQuery } from "../../inventario/api/nominaApi";
import { useListComisionesQuery } from "../../inventario/api/comisionesApi";
import { buildFinanceAlerts } from "../utils/financeAlerts";
import RechazarPagoModal from "../../moderadores/components/RechazarPagoModal";
import DashboardCharts from "./DashboardCharts";
import { getTodayKey, formatHora, buildDateTime } from "../utils/dateUtils";
import {
	DollarSign,
	UserPlus,
	Wallet,
	ShoppingCart,
	Banknote,
	Receipt,
	AlertTriangle,
	AlertCircle,
} from "lucide-react";

const formatMoneda = (n: number) =>
	new Intl.NumberFormat("es-VE", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(n);

const getSaludo = () => {
	const h = new Date().getHours();
	if (h < 12) return "Buenos días";
	if (h < 19) return "Buenas tardes";
	return "Buenas noches";
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
			return "—";
	}
};

const getEstadoCitaBadgeClass = (estado: number) => {
	switch (estado) {
		case 0:
			return "bg-amber-100 text-amber-900";
		case 1:
			return "bg-emerald-100 text-emerald-800";
		case 2:
			return "bg-red-100 text-red-800";
		case 3:
			return "bg-sky-100 text-sky-800";
		default:
			return "bg-slate-100 text-slate-700";
	}
};

type PreviewRow =
	| { kind: "macro"; solicitud: DisponibilidadSolicitudMacro }
	| { kind: "bloque"; bloque: DisponibilidadPendiente };

const DashboardAdmin = () => {
	const { user } = useAuth();
	const todayKey = getTodayKey();

	const { data: citasPendientesPago = [], isLoading: loadingPagos, refetch: refetchPagos } =
		useGetCitasPendientesPagoQuery();
	const { data: citasHoy = [], isLoading: loadingCitasHoy } = useGetCitasByFechaQuery(todayKey);
	const { data: resumenFacturacion, isLoading: loadingFacturacion } =
		useGetResumenFacturacionQuery();
	const { data: gestion, isLoading: loadingDisp, refetch: refetchDisp } =
		useGetDisponibilidadAdminQuery();
	const { data: productos = [], isLoading: loadingProd } = useGetProductosQuery();
	const { data: obligaciones = [], isLoading: loadingObl } = useGetObligacionesQuery();
	const { data: contratos = [], isLoading: loadingContratos } = useGetContratosQuery();
	const { data: empleados = [], isLoading: loadingEmpleados } = useGetEmpleadosQuery();
	const { data: comisionesPend = [], isLoading: loadingComisiones } = useListComisionesQuery({
		estado: "Pendiente",
		limit: 500,
	});

	const [updateEstadoPago, { isLoading: updatingPago }] = useUpdateEstadoPagoMutation();
	const [aprobarDisponibilidad] = useAprobarDisponibilidadMutation();
	const [rechazarDisponibilidad] = useRechazarDisponibilidadMutation();
	const [aprobarSolicitudMacro] = useAprobarSolicitudMacroMutation();
	const [rechazarSolicitudMacro] = useRechazarSolicitudMacroMutation();

	const [busyKey, setBusyKey] = useState<string | null>(null);
	const [citaToReject, setCitaToReject] = useState<{ id_cita: string; nombre: string } | null>(
		null,
	);

	const disponibilidades = gestion?.bloques ?? [];
	const solicitudesAll = gestion?.solicitudes ?? [];
	const solicitudesPend = solicitudesAll.filter((s) => s.estado === 0);
	const bloquesPend = disponibilidades.filter((d) => d.estado === 0);
	const pendientesCount = solicitudesPend.length + bloquesPend.length;

	const previewDisponibilidad = useMemo((): PreviewRow[] => {
		const rows: PreviewRow[] = [];
		for (const s of solicitudesPend) {
			if (rows.length >= 3) break;
			rows.push({ kind: "macro", solicitud: s });
		}
		let i = 0;
		while (rows.length < 3 && i < bloquesPend.length) {
			rows.push({ kind: "bloque", bloque: bloquesPend[i] });
			i++;
		}
		return rows;
	}, [solicitudesPend, bloquesPend]);

	const stockCritico = useMemo(() => {
		const crit = productos
			.filter((p) => p.activo === 1 && p.stock_minimo_base > 0)
			.map((p) => {
				const ratio =
					p.stock_minimo_base > 0 ? p.stock_base_total / p.stock_minimo_base : 1;
				return { p, ratio };
			})
			.filter((x) => x.p.stock_base_total <= x.p.stock_minimo_base)
			.sort((a, b) => a.ratio - b.ratio)
			.slice(0, 3);
		return crit;
	}, [productos]);

	const financeAlerts = useMemo(
		() =>
			buildFinanceAlerts({
				contratos,
				obligaciones,
				empleados,
				comisionesPendientes: comisionesPend,
			}),
		[contratos, obligaciones, empleados, comisionesPend],
	);

	const loadingFinance =
		loadingObl || loadingContratos || loadingEmpleados || loadingComisiones;

	const nombre =
		user?.nombre?.trim() || user?.apellido?.trim()
			? [user?.nombre, user?.apellido].filter(Boolean).join(" ").trim()
			: null;
	const welcomeTitle = nombre ? `${getSaludo()}, ${nombre.split(" ")[0]}.` : `${getSaludo()}.`;

	const citasHoyOrdenadas = [...citasHoy].sort(
		(a, b) =>
			buildDateTime(a.fecha_cita, a.hora_cita).getTime() -
			buildDateTime(b.fecha_cita, b.hora_cita).getTime(),
	);
	const citasTabla = citasHoyOrdenadas.slice(0, 8);
	const mensual = resumenFacturacion?.mensual;
	const pagosPreview = citasPendientesPago.slice(0, 2);

	const handleAprobarPago = async (id_cita: string) => {
		const confirmResult = await Swal.fire({
			title: "¿Aprobar pago y confirmar cita?",
			text: "Esta acción confirmará el pago y aprobará la cita.",
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Sí, aprobar",
			cancelButtonText: "Cancelar",
			confirmButtonColor: "#006965",
		});
		if (!confirmResult.isConfirmed) return;
		try {
			await updateEstadoPago({ id_cita, estado_pago: 1 }).unwrap();
			await Swal.fire({ icon: "success", title: "Pago aprobado", timer: 1800, showConfirmButton: false });
			refetchPagos();
		} catch (e: unknown) {
			const msg = (e as { data?: { message?: string } })?.data?.message ?? "No se pudo aprobar";
			Swal.fire({ icon: "error", title: "Error", text: msg });
		}
	};

	const handleConfirmRechazar = async (motivo: string) => {
		if (!citaToReject) return;
		try {
			await updateEstadoPago({
				id_cita: citaToReject.id_cita,
				estado_pago: 2,
				motivo_rechazo: motivo,
			}).unwrap();
			setCitaToReject(null);
			await Swal.fire({
				icon: "success",
				title: "Pago rechazado",
				timer: 2000,
				showConfirmButton: false,
			});
			refetchPagos();
		} catch (e: unknown) {
			const msg = (e as { data?: { message?: string } })?.data?.message ?? "Error al rechazar";
			Swal.fire({ icon: "error", title: "Error", text: msg });
		}
	};

	const handleAprobarMacro = async (id: string) => {
		setBusyKey(`m-${id}`);
		try {
			await aprobarSolicitudMacro(id).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Solicitud aprobada",
				timer: 2000,
				showConfirmButton: false,
			});
			refetchDisp();
		} catch (e: unknown) {
			const msg = (e as { data?: { message?: string } })?.data?.message ?? "No se pudo aprobar";
			Swal.fire({ icon: "error", title: "Error", text: msg });
		} finally {
			setBusyKey(null);
		}
	};

	const handleRechazarMacro = async (id: string) => {
		const r = await Swal.fire({
			icon: "warning",
			title: "¿Rechazar solicitud?",
			showCancelButton: true,
			confirmButtonText: "Rechazar",
			confirmButtonColor: "#dc2626",
		});
		if (!r.isConfirmed) return;
		setBusyKey(`m-${id}`);
		try {
			await rechazarSolicitudMacro(id).unwrap();
			await Swal.fire({ icon: "success", title: "Rechazada", timer: 1500, showConfirmButton: false });
			refetchDisp();
		} catch (e: unknown) {
			const msg = (e as { data?: { message?: string } })?.data?.message ?? "Error";
			Swal.fire({ icon: "error", title: "Error", text: msg });
		} finally {
			setBusyKey(null);
		}
	};

	const handleAprobarBloque = async (id: string) => {
		setBusyKey(`b-${id}`);
		try {
			await aprobarDisponibilidad(id).unwrap();
			await Swal.fire({ icon: "success", title: "Aprobado", timer: 1500, showConfirmButton: false });
			refetchDisp();
		} catch (e: unknown) {
			const msg = (e as { data?: { message?: string } })?.data?.message ?? "Error";
			Swal.fire({ icon: "error", title: "Error", text: msg });
		} finally {
			setBusyKey(null);
		}
	};

	const handleRechazarBloque = async (id: string) => {
		const r = await Swal.fire({
			icon: "warning",
			title: "¿Rechazar disponibilidad?",
			showCancelButton: true,
			confirmButtonText: "Rechazar",
			confirmButtonColor: "#dc2626",
		});
		if (!r.isConfirmed) return;
		setBusyKey(`b-${id}`);
		try {
			await rechazarDisponibilidad(id).unwrap();
			await Swal.fire({ icon: "success", title: "Rechazado", timer: 1500, showConfirmButton: false });
			refetchDisp();
		} catch (e: unknown) {
			const msg = (e as { data?: { message?: string } })?.data?.message ?? "Error";
			Swal.fire({ icon: "error", title: "Error", text: msg });
		} finally {
			setBusyKey(null);
		}
	};

	const initials = (n: string, a: string) =>
		`${n?.[0] ?? ""}${a?.[0] ?? ""}`.toUpperCase() || "?";

	return (
		<div className="mx-auto max-w-[1600px] space-y-5 bg-slate-50/0 pb-4">
			<section>
				<h1 className="mb-1 font-headline text-xl font-bold tracking-tight text-brand-900 sm:text-2xl">
					{welcomeTitle}
				</h1>
				<p className="max-w-2xl text-sm text-slate-500">
					Resumen operativo de la clínica: citas, pagos, disponibilidad e inventario.
				</p>
			</section>

			<section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
				<div className="flex flex-col justify-between gap-2 rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md">
					<div className="flex justify-between gap-2">
						<span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
							Pacientes hoy
						</span>
						<span className="shrink-0 rounded-md bg-teal-800/10 px-1.5 py-0.5 text-[10px] font-bold text-teal-800">
							Citas
						</span>
					</div>
					<div className="flex items-baseline gap-1.5">
						<span className="font-headline text-2xl font-extrabold tabular-nums text-brand-900 sm:text-3xl">
							{loadingCitasHoy ? "—" : citasHoy.length}
						</span>
						<span className="text-xs font-medium text-slate-400">consultas</span>
					</div>
				</div>
				<div className="flex flex-col justify-between gap-2 rounded-2xl border-l-4 border-rose-200 bg-white p-4 shadow-sm transition hover:shadow-md">
					<div className="flex justify-between gap-2">
						<span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
							Pagos por verificar
						</span>
						<span className="shrink-0 rounded-md bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-tight text-rose-800">
							Requiere validación
						</span>
					</div>
					<div className="flex items-baseline gap-1.5">
						<span className="font-headline text-2xl font-extrabold tabular-nums text-rose-700 sm:text-3xl">
							{loadingPagos ? "—" : String(citasPendientesPago.length).padStart(2, "0")}
						</span>
						<span className="text-xs font-medium text-slate-400">pendientes</span>
					</div>
				</div>
				<div className="flex flex-col justify-between gap-2 rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md">
					<div className="flex justify-between gap-2">
						<span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
							Ingresos del mes
						</span>
						{mensual != null && (
							<span className="shrink-0 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
								Balance
							</span>
						)}
					</div>
					<div className="flex min-w-0 items-baseline gap-1.5">
						<span className="truncate font-headline text-2xl font-extrabold text-emerald-600 sm:text-3xl">
							{loadingFacturacion || !mensual ? "—" : formatMoneda(mensual.ingresos)}
						</span>
						<span className="shrink-0 text-xs font-medium text-slate-400">USD</span>
					</div>
				</div>
				<div className="flex flex-col justify-between gap-2 rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md">
					<div className="flex justify-between gap-2">
						<span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
							Egresos del mes
						</span>
						{mensual != null && (
							<span className="shrink-0 rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
								Balance
							</span>
						)}
					</div>
					<div className="flex min-w-0 items-baseline gap-1.5">
						<span className="truncate font-headline text-2xl font-extrabold text-brand-900 sm:text-3xl">
							{loadingFacturacion || !mensual ? "—" : formatMoneda(mensual.egresos)}
						</span>
						<span className="shrink-0 text-xs font-medium text-slate-400">USD</span>
					</div>
				</div>
			</section>

			<section className="grid grid-cols-1 gap-5 lg:grid-cols-10">
				<div className="space-y-5 lg:col-span-6">
					<div className="flex flex-col rounded-2xl bg-white p-4 shadow-sm sm:p-5">
						<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
							<div>
								<h3 className="font-headline text-base font-bold text-brand-900">
									Disponibilidades pendientes
								</h3>
								<p className="text-xs text-slate-500">Solicitudes de agenda para especialistas.</p>
							</div>
							<span className="rounded-full bg-teal-800/10 px-2 py-0.5 text-[10px] font-bold uppercase text-teal-800">
								{pendientesCount} solicitudes
							</span>
						</div>
						<div className="space-y-2">
							{loadingDisp ? (
								<div className="h-14 animate-pulse rounded-xl bg-slate-100" />
							) : previewDisponibilidad.length === 0 ? (
								<p className="text-xs text-slate-500">No hay solicitudes pendientes.</p>
							) : (
								previewDisponibilidad.map((row) => {
									if (row.kind === "macro") {
										const s = row.solicitud;
										const label = `Dr(a). ${s.nombre} ${s.apellido}`.trim();
										const sub = `${s.especialidad} · ${String(s.fecha_desde).slice(0, 10)} → ${String(s.fecha_hasta).slice(0, 10)} · ${String(s.hora_inicio).slice(0, 5)}–${String(s.hora_fin).slice(0, 5)}`;
										return (
											<div
												key={`m-${s.id_solicitud}`}
												className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
											>
												<div className="flex items-center gap-3">
													<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-800/10 text-xs font-bold text-teal-800">
														{initials(s.nombre, s.apellido)}
													</div>
													<div className="min-w-0">
														<p className="text-xs font-bold text-brand-900">{label}</p>
														<p className="truncate text-[11px] text-slate-500">{sub}</p>
													</div>
												</div>
												<div className="flex flex-wrap gap-1.5 sm:shrink-0">
													<button
														type="button"
														disabled={busyKey === `m-${s.id_solicitud}`}
														onClick={() => handleAprobarMacro(s.id_solicitud)}
														className="rounded-lg bg-teal-800 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
													>
														Aprobar
													</button>
													<button
														type="button"
														disabled={busyKey === `m-${s.id_solicitud}`}
														onClick={() => handleRechazarMacro(s.id_solicitud)}
														className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
													>
														Rechazar
													</button>
												</div>
											</div>
										);
									}
									const d = row.bloque;
									const label = `Dr(a). ${d.nombre} ${d.apellido}`.trim();
									const sub = `${d.especialidad} · ${String(d.fecha).slice(0, 10)} ${String(d.hora_inicio).slice(0, 5)}–${String(d.hora_fin).slice(0, 5)}${d.eco_nombre ? ` · ${d.eco_nombre}` : ""}`;
									return (
										<div
											key={`b-${d.id_disponibilidad}`}
											className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:flex-row sm:items-center sm:justify-between"
										>
											<div className="flex items-center gap-3">
												<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-800/10 text-xs font-bold text-teal-800">
													{initials(d.nombre, d.apellido)}
												</div>
												<div className="min-w-0">
													<p className="text-xs font-bold text-brand-900">{label}</p>
													<p className="truncate text-[11px] text-slate-500">{sub}</p>
												</div>
											</div>
											<div className="flex flex-wrap gap-1.5 sm:shrink-0">
												<button
													type="button"
													disabled={busyKey === `b-${d.id_disponibilidad}`}
													onClick={() => handleAprobarBloque(d.id_disponibilidad)}
													className="rounded-lg bg-teal-800 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
												>
													Aprobar
												</button>
												<button
													type="button"
													disabled={busyKey === `b-${d.id_disponibilidad}`}
													onClick={() => handleRechazarBloque(d.id_disponibilidad)}
													className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
												>
													Rechazar
												</button>
											</div>
										</div>
									);
								})
							)}
						</div>
						<div className="mt-3 border-t border-slate-100 pt-3 text-center">
							<Link
								to="/disponibilidad/pendientes"
								className="text-[10px] font-bold uppercase tracking-wide text-teal-800 hover:underline"
							>
								Ver todas las solicitudes
							</Link>
						</div>
					</div>

					<div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
						<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
							<h3 className="font-headline text-base font-bold text-brand-900">Citas de hoy</h3>
							<Link
								to="/todas-las-citas"
								className="text-xs font-bold text-teal-800 hover:underline"
							>
								Ver agenda completa
							</Link>
						</div>
						{loadingCitasHoy ? (
							<div className="h-24 animate-pulse rounded-xl bg-slate-100" />
						) : citasTabla.length === 0 ? (
							<p className="text-xs text-slate-500">No hay citas programadas para hoy.</p>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-left text-xs">
									<thead>
										<tr className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
											<th className="pb-2">Hora</th>
											<th className="pb-2">Paciente</th>
											<th className="pb-2">Estudio</th>
											<th className="pb-2 text-right">Estado</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100">
										{citasTabla.map((cita) => (
											<tr key={cita.id_cita}>
												<td className="py-2 font-bold text-teal-800">
													{formatHora(cita.hora_cita)}
												</td>
												<td className="py-2 font-semibold text-brand-900">
													{cita.paciente_nombre} {cita.paciente_apellido}
												</td>
												<td className="py-2 text-slate-500">{cita.eco_nombre}</td>
												<td className="py-2 text-right">
													<span
														className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${getEstadoCitaBadgeClass(
															cita.estado_cita,
														)}`}
													>
														{getEstadoCitaLabel(cita.estado_cita)}
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>

					<DashboardCharts />

					<div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
						<h3 className="mb-3 font-headline text-base font-bold text-brand-900">Accesos rápidos</h3>
						<div className="grid grid-cols-2 gap-2">
							<Link
								to="/pacientes"
								className="flex min-h-[4.75rem] flex-col items-center justify-center rounded-xl bg-teal-800/5 px-2 py-2.5 text-teal-800 transition hover:bg-teal-800 hover:text-white"
							>
								<UserPlus className="mb-1 h-5 w-5" />
								<span className="text-center text-[9px] font-bold uppercase leading-tight tracking-tight">
									Registrar paciente
								</span>
							</Link>
							<Link
								to="/pagos"
								className="flex min-h-[4.75rem] flex-col items-center justify-center rounded-xl bg-teal-800/5 px-2 py-2.5 text-teal-800 transition hover:bg-teal-800 hover:text-white"
							>
								<Wallet className="mb-1 h-5 w-5" />
								<span className="text-center text-[9px] font-bold uppercase leading-tight tracking-tight">
									Registrar pago
								</span>
							</Link>
							<Link
								to="/inventario"
								className="flex min-h-[4.75rem] flex-col items-center justify-center rounded-xl bg-slate-50 px-2 py-2.5 text-brand-900 transition hover:bg-slate-900 hover:text-white"
							>
								<ShoppingCart className="mb-1 h-5 w-5" />
								<span className="text-center text-[9px] font-bold uppercase leading-tight tracking-tight">
									Cargar compra
								</span>
							</Link>
							<Link
								to="/finanzas?tab=nomina"
								className="flex min-h-[4.75rem] flex-col items-center justify-center rounded-xl bg-slate-50 px-2 py-2.5 text-brand-900 transition hover:bg-slate-900 hover:text-white"
							>
								<DollarSign className="mb-1 h-5 w-5" />
								<span className="text-center text-[9px] font-bold uppercase leading-tight tracking-tight">
									Pagar nómina
								</span>
							</Link>
						</div>
					</div>
				</div>

				<div className="flex flex-col space-y-5 lg:col-span-4">
					<div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm sm:p-5">
						<div className="mb-3 flex items-center justify-between">
							<h3 className="font-headline text-base font-bold text-brand-900">Requiere tu atención</h3>
							<AlertCircle className="h-5 w-5 shrink-0 text-rose-600" aria-hidden />
						</div>
						<div className="mb-4">
							<h4 className="mb-2 text-[9px] font-bold uppercase tracking-wide text-slate-400">
								Aprobación de pagos pendientes
							</h4>
							{loadingPagos ? (
								<div className="h-14 animate-pulse rounded-xl bg-slate-100" />
							) : pagosPreview.length === 0 ? (
								<p className="text-xs text-slate-500">No hay pagos por verificar.</p>
							) : (
								<div className="space-y-2">
									{pagosPreview.map((cita: CitaPendientePago) => (
										<div
											key={cita.id_cita}
											className="flex flex-col gap-2 rounded-xl border border-rose-100 bg-rose-50/30 p-3 sm:flex-row sm:items-center sm:justify-between"
										>
											<div className="flex min-w-0 items-center gap-2">
												<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-rose-700 shadow-sm">
													<Receipt className="h-4 w-4" />
												</div>
												<div className="min-w-0">
													<p className="truncate text-xs font-bold leading-tight text-brand-900">
														{cita.paciente_nombre} {cita.paciente_apellido}
													</p>
													<p className="mt-0.5 text-[9px] font-bold uppercase text-rose-700">
														{formatHora(cita.hora_cita)} · {cita.eco_nombre}
													</p>
												</div>
											</div>
											<div className="flex flex-wrap gap-1.5 sm:shrink-0">
												<button
													type="button"
													disabled={updatingPago}
													onClick={() => handleAprobarPago(cita.id_cita)}
													className="rounded-lg bg-white px-3 py-1.5 text-[10px] font-bold uppercase text-teal-800 shadow-sm hover:shadow disabled:opacity-50"
												>
													Aprobar
												</button>
												<button
													type="button"
													disabled={updatingPago}
													onClick={() =>
														setCitaToReject({
															id_cita: cita.id_cita,
															nombre: `${cita.paciente_nombre} ${cita.paciente_apellido}`,
														})
													}
													className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50"
												>
													Rechazar
												</button>
											</div>
										</div>
									))}
								</div>
							)}
							<Link
								to="/pagos"
								className="mt-2 inline-block text-[11px] font-semibold text-teal-800 hover:underline"
							>
								Ir a verificación de pagos
							</Link>
						</div>

						<div>
							<h4 className="mb-2 text-[9px] font-bold uppercase tracking-wide text-slate-400">
								Stock crítico inventario
							</h4>
							{loadingProd ? (
								<div className="h-12 animate-pulse rounded-xl bg-slate-100" />
							) : stockCritico.length === 0 ? (
								<p className="text-xs text-slate-500">Sin productos bajo mínimo.</p>
							) : (
								<div className="space-y-2">
									{stockCritico.map(({ p, ratio }) => {
										const urgent = p.stock_base_total <= 0;
										return (
											<div
												key={p.id_producto}
												className={`flex items-center justify-between rounded-xl px-2 py-2 ${
													urgent
														? "border-l-4 border-red-500 bg-red-50/30"
														: "bg-slate-50"
												}`}
											>
												<div className="flex min-w-0 items-center gap-2">
													<div
														className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
															urgent ? "bg-red-100 text-red-700" : "bg-orange-50 text-orange-600"
														}`}
													>
														<AlertTriangle className="h-3.5 w-3.5" />
													</div>
													<div className="min-w-0">
														<p className="truncate text-xs font-bold leading-tight text-brand-900">
															{p.nombre}
														</p>
														<p className="text-[9px] font-bold uppercase text-slate-500">
															{urgent
																? "Sin disponibilidad"
																: `${Math.round(ratio * 100)}% vs mínimo`}
														</p>
													</div>
												</div>
												<Link
													to="/inventario"
													className={`shrink-0 pl-2 text-[9px] font-bold uppercase ${
														urgent ? "text-red-600" : "text-teal-800 hover:underline"
													}`}
												>
													{urgent ? "Urgente" : "Atender"}
												</Link>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>

					<div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
						<div className="mb-3 flex items-center justify-between">
							<h3 className="font-headline text-base font-bold text-brand-900">Manejo de finanzas</h3>
							<Banknote className="h-5 w-5 shrink-0 text-slate-600" aria-hidden />
						</div>
						<p className="mb-3 text-[11px] leading-snug text-slate-500">
							Alertas por vencimiento (amarillo: próximos 3 días; rojo: vencido). Sin fechas no se
							listan aquí.
						</p>
						<div className="max-h-64 space-y-2 overflow-y-auto pr-0.5">
							{loadingFinance ? (
								<div className="h-14 animate-pulse rounded-xl bg-slate-100" />
							) : financeAlerts.length === 0 ? (
								<p className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-xs text-slate-600">
									No hay alertas de pago próximas o vencidas según las fechas registradas.
								</p>
							) : (
								financeAlerts.map((a) => {
									const isOverdue = a.severity === "overdue";
									return (
									<div
										key={a.id}
										className={`flex flex-row items-start gap-2 rounded-xl border-l-4 p-3 sm:gap-3 ${
											isOverdue
												? "border-red-500 bg-red-50/50"
												: "border-amber-400 bg-amber-50/60"
										}`}
									>
										<div className="min-w-0 flex-1">
											<p
												className={`text-[9px] font-bold uppercase tracking-wide ${
													isOverdue ? "text-red-700" : "text-amber-800"
												}`}
											>
												{isOverdue ? "Vencido" : "Próximo a vencer"}
											</p>
											<p
												className={`mt-1 text-xs font-semibold leading-snug ${
													isOverdue ? "text-red-950" : "text-amber-950"
												}`}
											>
												{a.message}
											</p>
										</div>
										<Link
											to={`/finanzas?tab=${a.tab}`}
											className="mt-0.5 shrink-0 self-center rounded-full border border-slate-400/80 bg-white px-3 py-1.5 text-center text-[10px] font-bold text-slate-800 shadow-sm transition hover:bg-slate-100 sm:px-4 sm:text-xs"
										>
											Ir a pagar
										</Link>
									</div>
									);
								})
							)}
						</div>
						<Link
							to="/finanzas"
							className="mt-3 inline-block text-[11px] font-semibold text-slate-700 underline-offset-2 hover:text-slate-900 hover:underline"
						>
							Abrir módulo de finanzas
						</Link>
					</div>
				</div>
			</section>

			{citaToReject && (
				<RechazarPagoModal
					onClose={() => setCitaToReject(null)}
					onConfirm={(motivo) => void handleConfirmRechazar(motivo)}
					isLoading={updatingPago}
					nombrePaciente={citaToReject.nombre}
				/>
			)}
		</div>
	);
};

export default DashboardAdmin;
