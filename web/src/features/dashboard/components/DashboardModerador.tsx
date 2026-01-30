import { useAuth } from "../../../shared";
import { useGetCitasPendientesPagoQuery } from "../../citas/citasApi";
import { useGetDisponibilidadPendientesQuery } from "../../disponibilidad/disponibilidadApi";
import { useGetCitasSinResultadoQuery } from "../../resultados/resultadosApi";
import { getTodayKey, toDateKey } from "../utils/dateUtils";
import DaySummaryCard from "./DaySummaryCard";
import QuickAlertsCard from "./QuickAlertsCard";
import QuickActionsModerador from "./QuickActionsModerador";

const DashboardModerador = () => {
	const { user } = useAuth();
	const todayKey = getTodayKey();

	const { data: citasPendientesPago = [], isLoading: loadingPagos } =
		useGetCitasPendientesPagoQuery();
	const { data: disponibilidadPendiente = [], isLoading: loadingDisponibilidad } =
		useGetDisponibilidadPendientesQuery();
	const { data: citasSinResultado = [], isLoading: loadingResultados } =
		useGetCitasSinResultadoQuery();

	const citasHoy = citasPendientesPago.filter(
		(cita) => toDateKey(cita.fecha_cita) === todayKey,
	);

	const moderadorSummary = [
		{
			label: "Citas pendientes de pago",
			value: String(citasPendientesPago.length),
		},
		{
			label: "Citas pendientes hoy",
			value: String(citasHoy.length),
		},
		{
			label: "Disponibilidades pendientes",
			value: String(disponibilidadPendiente.length),
		},
		{
			label: "Citas sin resultado",
			value: String(citasSinResultado.length),
		},
	];

	const moderadorAlerts = [
		citasPendientesPago.length
			? {
					id: "alert-pagos",
					message: `${citasPendientesPago.length} citas con pago pendiente por verificar.`,
				}
			: null,
		disponibilidadPendiente.length
			? {
					id: "alert-disponibilidad",
					message: `${disponibilidadPendiente.length} disponibilidades pendientes de aprobar.`,
				}
			: null,
		citasSinResultado.length
			? {
					id: "alert-resultados",
					message: `${citasSinResultado.length} citas atendidas sin resultado.`,
				}
			: null,
	].filter((alert): alert is { id: string; message: string } => Boolean(alert));

	const loading =
		loadingPagos || loadingDisponibilidad || loadingResultados;

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h1 className="text-2xl font-semibold text-brand-900">
					Dashboard - Moderador
				</h1>
				<p className="text-sm text-brand-800">
					Panel de control para gestión de pagos, disponibilidades y
					resultados.
				</p>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<DaySummaryCard dateLabel="Resumen" items={moderadorSummary} />
				<QuickAlertsCard
					alerts={moderadorAlerts}
					emptyMessage={
						loading ? "Cargando alertas..." : "Sin alertas pendientes."
					}
				/>
			</div>

			<div className="grid gap-4">
				<QuickActionsModerador
					citasPendientesPago={citasPendientesPago.length}
					disponibilidadPendiente={disponibilidadPendiente.length}
					citasSinResultado={citasSinResultado.length}
					showAdminLink={user?.rol === "admin"}
				/>
			</div>
		</div>
	);
};

export default DashboardModerador;
