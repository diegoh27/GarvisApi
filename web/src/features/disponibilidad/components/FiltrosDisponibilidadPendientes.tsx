import { Search } from "lucide-react";

export type OrdenFecha = "reciente" | "antigua";
export type EstadoFiltro =
	| "todas"
	| "pendientes"
	| "aprobadas"
	| "historial"
	| "rechazadas"
	| "canceladas"
	| "citas";

export type FiltrosDisponibilidadPendientesValues = {
	query: string;
	ordenFecha: OrdenFecha;
	estado: EstadoFiltro;
	fechaDesde: string;
	fechaHasta: string;
	horaDesde: string;
	horaHasta: string;
	ecoId: string;
};

type FiltrosDisponibilidadPendientesProps = {
	value: FiltrosDisponibilidadPendientesValues;
	onChange: (value: FiltrosDisponibilidadPendientesValues) => void;
	ecoOptions: { id: string; label: string }[];
	onReset?: () => void;
};

const FiltrosDisponibilidadPendientes = ({
	value,
	onChange,
	ecoOptions,
	onReset,
}: FiltrosDisponibilidadPendientesProps) => {
	const update = (partial: Partial<FiltrosDisponibilidadPendientesValues>) =>
		onChange({ ...value, ...partial });

	return (
		<div className="rounded-xl border border-brand-200 bg-paper p-4 space-y-5 shadow-sm">
			<div className="flex items-center justify-between pb-3 border-b border-brand-100">
				<h3 className="font-semibold text-brand-900 text-sm">Filtros</h3>
				<button
					type="button"
					onClick={onReset}
					disabled={!onReset}
					className="text-[11px] font-bold text-brand-600 hover:text-brand-800 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider transition-colors"
				>
					Limpiar
				</button>
			</div>

			<div className="space-y-4">
				{/* Búsqueda */}
				<div>
					<label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-brand-500">
						Búsqueda general
					</label>
					<div className="relative">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400" />
						<input
							type="text"
							value={value.query}
							onChange={(e) => update({ query: e.target.value })}
							placeholder="Médico o eco..."
							className="h-10 w-full rounded-lg border border-brand-300 bg-cloud pl-9 pr-3 text-sm text-brand-900 outline-none focus:border-brand-700 focus:bg-paper transition-colors"
						/>
					</div>
				</div>

				{/* Fechas */}
				<div>
					<label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-brand-500">
						Rango de Fechas
					</label>
					<div className="grid grid-cols-2 gap-2">
						<input
							type="date"
							value={value.fechaDesde}
							onChange={(e) => update({ fechaDesde: e.target.value })}
							title="Fecha Desde"
							className="h-10 w-full rounded-lg border border-brand-300 bg-cloud px-2 text-xs text-brand-900 outline-none focus:border-brand-700 focus:bg-paper transition-colors"
						/>
						<input
							type="date"
							value={value.fechaHasta}
							onChange={(e) => update({ fechaHasta: e.target.value })}
							title="Fecha Hasta"
							className="h-10 w-full rounded-lg border border-brand-300 bg-cloud px-2 text-xs text-brand-900 outline-none focus:border-brand-700 focus:bg-paper transition-colors"
						/>
					</div>
				</div>

				{/* Horas */}
				<div>
					<label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-brand-500">
						Horario
					</label>
					<div className="grid grid-cols-2 gap-2">
						<input
							type="time"
							value={value.horaDesde}
							onChange={(e) => update({ horaDesde: e.target.value })}
							title="Hora Desde"
							className="h-10 w-full rounded-lg border border-brand-300 bg-cloud px-2 text-xs text-brand-900 outline-none focus:border-brand-700 focus:bg-paper transition-colors"
						/>
						<input
							type="time"
							value={value.horaHasta}
							onChange={(e) => update({ horaHasta: e.target.value })}
							title="Hora Hasta"
							className="h-10 w-full rounded-lg border border-brand-300 bg-cloud px-2 text-xs text-brand-900 outline-none focus:border-brand-700 focus:bg-paper transition-colors"
						/>
					</div>
				</div>

				{/* Estado */}
				<div>
					<label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-brand-500">
						Estado de solicitud
					</label>
					<select
						value={value.estado}
						onChange={(e) => update({ estado: e.target.value as EstadoFiltro })}
						className="h-10 w-full rounded-lg border border-brand-300 bg-cloud px-3 text-sm text-brand-900 outline-none focus:border-brand-700 focus:bg-paper transition-colors"
					>
						<option value="todas">Mostrar todos</option>
						<option value="pendientes">Pendientes</option>
						<option value="aprobadas">Aprobadas</option>
						<option value="historial">Historial (rechazadas / canceladas)</option>
						<option value="rechazadas">Rechazadas</option>
						<option value="canceladas">Canceladas</option>
						<option value="citas">Con cita</option>
					</select>
				</div>

				{/* Tipo de Eco */}
				<div>
					<label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-brand-500">
						Eco
					</label>
					<select
						value={value.ecoId}
						onChange={(e) => update({ ecoId: e.target.value })}
						className="h-10 w-full rounded-lg border border-brand-300 bg-cloud px-3 text-sm text-brand-900 outline-none focus:border-brand-700 focus:bg-paper transition-colors"
					>
						<option value="">Cualquier Eco</option>
						{ecoOptions.map((opt) => (
							<option key={opt.id} value={opt.id}>
								{opt.label}
							</option>
						))}
					</select>
				</div>

				{/* Orden */}
				<div>
					<label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-brand-500">
						Ordenación
					</label>
					<div className="flex w-full rounded-lg border border-brand-300 bg-cloud overflow-hidden text-xs">
						<button
							type="button"
							onClick={() => update({ ordenFecha: "reciente" })}
							className={`flex-1 py-1.5 font-medium transition-colors ${
								value.ordenFecha === "reciente"
									? "bg-brand-700 text-paper"
									: "text-brand-800 hover:bg-mist"
							}`}
						>
							Nuevos
						</button>
						<button
							type="button"
							onClick={() => update({ ordenFecha: "antigua" })}
							className={`flex-1 py-1.5 font-medium transition-colors ${
								value.ordenFecha === "antigua"
									? "bg-brand-700 text-paper"
									: "text-brand-800 hover:bg-mist"
							}`}
						>
							Antiguos
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default FiltrosDisponibilidadPendientes;
