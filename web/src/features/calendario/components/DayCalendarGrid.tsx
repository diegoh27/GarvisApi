import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Disponibilidad, TimeOption } from "../types";
import { parseTimeToMinutes } from "../utils/slotUtils";
import { cellKey } from "../utils/calendarSegmentUtils";
import { estadoDisponibilidadNum } from "../utils/disponibilidadEstado";
import {
	Ban,
	Clock,
	Lightbulb,
	User,
	AlertCircle,
} from "lucide-react";
import type { DisponibilidadSegmentContext } from "./DisponibilidadBloqueModal";

export type DayCalendarGridProps = {
	dayKey: string;
	timeOptions: TimeOption[];
	bloquesMap: Map<string, Disponibilidad>;
	isEspecialista: boolean;
	minFecha: string;
	cancelingId: string | null;
	highlightSlotKeys: ReadonlySet<string>;
	formatHora: (value: string) => string;
	onCitaClick: (
		bloque: Disponibilidad,
		anchor: { x: number; y: number },
	) => void;
	onDisponibilidadSegmentClick: (ctx: DisponibilidadSegmentContext) => void;
	onRangeSelect: (payload: {
		fechaDesde: string;
		fechaHasta: string;
		horaInicio: string;
		horaFin: string;
	}) => void;
};

function blockSubtitleCita(b: Disponibilidad): string {
	if (estadoDisponibilidadNum(b.estado) !== 4) return "";
	if (b.estado_cita === 3) return "Atendida";
	if (b.estado_pago === 0) return "Pago pendiente";
	if (b.estado_pago === 2) return "Pago rechazado";
	return "Confirmada";
}

function slotTimeLabel(value: string): string {
	const [h, m] = value.split(":");
	return `${String(Number(h)).padStart(2, "0")}:${String(Number(m)).padStart(2, "0")}`;
}

function daySectionLabel(minutesFromMidnight: number): "mañana" | "mediodía" | "tarde" {
	if (minutesFromMidnight < 12 * 60) return "mañana";
	if (minutesFromMidnight < 15 * 60) return "mediodía";
	return "tarde";
}

const DayCalendarGrid = ({
	dayKey,
	timeOptions,
	bloquesMap,
	isEspecialista,
	minFecha,
	cancelingId,
	highlightSlotKeys,
	formatHora,
	onCitaClick,
	onDisponibilidadSegmentClick,
	onRangeSelect,
}: DayCalendarGridProps) => {
	const [dragging, setDragging] = useState(false);
	const [dragPreview, setDragPreview] = useState<{
		minSlot: number;
		maxSlot: number;
	} | null>(null);
	const dragStartRef = useRef<{ slotIdx: number } | null>(null);
	const lastEnterRef = useRef<{ slotIdx: number } | null>(null);

	const dragSelectionTimeLabel = useMemo(() => {
		if (!dragPreview) return "";
		const hvStart = timeOptions[dragPreview.minSlot]?.value;
		const hvEnd = timeOptions[dragPreview.maxSlot]?.value;
		if (!hvStart || !hvEnd) return "";
		const endMin = parseTimeToMinutes(hvEnd) + 20;
		const horaEndStr = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}:00`;
		return `${formatHora(hvStart)} – ${formatHora(horaEndStr)}`;
	}, [dragPreview, timeOptions, formatHora]);

	const isSlotOccupied = useCallback(
		(dk: string, hourValue: string) => {
			return bloquesMap.has(cellKey(dk, hourValue));
		},
		[bloquesMap],
	);

	const computeRangeSingleDay = useCallback(
		(s0: number, s1: number) => {
			const minS = Math.min(s0, s1);
			const maxS = Math.max(s0, s1);
			if (dayKey < minFecha) return null;
			const keys: string[] = [];
			for (let s = minS; s <= maxS; s += 1) {
				const hv = timeOptions[s]?.value;
				if (!hv) continue;
				if (isSlotOccupied(dayKey, hv)) continue;
				keys.push(cellKey(dayKey, hv));
			}
			if (keys.length === 0) return null;
			const parsed = keys.map((k) => {
				const [, hh] = k.split("|");
				return { t: parseTimeToMinutes(hh!) };
			});
			let minT = Infinity;
			let maxT = -Infinity;
			for (const p of parsed) {
				minT = Math.min(minT, p.t);
				maxT = Math.max(maxT, p.t);
			}
			const horaInicio = `${String(Math.floor(minT / 60)).padStart(2, "0")}:${String(minT % 60).padStart(2, "0")}:00`;
			const endSlotMin = maxT + 20;
			const horaFin = `${String(Math.floor(endSlotMin / 60)).padStart(2, "0")}:${String(endSlotMin % 60).padStart(2, "0")}:00`;
			return {
				fechaDesde: dayKey,
				fechaHasta: dayKey,
				horaInicio,
				horaFin,
			};
		},
		[dayKey, timeOptions, isSlotOccupied, minFecha],
	);

	const finishDrag = useCallback(() => {
		const start = dragStartRef.current;
		const end = lastEnterRef.current;
		dragStartRef.current = null;
		lastEnterRef.current = null;
		setDragging(false);
		setDragPreview(null);
		if (!start || !end) return;
		const range = computeRangeSingleDay(start.slotIdx, end.slotIdx);
		if (range) onRangeSelect(range);
	}, [computeRangeSingleDay, onRangeSelect]);

	useEffect(() => {
		if (!dragging) return;
		const up = () => finishDrag();
		document.addEventListener("pointerup", up);
		document.addEventListener("pointercancel", up);
		return () => {
			document.removeEventListener("pointerup", up);
			document.removeEventListener("pointercancel", up);
		};
	}, [dragging, finishDrag]);

	const onPointerDown = (e: React.PointerEvent, slotIdx: number) => {
		if (!isEspecialista) return;
		const hv = timeOptions[slotIdx]?.value;
		if (!hv) return;
		if (dayKey < minFecha) return;
		if (isSlotOccupied(dayKey, hv)) return;
		e.preventDefault();
		dragStartRef.current = { slotIdx };
		lastEnterRef.current = { slotIdx };
		setDragPreview({ minSlot: slotIdx, maxSlot: slotIdx });
		setDragging(true);
	};

	const onPointerEnter = (slotIdx: number) => {
		if (!dragging || !dragStartRef.current) return;
		const hv = timeOptions[slotIdx]?.value;
		if (!hv) return;
		if (isSlotOccupied(dayKey, hv)) return;
		lastEnterRef.current = { slotIdx };
		const anchor = dragStartRef.current;
		const minSlot = Math.min(anchor.slotIdx, slotIdx);
		const maxSlot = Math.max(anchor.slotIdx, slotIdx);
		setDragPreview({ minSlot, maxSlot });
	};

	/** Rango solo para este bloque de 20 min (vista Día: un slot = una tarjeta). */
	const rangeForSlot20 = useCallback(
		(hv: string) => {
			const endMin = parseTimeToMinutes(hv) + 20;
			const horaEndStr = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}:00`;
			return `${formatHora(hv)} – ${formatHora(horaEndStr)}`;
		},
		[formatHora],
	);

	const citaTitle = (b: Disponibilidad) => {
		const name = [b.paciente_nombre, b.paciente_apellido].filter(Boolean).join(" ").trim();
		const eco = b.eco_nombre ?? "Cita";
		if (name) return `Cita: ${name} — ${eco}`;
		return `Cita: ${eco}`;
	};

	const renderOccupiedRow = (slotIdx: number, b: Disponibilidad) => {
		const hv = timeOptions[slotIdx].value;
		const rangeFull = rangeForSlot20(hv);
		const endMin = parseTimeToMinutes(hv) + 20;
		const horaFinSeg = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}:00`;
		const canceling = cancelingId === b.id_disponibilidad;
		const est = estadoDisponibilidadNum(b.estado);
		const isCita = est === 4;

		if (canceling) {
			return (
				<div className="flex min-h-[56px] items-center rounded-2xl border border-dashed border-slate-300 bg-slate-100 px-4 py-2">
					<span className="w-12 text-right text-xs font-bold text-slate-400">
						{slotTimeLabel(hv)}
					</span>
					<div className="ml-4 flex flex-1 items-center justify-center text-[10px] text-slate-500">
						Cancelando…
					</div>
				</div>
			);
		}

		const inner = (() => {
			if (isCita) {
				const sub = blockSubtitleCita(b);
				return (
					<div className="flex min-h-[52px] flex-1 items-center justify-between gap-2 rounded-xl bg-[#006965] px-4 py-2 text-white shadow-md shadow-[#006965]/25">
						<div className="flex min-w-0 items-center gap-2">
							<User className="h-4 w-4 shrink-0 opacity-95" strokeWidth={2} />
							<span className="truncate text-[11px] font-bold leading-snug">{citaTitle(b)}</span>
						</div>
						<div className="flex shrink-0 flex-col items-end gap-0.5">
							<span className="text-[10px] font-semibold opacity-90">{rangeFull}</span>
							{sub ? <span className="text-[9px] font-medium text-white/85">{sub}</span> : null}
						</div>
					</div>
				);
			}
			if (est === -2) {
				return (
					<div className="flex min-h-[44px] flex-1 items-center justify-between rounded-xl border border-dashed border-slate-400 bg-slate-100 px-4 py-2 text-slate-600">
						<div className="flex items-center gap-2">
							<Lightbulb className="h-4 w-4 text-teal-700/70" />
							<span className="text-[11px] font-bold">Propuesta · {b.eco_nombre ?? "Eco"}</span>
						</div>
						<span className="text-[10px] text-slate-500">{rangeFull}</span>
					</div>
				);
			}
			if (est === 0) {
				return (
					<div className="flex min-h-[44px] flex-1 items-center justify-between rounded-xl border-l-4 border-amber-400 bg-amber-50 px-4 py-2 shadow-sm">
						<div className="flex min-w-0 items-center gap-2">
							<Clock className="h-4 w-4 shrink-0 text-amber-600" />
							<span className="truncate text-[11px] font-bold text-amber-900">
								En espera · {b.eco_nombre ?? "Eco"}
							</span>
						</div>
						<span className="text-[10px] font-medium text-amber-800/90">{rangeFull}</span>
					</div>
				);
			}
			if (est === 1) {
				return (
					<div className="flex min-h-[52px] flex-1 items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 pl-5 shadow-sm [border-left-width:4px] [border-left-color:#059669]">
						<div className="min-w-0">
							<p className="text-[11px] font-extrabold leading-tight text-emerald-950">Aprobada</p>
							<p className="mt-0.5 text-[10px] font-medium leading-snug text-emerald-900/90">
								{b.eco_nombre ?? "Eco"}
							</p>
						</div>
						<span className="shrink-0 text-[10px] text-emerald-900/80">{rangeFull}</span>
					</div>
				);
			}
			if (est === 2) {
				return (
					<div className="flex min-h-[44px] flex-1 items-center justify-between rounded-xl border border-red-100 bg-red-50 px-4 py-2 pl-5 shadow-sm [border-left-width:4px] [border-left-color:#dc2626]">
						<div className="flex min-w-0 items-center gap-2">
							<AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
							<span className="truncate text-[11px] font-bold text-red-900">
								Rechazada · {b.eco_nombre ?? "Eco"}
							</span>
						</div>
						<span className="text-[10px] text-red-800/90">{rangeFull}</span>
					</div>
				);
			}
			if (est === 3) {
				return (
					<div className="flex min-h-[44px] flex-1 items-center justify-between gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-2 pl-5 shadow-sm [border-left-width:4px] [border-left-color:#be123c]">
						<div className="flex min-w-0 items-center gap-2">
							<Ban className="h-4 w-4 shrink-0 text-rose-700" />
							<div className="min-w-0">
								<p className="text-[11px] font-extrabold leading-tight text-red-950">
									Cancelado por especialista
								</p>
								<p className="mt-0.5 text-[10px] font-medium leading-snug text-red-900/85">
									{b.eco_nombre ?? "Eco"}
								</p>
							</div>
						</div>
						<span className="shrink-0 text-[10px] text-red-900/80">{rangeFull}</span>
					</div>
				);
			}
			return (
				<div className="flex min-h-[44px] flex-1 items-center rounded-xl border border-slate-300 bg-slate-200 px-4 py-2 text-[11px] text-slate-600">
					{b.eco_nombre ?? "—"} · {rangeFull}
				</div>
			);
		})();

		return (
			<button
				type="button"
				className="group flex w-full min-h-[56px] items-center gap-4 rounded-2xl px-2 text-left sm:px-4"
				onClick={(e) => {
					if (!isEspecialista) return;
					if (!Number.isFinite(est)) return;
					if (est === -2) return;
					if (isCita) {
						onCitaClick(b, { x: e.clientX, y: e.clientY });
						return;
					}
					if (est === 2 || est === 4) return;
					onDisponibilidadSegmentClick({
						bloque: b,
						dayKey,
						startSlot: slotIdx,
						endSlot: slotIdx,
						horaInicio: hv,
						horaFin: horaFinSeg,
					});
				}}
			>
				<span className="w-12 shrink-0 text-right text-xs font-bold text-slate-400 group-hover:text-[#006965]">
					{slotTimeLabel(hv)}
				</span>
				{inner}
			</button>
		);
	};

	const rowsWithSections = useMemo(() => {
		const items: Array<
			| { type: "section"; title: "Mañana" | "Mediodía" | "Tarde"; key: string }
			| { type: "slot"; slotIdx: number }
		> = [];
		let lastSec: "mañana" | "mediodía" | "tarde" | null = null;
		for (let i = 0; i < timeOptions.length; i += 1) {
			const hv = timeOptions[i].value;
			const mins = parseTimeToMinutes(hv);
			const sec = daySectionLabel(mins);
			if (sec !== lastSec) {
				lastSec = sec;
				const title: "Mañana" | "Mediodía" | "Tarde" =
					sec === "mañana" ? "Mañana" : sec === "mediodía" ? "Mediodía" : "Tarde";
				items.push({ type: "section", title, key: `sec-${title}-${i}` });
			}
			items.push({ type: "slot", slotIdx: i });
		}
		return items;
	}, [timeOptions]);

	return (
		<div className="flex h-[min(750px,78vh)] flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[#faf9f9] shadow-sm">
			<div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/60 bg-white/90 px-4 py-4 backdrop-blur-md sm:px-6">
				<div className="flex items-center gap-3 sm:gap-4">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#006965]/10 text-[#006965]">
						<Clock className="h-5 w-5" strokeWidth={2} />
					</div>
					<div>
						<h4 className="font-headline text-sm font-bold text-slate-900 sm:text-base">
							Horario de Atención
						</h4>
						<p className="text-[11px] text-slate-500 sm:text-xs">
							Bloques de 20 minutos establecidos
						</p>
					</div>
				</div>
			</div>

			<div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-6">
				<div className="space-y-2">
					{rowsWithSections.map((item) => {
						if (item.type === "section") {
							return (
								<h5
									key={item.key}
									className="mb-2 ml-1 mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 first:mt-0"
								>
									{item.title}
								</h5>
							);
						}

						const i = item.slotIdx;
						const hv = timeOptions[i].value;
						const ck = cellKey(dayKey, hv);
						const occ = isSlotOccupied(dayKey, hv);
						const isPast = dayKey < minFecha;
						const highlighted = highlightSlotKeys.has(ck);
						const inDragRange =
							dragging &&
							dragPreview &&
							!occ &&
							i >= dragPreview.minSlot &&
							i <= dragPreview.maxSlot;

						if (occ) {
							const b = bloquesMap.get(ck)!;
							return (
								<div key={ck} className="space-y-1">
									{renderOccupiedRow(i, b)}
								</div>
							);
						}

						return (
							<div
								key={ck}
								className={`group flex min-h-[56px] items-center gap-3 rounded-2xl px-2 transition-colors sm:gap-4 sm:px-4 ${
									isPast ? "opacity-60" : "hover:bg-slate-50/90"
								}`}
							>
								<span
									className={`w-12 shrink-0 text-right text-xs font-bold ${
										isPast ? "text-slate-300" : "text-slate-400 group-hover:text-[#006965]"
									}`}
								>
									{slotTimeLabel(hv)}
								</span>
								<div
									role="presentation"
									className={`flex h-11 flex-1 cursor-crosshair items-center rounded-xl border px-4 transition-all ${
										isPast
											? "cursor-not-allowed border-slate-100 bg-[#EEEEEE] text-slate-400"
											: inDragRange
												? "border-[#006965] bg-[#006965] text-white shadow-md shadow-[#006965]/30"
												: highlighted
													? "border-brand-400/50 bg-brand-100/50 ring-1 ring-brand-500/20"
													: "border-transparent bg-[#f4f3f3] hover:border-[#006965]/25"
									}`}
									onPointerDown={(e) => onPointerDown(e, i)}
									onPointerEnter={() => onPointerEnter(i)}
								>
									<span
										className={`text-[11px] font-medium ${
											inDragRange ? "font-semibold text-white" : "text-slate-400"
										}`}
									>
										{inDragRange ? dragSelectionTimeLabel : "Espacio Disponible"}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{dragging && dragPreview && (
				<div className="pointer-events-none border-t border-slate-100 bg-[#006965]/95 px-4 py-2 text-center sm:hidden">
					<span className="text-xs font-semibold text-white">{dragSelectionTimeLabel}</span>
				</div>
			)}

			<div className="flex flex-wrap items-center justify-center gap-4 border-t border-slate-100 bg-slate-50 px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-slate-400 sm:gap-8">
				<div className="flex items-center gap-2">
					<span className="h-3 w-3 rounded-full bg-[#006965]" /> Cita
				</div>
				<div className="flex items-center gap-2">
					<span className="h-3 w-3 rounded-full bg-emerald-500" /> Aprobada
				</div>
				<div className="flex items-center gap-2">
					<span className="h-3 w-3 rounded-full bg-amber-400" /> En espera
				</div>
				<div className="flex items-center gap-2">
					<span className="h-3 w-3 rounded-full bg-red-500" /> Rechazada
				</div>
				<div className="flex items-center gap-2">
					<span className="h-3 w-3 rounded-full bg-rose-600" /> Cancelado (esp.)
				</div>
				<div className="flex items-center gap-2">
					<span className="h-3 w-3 rounded-full border border-slate-300 bg-[#f4f3f3]" /> Libre
				</div>
			</div>
		</div>
	);
};

export default DayCalendarGrid;
