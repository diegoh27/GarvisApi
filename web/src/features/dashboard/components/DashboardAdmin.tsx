import { UserPlus, Users, Stethoscope } from "lucide-react";
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

/**
 * Dashboard para rol admin. No consume APIs de especialista ni moderador,
 * para evitar peticiones no autorizadas (ej. 403 en /citas/mi-especialista).
 */
const DashboardAdmin = () => {
	const { data: notificaciones = [], isLoading } = useGetMisNotificacionesQuery({
		limit: 5,
	});
	const notifications = notificaciones.map((n) => ({
		id: n.id_notificacion,
		title: n.titulo,
		timeLabel: formatFecha(n.fecha_creacion),
	}));

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h1 className="text-2xl font-semibold text-brand-900">
					Dashboard - Administrador
				</h1>
				<p className="text-sm text-brand-800">
					Panel de administración. Accesos rápidos a gestión de usuarios y
					registros.
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<a
					href="/admin/registrar-especialista"
					className="flex items-center gap-3 rounded-lg border border-brand-200 bg-paper p-4 transition-colors hover:bg-brand-50"
				>
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
						<Stethoscope className="h-5 w-5" />
					</div>
					<div>
						<div className="font-semibold text-brand-900">
							Registrar especialista
						</div>
						<div className="text-xs text-brand-600">
							Alta de nuevos especialistas
						</div>
					</div>
				</a>
				<a
					href="/admin/registrar-moderador"
					className="flex items-center gap-3 rounded-lg border border-brand-200 bg-paper p-4 transition-colors hover:bg-brand-50"
				>
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
						<UserPlus className="h-5 w-5" />
					</div>
					<div>
						<div className="font-semibold text-brand-900">
							Registrar moderador
						</div>
						<div className="text-xs text-brand-600">
							Alta de nuevos moderadores
						</div>
					</div>
				</a>
				<a
					href="/usuarios"
					className="flex items-center gap-3 rounded-lg border border-brand-200 bg-paper p-4 transition-colors hover:bg-brand-50"
				>
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
						<Users className="h-5 w-5" />
					</div>
					<div>
						<div className="font-semibold text-brand-900">Usuarios</div>
						<div className="text-xs text-brand-600">
							Gestionar usuarios del sistema
						</div>
					</div>
				</a>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<RecentNotificationsCard
					notifications={notifications}
					emptyMessage={
						isLoading ? "Cargando notificaciones..." : undefined
					}
				/>
			</div>
		</div>
	);
};

export default DashboardAdmin;
