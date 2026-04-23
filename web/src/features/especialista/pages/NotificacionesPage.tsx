import { PageShell, formatFechaHoraLocal } from "../../../shared";
import { Bell, CheckCircle, MailOpen } from "lucide-react";
import {
	useGetMisNotificacionesQuery,
	useMarkNotificacionLeidaMutation,
} from "../../notificaciones/notificacionesApi";

const formatFecha = (value: string) => formatFechaHoraLocal(value);

const NotificacionesPage = () => {
	const { data: notificaciones = [], isLoading } = useGetMisNotificacionesQuery({
		limit: 100,
	});
	const [markLeida, { isLoading: marking }] = useMarkNotificacionLeidaMutation();

	return (
		<PageShell
			title="Notificaciones"
			description="Alertas y mensajes recientes del sistema."
		>
			<div className="rounded-2xl bg-paper p-5 shadow-sm">
				{isLoading ? (
					<p className="text-base text-brand-800">Cargando notificaciones...</p>
				) : notificaciones.length === 0 ? (
					<div className="flex items-center gap-2 text-base text-brand-800">
						<Bell className="h-4 w-4" />
						Sin notificaciones por ahora.
					</div>
				) : (
					<div className="space-y-3">
						{notificaciones.map((n) => (
							<div
								key={n.id_notificacion}
								className={`rounded-xl border p-4 ${n.leida
									? "border-mist bg-cloud"
									: "border-brand-200 bg-brand-50/60"
									}`}
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<div className="flex items-center gap-2">
											{n.leida ? (
												<MailOpen className="h-4 w-4 text-brand-700" />
											) : (
												<CheckCircle className="h-4 w-4 text-emerald-600" />
											)}
											<p className="text-base font-semibold text-brand-900">
												{n.titulo}
											</p>
										</div>
										<p className="mt-1 text-base text-brand-800">
											{n.mensaje}
										</p>
										<p className="mt-2 text-sm text-brand-600">
											{formatFecha(n.fecha_creacion)}
										</p>
									</div>
									{n.leida ? null : (
										<button
											type="button"
											onClick={() => markLeida({ id: n.id_notificacion })}
											disabled={marking}
											className="rounded-lg border border-brand-600 bg-white px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
										>
											Marcar como leida
										</button>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</PageShell>
	);
};

export default NotificacionesPage;
