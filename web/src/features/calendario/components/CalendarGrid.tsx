import React from "react";
import type { Disponibilidad, TimeOption } from "../types";

type CalendarGridProps = {
	dayLabels: string[];
	dayKeys: string[];
	timeOptions: TimeOption[];
	bloquesMap: Map<string, Disponibilidad>;
	isEspecialista: boolean;
	minFecha: string;
	busyCell: string | null;
	cancelingId: string | null;
	selectedCell: string | null;
	estadoColor: Record<number, string>;
	estadoLabel: Record<number, string>;
	formatHora: (value: string) => string;
	formatFecha: (value: string) => string;
	onCellClick: (dateKey: string, hourValue: string) => void;
};

const CalendarGrid = ({
	dayLabels,
	dayKeys,
	timeOptions,
	bloquesMap,
	isEspecialista,
	minFecha,
	busyCell,
	cancelingId,
	selectedCell,
	estadoColor,
	estadoLabel,
	formatHora,
	formatFecha,
	onCellClick,
}: CalendarGridProps) => {
	return (
		<div className="mt-4 overflow-x-auto rounded-2xl border border-mist bg-paper">
			<div className="grid min-w-[920px] grid-cols-[80px_repeat(7,minmax(120px,1fr))] border-b border-mist text-xs text-brand-800">
				<div className="p-2 sm:p-3 sticky left-0 z-20 bg-paper" />
				{dayLabels.map((label) => (
					<div key={label} className="border-l border-mist p-2 sm:p-3 font-semibold">
						{label}
					</div>
				))}
			</div>
			<div className="grid min-w-[920px] grid-cols-[80px_repeat(7,minmax(120px,1fr))] text-[11px]">
				{timeOptions.map((hour) => (
					<React.Fragment key={hour.value}>
						<div
							className="border-b border-mist py-1.5 px-2 sm:py-2 sm:px-3 text-brand-800 sticky left-0 z-10 bg-paper"
						>
							{hour.label}
						</div>
						{dayKeys.map((dateKey) => {
							const cellKey = `${dateKey}|${hour.value}`;
							const bloque = bloquesMap.get(cellKey);
							const isPast = dateKey < minFecha;

							const [hStr, mStr] = hour.value.split(":");
							const h = Number(hStr);
							const m = Number(mStr);
							const totalMinutes = h * 60 + (Number.isNaN(m) ? 0 : m) + 20;
							const endHour = Math.floor(totalMinutes / 60);
							const endMinute = totalMinutes % 60;
							const horaFin = `${String(endHour).padStart(
								2,
								"0",
							)}:${String(endMinute).padStart(2, "0")}:00`;

							const tooltip = `${formatFecha(dateKey)} • ${formatHora(
								hour.value,
							)} - ${formatHora(horaFin)}`;
							const isPagoPendiente = bloque?.estado === 4 && bloque.estado_pago === 0;
							const isAtendida =
								bloque?.estado === 4 && bloque.estado_cita === 3;
							const label = bloque
								? isAtendida
									? "Atendida"
									: estadoLabel[bloque.estado] ?? "Estado"
								: "";
							const colorClass = bloque
								? isAtendida
									? "bg-emerald-500 text-paper"
									: isPagoPendiente
										? "bg-amber-400 text-brand-900"
										: estadoColor[bloque.estado] ?? "bg-mist text-brand-800"
								: "";
							const isSelected = selectedCell === cellKey && !bloque;
							return (
								<div
									key={cellKey}
									className={`border-b border-l border-mist p-0 transition-colors ${isEspecialista ? "cursor-pointer" : ""
										} ${isPast ? "bg-cloud/60" : ""} ${isSelected
											? "bg-gray-200 border-brand-500 border-2"
											: "hover:bg-brand-50"
										}`}
									onClick={() => onCellClick(dateKey, hour.value)}
									title={tooltip}
								>
									{bloque ? (
										<span
											className={`flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 py-1 text-[11px] ${colorClass}`}
										>
											<span>
												{cancelingId === bloque.id_disponibilidad
													? "Cancelando..."
													: label}
											</span>
											{bloque.eco_nombre && (
												<span className="text-[10px] font-semibold">
													{bloque.eco_nombre}
												</span>
											)}
											{!isAtendida && isPagoPendiente ? (
												<span className="text-[10px] font-semibold">
													Pago por aprobar
												</span>
											) : null}
											<span className="text-[10px] opacity-90">
												{formatHora(bloque.hora_inicio)} - {formatHora(bloque.hora_fin)}
											</span>
										</span>
									) : busyCell === cellKey ? (
										<span className="inline-flex rounded-full bg-cloud px-2 py-1 text-[11px] text-brand-800">
											Enviando...
										</span>
									) : null}
								</div>
							);
						})}
					</React.Fragment>
				))}
			</div>
		</div>
	);
};

export default CalendarGrid;
