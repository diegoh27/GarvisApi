import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TimeOption } from "../types";
import { useGetEcosQuery, useGetEcosByEspecialistaQuery } from "../../ecos/ecosApi";
import { useAuth } from "../../../shared";
import Swal from "sweetalert2";

export type SlotPreview = { fecha: string; hora_inicio: string; hora_fin: string };

const parseTimeToMinutes = (timeStr: string): number => {
	const [h, m] = timeStr.split(":").map(Number);
	if (Number.isNaN(h) || Number.isNaN(m)) return 0;
	return h * 60 + m;
};
const minutesToTime = (totalMinutes: number): string => {
	const h = Math.floor(totalMinutes / 60);
	const m = totalMinutes % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
};

const generateSlots = (
	fecha: string,
	horaInicio: string,
	horaFin: string
): SlotPreview[] => {
	const start = parseTimeToMinutes(horaInicio);
	const end = parseTimeToMinutes(horaFin);
	if (start >= end) return [];
	const slots: SlotPreview[] = [];
	for (let m = start; m < end; m += 20) {
		const hora_inicio = minutesToTime(m);
		const hora_fin = minutesToTime(m + 20);
		slots.push({ fecha, hora_inicio, hora_fin });
	}
	return slots;
};

const generateSlotsRange = (
	fechaDesde: string,
	fechaHasta: string,
	horaInicio: string,
	horaFin: string
): SlotPreview[] => {
	const startDate = new Date(`${fechaDesde}T00:00:00`);
	const endDate = new Date(`${fechaHasta}T00:00:00`);
	if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
		return [];
	}
	if (startDate > endDate) return [];

	const slots: SlotPreview[] = [];
	for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
		const dateKey = d.toISOString().slice(0, 10);
		slots.push(...generateSlots(dateKey, horaInicio, horaFin));
	}
	return slots;
};

type DisponibilidadFormProps = {
	fecha: string;
	horaInicio: string;
	idEcos: string[];
	minFecha: string;
	timeOptions: TimeOption[];
	selectedCellsCount?: number;
	onClearSelection?: () => void;
	onSubmitBatch?: (bloques: { fecha: string; hora_inicio: string; hora_fin: string; id_eco?: string }[]) => Promise<void>;
	error: string | null;
	submitStatus: "idle" | "loading" | "done";
	onFechaChange: (value: string) => void;
	onHoraInicioChange: (value: string) => void;
	onIdEcosChange: (value: string[]) => void;
	onSubmit: (event: FormEvent) => void;
	onCancel?: () => void;
};

const DisponibilidadForm = ({
	fecha,
	horaInicio,
	idEcos,
	minFecha,
	timeOptions,
	selectedCellsCount = 0,
	onClearSelection,
	onSubmitBatch,
	error,
	submitStatus,
	onFechaChange,
	onHoraInicioChange,
	onIdEcosChange,
	onSubmit,
	onCancel,
}: DisponibilidadFormProps) => {
	const useCalendarSelection = selectedCellsCount > 0;
	const [modoRango, setModoRango] = useState(false);
	const [fechaDesde, setFechaDesde] = useState("");
	const [fechaHasta, setFechaHasta] = useState("");
	const [horaInicioRango, setHoraInicioRango] = useState("");
	const [horaFinRango, setHoraFinRango] = useState("");
	const [selectedSlotKeys, setSelectedSlotKeys] = useState<Set<string>>(new Set());
	const [rangeError, setRangeError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const rangeDays = useMemo(() => {
		if (!fechaDesde || !fechaHasta) return 0;
		const startDate = new Date(`${fechaDesde}T00:00:00`);
		const endDate = new Date(`${fechaHasta}T00:00:00`);
		if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
			return 0;
		}
		const diffMs = endDate.getTime() - startDate.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
		return diffDays;
	}, [fechaDesde, fechaHasta]);

	const slotsPrevia = useMemo(() => {
		if (!fechaDesde || !fechaHasta || !horaInicioRango || !horaFinRango) return [];
		if (rangeError) return [];
		return generateSlotsRange(fechaDesde, fechaHasta, horaInicioRango, horaFinRango);
	}, [fechaDesde, fechaHasta, horaInicioRango, horaFinRango, rangeError]);

	useEffect(() => {
		if (!modoRango) {
			setRangeError(null);
			setSubmitError(null);
			return;
		}
		if (!fechaDesde || !fechaHasta) {
			setRangeError(null);
			return;
		}
		const startDate = new Date(`${fechaDesde}T00:00:00`);
		const endDate = new Date(`${fechaHasta}T00:00:00`);
		if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
			setRangeError("Fecha inválida");
			return;
		}
		if (endDate < startDate) {
			setRangeError("La fecha hasta debe ser mayor o igual a la fecha desde");
			return;
		}
		if (rangeDays > 6) {
			setRangeError("El rango máximo permitido es de 6 días");
			return;
		}
		setRangeError(null);
	}, [fechaDesde, fechaHasta, modoRango, rangeDays]);

	// Cuando se generan slots nuevos, marcar todos como seleccionados
	useEffect(() => {
		if (slotsPrevia.length > 0) {
			setSelectedSlotKeys(
				new Set(slotsPrevia.map((s) => `${s.fecha}|${s.hora_inicio}`))
			);
		}
	}, [slotsPrevia]);

	useEffect(() => {
		setSubmitError(null);
	}, [idEcos, selectedSlotKeys, fechaDesde, fechaHasta, horaInicioRango, horaFinRango]);

	const toggleSlot = (key: string) => {
		setSelectedSlotKeys((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const selectAllSlots = () => {
		setSelectedSlotKeys(new Set(slotsPrevia.map((s) => `${s.fecha}|${s.hora_inicio}`)));
	};
	const deselectAllSlots = () => {
		setSelectedSlotKeys(new Set());
	};

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setSubmitError(null);
		if (modoRango && rangeError) {
			await Swal.fire({
				icon: "warning",
				title: "Rango inválido",
				text: rangeError,
				confirmButtonText: "Entendido",
				confirmButtonColor: "#1C837F",
			});
			return;
		}
		if (modoRango && onSubmitBatch && slotsPrevia.length > 0 && !rangeError) {
			const selected = slotsPrevia.filter((s) =>
				selectedSlotKeys.has(`${s.fecha}|${s.hora_inicio}`)
			);
			if (selected.length === 0) {
				setSubmitError("Selecciona al menos un bloque en la vista previa");
				return;
			}
			if (idEcos.length === 0) {
				setSubmitError("Selecciona al menos un tipo de eco");
				return;
			}
			const bloques = selected.flatMap((slot) =>
				idEcos.map((id_eco) => ({
					fecha: slot.fecha,
					hora_inicio: slot.hora_inicio,
					hora_fin: slot.hora_fin,
					id_eco,
				}))
			);
			try {
				await onSubmitBatch(bloques);
				setSubmitError(null);
				setModoRango(false);
				setFechaDesde("");
				setFechaHasta("");
				setHoraInicioRango("");
				setHoraFinRango("");
				setSelectedSlotKeys(new Set());
				return;
			} catch (err) {
				const apiMessage =
					(err as { data?: { message?: string }; message?: string })?.data
						?.message ||
					(err as { message?: string })?.message ||
					"No se pudieron crear los bloques.";
				await Swal.fire({
					icon: "warning",
					title: "No se pudo enviar",
					text: apiMessage,
					confirmButtonText: "Entendido",
					confirmButtonColor: "#1C837F",
				});
				return;
			}
		}
		onSubmit(event);
	};

	const { user } = useAuth();
	const isEspecialista = user?.rol === "especialista";
	const idEspecialista = user?.id_usuario || "";

	const { data: ecosEspecialista = [], isLoading: loadingEcosEspecialista } =
		useGetEcosByEspecialistaQuery(idEspecialista, { skip: !isEspecialista || !idEspecialista });
	const { data: ecosTodos = [], isLoading: loadingEcosTodos } =
		useGetEcosQuery(undefined, { skip: isEspecialista });

	const ecos = isEspecialista ? ecosEspecialista : ecosTodos;
	const loadingEcos = isEspecialista ? loadingEcosEspecialista : loadingEcosTodos;

	const [isEcosDropdownOpen, setIsEcosDropdownOpen] = useState(false);
	const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">("bottom");
	const ecosDropdownRef = useRef<HTMLDivElement | null>(null);
	const ecosButtonRef = useRef<HTMLButtonElement | null>(null);

	const toggleEco = (idEco: string) => {
		const isSelected = idEcos.includes(idEco);
		if (isSelected) {
			onIdEcosChange(idEcos.filter((id) => id !== idEco));
		} else {
			onIdEcosChange([...idEcos, idEco]);
		}
	};

	const handleToggleDropdown = () => {
		if (!isEcosDropdownOpen && ecosButtonRef.current) {
			const rect = ecosButtonRef.current.getBoundingClientRect();
			const spaceBelow = window.innerHeight - rect.bottom;
			const spaceAbove = rect.top;
			const dropdownHeight = 240;

			if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
				setDropdownPosition("top");
			} else {
				setDropdownPosition("bottom");
			}
		}
		setIsEcosDropdownOpen((prev) => !prev);
	};

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				ecosDropdownRef.current &&
				!ecosDropdownRef.current.contains(event.target as Node)
			) {
				setIsEcosDropdownOpen(false);
			}
		};

		if (isEcosDropdownOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isEcosDropdownOpen]);

	const horaFinOptions = useMemo(() => {
		if (!horaInicioRango) return timeOptions;
		const start = parseTimeToMinutes(horaInicioRango);
		return timeOptions.filter((opt) => parseTimeToMinutes(opt.value) > start);
	}, [timeOptions, horaInicioRango]);

	const formatHoraShort = (timeStr: string) => {
		const [h, m] = timeStr.split(":");
		const hh = Number(h);
		const period = hh >= 12 ? "PM" : "AM";
		const h12 = hh % 12 === 0 ? 12 : hh % 12;
		return `${h12}:${m} ${period}`;
	};

	return (
		<div className="rounded-2xl bg-paper p-4 shadow-sm">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold text-brand-900">
					Solicitar disponibilidad
				</h3>
				<span className="text-[10px] text-brand-800">Bloques de 20 minutos</span>
			</div>
			{!useCalendarSelection && (
				<div className="mt-2 flex gap-1 rounded-lg border border-mist p-1">
					<button
						type="button"
						onClick={() => {
							setModoRango(false);
							setFechaDesde("");
							setFechaHasta("");
							setHoraInicioRango("");
							setHoraFinRango("");
							setSelectedSlotKeys(new Set());
						}}
						className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${!modoRango ? "bg-brand-700 text-paper" : "text-brand-800 hover:bg-cloud"
							}`}
					>
						Una fecha/hora
					</button>
					<button
						type="button"
						onClick={() => setModoRango(true)}
						className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${modoRango ? "bg-brand-700 text-paper" : "text-brand-800 hover:bg-cloud"
							}`}
					>
						Por rango
					</button>
				</div>
			)}
			<form className="mt-3 space-y-3" onSubmit={handleSubmit}>
				{useCalendarSelection ? (
					<div className="rounded-xl border border-brand-200 bg-brand-50/50 px-3 py-3 text-xs text-brand-800">
						<p className="font-semibold">
							{selectedCellsCount} celda{selectedCellsCount !== 1 ? "s" : ""} seleccionada{selectedCellsCount !== 1 ? "s" : ""} en el calendario
						</p>
						<p className="mt-1 text-[11px] text-brand-700">
							Haz clic en celdas vacías para sumar o quitar. Elige el tipo de eco y envía la solicitud.
						</p>
						{onClearSelection && (
							<button
								type="button"
								onClick={onClearSelection}
								className="mt-2 rounded-lg border border-brand-300 bg-paper px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
							>
								Limpiar selección
							</button>
						)}
					</div>
				) : modoRango ? (
					<>
						<div className="grid grid-cols-2 gap-2">
							<div className="space-y-1 text-xs text-brand-800">
								<label className="font-semibold">Desde</label>
								<input
									type="date"
									value={fechaDesde}
									onChange={(e) => setFechaDesde(e.target.value)}
									min={minFecha}
									className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700"
								/>
							</div>
							<div className="space-y-1 text-xs text-brand-800">
								<label className="font-semibold">Hasta</label>
								<input
									type="date"
									value={fechaHasta}
									onChange={(e) => setFechaHasta(e.target.value)}
									min={minFecha}
									className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700"
								/>
							</div>
						</div>
						<p className="text-[10px] text-brand-700">Rango máximo: 6 días</p>
						<div className="grid grid-cols-2 gap-2">
							<div className="space-y-1 text-xs text-brand-800">
								<label className="font-semibold">Hora inicio</label>
								<select
									value={horaInicioRango}
									onChange={(e) => {
										setHoraInicioRango(e.target.value);
										if (horaFinRango && parseTimeToMinutes(e.target.value) >= parseTimeToMinutes(horaFinRango)) {
											setHoraFinRango("");
										}
									}}
									className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700"
								>
									<option value="">Inicio</option>
									{timeOptions.map((opt) => (
										<option key={opt.value} value={opt.value}>{opt.label}</option>
									))}
								</select>
							</div>
							<div className="space-y-1 text-xs text-brand-800">
								<label className="font-semibold">Hora fin</label>
								<select
									value={horaFinRango}
									onChange={(e) => setHoraFinRango(e.target.value)}
									className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700"
								>
									<option value="">Fin</option>
									{horaFinOptions.map((opt) => (
										<option key={opt.value} value={opt.value}>{opt.label}</option>
									))}
								</select>
							</div>
						</div>
						{rangeError && (
							<p className="text-[11px] font-semibold text-brand-900">{rangeError}</p>
						)}
						{!rangeError && slotsPrevia.length > 0 && (
							<div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3 text-xs text-brand-800">
								<p className="font-semibold">
									Vista previa: {slotsPrevia.length} bloque{slotsPrevia.length !== 1 ? "s" : ""} · {selectedSlotKeys.size} seleccionado{selectedSlotKeys.size !== 1 ? "s" : ""}
								</p>
								<div className="mt-2 flex gap-2">
									<button type="button" onClick={selectAllSlots} className="text-brand-700 underline hover:no-underline">
										Marcar todos
									</button>
									<button type="button" onClick={deselectAllSlots} className="text-brand-700 underline hover:no-underline">
										Desmarcar todos
									</button>
								</div>
								<div className="mt-2 max-h-40 overflow-y-auto space-y-1">
									{slotsPrevia.map((slot) => {
										const key = `${slot.fecha}|${slot.hora_inicio}`;
										const checked = selectedSlotKeys.has(key);
										return (
											<label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-brand-100/50 rounded px-1 py-0.5">
												<input
													type="checkbox"
													checked={checked}
													onChange={() => toggleSlot(key)}
													className="rounded border-brand-600 text-brand-700"
												/>
												<span>
													{slot.fecha} · {formatHoraShort(slot.hora_inicio)} - {formatHoraShort(slot.hora_fin)}
												</span>
											</label>
										);
									})}
								</div>
							</div>
						)}
					</>
				) : (
					<>
						<div className="space-y-1 text-xs text-brand-800">
							<label className="font-semibold">Fecha</label>
							<input
								type="date"
								value={fecha}
								onChange={(event) => onFechaChange(event.target.value)}
								min={minFecha}
								className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700"
							/>
						</div>
						<div className="space-y-1 text-xs text-brand-800">
							<label className="font-semibold">Hora inicio</label>
							<select
								value={horaInicio}
								onChange={(event) => onHoraInicioChange(event.target.value)}
								className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-700"
							>
								<option value="">Selecciona hora</option>
								{timeOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
					</>
				)}
				<div className="space-y-1 text-xs text-brand-800">
					<label className="font-semibold">
						Tipo de eco <span className="text-red-500">*</span>
					</label>
					<div className="relative" ref={ecosDropdownRef}>
						<button
							type="button"
							ref={ecosButtonRef}
							onClick={handleToggleDropdown}
							disabled={loadingEcos}
							className="h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-left text-xs outline-none focus:border-brand-500 disabled:opacity-50 flex items-center justify-between"
						>
							<span className="truncate">
								{loadingEcos
									? "Cargando ecos..."
									: idEcos.length === 0
										? "Selecciona los ecos"
										: idEcos.length === 1
											? "1 eco seleccionado"
											: `${idEcos.length} ecos seleccionados`}
							</span>
							<span className="ml-2 text-[10px] text-brand-600">
								{isEcosDropdownOpen ? "▲" : "▼"}
							</span>
						</button>
						{isEcosDropdownOpen && (
							<div
								className={`absolute z-50 w-full rounded-lg border border-brand-300 bg-paper shadow-lg max-h-60 overflow-auto ${dropdownPosition === "top" ? "bottom-full mb-1" : "top-full mt-1"
									}`}
							>
								{loadingEcos ? (
									<div className="p-3 text-xs text-brand-600">Cargando ecos...</div>
								) : ecos.filter((eco) => eco.activo === 1).length === 0 ? (
									<div className="p-3 text-xs text-brand-600">
										No hay ecos disponibles
									</div>
								) : (
									<div className="p-1">
										{ecos
											.filter((eco) => eco.activo === 1)
											.map((eco) => {
												const isSelected = idEcos.includes(eco.id_eco);
												return (
													<button
														key={eco.id_eco}
														type="button"
														onClick={() => toggleEco(eco.id_eco)}
														className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-brand-50 transition-colors ${isSelected ? "bg-brand-50" : ""
															}`}
													>
														<div
															className={`flex h-3 w-3 items-center justify-center rounded border ${isSelected
																? "border-brand-700 bg-brand-700"
																: "border-brand-300 bg-paper"
																}`}
														>
															{isSelected && (
																<span className="block h-2 w-2 rounded-sm bg-paper" />
															)}
														</div>
														<span className="flex-1 text-left">{eco.nombre}</span>
													</button>
												);
											})}
									</div>
								)}
							</div>
						)}
					</div>
					<p className="text-[10px] text-brand-700">
						{useCalendarSelection
							? "Selecciona uno o varios ecos para aplicar a todas las celdas."
							: "Puedes seleccionar uno o varios ecos desde el desplegable."}
					</p>
				</div>
				{error || submitError ? (
					<p className="text-[11px] font-semibold text-brand-900">
						{error ?? submitError}
					</p>
				) : null}
				<div className="flex gap-2">
					{onCancel && (
						<button
							type="button"
							onClick={onCancel}
							className="flex-1 rounded-full border border-brand-300 bg-paper px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
						>
							Cancelar
						</button>
					)}
					<button
						type="submit"
						disabled={submitStatus === "loading"}
						className={`rounded-full bg-brand-700 px-3 py-2 text-xs font-semibold text-paper disabled:opacity-60 ${onCancel ? "flex-1" : "w-full"
							}`}
					>
						{submitStatus === "loading" ? "Enviando..." : "Enviar solicitud"}
					</button>
				</div>
				{submitStatus === "done" ? (
					<p className="text-[11px] font-semibold text-brand-800">
						Solicitud enviada
					</p>
				) : null}
			</form>
		</div>
	);
};

export default DisponibilidadForm;
