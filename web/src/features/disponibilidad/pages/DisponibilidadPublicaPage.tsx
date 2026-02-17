import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import PageShell from "../../../shared/components/PageShell";
import { EmailVerificationBanner, useAuth } from "../../../shared";
import { useGetEcosQuery } from "../../ecos/ecosApi";
import {
	useGetDisponibilidadPublicaPorEcoQuery,
	type DisponibilidadPublicaPorEcoItem,
} from "../disponibilidadApi";
import { ReservarCitaElegirModal } from "../components";
import { formatFecha, formatHora, isSlotAtLeast2HoursFromNow } from "../utils/dateUtils";
import { useGetPacienteSelfQuery } from "../../usuarios/usuariosApi";

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
	const { user } = useAuth();
	const [idEco, setIdEco] = useState<string>("");
	const [blockToReservar, setBlockToReservar] =
		useState<DisponibilidadPublicaPorEcoItem | null>(null);
	const [selectedEspecialista, setSelectedEspecialista] = useState<string>("");
	const [dayOffset, setDayOffset] = useState(0);
	const [selectedDate, setSelectedDate] = useState<string>("");
	const [slotPage, setSlotPage] = useState(1);
	const pageSize = 5;
	const isPaciente = user?.rol === "paciente";

	const { data: pacienteSelf } = useGetPacienteSelfQuery(undefined, {
		skip: !isPaciente,
	});

	const isEmailVerified = !isPaciente
		? true
		: Number(pacienteSelf?.email_verificado) === 1;

	const { data: ecos = [], isLoading: loadingEcos } = useGetEcosQuery(undefined, {
		selectFromResult: ({ data, isLoading }) => ({
			data: data?.filter((e) => e.activo === 1) ?? [],
			isLoading,
		}),
	});

	const {
		data: bloques = [],
		isLoading: loadingBloques,
		refetch: refetchBloques,
	} = useGetDisponibilidadPublicaPorEcoQuery(
		{ id_eco: idEco },
		{ skip: !idEco },
	);

	const especialistas = useMemo(() => {
		const map = new Map<string, { id: string; nombre: string }>();
		bloques.forEach((item) => {
			if (!item.id_especialista) return;
			const nombre = `${item.especialista_nombre} ${item.especialista_apellido}`.trim();
			map.set(item.id_especialista, { id: item.id_especialista, nombre });
		});
		return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
	}, [bloques]);

	const bloquesFiltrados = useMemo(() => {
		if (!selectedEspecialista) return bloques;
		return bloques.filter((b) => b.id_especialista === selectedEspecialista);
	}, [bloques, selectedEspecialista]);

	const porFecha = useMemo(() => groupByFecha(bloquesFiltrados), [bloquesFiltrados]);
	const ecoSeleccionado = useMemo(
		() => ecos.find((e) => e.id_eco === idEco) ?? null,
		[ecos, idEco],
	);
	const dateKeys = useMemo(() => {
		const base = new Date();
		base.setHours(0, 0, 0, 0);
		base.setDate(base.getDate() + dayOffset);
		return Array.from({ length: 5 }, (_, idx) => {
			const d = new Date(base);
			d.setDate(base.getDate() + idx);
			return d.toISOString().slice(0, 10);
		});
	}, [dayOffset]);

	const selectedItems = useMemo(
		() => (selectedDate ? porFecha.get(selectedDate) ?? [] : []),
		[porFecha, selectedDate]
	);

	const totalSlotPages = Math.max(1, Math.ceil(selectedItems.length / pageSize));
	const pagedSlots = useMemo(() => {
		const start = (slotPage - 1) * pageSize;
		return selectedItems.slice(start, start + pageSize);
	}, [selectedItems, slotPage]);

	useEffect(() => {
		setSelectedEspecialista("");
		setDayOffset(0);
		setSelectedDate("");
		setSlotPage(1);
	}, [idEco]);

	useEffect(() => {
		setSlotPage(1);
	}, [selectedEspecialista]);

	useEffect(() => {
		if (!selectedDate || !dateKeys.includes(selectedDate)) {
			setSelectedDate(dateKeys[0]);
			setSlotPage(1);
		}
	}, [dateKeys, selectedDate]);

	useEffect(() => {
		setSlotPage(1);
	}, [selectedDate]);


	return (
		<PageShell
			title="Agendar cita"
			description="Selecciona un tipo de eco para ver fechas y especialistas disponibles (bloques aprobados)."
		>
			<div className="space-y-6">
				<EmailVerificationBanner />

				<div className="flex flex-col gap-4 sm:flex-row sm:items-end">
					<div className="w-full sm:max-w-md">
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

					{idEco && (
						<div className="w-full sm:max-w-md">
							<label
								htmlFor="especialista-select"
								className="mb-2 block text-sm font-medium text-brand-800"
							>
								Filtrar por especialista (opcional)
							</label>
							<select
								id="especialista-select"
								value={selectedEspecialista}
								onChange={(e) => setSelectedEspecialista(e.target.value)}
								className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-brand-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
								disabled={loadingBloques || especialistas.length === 0}
							>
								<option value="">Todos los especialistas</option>
								{especialistas.map((esp) => (
									<option key={esp.id} value={esp.id}>
										{esp.nombre}
									</option>
								))}
							</select>
						</div>
					)}
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

				{idEco && !loadingBloques && (
					<div className="space-y-6">
						<h2 className="text-lg font-semibold text-brand-900">
							Fechas disponibles
						</h2>
						<div className="flex flex-wrap items-center gap-2">
							<button
								type="button"
								onClick={() => setDayOffset((prev) => Math.max(0, prev - 5))}
								className="rounded-lg border border-brand-300 bg-paper px-3 py-1.5 text-sm font-medium text-brand-800 hover:bg-cloud"
								disabled={dayOffset === 0}
							>
								← Anteriores 5 días
							</button>
							<div className="flex flex-wrap items-center gap-2">
								{dateKeys.map((key) => {
									const count = porFecha.get(key)?.length ?? 0;
									const isActive = key === selectedDate;
									return (
										<button
											key={key}
											type="button"
											onClick={() => setSelectedDate(key)}
											className={
												`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${isActive
													? "border-brand-700 bg-brand-700 text-paper"
													: "border-brand-300 bg-paper text-brand-800 hover:bg-cloud"
												}`
											}
										>
											{formatFecha(key)}
											<span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-800">
												{count}
											</span>
										</button>
									);
								})}
							</div>
							<button
								type="button"
								onClick={() => setDayOffset((prev) => prev + 5)}
								className="rounded-lg border border-brand-300 bg-paper px-3 py-1.5 text-sm font-medium text-brand-800 hover:bg-cloud"
							>
								Siguientes 5 días →
							</button>
						</div>

						{selectedItems.length === 0 ? (
							<div className="rounded-lg border border-brand-200 bg-paper p-4 text-center text-brand-600">
								No hay fechas disponibles para esta fecha.
							</div>
						) : (
							<>
								<div className="rounded-lg border border-brand-200 bg-paper">
									<div className="border-b border-brand-200 bg-brand-50 px-4 py-3">
										<span className="font-medium text-brand-900">
											{formatFecha(selectedDate)}
										</span>
									</div>
									<ul className="divide-y divide-brand-100">
										{pagedSlots.map((b) => {
											const puedeReservar = isSlotAtLeast2HoursFromNow(b.fecha, b.hora_inicio);
											const deshabilitar = (isPaciente && !isEmailVerified) || !puedeReservar;
											return (
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
															onClick={() => puedeReservar && setBlockToReservar(b)}
															disabled={deshabilitar}
															title={!puedeReservar ? "Solo se puede reservar con al menos 2 horas de anticipación" : undefined}
															className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
																deshabilitar
																	? "bg-brand-800/60 text-paper/80 cursor-not-allowed"
																	: "bg-brand-700 text-paper hover:bg-brand-800"
															}`}
														>
															<CalendarPlus className="h-4 w-4" />
															Reservar cita
														</button>
													</div>
												</li>
											);
										})}
									</ul>
									<div className="flex items-center justify-between border-t border-mist bg-cloud/30 px-4 py-3">
										<p className="text-xs text-brand-700">
											Página {slotPage} de {totalSlotPages}
										</p>
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() => setSlotPage((prev) => Math.max(1, prev - 1))}
												disabled={slotPage === 1}
												className="rounded-lg border border-brand-300 bg-paper p-2 text-brand-800 hover:bg-cloud disabled:opacity-50 disabled:pointer-events-none"
												aria-label="Anterior"
											>
												<ChevronLeft className="h-4 w-4" />
											</button>
											<button
												type="button"
												onClick={() => setSlotPage((prev) => Math.min(totalSlotPages, prev + 1))}
												disabled={slotPage >= totalSlotPages}
												className="rounded-lg border border-brand-300 bg-paper p-2 text-brand-800 hover:bg-cloud disabled:opacity-50 disabled:pointer-events-none"
												aria-label="Siguiente"
											>
												<ChevronRight className="h-4 w-4" />
											</button>
										</div>
									</div>
								</div>
							</>
						)}
					</div>
				)}

				{blockToReservar && ecoSeleccionado && (
					<ReservarCitaElegirModal
						block={blockToReservar}
						eco={ecoSeleccionado}
						onClose={() => setBlockToReservar(null)}
						onSuccess={() => {
							setBlockToReservar(null);
							refetchBloques();
						}}
					/>
				)}
			</div>
		</PageShell>
	);
};

export default DisponibilidadPublicaPage;
