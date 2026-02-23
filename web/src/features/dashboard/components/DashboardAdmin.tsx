import { Link } from "react-router-dom";
import { useAuth } from "../../../shared";
import { useGetMisNotificacionesQuery } from "../../notificaciones/notificacionesApi";
import { useGetCitasPendientesPagoQuery } from "../../citas/citasApi";
import { useGetCitasSinResultadoQuery } from "../../resultados/resultadosApi";
import { useGetDisponibilidadPendientesQuery } from "../../disponibilidad/disponibilidadApi";
import { useGetCitasByFechaQuery } from "../../moderadores/moderadoresApi";
import { useListComisionesQuery } from "../../inventario/api/comisionesApi";
import { useGetResumenFacturacionQuery } from "../../inventario/api/facturacionApi";
import { useListUsersQuery } from "../../usuarios/usuariosApi";
import { useListMetodosPagoQuery } from "../../admin/adminApi";
import { getTodayKey, formatHora, buildDateTime } from "../utils/dateUtils";
import { formatFechaHoraLocal } from "../../../shared";
import DaySummaryCard from "./DaySummaryCard";
import QuickAlertsCard from "./QuickAlertsCard";
import RecentNotificationsCard from "./RecentNotificationsCard";
import {
	Shield,
	CalendarDays,
	Users,
	DollarSign,
	TrendingUp,
	Stethoscope,
	UserPlus,
	CreditCard,
	ClipboardList,
	Package,
	Settings,
	ChevronRight,
	Bell,
	FileCheck,
	LayoutGrid,
} from "lucide-react";

const formatFecha = (value: string) => formatFechaHoraLocal(value);

const getSaludo = () => {
	const h = new Date().getHours();
	if (h < 12) return "Buenos días";
	if (h < 19) return "Buenas tardes";
	return "Buenas noches";
};

const formatMoneda = (n: number) =>
	new Intl.NumberFormat("es-VE", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(n);

/**
 * Dashboard para rol admin: resúmenes de citas, ingresos/facturación,
 * comisiones, usuarios, alertas y accesos rápidos.
 */
const DashboardAdmin = () => {
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
	const { data: comisionesPendientes = [], isLoading: loadingComisiones } =
		useListComisionesQuery({ estado: "Pendiente" });
	const { data: resumenFacturacion, isLoading: loadingFacturacion } =
		useGetResumenFacturacionQuery();
	const { data: usuarios = [], isLoading: loadingUsuarios } = useListUsersQuery({});
	const { data: metodosPago = [], isLoading: loadingMetodos } =
		useListMetodosPagoQuery({ activos: true });

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

	const montoComisionesPendientes = comisionesPendientes.reduce(
		(acc, c) => acc + Number(c.monto ?? 0),
		0,
	);
	const totalPacientes = usuarios.filter((u) => u.rol === "paciente").length;
	const totalEspecialistas = usuarios.filter((u) => u.rol === "especialista").length;
	const totalModeradores = usuarios.filter((u) => u.rol === "moderador").length;

	const adminSummary = [
		{ label: "Citas hoy", value: String(citasHoy.length) },
		{ label: "Pendientes de pago (citas)", value: String(citasPendientesPago.length) },
		{ label: "Comisiones pendientes", value: String(comisionesPendientes.length) },
		{ label: "Disponibilidades pendientes", value: String(disponibilidadPendiente.length) },
		{ label: "Citas sin resultado", value: String(citasSinResultado.length) },
		{ label: "Usuarios activos", value: String(usuarios.filter((u) => u.activo === 1).length) },
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
		comisionesPendientes.length
			? {
					id: "alert-comisiones",
					message: `${comisionesPendientes.length} comisiones pendientes de pago (${formatMoneda(montoComisionesPendientes)}).`,
				}
			: null,
	].filter((a): a is { id: string; message: string } => Boolean(a));

	const loading =
		loadingPagos ||
		loadingResultados ||
		loadingDisp ||
		loadingCitasHoy ||
		loadingComisiones ||
		loadingUsuarios;

	// Citas del día ordenadas por hora (primeras 5)
	const citasHoyOrdenadas = [...citasHoy].sort(
		(a, b) =>
			buildDateTime(a.fecha_cita, a.hora_cita).getTime() -
			buildDateTime(b.fecha_cita, b.hora_cita).getTime(),
	);
	const citasHoyPreview = citasHoyOrdenadas.slice(0, 5);
	const mensual = resumenFacturacion?.mensual;

	return (
		<div className="space-y-8">
			{/* Hero */}
			<section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 px-6 py-8 shadow-xl sm:px-8 sm:py-10">
				<div className="relative z-10">
					<div className="flex items-center gap-2 text-blue-200">
						<Shield className="h-5 w-5" />
						<span className="text-sm font-medium">Panel de administración</span>
					</div>
					<h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
						{welcomeTitle}
					</h1>
					<p className="mt-2 max-w-lg text-sm text-white/90 sm:text-base">
						Resumen de citas, ingresos, comisiones y usuarios. Gestiona métodos de pago,
						especialistas, moderadores y configuración desde aquí.
					</p>
				</div>
				<div
					className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/5 to-transparent"
					aria-hidden
				/>
			</section>

			{/* KPIs principales */}
			<section>
				<h2 className="mb-3 text-lg font-semibold text-brand-900">Resumen general</h2>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-2xl border border-brand-200 bg-paper p-4 shadow-sm">
						<div className="flex items-center gap-3">
							<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
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
							className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
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
							<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
								<TrendingUp className="h-5 w-5" />
							</div>
							<div className="min-w-0">
								<p className="text-xs font-medium text-brand-600">Ingresos (mes)</p>
								<p className="text-lg font-bold text-brand-900">
									{loadingFacturacion
										? "—"
										: mensual != null
											? formatMoneda(mensual.ingresos)
											: "—"}
								</p>
							</div>
						</div>
						<Link
							to="/inventario"
							className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-800"
						>
							Facturación
							<ChevronRight className="h-3 w-3" />
						</Link>
					</div>

					<div className="rounded-2xl border border-brand-200 bg-paper p-4 shadow-sm">
						<div className="flex items-center gap-3">
							<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
								<Users className="h-5 w-5" />
							</div>
							<div className="min-w-0">
								<p className="text-xs font-medium text-brand-600">Usuarios</p>
								<p className="text-xl font-bold text-brand-900">
									{loadingUsuarios ? "—" : usuarios.length}
								</p>
							</div>
						</div>
						<Link
							to="/usuarios"
							className="mt-2 flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-800"
						>
							Gestionar
							<ChevronRight className="h-3 w-3" />
						</Link>
					</div>
				</div>
			</section>

			{/* Resumen del día + Financiero + Alertas */}
			<section>
				<h2 className="mb-3 text-lg font-semibold text-brand-900">Detalle y alertas</h2>
				<div className="grid gap-4 lg:grid-cols-3">
					<DaySummaryCard
						dateLabel="Hoy"
						title="Resumen operativo"
						items={adminSummary}
					/>
					<div className="flex min-h-[200px] flex-col rounded-2xl border border-brand-200 bg-paper p-5 shadow-sm">
						<h3 className="text-sm font-semibold text-brand-900">Financiero (mes)</h3>
						{loadingFacturacion ? (
							<div className="mt-4 h-20 animate-pulse rounded-xl bg-cloud" />
						) : mensual ? (
							<div className="mt-4 space-y-3">
								<div className="rounded-xl border border-mist bg-cloud px-3 py-2">
									<p className="text-xs text-brand-800">Ingresos</p>
									<p className="text-lg font-semibold text-emerald-700">
										{formatMoneda(mensual.ingresos)}
									</p>
								</div>
								<div className="rounded-xl border border-mist bg-cloud px-3 py-2">
									<p className="text-xs text-brand-800">Egresos</p>
									<p className="text-lg font-semibold text-red-600">
										{formatMoneda(mensual.egresos)}
									</p>
								</div>
								<div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2">
									<p className="text-xs text-brand-800">Balance</p>
									<p className="text-lg font-semibold text-brand-900">
										{formatMoneda(mensual.balance)}
									</p>
								</div>
							</div>
						) : (
							<p className="mt-4 text-xs text-brand-600">Sin datos de facturación.</p>
						)}
						<Link
							to="/inventario"
							className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800"
						>
							Ir a inventario
							<ChevronRight className="h-3 w-3" />
						</Link>
					</div>
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

			{/* Accesos rápidos */}
			<section>
				<h2 className="mb-3 text-lg font-semibold text-brand-900">Accesos rápidos</h2>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<Link
						to="/admin/registrar-especialista"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
							<Stethoscope className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Registrar especialista</p>
							<p className="text-xs text-brand-600">Alta de médicos</p>
						</div>
						<ChevronRight className="h-4 w-4 shrink-0 text-brand-400" />
					</Link>

					<Link
						to="/admin/registrar-moderador"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
							<UserPlus className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Registrar moderador</p>
							<p className="text-xs text-brand-600">Alta de moderadores</p>
						</div>
						<ChevronRight className="h-4 w-4 shrink-0 text-brand-400" />
					</Link>

					<Link
						to="/usuarios"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
							<Users className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Usuarios</p>
							<p className="text-xs text-brand-600">
								{totalPacientes} pacientes, {totalEspecialistas} esp.
							</p>
						</div>
						<ChevronRight className="h-4 w-4 shrink-0 text-brand-400" />
					</Link>

					<Link
						to="/admin/metodos-pago"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
							<CreditCard className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Métodos de pago</p>
							<p className="text-xs text-brand-600">
								{loadingMetodos ? "…" : `${metodosPago.length} activos`}
							</p>
						</div>
						<ChevronRight className="h-4 w-4 shrink-0 text-brand-400" />
					</Link>

					<Link
						to="/pagos"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
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
						to="/inventario"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
							<Package className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Inventario</p>
							<p className="text-xs text-brand-600">Facturación y comisiones</p>
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
						to="/especialidades"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
							<LayoutGrid className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Especialidades</p>
							<p className="text-xs text-brand-600">Catálogo</p>
						</div>
						<ChevronRight className="h-4 w-4 shrink-0 text-brand-400" />
					</Link>

					<Link
						to="/ecos"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lime-100 text-lime-700">
							<FileCheck className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">ECOs</p>
							<p className="text-xs text-brand-600">Estudios y precios</p>
						</div>
						<ChevronRight className="h-4 w-4 shrink-0 text-brand-400" />
					</Link>

					<Link
						to="/moderadores"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-700">
							<Users className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Moderadores</p>
							<p className="text-xs text-brand-600">{totalModeradores} en sistema</p>
						</div>
						<ChevronRight className="h-4 w-4 shrink-0 text-brand-400" />
					</Link>

					<Link
						to="/roles"
						className="flex items-center gap-3 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
							<Settings className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Roles y permisos</p>
							<p className="text-xs text-brand-600">Configuración</p>
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

export default DashboardAdmin;
