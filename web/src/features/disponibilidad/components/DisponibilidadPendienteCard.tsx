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
		<div className="rounded-lg border border-brand-200 bg-paper px-4 py-3 transition-colors hover:bg-brand-50/30">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				{/* Lado izquierdo: Info y Checkbox */}
				<div className="flex flex-1 items-center gap-3">
					{showCheckbox && onToggleSelect && (
						<label className="flex cursor-pointer items-center shrink-0">
							<input
								type="checkbox"
								checked={selected}
								onChange={onToggleSelect}
								className="h-4 w-4 rounded border-brand-600 text-brand-700"
							/>
							<span className="sr-only">Seleccionar para aprobar en lote</span>
						</label>
					)}

					<div className="flex flex-col justify-center gap-1.5">
						{/* Fila 1: Nombre y Badges */}
						<div className="flex flex-wrap items-center gap-2">
							<h3 className="font-semibold text-brand-900 text-sm">
								{disp.nombre} {disp.apellido}
							</h3>
							<span className="rounded-full bg-brand-700 px-2 py-0.5 text-[10px] uppercase font-medium text-paper tracking-wider">
								{disp.especialidad}
							</span>
							<span
								className={`rounded-full px-2 py-0.5 text-[10px] uppercase font-medium tracking-wider ${estadoInfo.className}`}
							>
								{estadoInfo.label}
							</span>
						</div>

						{/* Fila 2: Datos: Fecha, Hora y Eco */}
						<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-600">
							<div className="flex items-center gap-1">
								<span className="font-medium text-brand-500">Fecha:</span>{" "}
								{formatFecha(disp.fecha)}
							</div>
							<div className="hidden h-3 w-px bg-brand-200 sm:block" />
							<div className="flex items-center gap-1">
								<span className="font-medium text-brand-500">Hora:</span>{" "}
								{formatHora(disp.hora_inicio)} - {formatHora(disp.hora_fin)}
							</div>
							{disp.eco_nombre && (
								<>
									<div className="hidden h-3 w-px bg-brand-200 sm:block" />
									<div className="flex items-center gap-1">
										<span className="font-medium text-brand-500">Eco:</span> {disp.eco_nombre}
									</div>
								</>
							)}
						</div>
					</div>
				</div>

				{/* Lado derecho: Botones de Acción */}
				<div className="flex shrink-0 items-center gap-2 mt-2 sm:mt-0 lg:pl-4">
					<button
						type="button"
						onClick={() => onAprobar(disp.id_disponibilidad)}
						disabled={isBusy || !canAprobar}
						className="min-w-[70px] rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-medium text-paper transition-colors hover:bg-brand-800 disabled:opacity-50"
					>
						{isAprobando && selectedId === disp.id_disponibilidad ? "..." : "Aprobar"}
					</button>
					<button
						type="button"
						onClick={() => onRechazar(disp.id_disponibilidad)}
						disabled={isBusy || !canRechazar}
						className="rounded-lg border border-red-500 bg-paper px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
					>
						Rechazar
					</button>
					{onCancelar && (
						<button
							type="button"
							onClick={() => onCancelar(disp.id_disponibilidad)}
							disabled={isBusy || !canCancelar}
							className="rounded-lg border border-amber-500 bg-paper px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50"
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
