import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../shared";
import { useGetMisCitasQuery } from "../../especialista/especialistaApi";
import type { CitaEspecialista } from "../../especialista/types";
import type { CitaCardItem } from "../../citas/components/CitaCard";
import {
	getTodayKey,
	toDateKey,
	formatHora,
	formatDateLabel,
	buildDateTime,
} from "../utils/dateUtils";
import DaySummaryCard from "./DaySummaryCard";
import CitasPorResultadoCard from "./CitasPorResultadoCard";
import CitasVerificacionPagoCard from "./CitasVerificacionPagoCard";
import RecentNotificationsCard from "./RecentNotificationsCard";
import { useGetMisNotificacionesQuery } from "../../notificaciones/notificacionesApi";
import {
	CalendarDays,
	Users,
	FileCheck,
	FileText,
	Bell,
	ChevronRight,
	Stethoscope,
	ChevronLeft,
} from "lucide-react";
import { formatFechaHoraLocal } from "../../../shared";

const CITAS_DEL_DIA_POR_PAGINA = 3;

const formatFecha = (value: string) => formatFechaHoraLocal(value);

const formatDateLabelLong = (value: string) =>
	new Date(value.slice(0, 10)).toLocaleDateString("es-ES", {
		weekday: "long",
		day: "numeric",
		month: "long",
	});

const mapCitaToCardItem = (
	cita: CitaEspecialista,
	formatDate: (v: string | Date) => string,
): CitaCardItem => ({
	id_cita: cita.id_cita,
	patientName: `${cita.paciente_nombre} ${cita.paciente_apellido}`,
	ecoNombre: cita.eco_nombre,
	dateLabel: formatDate(cita.fecha_cita),
	timeLabel: formatHora(cita.hora_cita),
});

const getSaludo = () => {
	const h = new Date().getHours();
	if (h < 12) return "Buenos días";
	if (h < 19) return "Buenas tardes";
	return "Buenas noches";
};

const DashboardEspecialista = () => {
	const { user } = useAuth();
	const { data: rawCitas = [], isLoading } = useGetMisCitasQuery(undefined, {
		skip: user?.rol !== "especialista",
	});

	const { data: notificaciones = [], isLoading: loadingNotificaciones } =
		useGetMisNotificacionesQuery(
			{ limit: 5 },
			{ pollingInterval: 20000, refetchOnFocus: true },
		);

	// Normalizar estados (el API puede devolver números o strings) y fecha
	const citas: CitaEspecialista[] = rawCitas.map((cita) => {
		const estadoCita = Number(cita.estado_cita);
		const estadoPago = Number(cita.estado_pago);
		const fecha =
			typeof cita.fecha_cita === "string"
				? cita.fecha_cita
				: cita.fecha_cita instanceof Date
					? cita.fecha_cita.toISOString().slice(0, 10)
					: String(cita.fecha_cita ?? "").slice(0, 10);
		return {
			...cita,
			fecha_cita: fecha || (cita.fecha_cita as string),
			estado_cita: Number.isNaN(estadoCita) ? 0 : estadoCita,
			estado_pago: Number.isNaN(estadoPago) ? 0 : estadoPago,
		};
	});

	const notifications = notificaciones.map((n) => ({
		id: n.id_notificacion,
		title: n.titulo,
		timeLabel: formatFecha(n.fecha_creacion),
	}));

	const nombre = user?.nombre?.trim() || user?.apellido?.trim()
		? [user?.nombre, user?.apellido].filter(Boolean).join(" ").trim()
		: null;
	const saludo = getSaludo();
	const welcomeTitle = nombre ? `${saludo}, ${nombre}` : `${saludo}`;

	const todayKey = getTodayKey();
	const [paginaCitasDelDia, setPaginaCitasDelDia] = useState(1);

	const citasToday = citas.filter(
		(c) => toDateKey(c.fecha_cita) === todayKey,
	);
	const confirmedToday = citasToday.filter((c) => Number(c.estado_cita) === 1).length;
	const pendingPaymentToday = citasToday.filter((c) => Number(c.estado_pago) === 0).length;
	const attendedToday = citasToday.filter((c) => Number(c.estado_cita) === 3).length;
	const resultsPendingToday = citasToday.filter(
		(c) => Number(c.estado_cita) === 3 && !c.resultado_archivo,
	).length;
	const daySummary = [
		{ label: "Citas confirmadas", value: String(confirmedToday) },
		{ label: "Pendientes de pago", value: String(pendingPaymentToday) },
		{ label: "Atendidas hoy", value: String(attendedToday) },
		{ label: "Resultados por cargar", value: String(resultsPendingToday) },
	];

	// Citas del día ordenadas por hora (para el bloque "Citas del día" con paginado)
	const citasDelDiaOrdenadas = [...citasToday].sort(
		(a, b) =>
			buildDateTime(a.fecha_cita, a.hora_cita).getTime() -
			buildDateTime(b.fecha_cita, b.hora_cita).getTime(),
	);
	const totalPaginasCitasDelDia = Math.max(
		1,
		Math.ceil(citasDelDiaOrdenadas.length / CITAS_DEL_DIA_POR_PAGINA),
	);
	const paginaActual = Math.min(paginaCitasDelDia, totalPaginasCitasDelDia);
	const citasDelDiaPaginadas = citasDelDiaOrdenadas.slice(
		(paginaActual - 1) * CITAS_DEL_DIA_POR_PAGINA,
		paginaActual * CITAS_DEL_DIA_POR_PAGINA,
	);

	const citasSinResultado = citas
		.filter((c) => c.estado_cita === 3 && !c.resultado_archivo)
		.sort(
			(a, b) =>
				buildDateTime(b.fecha_cita, b.hora_cita).getTime() -
				buildDateTime(a.fecha_cita, a.hora_cita).getTime(),
		)
		.map((c) => ({
			...mapCitaToCardItem(c, formatDateLabel),
			badge: "Sin resultado",
			badgeVariant: "warning" as const,
		}));

	const citasPendientesVerificacionPago = citas
		.filter((c) => c.estado_cita === 1 && c.estado_pago === 0)
		.sort(
			(a, b) =>
				buildDateTime(a.fecha_cita, a.hora_cita).getTime() -
				buildDateTime(b.fecha_cita, b.hora_cita).getTime(),
		)
		.map((c) => ({
			...mapCitaToCardItem(c, formatDateLabel),
			badge: "Pago pendiente",
			badgeVariant: "warning" as const,
		}));

	const getEstadoPagoLabel = (estado: number) => {
		switch (estado) {
			case 0:
				return "Pendiente de pago";
			case 1:
				return "Pago aprobado";
			case 2:
				return "Pago rechazado";
			default:
				return "—";
		}
	};

	return (
		<div className="space-y-8">
			{/* Hero bienvenida */}
			<section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 via-teal-800 to-slate-800 px-6 py-8 shadow-xl sm:px-8 sm:py-10">
				<div className="relative z-10">
					<div className="flex items-center gap-2 text-teal-200">
						<Stethoscope className="h-5 w-5" />
						<span className="text-base font-medium">Panel del especialista</span>
					</div>
					<h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
						{welcomeTitle}
					</h1>
					<p className="mt-2 max-w-lg text-base text-white/90 sm:text-base">
						Aquí tienes las citas del día, el resumen y el acceso rápido a calendario, resultados e informes.
					</p>
				</div>
				<div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/5 to-transparent" aria-hidden />
			</section>

			{/* Resumen del día: citas + métricas */}
			<section>
				<h2 className="mb-3 text-lg font-semibold text-brand-900">Resumen del día</h2>
				<div className="grid gap-4 lg:grid-cols-2">
					{/* Citas del día */}
					<div className="flex min-h-[280px] flex-col">
						{isLoading ? (
							<div className="flex flex-1 rounded-2xl border border-brand-200 bg-paper p-6">
								<div className="h-24 w-full animate-pulse rounded-xl bg-cloud" />
							</div>
						) : citasDelDiaOrdenadas.length === 0 ? (
							<div className="flex flex-1 flex-col justify-center rounded-2xl border border-dashed border-brand-300 bg-cloud/30 p-6 text-center">
								<CalendarDays className="mx-auto h-12 w-12 text-brand-400" />
								<p className="mt-2 text-base font-medium text-brand-800">No hay citas hoy</p>
								<Link
									to="/calendario"
									className="mt-3 inline-block text-base font-medium text-brand-600 hover:text-brand-800"
								>
									Ver calendario →
								</Link>
							</div>
						) : (
							<div className="flex flex-1 flex-col rounded-2xl border border-brand-200 bg-paper p-4 shadow-sm">
								<h3 className="text-base font-semibold text-brand-900">Citas de hoy</h3>
								<ul className="mt-3 space-y-2">
									{citasDelDiaPaginadas.map((cita) => {
										const esPendienteResultado =
											cita.estado_cita === 3 && !cita.resultado_archivo;
										return (
											<li key={cita.id_cita}>
												<Link
													to={esPendienteResultado ? "/resultados" : "/calendario"}
													className="group flex items-center justify-between gap-2 rounded-xl border border-transparent bg-cloud/50 px-3 py-2.5 transition hover:border-brand-300 hover:bg-cloud"
												>
													<div className="min-w-0 flex-1">
														<p className="text-base font-medium text-brand-900">
															{cita.eco_nombre}
														</p>
														<p className="text-sm text-brand-700">
															{cita.paciente_nombre} {cita.paciente_apellido} · {formatHora(cita.hora_cita)}
														</p>
														{esPendienteResultado ? (
															<span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
																Pendiente de resultado
															</span>
														) : (
															<span
																className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
																	cita.estado_pago === 0
																		? "bg-amber-100 text-amber-800"
																		: cita.estado_pago === 1
																			? "bg-emerald-100 text-emerald-800"
																			: "bg-brand-100 text-brand-800"
																}`}
															>
																{getEstadoPagoLabel(cita.estado_pago)}
															</span>
														)}
													</div>
													<ChevronRight className="h-4 w-4 shrink-0 text-brand-400 group-hover:text-brand-600" />
												</Link>
											</li>
										);
									})}
								</ul>
								{totalPaginasCitasDelDia > 1 && (
									<div className="mt-3 flex items-center justify-between border-t border-brand-100 pt-3">
										<span className="text-sm text-brand-600">
											{(paginaActual - 1) * CITAS_DEL_DIA_POR_PAGINA + 1}–
											{Math.min(
												paginaActual * CITAS_DEL_DIA_POR_PAGINA,
												citasDelDiaOrdenadas.length,
											)}{" "}
											de {citasDelDiaOrdenadas.length}
										</span>
										<div className="flex items-center gap-1">
											<button
												type="button"
												onClick={() => setPaginaCitasDelDia((p) => Math.max(1, p - 1))}
												disabled={paginaActual <= 1}
												className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-200 bg-paper text-brand-700 transition hover:bg-cloud disabled:opacity-50 disabled:pointer-events-none"
												aria-label="Página anterior"
											>
												<ChevronLeft className="h-4 w-4" />
											</button>
											<span className="px-2 text-sm font-medium text-brand-700">
												{paginaActual} / {totalPaginasCitasDelDia}
											</span>
											<button
												type="button"
												onClick={() =>
													setPaginaCitasDelDia((p) => Math.min(totalPaginasCitasDelDia, p + 1))
												}
												disabled={paginaActual >= totalPaginasCitasDelDia}
												className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-200 bg-paper text-brand-700 transition hover:bg-cloud disabled:opacity-50 disabled:pointer-events-none"
												aria-label="Página siguiente"
											>
												<ChevronRight className="h-4 w-4" />
											</button>
										</div>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Métricas del día */}
					<div className="min-h-[280px]">
						<DaySummaryCard dateLabel="Hoy" items={daySummary} title="Hoy" />
					</div>
				</div>
			</section>

			{/* Accesos rápidos */}
			<section>
				<h2 className="mb-3 text-lg font-semibold text-brand-900">Accesos rápidos</h2>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<Link
						to="/calendario"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
							<CalendarDays className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Calendario</p>
							<p className="text-sm text-brand-600">Ver tu agenda</p>
						</div>
						<ChevronRight className="h-4 w-4 shrink-0 text-brand-400" />
					</Link>

					<Link
						to="/pacientes-especialista"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
							<Users className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Pacientes</p>
							<p className="text-sm text-brand-600">Citas y historial</p>
						</div>
						<ChevronRight className="h-4 w-4 shrink-0 text-brand-400" />
					</Link>

					<Link
						to="/resultados"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
							<FileCheck className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Subir resultados</p>
							<p className="text-sm text-brand-600">
								{citasSinResultado.length > 0
									? `${citasSinResultado.length} pendiente(s)`
									: "Cargar archivos"}
							</p>
						</div>
						<ChevronRight className="h-4 w-4 shrink-0 text-brand-400" />
					</Link>

					<Link
						to="/informes"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
							<FileText className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Informes</p>
							<p className="text-sm text-brand-600">Informes médicos</p>
						</div>
						<ChevronRight className="h-4 w-4 shrink-0 text-brand-400" />
					</Link>
				</div>
			</section>

			{/* Citas pendientes de resultado y de pago */}
			<div className="grid gap-4 lg:grid-cols-2">
				<CitasPorResultadoCard
					citas={citasSinResultado}
					isLoading={isLoading}
					emptyMessage="Sin citas pendientes de resultado."
				/>
				<CitasVerificacionPagoCard
					citas={citasPendientesVerificacionPago}
					isLoading={isLoading}
					emptyMessage="Sin citas pendientes de verificación de pago."
				/>
			</div>

			{/* Notificaciones */}
			<section>
				<div className="mb-3 flex items-center justify-between">
					<h2 className="text-lg font-semibold text-brand-900">Notificaciones</h2>
					<Link
						to="/notificaciones"
						className="flex items-center gap-1 text-base font-medium text-brand-600 hover:text-brand-800"
					>
						<Bell className="h-4 w-4" />
						Ver todas
					</Link>
				</div>
				<RecentNotificationsCard
					notifications={notifications}
					emptyMessage={
						loadingNotificaciones
							? "Cargando notificaciones..."
							: "No tienes notificaciones recientes."
					}
				/>
			</section>
		</div>
	);
};

export default DashboardEspecialista;
