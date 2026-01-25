import {
	DaySummaryCard,
	NextAppointmentCard,
	QuickAlertsCard,
	RecentNotificationsCard,
} from "../components";
import { useAuth } from "../../../shared";
import { useGetMisCitasQuery } from "../../especialista/especialistaApi";
import type { CitaEspecialista } from "../../especialista/types";

const DashboardPage = () => {
	const { user } = useAuth();
	const isEspecialista = user?.rol === "especialista";
	const { data: rawCitas = [], isLoading } = useGetMisCitasQuery(undefined, {
		skip: !isEspecialista,
	});

	const citas = rawCitas.map((cita) => ({
		...cita,
		estado_cita: Number(cita.estado_cita),
		estado_pago: Number(cita.estado_pago),
	}));

	// Usar fecha local en lugar de UTC para evitar problemas de zona horaria
	const today = new Date();
	const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

	const toDateKey = (value: string | Date) => {
		if (value instanceof Date) {
			// Usar fecha local en lugar de UTC
			const d = value;
			return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		}
		if (typeof value === "string" && value.length >= 10) {
			// Si viene como string, extraer solo la parte de fecha (YYYY-MM-DD)
			return value.includes("T") ? value.split("T")[0] : value.slice(0, 10);
		}
		return String(value).slice(0, 10);
	};

	const buildDateTime = (cita: CitaEspecialista) =>
		new Date(`${toDateKey(cita.fecha_cita)}T${cita.hora_cita}`);

	const formatHora = (value: string) => {
		const [hourStr, minute] = value.split(":");
		const hour = Number(hourStr);
		const period = hour >= 12 ? "PM" : "AM";
		const hour12 = hour % 12 || 12;
		return `${hour12}:${minute} ${period}`;
	};

	const formatDateLabel = (value: string | Date) =>
		new Date(`${toDateKey(value)}T00:00:00`).toLocaleDateString("es-ES", {
			day: "2-digit",
			month: "short",
		});

	const upcomingCitas = [...citas]
		.filter(
			(cita) =>
				cita.estado_cita === 1 &&
				toDateKey(cita.fecha_cita) >= todayKey,
		)
		.sort((a, b) => buildDateTime(a).getTime() - buildDateTime(b).getTime());

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

	const citasToday = citas.filter((cita) => {
		const citaDate = toDateKey(cita.fecha_cita);
		return citaDate === todayKey;
	});

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

	const pendingPaymentCount = citas.filter(
		(cita) => cita.estado_cita === 1 && cita.estado_pago === 0,
	).length;
	const resultsPendingCount = citas.filter(
		(cita) => cita.estado_cita === 3 && !cita.resultado_archivo,
	).length;

	const quickAlerts = [
		pendingPaymentCount
			? {
				id: "alert-pago",
				message: `${pendingPaymentCount} citas con pago pendiente por validar.`,
			}
			: null,
		resultsPendingCount
			? {
				id: "alert-resultados",
				message: `${resultsPendingCount} resultados por cargar.`,
			}
			: null,
	].filter((alert): alert is { id: string; message: string } => Boolean(alert));

	const recentNotifications = upcomingCitas.slice(0, 3).map((cita, index) => ({
		id: `notif-${cita.id_cita}-${index}`,
		title: `Cita confirmada: ${cita.paciente_nombre} ${cita.paciente_apellido}`,
		timeLabel: `${formatDateLabel(cita.fecha_cita)} · ${formatHora(
			cita.hora_cita,
		)}`,
	}));

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h1 className="text-2xl font-semibold text-brand-900">Dashboard</h1>
				<p className="text-sm text-brand-800">
					Espacio principal para especialistas, admin y moderadores.
				</p>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<NextAppointmentCard appointment={nextAppointment} />
				<DaySummaryCard dateLabel="Hoy" items={daySummary} />
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<QuickAlertsCard
					alerts={quickAlerts}
					emptyMessage={
						isLoading
							? "Cargando alertas..."
							: "Sin alertas pendientes."
					}
				/>
				<RecentNotificationsCard
					notifications={recentNotifications}
					emptyMessage={
						isLoading
							? "Cargando notificaciones..."
							: "Sin notificaciones recientes."
					}
				/>
			</div>
		</div>
	);
};

export default DashboardPage;
