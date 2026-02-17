import { Link } from "react-router-dom";
import { useAuth } from "../../../shared";
import { useGetMisCitasCompletasQuery } from "../../citas/citasApi";
import { useGetMisNotificacionesQuery } from "../../notificaciones/notificacionesApi";
import {
	CalendarCheck,
	CalendarDays,
	FileText,
	Bell,
	ChevronRight,
	Sparkles,
} from "lucide-react";
import RecentNotificationsCard from "./RecentNotificationsCard";
import { getTodayKey, toDateKey, formatHora, buildDateTime } from "../utils/dateUtils";

const formatDateLabel = (value: string) =>
	new Date(value.slice(0, 10)).toLocaleDateString("es-ES", {
		weekday: "long",
		day: "numeric",
		month: "long",
	});

const getSaludo = () => {
	const h = new Date().getHours();
	if (h < 12) return "Buenos días";
	if (h < 19) return "Buenas tardes";
	return "Buenas noches";
};

const DashboardPaciente = () => {
	const { user } = useAuth();
	const { data: citas = [], isLoading: loadingCitas } = useGetMisCitasCompletasQuery();
	const { data: notificaciones = [], isLoading: loadingNotif } = useGetMisNotificacionesQuery(
		{ limit: 5 },
		{ pollingInterval: 20000, refetchOnFocus: true },
	);

	const nombre = user?.nombre?.trim() || user?.apellido?.trim()
		? [user?.nombre, user?.apellido].filter(Boolean).join(" ").trim()
		: null;
	const saludo = getSaludo();
	const welcomeTitle = nombre ? `${saludo}, ${nombre}` : `${saludo}`;

	const todayKey = getTodayKey();
	const cancelada = 2;
	const atendida = 3;
	// Solo citas por venir: no canceladas, no atendidas, fecha >= hoy
	const proximasCitas = citas
		.filter((c) => {
			const estado = Number(c.estado_cita);
			if (estado === cancelada || estado === atendida) return false;
			return toDateKey(c.fecha_cita) >= todayKey;
		})
		.sort(
			(a, b) =>
				buildDateTime(a.fecha_cita, a.hora_cita).getTime() -
				buildDateTime(b.fecha_cita, b.hora_cita).getTime(),
		);
	const proximaCita = proximasCitas[0];

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

	const citasConResultado = citas.filter(
		(c) => c.resultado_archivo && String(c.resultado_archivo).trim() !== "" && String(c.resultado_archivo) !== "[]",
	).length;
	const citasConInforme = citas.filter((c) => c.id_informe != null).length;

	const notifications = notificaciones.map((n) => ({
		id: n.id_notificacion,
		title: n.titulo,
		timeLabel: new Date(n.fecha_creacion).toLocaleDateString("es-ES", {
			day: "2-digit",
			month: "short",
			hour: "2-digit",
			minute: "2-digit",
		}),
	}));

	return (
		<div className="space-y-8">
			{/* Hero bienvenida */}
			<section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 via-teal-800 to-slate-800 px-6 py-8 shadow-xl sm:px-8 sm:py-10">
				<div className="relative z-10">
					<div className="flex items-center gap-2 text-teal-200">
						<Sparkles className="h-5 w-5" />
						<span className="text-sm font-medium">Tu espacio</span>
					</div>
					<h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
						{welcomeTitle}
					</h1>
					<p className="mt-2 max-w-lg text-sm text-white/90 sm:text-base">
						Aquí puedes ver tu próxima cita, acceder a resultados e informes y gestionar tus estudios.
					</p>
				</div>
				<div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/5 to-transparent" aria-hidden />
			</section>

			{/* Próxima cita */}
			<section>
				<h2 className="mb-3 text-lg font-semibold text-brand-900">Tu próxima cita</h2>
				{loadingCitas ? (
					<div className="rounded-2xl border border-brand-200 bg-paper p-6">
						<div className="h-20 animate-pulse rounded-xl bg-cloud" />
					</div>
				) : proximaCita ? (
					<Link
						to="/citas"
						className="group block rounded-2xl border border-brand-200 bg-paper p-5 shadow-sm transition hover:border-brand-400 hover:shadow-md"
					>
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div className="min-w-0 flex-1">
								<p className="text-sm font-semibold text-brand-900">
									{proximaCita.eco_nombre}
								</p>
								<p className="mt-1 text-xs text-brand-700">
									{proximaCita.especialista_nombre} {proximaCita.especialista_apellido}
								</p>
								<p className="mt-2 text-sm text-brand-800">
									{formatDateLabel(proximaCita.fecha_cita)} · {formatHora(proximaCita.hora_cita)}
								</p>
								<div className="mt-2 flex flex-wrap items-center gap-2">
									{(() => {
										const estadoPago = Number(proximaCita.estado_pago ?? proximaCita.pago_estado_pago ?? 0);
										const label = getEstadoPagoLabel(estadoPago);
										return (
											<span
												className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
													estadoPago === 0
														? "bg-amber-100 text-amber-800"
														: estadoPago === 1
															? "bg-emerald-100 text-emerald-800"
															: estadoPago === 2
																? "bg-red-100 text-red-800"
																: "bg-brand-100 text-brand-800"
												}`}
											>
												{label}
											</span>
										);
									})()}
									{proximaCita.es_vinculada_mostrador === true && (
										<span className="inline-block rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-800">
											Cita de mostrador
										</span>
									)}
								</div>
							</div>
							<span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 transition group-hover:bg-brand-200">
								<ChevronRight className="h-5 w-5" />
							</span>
						</div>
						<p className="mt-3 text-xs text-brand-600">
							Ver todas mis citas →
						</p>
					</Link>
				) : (
					<div className="rounded-2xl border border-dashed border-brand-300 bg-cloud/30 p-6 text-center">
						<CalendarDays className="mx-auto h-12 w-12 text-brand-400" />
						<p className="mt-2 text-sm font-medium text-brand-800">No tienes citas próximas</p>
						<p className="mt-1 text-xs text-brand-600">
							Agenda una cita cuando lo necesites.
						</p>
						<Link
							to="/disponibilidad"
							className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
						>
							<CalendarDays className="h-4 w-4" />
							Agendar cita
						</Link>
					</div>
				)}
			</section>

			{/* Accesos rápidos */}
			<section>
				<h2 className="mb-3 text-lg font-semibold text-brand-900">Accesos rápidos</h2>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<Link
						to="/disponibilidad"
						className="flex items-center gap-4 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
							<CalendarDays className="h-6 w-6" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Agendar cita</p>
							<p className="text-xs text-brand-600">Elige fecha, especialista y estudio</p>
						</div>
						<ChevronRight className="h-5 w-5 shrink-0 text-brand-400" />
					</Link>

					<Link
						to="/citas"
						className="flex items-center gap-4 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
							<CalendarCheck className="h-6 w-6" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Mis citas</p>
							<p className="text-xs text-brand-600">
								{proximasCitas.length > 0
									? `${proximasCitas.length} cita(s) por venir`
									: "Historial y documentos"}
							</p>
						</div>
						<ChevronRight className="h-5 w-5 shrink-0 text-brand-400" />
					</Link>

					<Link
						to="/citas"
						className="flex items-center gap-4 rounded-xl border border-brand-200 bg-paper p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
					>
						<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
							<FileText className="h-6 w-6" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-brand-900">Resultados e informes</p>
							<p className="text-xs text-brand-600">
								{citasConResultado > 0 || citasConInforme > 0
									? `${citasConResultado} resultado(s), ${citasConInforme} informe(s)`
									: "Disponibles en el detalle de cada cita"}
							</p>
						</div>
						<ChevronRight className="h-5 w-5 shrink-0 text-brand-400" />
					</Link>
				</div>
			</section>

			{/* Notificaciones recientes */}
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
						loadingNotif ? "Cargando notificaciones..." : "No tienes notificaciones recientes."
					}
				/>
			</section>
		</div>
	);
};

export default DashboardPaciente;
