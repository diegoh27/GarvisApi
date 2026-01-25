import type { Disponibilidad, FilterOption } from "./types";

type BloquesListProps = {
	bloques: Disponibilidad[];
	loading: boolean;
	filter: string;
	filterOptions: FilterOption[];
	currentPage: number;
	totalPages: number;
	onFilterChange: (value: string) => void;
	onPageChange: (value: number) => void;
	formatFecha: (value: string) => string;
	formatHora: (value: string) => string;
	estadoLabel: Record<number, string>;
	estadoColor: Record<number, string>;
};

const BloquesList = ({
	bloques,
	loading,
	filter,
	filterOptions,
	currentPage,
	totalPages,
	onFilterChange,
	onPageChange,
	formatFecha,
	formatHora,
	estadoLabel,
	estadoColor,
}: BloquesListProps) => {
	return (
		<div className="rounded-2xl bg-paper p-4 shadow-sm">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold text-brand-900">Mis bloques</h3>
				{loading ? (
					<span className="text-[11px] text-brand-800">Cargando...</span>
				) : null}
			</div>
			<div className="mt-3 flex flex-wrap gap-2 text-[11px] text-brand-800">
				{filterOptions.map((item) => (
					<button
						key={item.id}
						onClick={() => onFilterChange(item.id)}
						className={`rounded-full px-3 py-1 ${
							filter === item.id
								? "bg-brand-700 text-paper"
								: "bg-cloud text-brand-800"
						}`}
					>
						{item.label}
					</button>
				))}
			</div>

			{bloques.length === 0 ? (
				<p className="mt-4 rounded-xl bg-paper p-3 text-[11px] text-brand-800">
					No hay bloques para mostrar.
				</p>
			) : (
				<div className="mt-4 space-y-3">
					{bloques.map((bloque) => {
						const isPagoPendiente =
							bloque.estado === 4 && bloque.estado_pago === 0;
						const isAtendida =
							bloque.estado === 4 && bloque.estado_cita === 3;
						const label = isAtendida
							? "Atendida"
							: isPagoPendiente
								? "Pago pendiente"
								: estadoLabel[bloque.estado] ?? "Estado";
						const colorClass = isAtendida
							? "bg-emerald-500 text-paper"
							: isPagoPendiente
								? "bg-amber-400 text-brand-900"
								: estadoColor[bloque.estado] ?? "bg-mist text-brand-800";
						return (
						<div
							key={bloque.id_disponibilidad}
							className="rounded-2xl bg-paper p-3 shadow-sm"
						>
							<p className="text-xs font-semibold text-brand-900">
								{formatFecha(bloque.fecha)}
							</p>
							<p className="text-[11px] text-brand-800">
								{formatHora(bloque.hora_inicio)} - {formatHora(bloque.hora_fin)}
							</p>
							<span
								className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] ${colorClass}`}
							>
								{label}
							</span>
						</div>
					)})}
				</div>
			)}

			<div className="mt-4 flex items-center justify-between text-[11px] text-brand-800">
				<button
					disabled={currentPage <= 1}
					onClick={() => onPageChange(Math.max(1, currentPage - 1))}
					className="rounded-full bg-cloud px-3 py-1 disabled:opacity-50"
				>
					Anterior
				</button>
				<span>
					Página {currentPage} de {totalPages}
				</span>
				<button
					disabled={currentPage >= totalPages}
					onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
					className="rounded-full bg-cloud px-3 py-1 disabled:opacity-50"
				>
					Siguiente
				</button>
			</div>
		</div>
	);
};

export default BloquesList;
