import { useState, useMemo, useRef, useEffect } from "react";
import {
	ArrowLeft,
	ArrowRight,
	ChevronLeft,
	ChevronRight,
	Sun,
	Sunset,
	Moon,
	Clock,
	Info,
} from "lucide-react";
import { useGetDisponibilidadPublicaPorEcoQuery } from "../../disponibilidad/disponibilidadApi";

type PasoFechaHoraProps = {
	idEco: string;
	ecoNombre: string;
	/** YYYY-MM-DD elegida en paso 2 o al volver desde paso 4 */
	fechaInicial?: string;
	onNext: (data: {
		fecha: string;
		hora: string;
		id_disponibilidad: string;
		id_especialista: string;
		especialistaNombre: string;
	}) => void;
	onBack: () => void;
};

/* ─── Helpers ─── */

const DAYS_AHEAD = 21;
const SLOT_MINUTES = 20;

const DAY_NAMES_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH_NAMES_SHORT = [
	"Ene", "Feb", "Mar", "Abr", "May", "Jun",
	"Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const toISODate = (d: Date): string => {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
};

const isSameDay = (a: Date, b: Date): boolean =>
	a.getFullYear() === b.getFullYear() &&
	a.getMonth() === b.getMonth() &&
	a.getDate() === b.getDate();

/** Alinea una fecha ISO al rango de tarjetas disponibles (hoy … hoy+N). */
const clampDateToRange = (iso: string | undefined, cards: Date[], fallback: Date): Date => {
	if (!iso || cards.length === 0) return fallback;
	const parts = iso.split("-").map(Number);
	const y = parts[0];
	const m = parts[1];
	const d = parts[2];
	if (y == null || m == null || d == null) return fallback;
	const candidate = new Date(y, m - 1, d);
	candidate.setHours(0, 0, 0, 0);
	const tMin = cards[0].getTime();
	const tMax = cards[cards.length - 1].getTime();
	const t = candidate.getTime();
	if (t < tMin) return new Date(tMin);
	if (t > tMax) return new Date(tMax);
	return candidate;
};

/** Parse "HH:MM:SS" or "HH:MM" to total minutes */
const timeToMinutes = (t: string): number => {
	const parts = t.split(":").map(Number);
	return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
};

/** Format minutes to "hh:mm AM/PM" */
const minutesToLabel = (m: number): string => {
	const h = Math.floor(m / 60);
	const mm = String(m % 60).padStart(2, "0");
	const ampm = h >= 12 ? "PM" : "AM";
	const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
	return `${String(h12).padStart(2, "0")}:${mm} ${ampm}`;
};

/** Format minutes to "HH:MM:00" for backend */
const minutesToTimeStr = (m: number): string => {
	const h = String(Math.floor(m / 60)).padStart(2, "0");
	const mm = String(m % 60).padStart(2, "0");
	return `${h}:${mm}:00`;
};

type TimeSlot = {
	startMin: number;
	label: string;
	timeStr: string;
	id_disponibilidad: string;
	id_especialista: string;
	especialistaNombre: string;
};

/** Generate 20-min slots from a disponibilidad block */
const generateSlots = (block: {
	id_disponibilidad: string;
	hora_inicio: string;
	hora_fin: string;
	id_especialista: string;
	especialista_nombre: string;
	especialista_apellido: string;
}): TimeSlot[] => {
	const start = timeToMinutes(block.hora_inicio);
	const end = timeToMinutes(block.hora_fin);
	const slots: TimeSlot[] = [];
	for (let m = start; m + SLOT_MINUTES <= end; m += SLOT_MINUTES) {
		slots.push({
			startMin: m,
			label: minutesToLabel(m),
			timeStr: minutesToTimeStr(m),
			id_disponibilidad: block.id_disponibilidad,
			id_especialista: block.id_especialista,
			especialistaNombre: `${block.especialista_nombre} ${block.especialista_apellido}`.trim(),
		});
	}
	return slots;
};

/* Group slots by time of day */
type SlotGroup = { label: string; icon: "morning" | "afternoon" | "evening"; slots: TimeSlot[] };

const groupSlotsByPeriod = (slots: TimeSlot[]): SlotGroup[] => {
	const morning: TimeSlot[] = [];
	const afternoon: TimeSlot[] = [];
	const evening: TimeSlot[] = [];

	for (const s of slots) {
		if (s.startMin < 720) morning.push(s);       // < 12:00
		else if (s.startMin < 1080) afternoon.push(s); // 12:00-17:59
		else evening.push(s);                          // >= 18:00
	}

	const groups: SlotGroup[] = [];
	if (morning.length > 0) groups.push({ label: "Mañana", icon: "morning", slots: morning });
	if (afternoon.length > 0) groups.push({ label: "Tarde", icon: "afternoon", slots: afternoon });
	if (evening.length > 0) groups.push({ label: "Noche", icon: "evening", slots: evening });
	return groups;
};

/* ─── Component ─── */

const PasoFechaHora = ({ idEco, ecoNombre, fechaInicial, onNext, onBack }: PasoFechaHoraProps) => {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	// Generate date cards (today + next N days)
	const dateCards = useMemo(() => {
		const cards: Date[] = [];
		for (let i = 0; i < DAYS_AHEAD; i++) {
			const d = new Date(today);
			d.setDate(d.getDate() + i);
			cards.push(d);
		}
		return cards;
	}, []);

	const [selectedDate, setSelectedDate] = useState<Date>(() =>
		clampDateToRange(fechaInicial, dateCards, today),
	);
	const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const horariosSectionRef = useRef<HTMLElement>(null);

	const fechaStr = toISODate(selectedDate);

	// Fetch disponibilidad for this eco + selected date
	const { data: disponibilidad = [], isLoading, isFetching } =
		useGetDisponibilidadPublicaPorEcoQuery({ id_eco: idEco, fecha: fechaStr });

	// Generate all 20-min slots from raw blocks
	const allSlots = useMemo(() => {
		const slots: TimeSlot[] = [];
		for (const block of disponibilidad) {
			slots.push(...generateSlots(block));
		}
		// Sort by time
		slots.sort((a, b) => a.startMin - b.startMin);
		// Deduplicate by time (in case overlapping blocks)
		const seen = new Set<number>();
		return slots.filter((s) => {
			if (seen.has(s.startMin)) return false;
			seen.add(s.startMin);
			return true;
		});
	}, [disponibilidad]);

	const slotGroups = useMemo(() => groupSlotsByPeriod(allSlots), [allSlots]);

	const handleSelectDate = (d: Date) => {
		setSelectedDate(d);
		setSelectedSlot(null);
	};

	const handleSelectSlot = (slot: TimeSlot) => {
		setSelectedSlot(slot);
	};

	const canContinue = selectedSlot != null;

	const handleContinue = () => {
		if (!selectedSlot) return;
		onNext({
			fecha: fechaStr,
			hora: selectedSlot.timeStr,
			id_disponibilidad: selectedSlot.id_disponibilidad,
			id_especialista: selectedSlot.id_especialista,
			especialistaNombre: selectedSlot.especialistaNombre,
		});
	};

	// Scroll helpers for date picker
	const scrollLeft = () => {
		scrollRef.current?.scrollBy({ left: -300, behavior: "smooth" });
	};
	const scrollRight = () => {
		scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" });
	};

	// Centrar la tarjeta del día seleccionado en el carrusel (incl. fecha del paso 2)
	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const selected = el.querySelector("[data-selected='true']");
		if (selected) {
			selected.scrollIntoView({ inline: "center", behavior: "smooth" });
		}
	}, [selectedDate]);

	// Tras cargar turnos o cambiar día: scroll suave a la cuadrícula de horarios
	useEffect(() => {
		if (isLoading || isFetching) return;
		const id = window.setTimeout(() => {
			horariosSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
		}, 100);
		return () => window.clearTimeout(id);
	}, [fechaStr, idEco, isLoading, isFetching, allSlots.length]);

	const PeriodIcon = ({ type }: { type: "morning" | "afternoon" | "evening" }) => {
		if (type === "morning") return <Sun className="h-5 w-5 text-amber-500" />;
		if (type === "afternoon") return <Sunset className="h-5 w-5 text-orange-500" />;
		return <Moon className="h-5 w-5 text-indigo-400" />;
	};

	return (
		<div>
			{/* ─── HEADER ─── */}
			<div className="mb-8 lg:mb-10">
				<span className="text-brand-800 text-[10px] uppercase tracking-[0.3em] font-bold mb-2 block">
					HORARIO
				</span>
				<h2 className="font-headline text-3xl lg:text-4xl font-extrabold text-brand-900 tracking-tight mb-2">
					Selecciona la Fecha y Hora
				</h2>
				<p className="text-brand-600 text-sm lg:text-base max-w-xl leading-relaxed">
					Elija la hora adecuada para realizarte el {" "}
					<span className="font-semibold text-brand-800">{ecoNombre}</span>.
				</p>
			</div>

			{/* ─── DATE PICKER: Horizontal Scroll ─── */}
			<section className="mb-12">
				<div className="flex items-end justify-between mb-5">
					<h3 className="text-lg font-bold font-headline text-brand-900 flex items-center gap-2">
						<span className="w-1.5 h-7 bg-brand-800 rounded-full" />
						Seleccione el Día
					</h3>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={scrollLeft}
							className="w-8 h-8 rounded-full bg-cloud hover:bg-brand-100 flex items-center justify-center transition-colors"
						>
							<ChevronLeft className="h-4 w-4 text-brand-600" />
						</button>
						<button
							type="button"
							onClick={scrollRight}
							className="w-8 h-8 rounded-full bg-cloud hover:bg-brand-100 flex items-center justify-center transition-colors"
						>
							<ChevronRight className="h-4 w-4 text-brand-600" />
						</button>
					</div>
				</div>

				<div className="relative">
					<div
						ref={scrollRef}
						className="flex overflow-x-auto gap-3 py-3 px-1 scrollbar-hide"
						style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
					>
						{dateCards.map((d) => {
							const isSelected = isSameDay(d, selectedDate);
							const isToday = isSameDay(d, today);
							return (
								<button
									key={toISODate(d)}
									type="button"
									data-selected={isSelected}
									onClick={() => handleSelectDate(d)}
									className={`flex-shrink-0 w-20 h-28 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 snap-center relative ${isSelected
										? "bg-brand-800 text-white ring-4 ring-brand-200 shadow-xl shadow-brand-800/15"
										: "bg-paper text-brand-900 hover:bg-cloud border border-transparent hover:border-brand-200"
										}`}
								>
									<span className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${isSelected ? "text-white/70" : "text-brand-600"}`}>
										{MONTH_NAMES_SHORT[d.getMonth()]}
									</span>
									<span className="text-2xl font-black font-headline mb-0.5">
										{d.getDate()}
									</span>
									<span className={`text-[10px] font-medium uppercase tracking-widest ${isSelected ? "text-white/60" : "text-slate-400"}`}>
										{DAY_NAMES_SHORT[d.getDay()]}
									</span>
									{isToday && !isSelected && (
										<div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-brand-800" />
									)}
								</button>
							);
						})}
					</div>
					{/* Fade edges */}
					<div className="absolute top-0 left-0 h-full w-10 bg-gradient-to-r from-[var(--bg,#f0faf9)] to-transparent pointer-events-none" />
					<div className="absolute top-0 right-0 h-full w-10 bg-gradient-to-l from-[var(--bg,#f0faf9)] to-transparent pointer-events-none" />
				</div>
			</section>

			{/* ─── TIME SLOTS: Bento Grid ─── */}
			<section ref={horariosSectionRef} className="mb-10 scroll-mt-28">
				<h3 className="text-lg font-bold font-headline text-brand-900 flex items-center gap-2 mb-6">
					<span className="w-1.5 h-7 bg-brand-600 rounded-full" />
					Seleccione el Horario
				</h3>

				{isLoading || isFetching ? (
					<div className="flex items-center justify-center py-16">
						<div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-800 border-t-transparent" />
					</div>
				) : allSlots.length > 0 ? (
					<div className={`grid grid-cols-1 gap-6 ${slotGroups.length >= 3 ? "md:grid-cols-3" : slotGroups.length === 2 ? "md:grid-cols-2" : "md:grid-cols-1 max-w-md"}`}>
						{slotGroups.map((group) => (
							<div
								key={group.label}
								className="bg-white/40 backdrop-blur-sm p-5 rounded-3xl border border-white/40 shadow-sm"
							>
								<div className="flex items-center gap-3 mb-5">
									<PeriodIcon type={group.icon} />
									<h4 className="text-xs font-black font-headline uppercase tracking-widest text-slate-500">
										{group.label}
									</h4>
									<span className="ml-auto text-[10px] font-bold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">
										{group.slots.length} turnos
									</span>
								</div>
								<div className="grid grid-cols-2 gap-2.5">
									{group.slots.map((slot) => {
										const isActive = selectedSlot?.startMin === slot.startMin;
										return (
											<button
												key={slot.startMin}
												type="button"
												onClick={() => handleSelectSlot(slot)}
												className={`py-3 px-3 rounded-xl text-sm font-semibold text-center transition-all duration-200 ${isActive
													? "bg-brand-800 text-white shadow-lg shadow-brand-800/20"
													: "bg-white/80 hover:bg-brand-800 hover:text-white border border-brand-200/20 text-brand-900"
													}`}
											>
												{slot.label}
											</button>
										);
									})}
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="text-center py-14">
						<Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
						<p className="text-lg font-bold text-brand-900 font-headline mb-2">
							No hay horarios disponibles
						</p>
						<p className="text-sm text-brand-600 max-w-sm mx-auto">
							No hay turnos para esta ecografía en el día seleccionado.
							Prueba con otra fecha.
						</p>
					</div>
				)}
			</section>

			{/* ─── SELECTED SLOT INFO ─── */}
			{selectedSlot && (
				<div className="bg-paper rounded-2xl p-5 border border-brand-200/20 flex items-start gap-4 mb-8">
					<div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
						<Info className="h-5 w-5 text-brand-600" />
					</div>
					<div>
						<p className="text-sm font-medium text-brand-900">
							Turno seleccionado:{" "}
							<span className="font-bold">{selectedSlot.label}</span> — Duración:{" "}
							<span className="font-bold text-brand-800">20 minutos</span>
						</p>
						<p className="text-xs text-brand-600 mt-1">
							Especialista: Dr./Dra. {selectedSlot.especialistaNombre}
						</p>
					</div>
				</div>
			)}

			{/* ─── ACTION FOOTER ─── */}
			<footer className="flex items-center justify-between border-t border-brand-200/20 pt-8 pb-6">
				<button
					type="button"
					onClick={onBack}
					className="flex items-center gap-2 text-slate-400 font-bold hover:text-brand-900 transition-colors px-6 py-3 rounded-xl text-sm"
				>
					<ArrowLeft className="h-4 w-4" />
					<span className="font-headline tracking-tight">Volver</span>
				</button>
				<button
					type="button"
					onClick={handleContinue}
					disabled={!canContinue}
					className="bg-gradient-to-br from-brand-900 to-brand-800 text-white px-10 py-4 rounded-2xl font-headline font-extrabold tracking-tight shadow-xl shadow-brand-800/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm"
				>
					Continuar
					<ArrowRight className="h-4 w-4" />
				</button>
			</footer>
		</div>
	);
};

export default PasoFechaHora;
