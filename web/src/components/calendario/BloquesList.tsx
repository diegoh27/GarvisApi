import { useState } from "react";
import type { Disponibilidad, FilterOption } from "./types";
import { useGetCitaByIdQuery } from "../../features/especialista/especialistaApi";
import VerCitaModal from "../../features/moderadores/components/VerCitaModal";

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
	const [selectedCitaId, setSelectedCitaId] = useState<string | null>(null);

	// Obtener datos completos de la cita cuando se selecciona para ver
	const {
		data: citaData,
		isLoading: loadingCita,
		error: citaError,
	} = useGetCitaByIdQuery(selectedCitaId || "", {
		skip: !selectedCitaId,
	});

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
						const isCita = bloque.estado === 4;
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
						
						// Extraer el id_cita si es una cita
						const citaId = isCita && bloque.id_disponibilidad.startsWith("cita-")
							? bloque.id_disponibilidad.replace("cita-", "")
							: null;
						
						return (
						<div
							key={bloque.id_disponibilidad}
							className="rounded-2xl bg-paper p-3 shadow-sm border border-mist"
						>
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<p className="text-xs font-semibold text-brand-900">
										{formatFecha(bloque.fecha)}
									</p>
									<p className="text-[11px] text-brand-800">
										{formatHora(bloque.hora_inicio)} - {formatHora(bloque.hora_fin)}
									</p>
									{bloque.eco_nombre && (
										<p className="mt-1 text-[11px] font-medium text-brand-700">
											{bloque.eco_nombre}
										</p>
									)}
									<span
										className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] ${colorClass}`}
									>
										{label}
									</span>
								</div>
								{isCita && citaId && (
									<button
										onClick={() => setSelectedCitaId(citaId)}
										className="ml-2 rounded-lg border border-brand-700 bg-paper px-3 py-1.5 text-[10px] text-brand-700 hover:bg-brand-50 transition-colors"
									>
										Ver cita
									</button>
								)}
							</div>
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

			{/* Modal de ver cita */}
			{selectedCitaId && (
				<VerCitaModal
					cita={loadingCita ? null : citaData || null}
					error={citaError ? "No se pudo cargar la información de la cita" : null}
					onClose={() => setSelectedCitaId(null)}
					hideSensitiveData={true}
				/>
			)}
		</div>
	);
};

export default BloquesList;
