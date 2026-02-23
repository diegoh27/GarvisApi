import type { DisponibilidadPendiente } from "../disponibilidadApi";
import { formatFecha, formatHora } from "../utils/dateUtils";

type DisponibilidadPendienteCardProps = {
	disp: DisponibilidadPendiente;
	onAprobar: (id: string) => void;
	onRechazar: (id: string) => void;
	onCancelar?: (id: string) => void;
	isAprobando: boolean;
	isRechazando: boolean;
	isCancelando?: boolean;
	selectedId: string | null;
	/** Para aprobación en lote: mostrar checkbox y estado de selección */
	showCheckbox?: boolean;
	selected?: boolean;
	onToggleSelect?: () => void;
};

const DisponibilidadPendienteCard = ({
	disp,
	onAprobar,
	onRechazar,
	onCancelar,
	isAprobando,
	isRechazando,
	isCancelando = false,
	selectedId,
	showCheckbox = false,
	selected = false,
	onToggleSelect,
}: DisponibilidadPendienteCardProps) => {
	const isBusy =
		isAprobando ||
		isRechazando ||
		isCancelando ||
		selectedId === disp.id_disponibilidad;
	const canAprobar = disp.estado === 0;
	const canRechazar = disp.estado === 0;
	const canCancelar = disp.estado === 0 || disp.estado === 1;

	const estadoBadge = () => {
		switch (disp.estado) {
			case 0:
				return { label: "Pendiente", className: "bg-amber-100 text-amber-800" };
			case 1:
				return { label: "Aprobada", className: "bg-emerald-100 text-emerald-800" };
			case 2:
				return { label: "Rechazada", className: "bg-red-100 text-red-700" };
			case 3:
				return { label: "Cancelada", className: "bg-slate-100 text-slate-700" };
			case 4:
				return { label: "Con cita", className: "bg-sky-100 text-sky-700" };
			default:
				return { label: "Desconocido", className: "bg-slate-100 text-slate-700" };
		}
	};
	const estadoInfo = estadoBadge();

	return (
		<div className="rounded-lg border border-brand-200 bg-paper p-4">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				{showCheckbox && onToggleSelect && (
					<div className="flex items-center">
						<label className="flex cursor-pointer items-center gap-2">
							<input
								type="checkbox"
								checked={selected}
								onChange={onToggleSelect}
								className="h-4 w-4 rounded border-brand-600 text-brand-700"
							/>
							<span className="sr-only">Seleccionar para aprobar en lote</span>
						</label>
					</div>
				)}
				<div className="flex-1 space-y-2">
					<div className="flex items-center gap-2">
						<h3 className="font-semibold text-brand-900">
							{disp.nombre} {disp.apellido}
						</h3>
						<span className="rounded-full bg-brand-700 px-2 py-0.5 text-xs font-medium text-paper">
							{disp.especialidad}
						</span>
						<span
							className={`rounded-full px-2 py-0.5 text-xs font-medium ${estadoInfo.className}`}
						>
							{estadoInfo.label}
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
						disabled={isBusy || !canAprobar}
						className="flex-1 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-brand-800 disabled:opacity-50"
					>
						{isAprobando && selectedId === disp.id_disponibilidad
							? "Procesando..."
							: "Aprobar"}
					</button>
					<button
						type="button"
						onClick={() => onRechazar(disp.id_disponibilidad)}
						disabled={isBusy || !canRechazar}
						className="flex-1 rounded-lg border border-red-500 bg-paper px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
					>
						Rechazar
					</button>
					{onCancelar && (
						<button
							type="button"
							onClick={() => onCancelar(disp.id_disponibilidad)}
							disabled={isBusy || !canCancelar}
							className="flex-1 rounded-lg border border-amber-500 bg-paper px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50"
						>
							Cancelar
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default DisponibilidadPendienteCard;
