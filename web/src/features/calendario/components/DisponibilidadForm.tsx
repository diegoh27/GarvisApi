import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TimeOption } from "../types";
import {
	useGetEcosQuery,
	useGetEcosByEspecialistaQuery,
} from "../../ecos/ecosApi";
import { useAuth } from "../../../shared";
import Swal from "sweetalert2";
import { generateSlotsRange, parseTimeToMinutes } from "../utils/slotUtils";
import { CalendarDays, Clock, Send, X } from "lucide-react";

type DisponibilidadFormProps = {
	fecha: string;
	horaInicio: string;
	idEcos: string[];
	minFecha: string;
	timeOptions: TimeOption[];
	/** Estado de rango elevado (sincronía con grilla). */
	fechaDesde: string;
	fechaHasta: string;
	horaInicioRango: string;
	horaFinRango: string;
	onFechaDesdeChange: (value: string) => void;
	onFechaHastaChange: (value: string) => void;
	onHoraInicioRangoChange: (value: string) => void;
	onHoraFinRangoChange: (value: string) => void;
	onClearSelection?: () => void;
	/** Solicitud macro (rango + horario); un POST con todos los ecos. */
	onSubmitMacro?: (payload: {
		fecha_desde: string;
		fecha_hasta: string;
		hora_inicio: string;
		hora_fin: string;
		id_ecos: string[];
	}) => Promise<void>;
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
	fechaDesde,
	fechaHasta,
	horaInicioRango,
	horaFinRango,
	onFechaDesdeChange,
	onFechaHastaChange,
	onHoraInicioRangoChange,
	onHoraFinRangoChange,
	onClearSelection,
	onSubmitMacro,
	error,
	submitStatus,
	onFechaChange,
	onHoraInicioChange,
	onIdEcosChange,
	onSubmit,
	onCancel,
}: DisponibilidadFormProps) => {
	const [modoRango] = useState(true);
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
		if (rangeDays > 31) {
			setRangeError("El rango máximo permitido es de 31 días");
			return;
		}
		setRangeError(null);
	}, [fechaDesde, fechaHasta, modoRango, rangeDays]);

	useEffect(() => {
		setSubmitError(null);
	}, [idEcos, fechaDesde, fechaHasta, horaInicioRango, horaFinRango]);

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
		if (modoRango && onSubmitMacro && slotsPrevia.length > 0 && !rangeError) {
			if (idEcos.length === 0) {
				setSubmitError("Selecciona al menos un tipo de eco");
				return;
			}
			try {
				await onSubmitMacro({
					fecha_desde: fechaDesde,
					fecha_hasta: fechaHasta,
					hora_inicio: horaInicioRango,
					hora_fin: horaFinRango,
					id_ecos: idEcos,
				});
				setSubmitError(null);
				return;
			} catch (err) {
				const apiMessage =
					(err as { data?: { message?: string }; message?: string })?.data
						?.message ||
					(err as { message?: string })?.message ||
					"No se pudo registrar la solicitud.";
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
		useGetEcosByEspecialistaQuery(idEspecialista, {
			skip: !isEspecialista || !idEspecialista,
		});
	const { data: ecosTodos = [], isLoading: loadingEcosTodos } = useGetEcosQuery(
		undefined,
		{ skip: isEspecialista },
	);

	const ecos = isEspecialista ? ecosEspecialista : ecosTodos;
	const loadingEcos = isEspecialista ? loadingEcosEspecialista : loadingEcosTodos;

	const [isEcosDropdownOpen, setIsEcosDropdownOpen] = useState(false);
	const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">(
		"bottom",
	);
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

	const formatShortDate = (iso: string) => {
		if (!iso) return "";
		const d = new Date(`${iso}T12:00:00`);
		if (Number.isNaN(d.getTime())) return iso;
		return d.toLocaleDateString("es-VE", { day: "numeric", month: "short", year: "numeric" });
	};

	return (
		<div className="space-y-6">
			<div className="rounded-3xl border border-mist/80 bg-paper p-8 shadow-xl shadow-slate-200/50">
				<div className="mb-6">
					<h3 className="font-headline text-xl font-extrabold text-brand-900">
						Nueva solicitud
					</h3>
				</div>
				<form className="space-y-6" onSubmit={handleSubmit}>
					{modoRango ? (
						<>
							<div className="space-y-2">
								<label className="px-1 text-xs font-bold uppercase tracking-widest text-slate-400">
									Rango de fechas
								</label>
								<div className="grid grid-cols-2 gap-3">
									<div className="relative flex items-center gap-3 rounded-2xl bg-cloud/80 p-3 pl-4">
										<div className="absolute bottom-0 left-0 top-0 w-1 rounded-l-2xl bg-brand-800" />
										<CalendarDays className="h-5 w-5 shrink-0 text-slate-400" />
										<div className="min-w-0">
											<span className="mb-1 block text-[10px] font-bold leading-none text-slate-400">
												Desde
											</span>
											<input
												type="date"
												value={fechaDesde}
												min={minFecha}
												onChange={(e) => onFechaDesdeChange(e.target.value)}
												className="w-full border-none bg-transparent p-0 text-sm font-semibold text-brand-900 outline-none focus:ring-0"
											/>
										</div>
									</div>
									<div className="flex items-center gap-3 rounded-2xl bg-cloud/80 p-3">
										<CalendarDays className="h-5 w-5 shrink-0 text-slate-400" />
										<div className="min-w-0">
											<span className="mb-1 block text-[10px] font-bold leading-none text-slate-400">
												Hasta
											</span>
											<input
												type="date"
												value={fechaHasta}
												min={minFecha}
												onChange={(e) => onFechaHastaChange(e.target.value)}
												className="w-full border-none bg-transparent p-0 text-sm font-semibold text-brand-900 outline-none focus:ring-0"
											/>
										</div>
									</div>
								</div>
								<p className="text-[10px] text-brand-700">
									Vista previa: {formatShortDate(fechaDesde)} — {formatShortDate(fechaHasta)} · máximo 31 días
								</p>
							</div>
							<div className="space-y-2">
								<label className="px-1 text-xs font-bold uppercase tracking-widest text-slate-400">
									Horario
								</label>
								<div className="grid grid-cols-2 gap-3">
									<div className="rounded-2xl bg-cloud/80 p-3">
										<span className="mb-1 block text-[10px] font-bold text-slate-400">
											Inicio
										</span>
										<div className="flex items-center gap-2 text-sm font-semibold text-brand-900">
											<Clock className="h-5 w-5 shrink-0 text-slate-400" />
											<select
												value={horaInicioRango}
												onChange={(e) => {
													onHoraInicioRangoChange(e.target.value);
													if (
														horaFinRango &&
														parseTimeToMinutes(e.target.value) >=
															parseTimeToMinutes(horaFinRango)
													) {
														onHoraFinRangoChange("");
													}
												}}
												className="min-w-0 flex-1 border-none bg-transparent p-0 font-semibold outline-none focus:ring-0"
											>
												<option value="">Seleccionar</option>
												{timeOptions.map((opt) => (
													<option key={opt.value} value={opt.value}>
														{opt.label}
													</option>
												))}
											</select>
										</div>
									</div>
									<div className="rounded-2xl bg-cloud/80 p-3">
										<span className="mb-1 block text-[10px] font-bold text-slate-400">
											Fin
										</span>
										<div className="flex items-center gap-2 text-sm font-semibold text-brand-900">
											<Clock className="h-5 w-5 shrink-0 text-slate-400" />
											<select
												value={horaFinRango}
												onChange={(e) => onHoraFinRangoChange(e.target.value)}
												className="min-w-0 flex-1 border-none bg-transparent p-0 font-semibold outline-none focus:ring-0"
											>
												<option value="">Seleccionar</option>
												{horaFinOptions.map((opt) => (
													<option key={opt.value} value={opt.value}>
														{opt.label}
													</option>
												))}
											</select>
										</div>
									</div>
								</div>
							</div>
							{rangeError && (
								<p className="text-[11px] font-semibold text-red-600">{rangeError}</p>
							)}
							{!rangeError && slotsPrevia.length > 0 && (
								<div className="rounded-xl border border-brand-200 bg-brand-100/40 p-3 text-xs text-brand-800">
									<p className="font-semibold">
										{slotsPrevia.length} bloque{slotsPrevia.length !== 1 ? "s" : ""} de 20 min ·{" "}
										{rangeDays} día{rangeDays !== 1 ? "s" : ""}
									</p>
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
									className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-800"
								/>
							</div>
							<div className="space-y-1 text-xs text-brand-800">
								<label className="font-semibold">Hora inicio</label>
								<select
									value={horaInicio}
									onChange={(event) => onHoraInicioChange(event.target.value)}
									className="w-full rounded-xl border border-mist bg-paper px-3 py-2 text-xs text-brand-900 outline-none focus:border-brand-800"
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
					<div className="space-y-2">
						<label className="px-1 text-xs font-bold uppercase tracking-widest text-slate-400">
							Servicios (ecos)
						</label>
						<div className="flex flex-wrap items-center gap-2">
							{idEcos.map((id) => {
								const eco = ecos.find((e) => e.id_eco === id);
								if (!eco) return null;
								return (
									<span
										key={id}
										className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-bold text-brand-800"
									>
										{eco.nombre}
										<button
											type="button"
											onClick={() => onIdEcosChange(idEcos.filter((x) => x !== id))}
											className="rounded-full p-0.5 hover:bg-brand-200/80"
											aria-label={`Quitar ${eco.nombre}`}
										>
											<X className="h-3.5 w-3.5" />
										</button>
									</span>
								);
							})}
							<div className="relative" ref={ecosDropdownRef}>
								<button
									type="button"
									ref={ecosButtonRef}
									onClick={handleToggleDropdown}
									disabled={loadingEcos}
									className="rounded-full border border-dashed border-slate-300 bg-cloud/50 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-cloud disabled:opacity-50"
								>
									+ Añadir
								</button>
								{isEcosDropdownOpen && (
									<div
										className={`absolute z-50 w-56 rounded-lg border border-mist bg-paper shadow-lg max-h-60 overflow-auto ${
											dropdownPosition === "top" ? "bottom-full mb-1" : "top-full mt-1"
										}`}
									>
										{loadingEcos ? (
											<div className="p-3 text-xs text-brand-600">Cargando ecos...</div>
										) : ecos.filter((eco) => eco.activo === 1).length === 0 ? (
											<div className="p-3 text-xs text-brand-600">No hay ecos disponibles</div>
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
																className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors hover:bg-brand-100/60 ${
																	isSelected ? "bg-brand-100/50" : ""
																}`}
															>
																<span className="flex-1 text-left">{eco.nombre}</span>
															</button>
														);
													})}
											</div>
										)}
									</div>
								)}
							</div>
						</div>
					</div>
					{error || submitError ? (
						<p className="text-[11px] font-semibold text-red-600">{error ?? submitError}</p>
					) : null}
					<div className="flex flex-col gap-2 sm:flex-row">
						{onCancel && (
							<button
								type="button"
								onClick={onCancel}
								className="rounded-2xl border border-mist px-4 py-3 text-sm font-semibold text-brand-800 hover:bg-cloud"
							>
								Limpiar
							</button>
						)}
						<button
							type="submit"
							disabled={submitStatus === "loading"}
							className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-800 py-4 text-sm font-bold text-paper shadow-lg shadow-brand-800/20 transition hover:scale-[0.98] active:scale-95 disabled:opacity-60"
						>
							{submitStatus === "loading" ? "Enviando..." : "Enviar solicitud al administrador"}
							<Send className="h-4 w-4" />
						</button>
					</div>
					{onClearSelection && (
						<button
							type="button"
							onClick={onClearSelection}
							className="w-full text-center text-xs font-medium text-brand-700 underline-offset-2 hover:underline"
						>
							Limpiar selección en el calendario
						</button>
					)}
					{submitStatus === "done" ? (
						<p className="text-center text-[11px] font-semibold text-brand-800">
							Solicitud enviada
						</p>
					) : null}
				</form>
			</div>
			<div className="rounded-3xl border border-brand-800/10 bg-brand-100/30 p-6">
				<h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-brand-800">
					<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-200/50 text-xs">
						i
					</span>
					Estado de solicitudes
				</h4>
				<p className="text-xs leading-relaxed text-slate-600">
					Las solicitudes enviadas suelen ser procesadas por administración en un plazo máximo de 24
					horas hábiles. Recibirás una notificación cuando se aprueben.
				</p>
			</div>
		</div>
	);
};

export default DisponibilidadForm;
