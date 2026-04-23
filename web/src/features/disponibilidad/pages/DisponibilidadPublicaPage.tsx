import { useEffect, useMemo, useState } from "react";
import {
	CalendarPlus,
	ChevronLeft,
	ChevronRight,
	Stethoscope,
	CheckCircle2,
	Calendar,
	Clock,
	AlertTriangle,
	Phone,
} from "lucide-react";
import PageShell from "../../../shared/components/PageShell";
import { EmailVerificationBanner, useAuth } from "../../../shared";
import { useGetEcosQuery } from "../../ecos/ecosApi";
import { useGetTienePagoPendienteQuery } from "../../citas/citasApi";
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

	const { data: tienePagoData } = useGetTienePagoPendienteQuery(undefined, {
		skip: !isPaciente,
	});
	const tienePagoPendiente = tienePagoData?.tienePagoPendiente ?? false;

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
			const y = d.getFullYear();
			if (y < 1000 || y > 9999) return "";
			return `${y}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
		}).filter(Boolean);
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
			description="Elige tu tipo de ecografía y reserva en pocos pasos."
		>
			<div className="space-y-8">
				<EmailVerificationBanner />

				{/* Banner: pago pendiente de verificación */}
				{isPaciente && tienePagoPendiente && (
					<div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm">
						<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
						<div className="min-w-0 flex-1 text-base">
							<p className="font-semibold">Tiene una cita con pago pendiente de verificación</p>
							<p className="mt-1">
								No puede agendar otra cita hasta que un moderador apruebe o rechace el pago de su cita actual. Puede revisar el estado en <strong>Mis citas</strong>.
							</p>
						</div>
					</div>
				)}

				{/* Aviso: orden médica y asesoría */}
				<div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm">
					<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
					<div className="min-w-0 flex-1 text-base">
						<p>
							La <strong>orden médica</strong> (puede ser una foto) es solicitada para dejar registro de que su médico indicó este estudio. Si tiene dudas, puede ponerse en contacto con nosotros para asesoría.
						</p>
						<p className="mt-1 flex items-center gap-1.5 text-amber-800">
							<Phone className="h-3.5 w-3.5" />
							Consulte por teléfono o correo para más información.
						</p>
					</div>
				</div>

				{/* Hero: pasos del flujo */}
				<div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-6 text-paper shadow-lg sm:p-8">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-4">
							<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur sm:h-16 sm:w-16">
								<CalendarPlus className="h-7 w-7 sm:h-8 sm:w-8" />
							</div>
							<div>
								<h2 className="text-xl font-bold sm:text-2xl">Agenda tu ecografía</h2>
								<p className="mt-1 text-base text-white/90">
									En 3 pasos: elige el estudio, la fecha y confirma tu cita.
								</p>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2 sm:gap-3">
							<span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium sm:text-base">
								<Stethoscope className="h-3.5 w-3.5" />
								Paso 1: Tipo de eco
							</span>
							<span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium sm:text-base">
								<Calendar className="h-3.5 w-3.5" />
								Paso 2: Fecha y hora
							</span>
							<span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium sm:text-base">
								<CheckCircle2 className="h-3.5 w-3.5" />
								Paso 3: Confirmar
							</span>
						</div>
					</div>
				</div>

				{/* Paso 1: Tipo de eco (tarjetas) */}
				<section className="space-y-4">
					<div className="flex items-center gap-2">
						<span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-base font-bold text-paper">
							1
						</span>
						<h3 className="text-lg font-semibold text-brand-900">Elige el tipo de ecografía</h3>
					</div>
					{loadingEcos ? (
						<div className="flex flex-wrap gap-3">
							{[1, 2, 3].map((i) => (
								<div
									key={i}
									className="h-24 w-full min-w-[140px] max-w-[200px] animate-pulse rounded-xl bg-mist"
								/>
							))}
						</div>
					) : (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{ecos.map((eco) => {
								const selected = idEco === eco.id_eco;
								const precio = eco.precio != null && Number(eco.precio) > 0
									? Number(eco.precio)
									: null;
								return (
									<button
										key={eco.id_eco}
										type="button"
										onClick={() => setIdEco(eco.id_eco)}
										className={`group relative flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200 hover:shadow-md ${
											selected
												? "border-brand-700 bg-brand-50 shadow ring-2 ring-brand-700/30"
												: "border-mist bg-paper hover:border-brand-300 hover:bg-cloud/50"
										}`}
									>
										{selected && (
											<span className="absolute right-3 top-3 text-brand-700">
												<CheckCircle2 className="h-5 w-5" />
											</span>
										)}
										<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 group-hover:bg-brand-200">
											<Stethoscope className="h-6 w-6" />
										</div>
										<div className="min-w-0 flex-1 pr-8">
											<p className="font-semibold text-brand-900">{eco.nombre}</p>
											{precio != null && (
												<p className="mt-1 text-base font-medium text-brand-700">
													${precio.toLocaleString("es-VE")} USD
												</p>
											)}
										</div>
									</button>
								);
							})}
						</div>
					)}
					{!idEco && ecos.length > 0 && (
						<p className="text-base text-brand-600">
							Selecciona un tipo de eco para ver fechas y horarios disponibles.
						</p>
					)}
				</section>

				{/* Filtro por especialista (cuando hay eco elegido) */}
				{idEco && especialistas.length > 0 && (
					<div className="flex flex-wrap items-center gap-3 rounded-xl border border-mist bg-paper p-4">
						<label htmlFor="especialista-select" className="text-base font-medium text-brand-800">
							Filtrar por especialista (opcional):
						</label>
						<select
							id="especialista-select"
							value={selectedEspecialista}
							onChange={(e) => setSelectedEspecialista(e.target.value)}
							className="rounded-lg border border-brand-300 bg-paper px-3 py-2 text-base text-brand-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
							disabled={loadingBloques}
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

				{idEco && loadingBloques && (
					<div className="flex items-center justify-center gap-3 rounded-xl border border-mist bg-paper py-12">
						<div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-300 border-t-brand-700" />
						<span className="text-brand-700">Buscando fechas disponibles…</span>
					</div>
				)}

				{idEco && !loadingBloques && bloques.length === 0 && (
					<div className="rounded-xl border border-brand-200 bg-paper p-8 text-center shadow-sm">
						<Calendar className="mx-auto h-12 w-12 text-brand-300" />
						<p className="mt-3 font-medium text-brand-800">Sin disponibilidad por ahora</p>
						<p className="mt-1 text-base text-brand-600">
							No hay bloques aprobados para este eco en fechas futuras. Prueba otro tipo de eco o vuelve más tarde.
						</p>
					</div>
				)}

				{/* Paso 2: Fechas y horarios */}
				{idEco && !loadingBloques && bloques.length > 0 && (
					<section className="space-y-4">
						<div className="flex items-center gap-2">
							<span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-base font-bold text-paper">
								2
							</span>
							<h3 className="text-lg font-semibold text-brand-900">Elige fecha y horario</h3>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<button
								type="button"
								onClick={() => setDayOffset((prev) => Math.max(0, prev - 5))}
								className="rounded-lg border border-brand-300 bg-paper px-3 py-2 text-base font-medium text-brand-800 shadow-sm transition-colors hover:bg-cloud disabled:opacity-50"
								disabled={dayOffset === 0}
							>
								<ChevronLeft className="inline h-4 w-4" /> Anteriores
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
											className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-base font-medium transition-all ${
												isActive
													? "border-brand-700 bg-brand-700 text-paper shadow"
													: "border-mist bg-paper text-brand-800 hover:border-brand-300 hover:bg-cloud/50"
											}`}
										>
											<Clock className="h-4 w-4 shrink-0" />
											{formatFecha(key)}
											<span className="rounded-full bg-brand-100 px-2 py-0.5 text-sm font-medium text-brand-800">
												{count}
											</span>
										</button>
									);
								})}
							</div>
							<button
								type="button"
								onClick={() => setDayOffset((prev) => prev + 5)}
								className="rounded-lg border border-brand-300 bg-paper px-3 py-2 text-base font-medium text-brand-800 shadow-sm transition-colors hover:bg-cloud"
							>
								Siguientes <ChevronRight className="inline h-4 w-4" />
							</button>
						</div>

						{selectedItems.length === 0 ? (
							<div className="rounded-xl border border-mist bg-paper p-6 text-center text-brand-600">
								No hay turnos para esta fecha. Elige otra.
							</div>
						) : (
							<div className="overflow-hidden rounded-xl border border-brand-200 bg-paper shadow-sm">
								<div className="border-b border-mist bg-brand-50/80 px-4 py-3">
									<span className="font-semibold text-brand-900">
										{formatFecha(selectedDate)} — {selectedItems.length} turno{selectedItems.length !== 1 ? "s" : ""} disponible{selectedItems.length !== 1 ? "s" : ""}
									</span>
								</div>
								<ul className="divide-y divide-mist">
									{pagedSlots.map((b) => {
										const puedeReservar = isSlotAtLeast2HoursFromNow(b.fecha, b.hora_inicio);
										const deshabilitar = (isPaciente && !isEmailVerified) || !puedeReservar || (isPaciente && tienePagoPendiente);
										return (
											<li
												key={b.id_disponibilidad}
												className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:flex-nowrap"
											>
												<div className="flex items-center gap-3">
													<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
														<Stethoscope className="h-5 w-5" />
													</div>
													<div>
														<p className="font-medium text-brand-900">
															{b.especialista_nombre} {b.especialista_apellido}
														</p>
														<p className="text-sm text-brand-600">{b.especialidad_nombre}</p>
													</div>
												</div>
												<div className="flex items-center gap-3">
													<span className="text-base font-medium text-brand-700">
														{formatHora(b.hora_inicio)} – {formatHora(b.hora_fin)}
													</span>
													<button
														type="button"
														onClick={() => puedeReservar && !tienePagoPendiente && setBlockToReservar(b)}
														disabled={deshabilitar}
														title={
															tienePagoPendiente
																? "Tiene una cita con pago pendiente de verificación"
																: !puedeReservar
																	? "Solo se puede reservar con al menos 2 horas de anticipación"
																	: undefined
														}
														className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-base font-semibold transition-all ${
															deshabilitar
																? "cursor-not-allowed bg-brand-200 text-paper/80"
																: "bg-brand-700 text-paper shadow hover:bg-brand-800 hover:shadow-md"
														}`}
													>
														<CalendarPlus className="h-4 w-4" />
														Reservar
													</button>
												</div>
											</li>
										);
									})}
								</ul>
								<div className="flex items-center justify-between border-t border-mist bg-cloud/40 px-4 py-3">
									<p className="text-sm font-medium text-brand-700">
										Página {slotPage} de {totalSlotPages}
									</p>
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => setSlotPage((prev) => Math.max(1, prev - 1))}
											disabled={slotPage === 1}
											className="rounded-lg border border-brand-300 bg-paper p-2 text-brand-800 transition-colors hover:bg-cloud disabled:opacity-50 disabled:pointer-events-none"
											aria-label="Anterior"
										>
											<ChevronLeft className="h-4 w-4" />
										</button>
										<button
											type="button"
											onClick={() => setSlotPage((prev) => Math.min(totalSlotPages, prev + 1))}
											disabled={slotPage >= totalSlotPages}
											className="rounded-lg border border-brand-300 bg-paper p-2 text-brand-800 transition-colors hover:bg-cloud disabled:opacity-50 disabled:pointer-events-none"
											aria-label="Siguiente"
										>
											<ChevronRight className="h-4 w-4" />
										</button>
									</div>
								</div>
							</div>
						)}
					</section>
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
