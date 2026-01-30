import type { DisponibilidadPendiente } from "../disponibilidadApi";
import { formatFecha, formatHora } from "../utils/dateUtils";

type DisponibilidadPendienteCardProps = {
	disp: DisponibilidadPendiente;
	onAprobar: (id: string) => void;
	onRechazar: (id: string) => void;
	isAprobando: boolean;
	isRechazando: boolean;
	selectedId: string | null;
};

const DisponibilidadPendienteCard = ({
	disp,
	onAprobar,
	onRechazar,
	isAprobando,
	isRechazando,
	selectedId,
}: DisponibilidadPendienteCardProps) => {
	const isBusy =
		isAprobando || isRechazando || selectedId === disp.id_disponibilidad;

	return (
		<div className="rounded-lg border border-brand-200 bg-paper p-4">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex-1 space-y-2">
					<div className="flex items-center gap-2">
						<h3 className="font-semibold text-brand-900">
							{disp.nombre} {disp.apellido}
						</h3>
						<span className="rounded-full bg-brand-700 px-2 py-0.5 text-xs font-medium text-paper">
							{disp.especialidad}
						</span>
					</div>
					<div className="space-y-1 text-sm text-brand-600">
						<div>
							<span className="font-medium">Fecha:</span>{" "}
							{formatFecha(disp.fecha)}
						</div>
						<div>
							<span className="font-medium">Horario:</span>{" "}
							{formatHora(disp.hora_inicio)} - {formatHora(disp.hora_fin)}
						</div>
						{disp.eco_nombre && (
							<div>
								<span className="font-medium">Eco:</span> {disp.eco_nombre}
							</div>
						)}
					</div>
				</div>
				<div className="flex gap-2 sm:flex-col">
					<button
						type="button"
						onClick={() => onAprobar(disp.id_disponibilidad)}
						disabled={isBusy}
						className="flex-1 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-brand-800 disabled:opacity-50"
					>
						{isAprobando && selectedId === disp.id_disponibilidad
							? "Procesando..."
							: "Aprobar"}
					</button>
					<button
						type="button"
						onClick={() => onRechazar(disp.id_disponibilidad)}
						disabled={isBusy}
						className="flex-1 rounded-lg border border-red-500 bg-paper px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
					>
						Rechazar
					</button>
				</div>
			</div>
		</div>
	);
};

export default DisponibilidadPendienteCard;
