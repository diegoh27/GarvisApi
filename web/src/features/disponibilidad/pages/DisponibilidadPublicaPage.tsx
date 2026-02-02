import { useState, useMemo } from "react";
import { CalendarPlus } from "lucide-react";
import PageShell from "../../../shared/components/PageShell";
import { useGetEcosQuery } from "../../ecos/ecosApi";
import {
	useGetDisponibilidadPublicaPorEcoQuery,
	type DisponibilidadPublicaPorEcoItem,
} from "../disponibilidadApi";
import { ReservarCitaElegirModal } from "../components";
import { formatFecha, formatHora } from "../utils/dateUtils";

function groupByFecha(
	items: DisponibilidadPublicaPorEcoItem[],
): Map<string, DisponibilidadPublicaPorEcoItem[]> {
	const map = new Map<string, DisponibilidadPublicaPorEcoItem[]>();
	for (const item of items) {
		const key = item.fecha.slice(0, 10);
		if (!map.has(key)) map.set(key, []);
		map.get(key)!.push(item);
	}
	// Ordenar por fecha
	const sorted = new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
	return sorted;
}

const DisponibilidadPublicaPage = () => {
	const [idEco, setIdEco] = useState<string>("");
	const [blockToReservar, setBlockToReservar] =
		useState<DisponibilidadPublicaPorEcoItem | null>(null);

	const { data: ecos = [], isLoading: loadingEcos } = useGetEcosQuery(undefined, {
		selectFromResult: ({ data, isLoading }) => ({
			data: data?.filter((e) => e.activo === 1) ?? [],
			isLoading,
		}),
	});

	const { data: bloques = [], isLoading: loadingBloques } =
		useGetDisponibilidadPublicaPorEcoQuery(
			{ id_eco: idEco },
			{ skip: !idEco },
		);

	const porFecha = useMemo(() => groupByFecha(bloques), [bloques]);
	const ecoSeleccionado = useMemo(
		() => ecos.find((e) => e.id_eco === idEco) ?? null,
		[ecos, idEco],
	);

	return (
		<PageShell
			title="Calendario"
			description="Selecciona un tipo de eco para ver fechas y especialistas disponibles (bloques aprobados)."
		>
			<div className="space-y-6">
				<div className="max-w-md">
					<label
						htmlFor="eco-select"
						className="mb-2 block text-sm font-medium text-brand-800"
					>
						Tipo de eco
					</label>
					<select
						id="eco-select"
						value={idEco}
						onChange={(e) => setIdEco(e.target.value)}
						className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-brand-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
						disabled={loadingEcos}
					>
						<option value="">Selecciona un tipo de eco</option>
						{ecos.map((eco) => (
							<option key={eco.id_eco} value={eco.id_eco}>
								{eco.nombre}
								{eco.precio != null && eco.precio > 0
									? ` — $ ${eco.precio.toLocaleString("es-VE")}`
									: ""}
							</option>
						))}
					</select>
				</div>

				{!idEco && (
					<p className="text-sm text-brand-600">
						Elige un tipo de eco arriba para ver las fechas y especialistas
						disponibles.
					</p>
				)}

				{idEco && loadingBloques && (
					<p className="text-sm text-brand-600">Cargando disponibilidad…</p>
				)}

				{idEco && !loadingBloques && bloques.length === 0 && (
					<div className="rounded-lg border border-brand-200 bg-paper p-4 text-center text-brand-600">
						No hay bloques de disponibilidad aprobados para este eco en fechas
						futuras.
					</div>
				)}

				{idEco && !loadingBloques && porFecha.size > 0 && (
					<div className="space-y-6">
						<h2 className="text-lg font-semibold text-brand-900">
							Fechas disponibles
						</h2>
						<div className="space-y-6">
							{Array.from(porFecha.entries()).map(([fechaKey, items]) => (
								<div
									key={fechaKey}
									className="rounded-lg border border-brand-200 bg-paper"
								>
									<div className="border-b border-brand-200 bg-brand-50 px-4 py-3">
										<span className="font-medium text-brand-900">
											{formatFecha(fechaKey)}
										</span>
									</div>
									<ul className="divide-y divide-brand-100">
										{items.map((b) => (
											<li
												key={b.id_disponibilidad}
												className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:flex-nowrap"
											>
												<div className="flex items-center gap-2">
													<span className="font-medium text-brand-900">
														{b.especialista_nombre} {b.especialista_apellido}
													</span>
													<span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-800">
														{b.especialidad_nombre}
													</span>
												</div>
												<div className="flex items-center gap-2">
													<span className="text-sm text-brand-600">
														{formatHora(b.hora_inicio)} – {formatHora(b.hora_fin)}
													</span>
													<button
														type="button"
														onClick={() => setBlockToReservar(b)}
														className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-medium text-paper transition-colors hover:bg-brand-800"
													>
														<CalendarPlus className="h-4 w-4" />
														Reservar cita
													</button>
												</div>
											</li>
										))}
									</ul>
								</div>
							))}
						</div>
					</div>
				)}

				{blockToReservar && ecoSeleccionado && (
					<ReservarCitaElegirModal
						block={blockToReservar}
						eco={ecoSeleccionado}
						onClose={() => setBlockToReservar(null)}
						onSuccess={() => {
							setBlockToReservar(null);
							// La query se invalida por useAsignarCitaCompletaMutation
						}}
					/>
				)}
			</div>
		</PageShell>
	);
};

export default DisponibilidadPublicaPage;
