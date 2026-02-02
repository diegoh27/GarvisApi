import { Search } from "lucide-react";

export type OrdenFecha = "reciente" | "antigua";

export type FiltrosDisponibilidadPendientesValues = {
	query: string;
	ordenFecha: OrdenFecha;
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
};

const FiltrosDisponibilidadPendientes = ({
	value,
	onChange,
	ecoOptions,
}: FiltrosDisponibilidadPendientesProps) => {
	const update = (partial: Partial<FiltrosDisponibilidadPendientesValues>) =>
		onChange({ ...value, ...partial });

	return (
		<div className="space-y-4 rounded-lg border border-brand-200 bg-paper p-4">
			<div>
				<label className="mb-2 block text-xs font-medium text-brand-700">
					Buscar por eco, especialista o fecha
				</label>
				<div className="relative">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
					<input
						type="text"
						value={value.query}
						onChange={(e) => update({ query: e.target.value })}
						placeholder="Ej: abdominal, Dr. Pérez, 2026-01..."
						className="h-10 w-full rounded-lg border border-brand-300 bg-cloud pl-9 pr-4 text-sm text-brand-900 outline-none focus:border-brand-700"
					/>
				</div>
			</div>

			<div>
				<label className="mb-2 block text-xs font-medium text-brand-700">
					Ordenar por fecha
				</label>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => update({ ordenFecha: "reciente" })}
						className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${value.ordenFecha === "reciente"
								? "bg-brand-700 text-paper"
								: "bg-cloud text-brand-800 hover:bg-mist"
							}`}
					>
						Más recientes primero
					</button>
					<button
						type="button"
						onClick={() => update({ ordenFecha: "antigua" })}
						className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${value.ordenFecha === "antigua"
								? "bg-brand-700 text-paper"
								: "bg-cloud text-brand-800 hover:bg-mist"
							}`}
					>
						Más antiguas primero
					</button>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<label className="mb-2 block text-xs font-medium text-brand-700">
						Desde fecha
					</label>
					<input
						type="date"
						value={value.fechaDesde}
						onChange={(e) => update({ fechaDesde: e.target.value })}
						className="h-10 w-full rounded-lg border border-brand-300 bg-cloud px-4 text-sm text-brand-900 outline-none focus:border-brand-700"
					/>
				</div>
				<div>
					<label className="mb-2 block text-xs font-medium text-brand-700">
						Hasta fecha
					</label>
					<input
						type="date"
						value={value.fechaHasta}
						onChange={(e) => update({ fechaHasta: e.target.value })}
						className="h-10 w-full rounded-lg border border-brand-300 bg-cloud px-4 text-sm text-brand-900 outline-none focus:border-brand-700"
					/>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<label className="mb-2 block text-xs font-medium text-brand-700">
						Desde hora
					</label>
					<input
						type="time"
						value={value.horaDesde}
						onChange={(e) => update({ horaDesde: e.target.value })}
						className="h-10 w-full rounded-lg border border-brand-300 bg-cloud px-4 text-sm text-brand-900 outline-none focus:border-brand-700"
					/>
				</div>
				<div>
					<label className="mb-2 block text-xs font-medium text-brand-700">
						Hasta hora
					</label>
					<input
						type="time"
						value={value.horaHasta}
						onChange={(e) => update({ horaHasta: e.target.value })}
						className="h-10 w-full rounded-lg border border-brand-300 bg-cloud px-4 text-sm text-brand-900 outline-none focus:border-brand-700"
					/>
				</div>
			</div>

			<div>
				<label className="mb-2 block text-xs font-medium text-brand-700">
					Filtrar por eco
				</label>
				<select
					value={value.ecoId}
					onChange={(e) => update({ ecoId: e.target.value })}
					className="h-10 w-full rounded-lg border border-brand-300 bg-cloud px-4 text-sm text-brand-900 outline-none focus:border-brand-700"
				>
					<option value="">Todos los ecos</option>
					{ecoOptions.map((opt) => (
						<option key={opt.id} value={opt.id}>
							{opt.label}
						</option>
					))}
				</select>
			</div>
		</div>
	);
};

export default FiltrosDisponibilidadPendientes;
