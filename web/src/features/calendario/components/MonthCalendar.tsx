import { useMemo } from "react";
import type { Disponibilidad } from "../types";

export type MonthCalendarProps = {
	currentMonth: Date;
	selectedDate: string | null;
	/** Bloques y citas del mes (o lista global filtrada en el padre). */
	bloques: Disponibilidad[];
	onDateClick: (dateKey: string) => void;
	onMonthChange: (newMonth: Date) => void;
	formatHora: (value: string) => string;
	/** Clic en una cita (estado 4); usar stopPropagation en el padre del pill. */
	onCitaClick?: (
		bloque: Disponibilidad,
		anchor: { x: number; y: number },
	) => void;
	/** Si es true, muestra la franja superior con mes y flechas (vista moderador legacy). */
	showMonthNavigation?: boolean;
};

const getLocalDateKey = (date: Date) => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

function fechaKey(b: Disponibilidad): string {
	const raw = b.fecha;
	return raw.includes("T") ? raw.split("T")[0]! : raw.slice(0, 10);
}

function bloquesPorFecha(bloques: Disponibilidad[]) {
	const map = new Map<string, Disponibilidad[]>();
	for (const b of bloques) {
		const fk = fechaKey(b);
		if (!map.has(fk)) map.set(fk, []);
		map.get(fk)!.push(b);
	}
	for (const [, arr] of map) {
		arr.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
	}
	return map;
}

/** Estados de disponibilidad (no citas ni preview) para el fondo de la celda. */
function bloquesDisponibilidadParaColor(list: Disponibilidad[]) {
	return list.filter((b) => {
		const e = Number(b.estado);
		return e === 0 || e === 1 || e === 2 || e === 3;
	});
}

/**
 * Color de fondo del día en vista mes.
 * Prioridad: rechazada > día mixto (cancelado esp. + aprobado/pendiente/cita) naranja >
 * solo cancelaciones (rose) > en espera > aprobada.
 */
function celdaDisponibilidadBg(list: Disponibilidad[]): string {
	const ag = bloquesDisponibilidadParaColor(list);
	if (ag.length === 0) return "";
	if (ag.some((b) => Number(b.estado) === 2)) return "bg-[#F3CFCE]";

	const estados = ag.map((b) => Number(b.estado));
	const tieneCanceladoEsp = estados.some((e) => e === 3);
	const tieneActivoOMixto =
		tieneCanceladoEsp &&
		estados.some((e) => e === 1 || e === 0 || e === 4);
	if (tieneActivoOMixto) return "bg-orange-100/95";

	if (estados.some((e) => e === 3)) return "bg-rose-100/95";
	if (estados.some((e) => e === 0)) return "bg-[#FFFFEC]";
	if (estados.some((e) => e === 1)) return "bg-[#EBF3E7]";
	return "";
}

function pillClasses(estado: number): string {
	if (estado === 4) {
		return "border-l-2 border-sky-600 bg-sky-50 text-sky-900 hover:bg-sky-100/90";
	}
	if (estado === 1) {
		return "border-l-2 border-brand-700 bg-brand-100/70 text-brand-900";
	}
	if (estado === 0) {
		return "border-l-2 border-amber-400 bg-amber-50 text-amber-800";
	}
	if (estado === 2) {
		return "border-l-2 border-red-500 bg-red-50 text-red-800";
	}
	if (estado === -2) {
		return "border border-dashed border-slate-300 bg-slate-50 text-slate-500";
	}
	if (estado === 3) {
		return "border-l-2 border-rose-700 bg-rose-50 text-rose-900 hover:bg-rose-100/90";
	}
	return "border-l-2 border-slate-400 bg-slate-50 text-slate-700";
}

function pillLabel(b: Disponibilidad, formatHora: (v: string) => string): string {
	const t = formatHora(b.hora_inicio);
	if (b.estado === 4) {
		const eco = b.eco_nombre ?? "Cita";
		return `${t} ${eco}`;
	}
	if (b.estado === 0) return `${t} En espera`;
	if (b.estado === 2) return `${t} Rechazada`;
	if (b.estado === 1) {
		const eco = b.eco_nombre ?? "Aprobada";
		return `${t} ${eco}`;
	}
	if (b.estado === -2) return `${t} Propuesta`;
	if (Number(b.estado) === 3) return `${t} Cancelado (esp.)`;
	return `${t}`;
}

const MonthCalendar = ({
	currentMonth,
	selectedDate,
	bloques,
	onDateClick,
	onMonthChange,
	formatHora,
	onCitaClick,
	showMonthNavigation = false,
}: MonthCalendarProps) => {
	const year = currentMonth.getFullYear();
	const month = currentMonth.getMonth();

	const firstDay = new Date(year, month, 1);
	const lastDay = new Date(year, month + 1, 0);
	const startDayOfWeek = firstDay.getDay();
	const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
	const daysInMonth = lastDay.getDate();

	const porFecha = useMemo(() => bloquesPorFecha(bloques), [bloques]);

	const days: Array<{
		day: number;
		dateKey: string;
		isCurrentMonth: boolean;
	}> = [];

	for (let i = adjustedStartDay - 1; i >= 0; i--) {
		const prevMonth = new Date(year, month, -i);
		days.push({
			day: prevMonth.getDate(),
			dateKey: getLocalDateKey(prevMonth),
			isCurrentMonth: false,
		});
	}

	for (let day = 1; day <= daysInMonth; day++) {
		const date = new Date(year, month, day);
		days.push({
			day,
			dateKey: getLocalDateKey(date),
			isCurrentMonth: true,
		});
	}

	const remainingDays = 42 - days.length;
	for (let day = 1; day <= remainingDays; day++) {
		const nextMonth = new Date(year, month + 1, day);
		days.push({
			day: nextMonth.getDate(),
			dateKey: getLocalDateKey(nextMonth),
			isCurrentMonth: false,
		});
	}

	const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

	const monthNames = [
		"Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
		"Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
	];

	const goToPreviousMonth = () => {
		onMonthChange(new Date(year, month - 1, 1));
	};

	const goToNextMonth = () => {
		onMonthChange(new Date(year, month + 1, 1));
	};

	const todayKey = getLocalDateKey(new Date());

	const grid = (
		<>
			<div className="mb-2 grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
				{weekDays.map((d) => (
					<div key={d} className="py-2">
						{d}
					</div>
				))}
			</div>
			<div className="grid grid-cols-7 overflow-hidden rounded-lg border-l border-t border-slate-200/80">
				{days.map(({ day, dateKey, isCurrentMonth }) => {
					const dayList = porFecha.get(dateKey) ?? [];
					const isToday = dateKey === todayKey;
					const isSelected = dateKey === selectedDate;
					const dispBg = isCurrentMonth ? celdaDisponibilidadBg(dayList) : "";
					const isPast = isCurrentMonth && dateKey < todayKey;
					const basePad = !isCurrentMonth
						? "bg-slate-50/30"
						: dispBg || (isPast ? "bg-slate-50/40" : "bg-white");

					return (
						<div
							key={`${dateKey}-${isCurrentMonth}`}
							className={`flex min-h-[120px] flex-col border-b border-r border-slate-200/80 p-2 text-left transition-colors ${basePad} ${
								isCurrentMonth ? "cursor-pointer hover:brightness-[0.99]" : ""
							} ${
								isSelected && isCurrentMonth
									? "z-[1] ring-2 ring-brand-600 ring-inset"
									: ""
							}`}
							onClick={() => isCurrentMonth && onDateClick(dateKey)}
							role="gridcell"
						>
							<span
								className={`text-xs font-bold ${
									!isCurrentMonth
										? "text-slate-300"
										: isToday
											? "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-brand-700 px-1.5 text-paper"
											: "text-slate-500"
								}`}
							>
								{day}
							</span>
							{dayList.length > 0 && (
								<div className="mt-1 flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
									{dayList.slice(0, 4).map((b) => {
										const label = pillLabel(b, formatHora);
										const isCita = b.estado === 4;
										if (isCita && onCitaClick) {
											return (
												<button
													key={b.id_disponibilidad}
													type="button"
													className={`w-full truncate rounded px-1.5 py-0.5 text-left text-[9px] font-bold ${pillClasses(b.estado)}`}
													onClick={(e) => {
														e.stopPropagation();
														onCitaClick(b, { x: e.clientX, y: e.clientY });
													}}
												>
													{label}
												</button>
											);
										}
										if (isCita) {
											return (
												<div
													key={b.id_disponibilidad}
													className={`truncate rounded px-1.5 py-0.5 text-[9px] font-bold ${pillClasses(b.estado)}`}
													onClick={(e) => e.stopPropagation()}
													onKeyDown={(e) => e.stopPropagation()}
													role="presentation"
												>
													{label}
												</div>
											);
										}
										return (
											<div
												key={b.id_disponibilidad}
												className={`truncate rounded px-1.5 py-0.5 text-[9px] font-bold ${pillClasses(b.estado)}`}
												onClick={(e) => e.stopPropagation()}
												onKeyDown={(e) => e.stopPropagation()}
												role="presentation"
											>
												{label}
											</div>
										);
									})}
									{dayList.length > 4 && (
										<span className="text-[9px] font-semibold text-slate-400">
											+{dayList.length - 4} más
										</span>
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</>
	);

	if (showMonthNavigation) {
		return (
			<div className="overflow-x-auto">
				<div className="flex min-w-[560px] items-center justify-between border-b border-mist p-3 sm:p-4">
					<button
						type="button"
						onClick={goToPreviousMonth}
						className="rounded-lg p-2 hover:bg-brand-50"
					>
						<svg className="h-5 w-5 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
					</button>
					<h2 className="text-lg font-semibold text-brand-900">
						{monthNames[month]} {year}
					</h2>
					<button
						type="button"
						onClick={goToNextMonth}
						className="rounded-lg p-2 hover:bg-brand-50"
					>
						<svg className="h-5 w-5 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
						</svg>
					</button>
				</div>
				<div className="p-3 sm:p-4">{grid}</div>
			</div>
		);
	}

	return <div className="w-full min-w-0">{grid}</div>;
};

export default MonthCalendar;
