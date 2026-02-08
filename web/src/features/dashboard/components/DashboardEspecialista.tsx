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
import NextAppointmentCard from "./NextAppointmentCard";
import CitasPorResultadoCard from "./CitasPorResultadoCard";
import CitasVerificacionPagoCard from "./CitasVerificacionPagoCard";
import RecentNotificationsCard from "./RecentNotificationsCard";
import { useGetMisNotificacionesQuery } from "../../notificaciones/notificacionesApi";

const formatFecha = (value: string) => {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString("es-VE", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

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

const DashboardEspecialista = () => {
	const { user } = useAuth();
	const { data: rawCitas = [], isLoading } = useGetMisCitasQuery(undefined, {
		skip: user?.rol !== "especialista",
	});

	const { data: notificaciones = [], isLoading: loadingNotificaciones } =
		useGetMisNotificacionesQuery({ limit: 5 });
	const notifications = notificaciones.map((n) => ({
		id: n.id_notificacion,
		title: n.titulo,
		timeLabel: formatFecha(n.fecha_creacion),
	}));

	const citas: CitaEspecialista[] = rawCitas.map((cita) => ({
		...cita,
		estado_cita: Number(cita.estado_cita),
		estado_pago: Number(cita.estado_pago),
	}));

	const todayKey = getTodayKey();

	const upcomingCitas = [...citas]
		.filter(
			(cita) =>
				cita.estado_cita === 1 && toDateKey(cita.fecha_cita) >= todayKey,
		)
		.sort(
			(a, b) =>
				buildDateTime(a.fecha_cita, a.hora_cita).getTime() -
				buildDateTime(b.fecha_cita, b.hora_cita).getTime(),
		);

	const nextCita = upcomingCitas[0];
	const nextAppointment = nextCita
		? {
			patientName: `${nextCita.paciente_nombre} ${nextCita.paciente_apellido}`,
			study: nextCita.eco_nombre,
			dateLabel: formatDateLabel(nextCita.fecha_cita),
			timeLabel: formatHora(nextCita.hora_cita),
			paymentStatus:
				nextCita.estado_pago === 1 ? "Pago aprobado" : "Pago pendiente",
			statusLabel: "Confirmada",
		}
		: null;

	const citasToday = citas.filter(
		(cita) => toDateKey(cita.fecha_cita) === todayKey,
	);

	const confirmedToday = citasToday.filter(
		(cita) => Number(cita.estado_cita) === 1,
	).length;
	const pendingPaymentToday = citasToday.filter(
		(cita) => Number(cita.estado_pago) === 0,
	).length;
	const attendedToday = citasToday.filter(
		(cita) => Number(cita.estado_cita) === 3,
	).length;
	const resultsPendingToday = citasToday.filter(
		(cita) => Number(cita.estado_cita) === 3 && !cita.resultado_archivo,
	).length;

	const daySummary = [
		{ label: "Citas confirmadas", value: String(confirmedToday) },
		{ label: "Pendientes de pago", value: String(pendingPaymentToday) },
		{ label: "Atendidas hoy", value: String(attendedToday) },
		{ label: "Resultados por cargar", value: String(resultsPendingToday) },
	];

	// Citas por resultado (faltantes): atendidas sin resultado
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

	// Citas que requieren verificación de pago: confirmadas con pago pendiente
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

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h1 className="text-2xl font-semibold text-brand-900">Dashboard</h1>
				<p className="text-sm text-brand-800">
					Espacio principal para especialistas.
				</p>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<NextAppointmentCard appointment={nextAppointment} />
				<DaySummaryCard dateLabel="Hoy" items={daySummary} />
			</div>

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

			<div className="grid gap-4 lg:grid-cols-2">
				<RecentNotificationsCard
					notifications={notifications}
					emptyMessage={
						loadingNotificaciones
							? "Cargando notificaciones..."
							: undefined
					}
				/>
			</div>
		</div>
	);
};

export default DashboardEspecialista;
