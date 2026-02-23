import { Link } from "react-router-dom";
import { useAuth } from "../../../shared";
import { useGetMisNotificacionesQuery } from "../../notificaciones/notificacionesApi";
import { useGetCitasPendientesPagoQuery } from "../../citas/citasApi";
import { useGetCitasSinResultadoQuery } from "../../resultados/resultadosApi";
import { useGetDisponibilidadPendientesQuery } from "../../disponibilidad/disponibilidadApi";
import { useGetCitasByFechaQuery } from "../../moderadores/moderadoresApi";
import { getTodayKey, formatHora, buildDateTime } from "../utils/dateUtils";
import { formatFechaHoraLocal } from "../../../shared";
import DaySummaryCard from "./DaySummaryCard";
import QuickAlertsCard from "./QuickAlertsCard";
import RecentNotificationsCard from "./RecentNotificationsCard";
import {
	CalendarDays,
	Users,
	DollarSign,
	ClipboardList,
	Package,
	ChevronRight,
	Bell,
	FileCheck,
	FileText,
	ClipboardCheck,
} from "lucide-react";

const formatFecha = (value: string) => formatFechaHoraLocal(value);

const getSaludo = () => {
	const h = new Date().getHours();
	if (h < 12) return "Buenos días";
	if (h < 19) return "Buenas tardes";
	return "Buenas noches";
};

/**
 * Dashboard para rol moderador. Muy parecido al de admin pero sin ingresos/facturación
 * y sin accesos a crear especialistas, moderadores ni gestionar usuarios.
 */
const DashboardModerador = () => {
	const { user } = useAuth();
	const todayKey = getTodayKey();

	const { data: notificaciones = [], isLoading: loadingNotif } =
		useGetMisNotificacionesQuery(
			{ limit: 5 },
			{ pollingInterval: 20000, refetchOnFocus: true },
		);
	const { data: citasPendientesPago = [], isLoading: loadingPagos } =
		useGetCitasPendientesPagoQuery();
	const { data: citasSinResultado = [], isLoading: loadingResultados } =
		useGetCitasSinResultadoQuery();
	const { data: disponibilidadPendiente = [], isLoading: loadingDisp } =
		useGetDisponibilidadPendientesQuery();
	const { data: citasHoy = [], isLoading: loadingCitasHoy } =
		useGetCitasByFechaQuery(todayKey);

	const notifications = notificaciones.map((n) => ({
		id: n.id_notificacion,
		title: n.titulo,
		timeLabel: formatFecha(n.fecha_creacion),
	}));

	const nombre =
		user?.nombre?.trim() || user?.apellido?.trim()
			? [user?.nombre, user?.apellido].filter(Boolean).join(" ").trim()
			: null;
	const saludo = getSaludo();
	const welcomeTitle = nombre ? `${saludo}, ${nombre}` : `${saludo}`;

	const moderadorSummary = [
		{ label: "Citas hoy", value: String(citasHoy.length) },
		{ label: "Pendientes de pago (citas)", value: String(citasPendientesPago.length) },
		{ label: "Disponibilidades pendientes", value: String(disponibilidadPendiente.length) },
		{ label: "Citas sin resultado", value: String(citasSinResultado.length) },
	];

	const alertas = [
		citasPendientesPago.length
			? {
					id: "alert-pagos",
					message: `${citasPendientesPago.length} citas con pago pendiente por verificar.`,
				}
			: null,
		disponibilidadPendiente.length
			? {
					id: "alert-disp",
					message: `${disponibilidadPendiente.length} disponibilidades pendientes de aprobar.`,
				}
			: null,
		citasSinResultado.length
			? {
					id: "alert-resultados",
					message: `${citasSinResultado.length} citas atendidas sin resultado.`,
				}
			: null,
	].filter((a): a is { id: string; message: string } => Boolean(a));

	const loading =
		loadingPagos || loadingResultados || loadingDisp || loadingCitasHoy;

	const citasHoyOrdenadas = [...citasHoy].sort(
		(a, b) =>
			buildDateTime(a.fecha_cita, a.hora_cita).getTime() -
			buildDateTime(b.fecha_cita, b.hora_cita).getTime(),
	);
	const citasHoyPreview = citasHoyOrdenadas.slice(0, 5);

	return (
		<div className="space-y-8">
			{/* Hero */}
			<section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 px-6 py-8 shadow-xl sm:px-8 sm:py-10">
				<div className="relative z-10">
					<div className="flex items-center gap-2 text-teal-200">
						<ClipboardCheck className="h-5 w-5" />
						<span className="text-sm font-medium">Panel de moderación</span>
					</div>
					<h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
						{welcomeTitle}
					</h1>
					<p className="mt-2 max-w-lg text-sm text-white/90 sm:text-base">
						Gestiona pagos, disponibilidades, citas y resultados. Acceso rápido a
						calendario, pacientes e inventario.
					</p>
				</div>
				<div
					className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/5 to-transparent"
					aria-hidden
				/>
			</section>

			{/* KPIs principales (sin ingresos ni usuarios) */}
			<section>
				<h2 className="mb-3 text-lg font-semibold text-brand-900">Resumen general</h2>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-2xl border border-brand-200 bg-paper p-4 shadow-sm">
						<div className="flex items-center gap-3">
							<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
								<CalendarDays className="h-5 w-5" />
							</div>
							<div className="min-w-0">
								<p className="text-xs font-medium text-brand-600">Citas hoy</p>
								<p className="text-xl font-bold text-brand-900">
									{loadingCitasHoy ? "—" : citasHoy.length}
								</p>
							</div>
						</div>
						<Link
							to="/todas-las-citas"
							className="mt-2 flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-800"
						>
							Ver todas
							<ChevronRight className="h-3 w-3" />
						</Link>
					</div>

					<div className="rounded-2xl border border-brand-200 bg-paper p-4 shadow-sm">
						<div className="flex items-center gap-3">
							<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
								<DollarSign className="h-5 w-5" />
							</div>
							<div className="min-w-0">
								<p className="text-xs font-medium text-brand-600">Pendientes pago</p>
								<p className="text-xl font-bold text-brand-900">
									{loadingPagos ? "—" : citasPendientesPago.length}
								</p>
							</div>
						</div>
						<Link
							to="/pagos"
							className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-800"
						>
							Ver pagos
							<ChevronRight className="h-3 w-3" />
						</Link>
					</div>

					<div className="rounded-2xl border border-brand-200 bg-paper p-4 shadow-sm">
						<div className="flex items-center gap-3">
							<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
								<CalendarDays className="h-5 w-5" />
							</div>
							<div className="min-w-0">
								<p className="text-xs font-medium text-brand-600">Disp. pendientes</p>
								<p className="text-xl font-bold text-brand-900">
									{loadingDisp ? "—" : disponibilidadPendiente.length}
								</p>
							</div>
						</div>
						<Link
							to="/disponibilidad/pendientes"
							className="mt-2 flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-800"
						>
							Aprobar
							<ChevronRight className="h-3 w-3" />
						</Link>
					</div>

					<div className="rounded-2xl border border-brand-200 bg-paper p-4 shadow-sm">
						<div className="flex items-center gap-3">
							<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
								<FileCheck className="h-5 w-5" />
							</div>
							<div className="min-w-0">
								<p className="text-xs font-medium text-brand-600">Sin resultado</p>
								<p className="text-xl font-bold text-brand-900">
									{loadingResultados ? "—" : citasSinResultado.length}
								</p>
							</div>
						</div>
						<Link
							to="/resultados"
							className="mt-2 flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800"
						>
							Resultados
							<ChevronRight className="h-3 w-3" />
						</Link>
					</div>
				</div>
			</section>

			{/* Resumen operativo + Alertas (sin card financiero) */}
			<section>
				<h2 className="mb-3 text-lg font-semibold text-brand-900">Detalle y alertas</h2>
				<div className="grid gap-4 lg:grid-cols-2">
					<DaySummaryCard
						dateLabel="Hoy"
						title="Resumen operativo"
						items={moderadorSummary}
					/>
					<QuickAlertsCard
						alerts={alertas}
						emptyMessage={loading ? "Cargando alertas..." : "Sin alertas pendientes."}
					/>
				</div>
			</section>

			{/* Citas del día (preview) */}
			<section>
				<h2 className="mb-3 text-lg font-semibold text-brand-900">Citas de hoy</h2>
				{loadingCitasHoy ? (
					<div className="rounded-2xl border border-brand-200 bg-paper p-6">
						<div className="h-32 animate-pulse rounded-xl bg-cloud" />
					</div>
				) : citasHoyOrdenadas.length === 0 ? (
					<div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-300 bg-cloud/30 py-10 text-center">
						<CalendarDays className="mx-auto h-12 w-12 text-brand-400" />
						<p className="mt-2 text-sm font-medium text-brand-800">No hay citas hoy</p>
						<Link
							to="/calendario-moderador"
							className="mt-3 inline-block text-sm font-medium text-brand-600 hover:text-brand-800"
						>
							Ver calendario →
						</Link>
					</div>
				) : (
					<div className="rounded-2xl border border-brand-200 bg-paper p-4 shadow-sm">
						<ul className="space-y-2">
							{citasHoyPreview.map((cita) => (
								<li key={cita.id_cita}>
									<Link
										to="/todas-las-citas"
										className="group flex items-center justify-between gap-2 rounded-xl border border-transparent bg-cloud/50 px-3 py-2.5 transition hover:border-brand-300 hover:bg-cloud"
									>
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium text-brand-900">
												{cita.eco_nombre}
											</p>
											<p className="text-xs text-brand-700">
												{cita.paciente_nombre} {cita.paciente_apellido} ·{" "}
												{formatHora(cita.hora_cita)}
											</p>
										</div>
										<ChevronRight className="h-4 w-4 shrink-0 text-brand-400 group-hover:text-brand-600" />
									</Link>
								</li>
							))}
						</ul>
						{citasHoyOrdenadas.length > 5 && (
							<Link
								to="/todas-las-citas"
								className="mt-3 flex items-center justify-center gap-1 border-t border-brand-100 pt-3 text-sm font-medium text-brand-600 hover:text-brand-800"
							>
								Ver las {citasHoyOrdenadas.length} citas del día
								<ChevronRight className="h-4 w-4" />
							</Link>
						)}
					</div>
				)}
			</section>

			{/* Accesos rápidos (sin registrar especialista/moderador, usuarios, métodos de pago, roles, etc.) */}
			<section>
				<h2 className="mb-3 text-lg font-semibold text-brand-900">Accesos rápidos</h2>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<Link
						to="/pagos"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
							<DollarSign className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Pagos</p>
							<p className="text-xs text-brand-600">Verificar y aprobar pagos</p>
						</div>
						<ChevronRight className="h-4 w-4 shrink-0 text-brand-400" />
					</Link>

					<Link
						to="/todas-las-citas"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
							<ClipboardList className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Todas las citas</p>
							<p className="text-xs text-brand-600">Listado completo</p>
						</div>
						<ChevronRight className="h-4 w-4 shrink-0 text-brand-400" />
					</Link>

					<Link
						to="/calendario-moderador"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
							<CalendarDays className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Calendario mostrador</p>
							<p className="text-xs text-brand-600">Citas y disponibilidad</p>
						</div>
						<ChevronRight className="h-4 w-4 shrink-0 text-brand-400" />
					</Link>

					<Link
						to="/pacientes"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
							<Users className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Pacientes</p>
							<p className="text-xs text-brand-600">Gestión de pacientes</p>
						</div>
						<ChevronRight className="h-4 w-4 shrink-0 text-brand-400" />
					</Link>

					<Link
						to="/disponibilidad/pendientes"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
							<ClipboardCheck className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Disponibilidades pendientes</p>
							<p className="text-xs text-brand-600">
								{disponibilidadPendiente.length} por aprobar
							</p>
						</div>
						<ChevronRight className="h-4 w-4 shrink-0 text-brand-400" />
					</Link>

					<Link
						to="/resultados"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
							<FileCheck className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Resultados</p>
							<p className="text-xs text-brand-600">
								{citasSinResultado.length > 0
									? `${citasSinResultado.length} pendiente(s)`
									: "Subir resultados"}
							</p>
						</div>
						<ChevronRight className="h-4 w-4 shrink-0 text-brand-400" />
					</Link>

					<Link
						to="/inventario"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
							<Package className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Inventario</p>
							<p className="text-xs text-brand-600">Visualizar inventario</p>
						</div>
						<ChevronRight className="h-4 w-4 shrink-0 text-brand-400" />
					</Link>

					<Link
						to="/informes"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
							<FileText className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Informes</p>
							<p className="text-xs text-brand-600">Informes médicos</p>
						</div>
						<ChevronRight className="h-4 w-4 shrink-0 text-brand-400" />
					</Link>
				</div>
			</section>

			{/* Notificaciones */}
			<section>
				<div className="mb-3 flex items-center justify-between">
					<h2 className="text-lg font-semibold text-brand-900">Notificaciones</h2>
					<Link
						to="/notificaciones"
						className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-800"
					>
						<Bell className="h-4 w-4" />
						Ver todas
					</Link>
				</div>
				<RecentNotificationsCard
					notifications={notifications}
					emptyMessage={
						loadingNotif
							? "Cargando notificaciones..."
							: "No tienes notificaciones recientes."
					}
				/>
			</section>
		</div>
	);
};

export default DashboardModerador;
