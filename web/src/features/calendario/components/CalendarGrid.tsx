import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Disponibilidad, TimeOption } from "../types";
import type { DisponibilidadSegmentContext } from "./DisponibilidadBloqueModal";
import { parseTimeToMinutes } from "../utils/slotUtils";
import { buildMergedSegments, cellKey } from "../utils/calendarSegmentUtils";
import { estadoDisponibilidadNum } from "../utils/disponibilidadEstado";
import { Ban, Check, Lightbulb, AlertCircle, User } from "lucide-react";

const SLOT_PX = 22;

type CalendarGridProps = {
	dayLabels: string[];
	dayKeys: string[];
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
	/** Clic en bloque sin cita: pendiente, aprobada, cancelada o solicitud macro. */
	onDisponibilidadSegmentClick: (ctx: DisponibilidadSegmentContext) => void;
	onRangeSelect: (payload: {
		fechaDesde: string;
		fechaHasta: string;
		horaInicio: string;
		horaFin: string;
	}) => void;
};

function blockSubtitle(b: Disponibilidad): string {
	if (estadoDisponibilidadNum(b.estado) === 4) {
		if (b.estado_cita === 3) return "Atendida";
		if (b.estado_pago === 0) return "Pago pendiente";
		if (b.estado_pago === 2) return "Pago rechazado";
		return "Confirmada";
	}
	if (b.estado === -2) return "Borrador";
	if (b.estado === 0) return "En espera de aprobación";
	if (b.estado === 1) return "Aprobada";
	return "";
}

const CalendarGrid = ({
	dayLabels,
	dayKeys,
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
}: CalendarGridProps) => {
	const [dragging, setDragging] = useState(false);
	const [dragPreview, setDragPreview] = useState<{
		minDayIdx: number;
		maxDayIdx: number;
		minSlot: number;
		maxSlot: number;
	} | null>(null);
	const dragStartRef = useRef<{ dayIdx: number; slotIdx: number } | null>(null);
	const lastEnterRef = useRef<{ dayIdx: number; slotIdx: number } | null>(null);
	const totalHeight = timeOptions.length * SLOT_PX;

	const dragSelectionTimeLabel = useMemo(() => {
		if (!dragPreview) return "";
		const hvStart = timeOptions[dragPreview.minSlot]?.value;
		const hvEnd = timeOptions[dragPreview.maxSlot]?.value;
		if (!hvStart || !hvEnd) return "";
		const endMin = parseTimeToMinutes(hvEnd) + 20;
		const horaEndStr = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}:00`;
		return `${formatHora(hvStart)} – ${formatHora(horaEndStr)}`;
	}, [dragPreview, timeOptions, formatHora]);

	const hourRows = useMemo(() => {
		const rows: { label: string; slotIndex: number }[] = [];
		for (let i = 0; i < timeOptions.length; i += 1) {
			const m = parseTimeToMinutes(timeOptions[i].value);
			if (m % 60 === 0) {
				rows.push({ label: timeOptions[i].label, slotIndex: i });
			}
		}
		return rows;
	}, [timeOptions]);

	const isSlotOccupied = useCallback(
		(dateKey: string, hourValue: string) => {
			return bloquesMap.has(cellKey(dateKey, hourValue));
		},
		[bloquesMap],
	);

	const computeRangeFromRect = useCallback(
		(
			d0: number,
			s0: number,
			d1: number,
			s1: number,
		): { fechaDesde: string; fechaHasta: string; horaInicio: string; horaFin: string } | null => {
			const minD = Math.min(d0, d1);
			const maxD = Math.max(d0, d1);
			const minS = Math.min(s0, s1);
			const maxS = Math.max(s0, s1);
			const keys: string[] = [];
			for (let d = minD; d <= maxD; d += 1) {
				const dk = dayKeys[d];
				if (!dk) continue;
				if (dk < minFecha) continue;
				for (let s = minS; s <= maxS; s += 1) {
					const hv = timeOptions[s]?.value;
					if (!hv) continue;
					if (isSlotOccupied(dk, hv)) continue;
					keys.push(cellKey(dk, hv));
				}
			}
			if (keys.length === 0) return null;

			const parsed = keys.map((k) => {
				const [fd, hh] = k.split("|");
				return { fd: fd!, hh: hh!, t: parseTimeToMinutes(hh!) };
			});
			parsed.sort((a, b) => a.fd.localeCompare(b.fd) || a.t - b.t);
			const fechaDesde = parsed[0].fd;
			const fechaHasta = parsed[parsed.length - 1].fd;
			let minT = Infinity;
			let maxT = -Infinity;
			for (const p of parsed) {
				minT = Math.min(minT, p.t);
				maxT = Math.max(maxT, p.t);
			}
			const horaInicio = `${String(Math.floor(minT / 60)).padStart(2, "0")}:${String(minT % 60).padStart(2, "0")}:00`;
			const endSlotMin = maxT + 20;
			const horaFin = `${String(Math.floor(endSlotMin / 60)).padStart(2, "0")}:${String(endSlotMin % 60).padStart(2, "0")}:00`;
			return { fechaDesde, fechaHasta, horaInicio, horaFin };
		},
		[dayKeys, timeOptions, isSlotOccupied, minFecha],
	);

	const finishDrag = useCallback(() => {
		const start = dragStartRef.current;
		const end = lastEnterRef.current;
		dragStartRef.current = null;
		lastEnterRef.current = null;
		setDragging(false);
		setDragPreview(null);
		if (!start || !end) return;
		const range = computeRangeFromRect(
			start.dayIdx,
			start.slotIdx,
			end.dayIdx,
			end.slotIdx,
		);
		if (range) onRangeSelect(range);
	}, [computeRangeFromRect, onRangeSelect]);

	useEffect(() => {
		if (!dragging) return;
		const up = () => {
			finishDrag();
		};
		document.addEventListener("pointerup", up);
		document.addEventListener("pointercancel", up);
		return () => {
			document.removeEventListener("pointerup", up);
			document.removeEventListener("pointercancel", up);
		};
	}, [dragging, finishDrag]);

	const onPointerDown = (
		e: React.PointerEvent,
		dayIdx: number,
		slotIdx: number,
	) => {
		if (!isEspecialista) return;
		const dk = dayKeys[dayIdx];
		const hv = timeOptions[slotIdx]?.value;
		if (!dk || !hv) return;
		if (dk < minFecha) return;
		if (isSlotOccupied(dk, hv)) return;
		e.preventDefault();
		dragStartRef.current = { dayIdx, slotIdx };
		lastEnterRef.current = { dayIdx, slotIdx };
		setDragPreview({
			minDayIdx: dayIdx,
			maxDayIdx: dayIdx,
			minSlot: slotIdx,
			maxSlot: slotIdx,
		});
		setDragging(true);
	};

	const onPointerEnter = (dayIdx: number, slotIdx: number) => {
		if (!dragging || !dragStartRef.current) return;
		const dk = dayKeys[dayIdx];
		const hv = timeOptions[slotIdx]?.value;
		if (!dk || !hv) return;
		if (isSlotOccupied(dk, hv)) return;
		lastEnterRef.current = { dayIdx, slotIdx };
		const anchor = dragStartRef.current;
		const minDayIdx = Math.min(anchor.dayIdx, dayIdx);
		const maxDayIdx = Math.max(anchor.dayIdx, dayIdx);
		const minSlot = Math.min(anchor.slotIdx, slotIdx);
		const maxSlot = Math.max(anchor.slotIdx, slotIdx);
		setDragPreview({ minDayIdx, maxDayIdx, minSlot, maxSlot });
	};

	const renderBlockCard = (b: Disponibilidad, horaStart: string, horaEnd: string, slots: number) => {
		const rangeText = `${formatHora(horaStart)} – ${formatHora(horaEnd)}`;
		const sub = blockSubtitle(b);
		const est = estadoDisponibilidadNum(b.estado);
		const isCita = est === 4;
		const isPreview = est === -2;

		const isLarge = slots > 1;

		if (isLarge) {
			if (isPreview) {
				return (
					<div className="pointer-events-auto flex h-full w-full min-h-[40px] flex-col overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white p-3 text-left shadow-sm leading-snug">
						<div className="flex items-start justify-between gap-2">
							<span className="text-base font-semibold text-slate-800">{rangeText}</span>
							<Lightbulb className="h-4 w-4 shrink-0 text-teal-600/70" />
						</div>
						<p className="mt-2 text-base font-medium text-slate-700">{b.eco_nombre ?? "Vista previa"}</p>
						<p className="mt-0.5 text-base text-slate-500">{sub}</p>
					</div>
				);
			}

			if (est === 0) {
				return (
					<div className="pointer-events-auto flex h-full w-full min-h-[40px] flex-col overflow-hidden rounded-lg border border-dashed border-amber-300 bg-amber-50/80 p-3 text-left leading-snug shadow-sm">
						<div className="flex items-start justify-between gap-2">
							<span className="text-base font-semibold text-slate-800">{rangeText}</span>
							<Lightbulb className="h-4 w-4 shrink-0 text-amber-600" />
						</div>
						<p className="mt-2 text-base font-medium text-slate-800">{b.eco_nombre ?? "Eco"}</p>
						<p className="mt-0.5 text-base font-medium text-amber-800">En espera de aprobación</p>
					</div>
				);
			}

			if (est === 1) {
				return (
					<div className="pointer-events-auto flex h-full w-full min-h-[40px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-[#F0F9F9] border-l-[6px] border-l-teal-700 p-3 text-left shadow-sm leading-snug">
						<div className="flex items-start justify-between gap-2">
							<span className="text-base font-semibold leading-snug text-slate-900">{rangeText}</span>
							<Check className="h-4 w-4 shrink-0 text-teal-700" strokeWidth={2.5} />
						</div>
						<p className="mt-2 text-base font-medium leading-snug text-slate-600">
							{b.eco_nombre ?? "Eco"}
						</p>
						<p className="mt-1 text-base font-medium leading-snug text-teal-600">Aprobada</p>
					</div>
				);
			}

			if (isCita) {
				const pacienteStr = [b.paciente_nombre, b.paciente_apellido].filter(Boolean).join(" ").trim() || "Paciente";
				return (
					<div className="pointer-events-auto flex h-full w-full min-h-[40px] flex-col overflow-hidden rounded-lg bg-[#006965] border border-[#006965] p-3 text-left shadow-sm leading-snug text-white">
						<div className="flex items-start justify-between gap-2">
							<span className="text-base font-bold leading-snug">{rangeText}</span>
							<User className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2.5} />
						</div>
						<p className="mt-2 text-base font-semibold leading-snug truncate">{pacienteStr}</p>
						<p className="mt-1 text-base font-medium text-white/80 truncate">{b.eco_nombre ?? "Cita"}</p>
					</div>
				);
			}

			if (est === 2) {
				return (
					<div className="pointer-events-auto flex h-full w-full min-h-[40px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-red-50 border-l-[6px] border-l-red-500 p-3 text-left shadow-sm leading-snug">
						<div className="flex items-start justify-between gap-1">
							<span className="text-base font-semibold text-red-900">{rangeText}</span>
							<AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
						</div>
						<p className="mt-1 text-base font-medium text-red-950">Rechazada</p>
					</div>
				);
			}

			if (est === 3) {
				return (
					<div className="pointer-events-auto flex h-full w-full min-h-[40px] flex-col overflow-hidden rounded-lg border border-rose-200 bg-rose-50 p-3 text-left shadow-sm leading-snug border-l-[6px] border-l-rose-700">
						<div className="flex items-start justify-between gap-1">
							<span className="text-base font-semibold text-rose-950">{rangeText}</span>
							<Ban className="h-4 w-4 shrink-0 text-rose-800" strokeWidth={2} />
						</div>
						<p className="mt-2 text-base font-medium text-rose-950">Cancelado por especialista</p>
						{b.eco_nombre ? (
							<p className="mt-0.5 text-base text-rose-900/85">{b.eco_nombre}</p>
						) : null}
					</div>
				);
			}
		}

		const genericTitleStr = `${b.eco_nombre ?? "Eco"} (${sub || 'Borrador'})`;

		const renderCompact = (bgClass: string, textClass: string, Icon: any, titleStr: string) => (
			<div
				title={titleStr}
				className={`pointer-events-auto flex h-full w-full items-center justify-start overflow-hidden rounded px-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.06)] ${bgClass} ${textClass}`}
			>
				<span className="truncate whitespace-nowrap text-[10px] font-semibold leading-none flex items-center gap-1">
					<Icon className="h-2.5 w-2.5 shrink-0" strokeWidth={2.5} />
					{rangeText}
				</span>
			</div>
		);

		if (isCita) {
			const pacienteStr = [b.paciente_nombre, b.paciente_apellido].filter(Boolean).join(" ").trim() || "Paciente";
			const ecoStr = b.eco_nombre ?? "Cita";
			const titleStr = `${pacienteStr} — ${ecoStr} (${sub})`;
			return renderCompact("bg-[#006965]", "text-white", User, titleStr);
		}

		if (isPreview) return renderCompact("bg-white border border-dashed border-slate-300", "text-slate-600", Lightbulb, genericTitleStr);
		if (est === 0) return renderCompact("bg-amber-50 border-l-[3px] border-amber-400", "text-amber-800", Lightbulb, genericTitleStr);
		if (est === 1) return renderCompact("bg-[#F0F9F9] border-l-[3px] border-teal-600", "text-teal-700", Check, genericTitleStr);
		if (est === 2) return renderCompact("bg-red-50 border-l-[3px] border-red-500", "text-red-900", AlertCircle, genericTitleStr);
		if (est === 3) return renderCompact("bg-rose-50 border-l-[3px] border-rose-700", "text-rose-900", Ban, genericTitleStr);

		return renderCompact("bg-mist/50", "text-slate-800", Check, rangeText); // fallback
	};

	return (
		<div className="overflow-hidden rounded-3xl border border-mist/80 bg-paper shadow-sm">
			<div className="mb-4 px-1">
				<div className="grid w-full grid-cols-[72px_repeat(7,minmax(0,1fr))] gap-0 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
					<div />
					{dayLabels.map((label) => (
						<div key={label} className="truncate px-0.5">
							{label}
						</div>
					))}
				</div>
			</div>
			<div className="relative max-h-[600px] overflow-y-auto border-t border-mist/60">
				<div className="relative flex" style={{ minHeight: totalHeight }}>
					<div
						className="relative shrink-0 border-r border-mist/40"
						style={{ width: 72 }}
					>
						{hourRows.map((hr) => (
							<div
								key={hr.slotIndex}
								className="absolute left-0 right-1 text-right text-[10px] leading-none text-slate-400"
								style={{ top: hr.slotIndex * SLOT_PX }}
							>
								<span className="inline-block pt-0.5">{hr.label}</span>
							</div>
						))}
					</div>

					<div
						className="relative min-w-0 flex-1"
						style={{ height: totalHeight }}
					>
						{timeOptions.map((_, idx) => (
							<div
								key={idx}
								className="pointer-events-none absolute inset-x-0 border-b border-slate-100"
								style={{ top: idx * SLOT_PX, height: SLOT_PX }}
							/>
						))}

						<div className="absolute inset-0 flex">
							{dayKeys.map((dayKey, dayIdx) => {
								const segments = buildMergedSegments(dayKey, timeOptions, bloquesMap);
								const occupied = new Set<string>();
								for (const seg of segments) {
									for (let s = seg.startSlot; s <= seg.endSlot; s += 1) {
										occupied.add(cellKey(dayKey, timeOptions[s].value));
									}
								}

								return (
									<div
										key={dayKey}
										className={`relative flex-1 border-l border-slate-100 ${
											dayKey < minFecha ? "bg-[#EEEEEE]" : "bg-white"
										}`}
										style={{ minHeight: totalHeight }}
									>
										{timeOptions.map((slot, slotIdx) => {
											const dk = dayKey;
											const hv = slot.value;
											const ck = cellKey(dk, hv);
											const occ = occupied.has(ck);
											const isPast = dk < minFecha;
											const highlighted = highlightSlotKeys.has(ck);
											const inDragRange =
												dragging &&
												dragPreview &&
												dayIdx >= dragPreview.minDayIdx &&
												dayIdx <= dragPreview.maxDayIdx &&
												slotIdx >= dragPreview.minSlot &&
												slotIdx <= dragPreview.maxSlot;
											if (occ) return null;
											return (
												<div
													key={ck}
													role="presentation"
													className={`absolute left-1 right-1 rounded-sm transition-colors ${
														isPast
															? "cursor-not-allowed bg-[#EEEEEE]"
															: isEspecialista
																? `cursor-crosshair ${
																		inDragRange
																			? "bg-transparent"
																			: !dragging
																				? "hover:bg-brand-100/35"
																				: ""
																	}`
																: ""
														} ${
															highlighted &&
															!isPast &&
															!(dragging && inDragRange)
																? "bg-brand-200/45 ring-1 ring-inset ring-brand-500/30"
																: ""
														}`}
													style={{
														top: slotIdx * SLOT_PX,
														height: SLOT_PX,
														zIndex: 1,
														pointerEvents: isPast ? "none" : "auto",
													}}
													onPointerDown={(e) => onPointerDown(e, dayIdx, slotIdx)}
													onPointerEnter={() => onPointerEnter(dayIdx, slotIdx)}
												/>
											);
										})}

										{dragging &&
											dragPreview &&
											dayIdx >= dragPreview.minDayIdx &&
											dayIdx <= dragPreview.maxDayIdx && (
												<div
													className="pointer-events-none absolute left-1 right-1 z-[25] flex min-h-[22px] flex-col justify-start overflow-hidden rounded-md bg-[#006965] px-2 py-1 shadow-md ring-1 ring-black/15"
													style={{
														top: dragPreview.minSlot * SLOT_PX,
														height: Math.max(
															(dragPreview.maxSlot - dragPreview.minSlot + 1) *
																SLOT_PX,
															22,
														),
													}}
													aria-hidden
												>
													<span className="select-none text-sm font-semibold leading-snug text-white">
														{dragSelectionTimeLabel}
													</span>
												</div>
											)}

										{segments.map((seg) => {
											const top = seg.startSlot * SLOT_PX;
											const h = (seg.endSlot - seg.startSlot + 1) * SLOT_PX;
											const b = seg.bloque;
											const hv0 = timeOptions[seg.startSlot].value;
											const hv1 = timeOptions[seg.endSlot].value;
											const endMin = parseTimeToMinutes(hv1) + 20;
											const horaEndStr = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}:00`;
											const estSeg = estadoDisponibilidadNum(b.estado);
											const isCita = estSeg === 4;
											const canceling = cancelingId === b.id_disponibilidad;
											/** Por encima de celdas (z-1) y del preview de arrastre (z-25); por debajo del popover fijo (z-200 en CalendarioPage). */
											const stackZ = 100 + seg.startSlot;

											return (
												<div
													key={`${dayKey}-${seg.startSlot}-${b.id_disponibilidad}`}
													className="absolute left-1 right-1 overflow-hidden rounded-md"
													style={{ top, height: h, zIndex: stackZ }}
												>
													<button
														type="button"
														className="relative z-10 h-full w-full text-left"
														onClick={(e) => {
															if (!isEspecialista) return;
															if (!Number.isFinite(estSeg)) return;
															if (estSeg === -2) return;
															if (isCita) {
																onCitaClick(b, { x: e.clientX, y: e.clientY });
																return;
															}
															if (estSeg === 2 || estSeg === 4) return;
															onDisponibilidadSegmentClick({
																bloque: b,
																dayKey,
																startSlot: seg.startSlot,
																endSlot: seg.endSlot,
																horaInicio: hv0,
																horaFin: horaEndStr,
															});
														}}
													>
														{canceling ? (
															<div className="flex h-full items-center justify-center rounded-xl bg-mist/80 text-[10px]">
																Cancelando…
															</div>
														) : (
															renderBlockCard(b, hv0, horaEndStr, seg.endSlot - seg.startSlot + 1)
														)}
													</button>
												</div>
											);
										})}
									</div>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default CalendarGrid;
