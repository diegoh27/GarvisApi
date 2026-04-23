import { useState, useMemo, useRef } from "react";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	ScanHeart,
	Info,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { useGetDisponibilidadPorFechaQuery } from "../../disponibilidad/disponibilidadApi";
import type { DisponibilidadPublicaPorEcoItem } from "../../disponibilidad/disponibilidadApi";
import { useGetEcosQuery } from "../../ecos/ecosApi";
import { PREDEFINED_ICONS } from "../../ecos/components/EcoForm";

type PasoServicioProps = {
	onNext: (data: { id_eco: string; ecoNombre: string; fecha: string }) => void;
	onBack: () => void;
};

/* ─── Helpers ─── */

/** Format date to YYYY-MM-DD */
const toISODate = (d: Date): string => {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
};

/** Check if two Date-like strings refer to the same calendar day */
const isSameDay = (a: Date, b: Date): boolean =>
	a.getFullYear() === b.getFullYear() &&
	a.getMonth() === b.getMonth() &&
	a.getDate() === b.getDate();

/** Generate descriptive text for an eco name */
const getEcoDescription = (nombre: string): string => {
	const lower = nombre.toLowerCase();
	if (lower.includes("abdominal")) return "Evaluación de órganos abdominales: hígado, vesícula, páncreas, riñones y bazo.";
	if (lower.includes("pélvic")) return "Evaluación de órganos pélvicos: útero, ovarios, vejiga o próstata.";
	if (lower.includes("obstétric") || lower.includes("embaraz")) return "Control prenatal y seguimiento del desarrollo fetal.";
	if (lower.includes("tiroid")) return "Evaluación de la glándula tiroides y estructuras del cuello.";
	if (lower.includes("mamari") || lower.includes("mama")) return "Evaluación complementaria del tejido mamario.";
	if (lower.includes("renal")) return "Estudio especializado de riñones y vías urinarias.";
	if (lower.includes("muscul") || lower.includes("tejido")) return "Evaluación de músculos, tendones, ligamentos y articulaciones.";
	if (lower.includes("transvaginal")) return "Evaluación detallada de útero, ovarios y endometrio por vía endocavitaria.";
	if (lower.includes("doppler")) return "Estudio del flujo sanguíneo en vasos y órganos mediante ultrasonido Doppler.";
	if (lower.includes("cardiac") || lower.includes("corazón")) return "Evaluación de la estructura y función del corazón.";
	if (lower.includes("próstat") || lower.includes("prostat")) return "Evaluación de la glándula prostática y vesículas seminales.";
	return "Estudio ecográfico especializado con equipos de alta resolución.";
};

/* ─── Mini Calendar ─── */

const WEEKDAYS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
const MONTH_NAMES = [
	"Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
	"Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type MiniCalendarProps = {
	selectedDate: Date;
	onSelectDate: (d: Date) => void;
};

const MiniCalendar = ({ selectedDate, onSelectDate }: MiniCalendarProps) => {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const maxDate = new Date(today);
	maxDate.setDate(today.getDate() + 30);
	maxDate.setHours(23, 59, 59, 999);

	const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
	const [viewYear, setViewYear] = useState(selectedDate.getFullYear());

	const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
	const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sunday

	const prevMonth = () => {
		// Don't go before the current month
		const nowMonth = today.getMonth();
		const nowYear = today.getFullYear();
		if (viewYear === nowYear && viewMonth <= nowMonth) return;
		if (viewMonth === 0) {
			setViewMonth(11);
			setViewYear(viewYear - 1);
		} else {
			setViewMonth(viewMonth - 1);
		}
	};

	const nextMonth = () => {
		if (viewMonth === 11) {
			setViewMonth(0);
			setViewYear(viewYear + 1);
		} else {
			setViewMonth(viewMonth + 1);
		}
	};

	const canGoPrev = (() => {
		const nowMonth = today.getMonth();
		const nowYear = today.getFullYear();
		return viewYear > nowYear || (viewYear === nowYear && viewMonth > nowMonth);
	})();

	const canGoNext = (() => {
		const maxMonth = maxDate.getMonth();
		const maxYear = maxDate.getFullYear();
		return viewYear < maxYear || (viewYear === maxYear && viewMonth < maxMonth);
	})();

	const days: (number | null)[] = [];
	for (let i = 0; i < firstDay; i++) days.push(null);
	for (let d = 1; d <= daysInMonth; d++) days.push(d);

	return (
		<div>
			{/* Header */}
			<div className="flex items-center justify-between mb-2">
				<h5 className="text-[10px] font-bold uppercase tracking-widest text-brand-800">
					Selecciona una fecha
				</h5>
				<div className="flex gap-0.5">
					<button
						type="button"
						onClick={prevMonth}
						disabled={!canGoPrev}
						className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-cloud transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
					>
						<ChevronLeft className="h-3.5 w-3.5 text-brand-600" />
					</button>
					<button
						type="button"
						onClick={nextMonth}
						disabled={!canGoNext}
						className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-cloud transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
					>
						<ChevronRight className="h-3.5 w-3.5 text-brand-600" />
					</button>
				</div>
			</div>

			{/* Month name */}
			<p className="text-sm font-bold font-headline text-brand-900 mb-2 px-0.5">
				{MONTH_NAMES[viewMonth]} {viewYear}
			</p>

			{/* Weekday headers */}
			<div className="grid grid-cols-7 gap-0.5 text-center mb-1">
				{WEEKDAYS.map((w) => (
					<span key={w} className="text-[10px] font-bold text-slate-400 uppercase">
						{w}
					</span>
				))}
			</div>

			{/* Day grid */}
			<div className="grid grid-cols-7 gap-0.5 text-center">
				{days.map((day, idx) => {
					if (day === null) {
						return <span key={`e-${idx}`} className="text-[11px] py-1" />;
					}

					const date = new Date(viewYear, viewMonth, day);
					const isPast = date < today;
					const isFutureLimit = date > maxDate;
					const isSelected = isSameDay(date, selectedDate);
					const isToday = isSameDay(date, today);

					if (isPast || isFutureLimit) {
						return (
							<span
								key={day}
								className="text-[11px] py-1 text-slate-300 cursor-not-allowed"
							>
								{day}
							</span>
						);
					}

					return (
						<button
							key={day}
							type="button"
							onClick={() => onSelectDate(date)}
							className={`text-[11px] py-1 font-medium rounded-md transition-colors ${isSelected
								? "bg-brand-800 text-white shadow-sm shadow-brand-800/30"
								: isToday
									? "text-brand-800 font-bold hover:bg-brand-100"
									: "text-brand-900 hover:bg-brand-100/50"
								}`}
						>
							{day}
						</button>
					);
				})}
			</div>

			{/* Selected date label */}
			<div className="mt-3 pt-3 border-t border-brand-200/30 flex items-center gap-2">
				<div className="w-2 h-2 rounded-full bg-brand-800" />
				<span className="text-[10px] font-bold text-brand-600 uppercase">
					Seleccionado: {selectedDate.getDate()} de {MONTH_NAMES[selectedDate.getMonth()]}
				</span>
			</div>
		</div>
	);
};

/* ─── Group disponibilidad items by eco ─── */
type EcoGroup = {
	id_eco: string;
	nombre: string;
	slotsCount: number;
	especialistas: string[];
};

const groupByEco = (items: DisponibilidadPublicaPorEcoItem[]): EcoGroup[] => {
	const map = new Map<string, EcoGroup>();
	for (const item of items) {
		if (!item.id_eco || !item.eco_nombre) continue;
		const existing = map.get(item.id_eco);
		if (existing) {
			existing.slotsCount++;
			const fullName = `${item.especialista_nombre} ${item.especialista_apellido}`;
			if (!existing.especialistas.includes(fullName)) {
				existing.especialistas.push(fullName);
			}
		} else {
			map.set(item.id_eco, {
				id_eco: item.id_eco,
				nombre: item.eco_nombre,
				slotsCount: 1,
				especialistas: [`${item.especialista_nombre} ${item.especialista_apellido}`],
			});
		}
	}
	return Array.from(map.values());
};

/* ─── Main Component ─── */

const PasoServicio = ({ onNext, onBack }: PasoServicioProps) => {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const [selectedDate, setSelectedDate] = useState<Date>(today);
	const [selectedEcoId, setSelectedEcoId] = useState<string | null>(null);
	const ecoListSectionRef = useRef<HTMLDivElement>(null);

	const fechaStr = toISODate(selectedDate);

	// Fetch availability for the selected date
	const { data: disponibilidad = [], isLoading, isFetching } = useGetDisponibilidadPorFechaQuery(
		{ fecha: fechaStr },
	);
	const { data: allEcos = [] } = useGetEcosQuery();

	// Group by eco
	const ecoGroups = useMemo(() => groupByEco(disponibilidad), [disponibilidad]);
	const selectedGroup = ecoGroups.find((g) => g.id_eco === selectedEcoId) ?? null;

	const canContinue = selectedEcoId != null && selectedGroup != null;

	const handleSelectDate = (d: Date) => {
		setSelectedDate(d);
		setSelectedEcoId(null); // reset eco when date changes
		window.setTimeout(() => {
			ecoListSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
		}, 0);
	};

	const handleSelectEco = (eco: EcoGroup) => {
		setSelectedEcoId(eco.id_eco);
	};

	const handleContinue = () => {
		if (!canContinue || !selectedEcoId || !selectedGroup) return;
		onNext({ id_eco: selectedEcoId, ecoNombre: selectedGroup.nombre, fecha: fechaStr });
	};

	return (
		<div>
			{/* ─── HEADER ─── */}
			<div className="mb-8 lg:mb-12">
				<h2 className="font-headline text-2xl font-extrabold text-brand-900 tracking-tight mb-2 sm:text-3xl lg:text-4xl">
					Tipo de Ecografía
				</h2>
				<p className="text-brand-600 text-base lg:text-base max-w-2xl leading-relaxed">
					Selecciona una fecha y elige el tipo de ecografía que deseas realizarte. Solo se muestran
					los tipos de ecografías con especialistas disponibles para el día seleccionado.
				</p>
			</div>

			{/* ─── GRID: móvil = calendario → tipo de eco → detalles → orientación; desktop = eco+detalles | calendario+orientación ─── */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
				{/* Calendario — primero en móvil */}
				<div className="order-1 lg:col-span-5 lg:col-start-8 lg:row-start-1">
					<div className="lg:sticky lg:top-32">
						<div className="bg-paper rounded-2xl p-4 border border-brand-200/20 shadow-sm">
							<MiniCalendar
								selectedDate={selectedDate}
								onSelectDate={handleSelectDate}
							/>
						</div>
					</div>
				</div>

				{/* Tipo de eco + Detalles de la cita — segundo en móvil */}
				<div
					ref={ecoListSectionRef}
					className="order-2 lg:col-span-7 lg:col-start-1 lg:row-start-1 lg:row-span-2 space-y-6 scroll-mt-24"
				>
					<div className="rounded-xl border border-slate-200 bg-paper/30 p-4">
						<h3 className="mb-4 font-headline text-base font-bold text-brand-900">
							Tipo de eco
						</h3>
						{isLoading || isFetching ? (
							<div className="flex items-center justify-center py-16">
								<div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-800 border-t-transparent" />
							</div>
						) : ecoGroups.length > 0 ? (
							<div className="space-y-3">
								{ecoGroups.map((eco) => {
									const isSelected = selectedEcoId === eco.id_eco;
									const fullEco = allEcos.find((e) => e.id_eco === eco.id_eco);
									const desc = fullEco?.descripcion || getEcoDescription(eco.nombre);
									const iconoOriginal = fullEco?.icono || "Activity";

									let IconComponent = ScanHeart;
									let isImage = false;
									if (iconoOriginal.startsWith("http") || iconoOriginal.startsWith("/uploads")) {
										isImage = true;
									} else {
										const f = PREDEFINED_ICONS.find((p) => p.name === iconoOriginal);
										if (f) IconComponent = f.icon;
									}

									return (
										<button
											key={eco.id_eco}
											type="button"
											onClick={() => handleSelectEco(eco)}
											className={`group flex w-full items-center gap-4 rounded-2xl p-5 text-left transition-all duration-200 lg:gap-6 ${isSelected
												? "border-l-4 border-brand-800 bg-paper shadow-md"
												: "border-l-4 border-transparent bg-paper/50 hover:bg-paper hover:shadow-sm"
												}`}
										>
											<div
												className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-all duration-200 lg:h-16 lg:w-16 overflow-hidden ${isSelected
													? "scale-105 bg-brand-800/10"
													: "bg-cloud group-hover:bg-brand-100"
													}`}
											>
												{isImage ? (
													<img src={iconoOriginal} alt={eco.nombre} className="h-full w-full object-cover" />
												) : (
													<IconComponent
														className={`h-7 w-7 lg:h-8 lg:w-8 ${isSelected ? "text-brand-800" : "text-slate-400 group-hover:text-brand-600"}`}
													/>
												)}
											</div>
											<div className="min-w-0 flex-1">
												<div className="flex flex-wrap items-center justify-between gap-2">
													<h4 className="truncate font-headline text-base font-bold text-brand-900 lg:text-lg">
														{eco.nombre}
													</h4>
													<div className="flex shrink-0 items-center gap-2">
														<span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-800">
															20 min
														</span>
														<span className="hidden rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-800 sm:inline-block">
															{eco.slotsCount} disponible{eco.slotsCount !== 1 ? "s" : ""}
														</span>
														{isSelected ? (
															<Check className="h-5 w-5 text-brand-800" strokeWidth={3} />
														) : (
															<ArrowRight className="h-4 w-4 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
														)}
													</div>
												</div>
												<p className="mt-1 line-clamp-2 text-base leading-snug text-brand-600">
													{desc}
												</p>
												{isSelected && eco.especialistas.length > 0 && (
													<p className="mt-2 text-sm text-brand-500">
														Especialista{eco.especialistas.length > 1 ? "s" : ""}:{" "}
														{eco.especialistas.join(", ")}
													</p>
												)}
											</div>
										</button>
									);
								})}
							</div>
						) : (
							<div className="py-16 text-center">
								<ScanHeart className="mx-auto mb-4 h-12 w-12 text-slate-300" />
								<p className="mb-2 font-headline text-lg font-bold text-brand-900">
									No hay servicios disponibles
								</p>
								<p className="mx-auto max-w-sm text-base text-brand-600">
									No hay especialistas con disponibilidad para el día seleccionado. Intenta seleccionar otra fecha en el
									calendario.
								</p>
							</div>
						)}
					</div>

					<div className="rounded-2xl border border-brand-200/50 bg-slate-50 p-6 lg:p-8 shadow-sm">
						<h5 className="mb-6 text-sm font-bold uppercase tracking-widest text-brand-800">
							Detalles de la cita
						</h5>
						{selectedGroup ? (
							<div className="space-y-5">
								<div>
									<span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
										Ecografía seleccionada
									</span>
									<p className="mt-0.5 font-headline text-lg font-bold text-brand-900">
										{selectedGroup.nombre}
									</p>
								</div>
								<div>
									<span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
										Disponibilidad de especialistas
									</span>
									<div className="mt-1 flex items-center gap-2">
										<div className="h-2 w-2 rounded-full bg-amber-400" />
										<p className="text-base font-medium text-brand-900">
											{selectedGroup.especialistas.length} especialista
											{selectedGroup.especialistas.length > 1 ? "s" : ""} disponible
											{selectedGroup.especialistas.length > 1 ? "s" : ""}
										</p>
									</div>
								</div>
								<div className="border-t border-brand-200/30 pt-4">
									<p className="text-sm leading-relaxed text-brand-600">
										Al continuar, verás los horarios disponibles para esta ecografía con nuestros especialistas.
									</p>
								</div>
							</div>
						) : (
							<div className="py-6 text-center">
								<ScanHeart className="mx-auto mb-3 h-10 w-10 text-slate-300" />
								<p className="text-base font-medium text-slate-400">
									{ecoGroups.length > 0
										? "Selecciona una ecografía para ver los detalles"
										: "Selecciona una fecha con disponibilidad"}
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Orientación — tercero en móvil */}
				<div className="order-3 lg:col-span-5 lg:col-start-8 lg:row-start-2">
					<div className="flex items-start gap-3 rounded-2xl border border-brand-200/20 bg-paper p-5 lg:gap-4">
						<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 lg:h-10 lg:w-10">
							<Info className="h-4 w-4 text-brand-600 lg:h-5 lg:w-5" />
						</div>
						<div>
							<h6 className="text-base font-bold text-brand-900">¿Necesitas orientación?</h6>
							<p className="mt-1 text-sm leading-relaxed text-brand-600">
								Si no estás seguro qué tipo de ecografía necesitas, consulta con tu médico tratante antes de agendar. También puedes enviarnos un mensaje al +584144774526 si requieres alguna asesoría
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* ─── ACTION FOOTER ─── */}
			{/* Mobile: full-width stacked */}
			<div className="mt-8 lg:hidden">
				<button
					type="button"
					onClick={handleContinue}
					disabled={!canContinue}
					className="w-full bg-gradient-to-br from-brand-900 to-brand-800 text-white py-4 rounded-3xl font-headline font-bold text-lg shadow-xl shadow-brand-800/20 active:scale-95 transition-transform duration-200 disabled:opacity-40 disabled:active:scale-100"
				>
					Continuar
				</button>
				<button
					type="button"
					onClick={onBack}
					className="w-full mt-3 py-3 text-brand-800 font-semibold text-base hover:bg-cloud rounded-xl transition-colors"
				>
					Volver al paso anterior
				</button>
			</div>

			{/* Desktop: inline left-right */}
			<div className="hidden lg:flex justify-between items-center mt-12 pb-10">
				<button
					type="button"
					onClick={onBack}
					className="flex items-center gap-2 text-slate-400 font-bold hover:text-brand-900 transition-colors px-6 py-3 rounded-xl text-base"
				>
					<ArrowLeft className="h-4 w-4" />
					<span className="font-headline tracking-tight">Volver</span>
				</button>
				<button
					type="button"
					onClick={handleContinue}
					disabled={!canContinue}
					className="bg-gradient-to-br from-brand-900 to-brand-800 text-white px-10 py-4 rounded-2xl font-headline font-extrabold tracking-tight shadow-xl shadow-brand-800/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 text-base"
				>
					Continuar
					<ArrowRight className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
};

export default PasoServicio;
