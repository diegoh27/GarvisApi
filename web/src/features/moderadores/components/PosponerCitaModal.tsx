import { useEffect, useMemo, useState } from "react";
import { X, Clock, Calendar } from "lucide-react";
import type { CitaPendientePago } from "../../citas/citasApi";
import { usePosponerCitaMutation } from "../../citas/citasApi";
import {
	useGetAllEspecialistasQuery,
	useGetDisponibilidadesByEspecialistaQuery,
} from "../moderadoresApi";
import { useAprobarDisponibilidadMutation } from "../../disponibilidad/disponibilidadApi";
import { formatFechaLocal, formatFechaConDia as formatFechaConDiaShared } from "../../../shared";
import Swal from "sweetalert2";

type PosponerCitaModalProps = {
	cita: CitaPendientePago | null;
	onClose: () => void;
	onSuccess?: () => void;
};

type DisponibilidadItem = {
	id_disponibilidad: string;
	fecha: string;
	hora_inicio: string;
	hora_fin: string;
	estado: number;
	id_eco?: string | null;
	eco_nombre?: string | null;
};

const formatFecha = (fecha: string) => formatFechaLocal(fecha);
const formatFechaConDia = (fecha: string) => formatFechaConDiaShared(fecha);

const formatHora = (hora: string) => {
	if (!hora) return "";
	const [hourStr, minuteStr = "00"] = hora.split(":");
	const hour = Number(hourStr);
	if (Number.isNaN(hour)) return hora;
	const period = hour >= 12 ? "PM" : "AM";
	const hour12 = hour % 12 === 0 ? 12 : hour % 12;
	return `${hour12}:${minuteStr} ${period}`;
};

const getDateKey = (value: string) => {
	if (!value) return "";
	if (value.includes("T")) return value.split("T")[0];
	return value;
};

/** Formatea una clave YYYY-MM-DD como fecha local (evita desfase por UTC al mostrar). */
const formatDateKeyLocal = (dateKey: string) => {
	if (!dateKey) return "";
	const [y, m, d] = dateKey.split("-");
	if (!y || !m || !d) return dateKey;
	const date = new Date(Number(y), Number(m) - 1, Number(d));
	if (Number.isNaN(date.getTime())) return dateKey;
	return date.toLocaleDateString("es-VE", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
};

// Normalizar fecha a formato YYYY-MM-DD para el API
const normalizeFecha = (fecha: string): string => {
	if (!fecha) return "";

	// Si ya está en formato YYYY-MM-DD, retornarlo directamente
	if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
		return fecha;
	}

	// Si incluye información de tiempo (ISO format), extraer solo la parte de fecha
	let fechaStr = fecha;
	if (fecha.includes("T") || fecha.includes("Z")) {
		fechaStr = fecha.split("T")[0].split("Z")[0];
	}

	// Intentar parsear la fecha
	const date = new Date(fechaStr);
	if (Number.isNaN(date.getTime())) {
		// Si falla, intentar con formato YYYY-MM-DD
		const date2 = new Date(`${fechaStr}T00:00:00`);
		if (Number.isNaN(date2.getTime())) {
			// Si aún falla, devolver la fecha original (aunque puede causar error)
			return fechaStr;
		}
		return date2.toISOString().split("T")[0];
	}

	// Convertir a formato YYYY-MM-DD
	return date.toISOString().split("T")[0];
};

const PosponerCitaModal = ({ cita, onClose, onSuccess }: PosponerCitaModalProps) => {
	const [posponerCita, { isLoading: isPosponiendo }] = usePosponerCitaMutation();
	const [aprobarDisponibilidad, { isLoading: isAprobando }] = useAprobarDisponibilidadMutation();
	const [selectedEspecialistaId, setSelectedEspecialistaId] = useState<string>("");
	const [selectedDayKey, setSelectedDayKey] = useState<string>("");
	const [dayOffset, setDayOffset] = useState<number>(0);
	const [selectedDisponibilidad, setSelectedDisponibilidad] = useState<DisponibilidadItem | null>(null);

	useEffect(() => {
		setSelectedEspecialistaId(cita?.id_especialista || "");
	}, [cita?.id_especialista, cita?.id_cita]);

	useEffect(() => {
		setDayOffset(0);
		setSelectedDisponibilidad(null);
	}, [selectedEspecialistaId]);

	const { data: especialistas = [], isLoading: isLoadingEspecialistas } =
		useGetAllEspecialistasQuery(undefined, {
			skip: !cita,
		});

	// Obtener disponibilidades del especialista
	const {
		data: disponibilidades = [],
		isLoading: isLoadingDisponibilidades,
	} = useGetDisponibilidadesByEspecialistaQuery(selectedEspecialistaId, {
		skip: !selectedEspecialistaId,
	});

	// Filtrar disponibilidades por el mismo eco y ordenar por fecha y hora
	const disponibilidadesFiltradas = useMemo(() => {
		if (!cita) return [];

		// Si no hay disponibilidades, retornar array vacío
		if (!disponibilidades || disponibilidades.length === 0) {
			return [];
		}

		// Mostrar TODAS las disponibilidades del especialista que tengan el mismo tipo de eco
		// Priorizar las que tienen el mismo eco, pero también incluir las que no tienen eco asignado
		const filtradas = disponibilidades
			.filter((disp: DisponibilidadItem) => {
				// Si la cita tiene un eco específico
				if (cita.id_eco) {
					// Incluir todas las disponibilidades que:
					// 1. Tengan el mismo id_eco que la cita (coincidencia exacta)
					// 2. No tengan id_eco asignado (null/undefined) - disponibilidades genéricas
					// Esto permite ver todas las opciones relacionadas con ese tipo de eco
					return disp.id_eco === cita.id_eco || disp.id_eco === null || disp.id_eco === undefined;
				}
				// Si la cita no tiene eco, mostrar todas las disponibilidades
				return true;
			})
			.sort((a: DisponibilidadItem, b: DisponibilidadItem) => {
				// Priorizar las que tienen el mismo eco de la cita
				if (cita.id_eco) {
					const aMatchesEco = a.id_eco === cita.id_eco;
					const bMatchesEco = b.id_eco === cita.id_eco;
					if (aMatchesEco && !bMatchesEco) return -1;
					if (!aMatchesEco && bMatchesEco) return 1;
				}
				// Ordenar por fecha primero, luego por hora
				if (a.fecha !== b.fecha) {
					return a.fecha.localeCompare(b.fecha);
				}
				return a.hora_inicio.localeCompare(b.hora_inicio);
			});

		return filtradas;
	}, [disponibilidades, cita]);

	const diasDisponibles = useMemo(() => {
		const uniqueDays = Array.from(
			new Set(disponibilidadesFiltradas.map((disp) => getDateKey(disp.fecha)).filter(Boolean)),
		).sort((a, b) => a.localeCompare(b));
		return uniqueDays;
	}, [disponibilidadesFiltradas]);

	const cantidadPorDia = useMemo(() => {
		const map = new Map<string, number>();
		disponibilidadesFiltradas.forEach((disp) => {
			const dayKey = getDateKey(disp.fecha);
			if (!dayKey) return;
			map.set(dayKey, (map.get(dayKey) ?? 0) + 1);
		});
		return map;
	}, [disponibilidadesFiltradas]);

	const diasVisibles = useMemo(
		() => diasDisponibles.slice(dayOffset, dayOffset + 5),
		[diasDisponibles, dayOffset],
	);

	useEffect(() => {
		if (!diasDisponibles.length) {
			setSelectedDayKey("");
			setDayOffset(0);
			setSelectedDisponibilidad(null);
			return;
		}
		if (!selectedDayKey || !diasDisponibles.includes(selectedDayKey)) {
			setSelectedDayKey(diasDisponibles[0]);
		}
	}, [diasDisponibles, selectedDayKey]);

	useEffect(() => {
		if (!diasDisponibles.length) return;
		if (dayOffset >= diasDisponibles.length) {
			setDayOffset(Math.max(0, diasDisponibles.length - 5));
		}
	}, [dayOffset, diasDisponibles]);

	const disponibilidadesDelDia = useMemo(() => {
		if (!selectedDayKey) return [];
		return disponibilidadesFiltradas.filter(
			(disp) => getDateKey(disp.fecha) === selectedDayKey,
		);
	}, [disponibilidadesFiltradas, selectedDayKey]);

	useEffect(() => {
		if (!selectedDisponibilidad || !selectedDayKey) return;
		if (getDateKey(selectedDisponibilidad.fecha) !== selectedDayKey) {
			setSelectedDisponibilidad(null);
		}
	}, [selectedDayKey, selectedDisponibilidad]);

	useEffect(() => {
		if (!selectedDisponibilidad) return;
		const stillExists = disponibilidadesFiltradas.some(
			(disp) => disp.id_disponibilidad === selectedDisponibilidad.id_disponibilidad,
		);
		if (!stillExists) {
			setSelectedDisponibilidad(null);
		}
	}, [disponibilidadesFiltradas, selectedDisponibilidad]);

	const canGoPrevDays = dayOffset > 0;
	const canGoNextDays = dayOffset + 5 < diasDisponibles.length;

	const handleAceptarFecha = async (disp: DisponibilidadItem) => {
		setSelectedDisponibilidad(disp);

		if (disp.estado !== 0) return;

		try {
			await aprobarDisponibilidad(disp.id_disponibilidad).unwrap();
			setSelectedDisponibilidad({ ...disp, estado: 1 });
			await Swal.fire({
				icon: "success",
				title: "Fecha aceptada",
				text: "La disponibilidad fue aprobada correctamente.",
				timer: 1200,
				showConfirmButton: false,
			});
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudo aceptar la fecha",
			});
		}
	};

	const handlePosponerCita = async () => {
		if (!cita) return;
		if (!selectedDisponibilidad) {
			Swal.fire({
				icon: "warning",
				title: "Selecciona una fecha",
				text: "Debes seleccionar un horario antes de posponer la cita.",
			});
			return;
		}

		if (selectedDisponibilidad.estado === 0) {
			Swal.fire({
				icon: "warning",
				title: "Fecha pendiente",
				text: "Primero debes aceptar la fecha seleccionada.",
			});
			return;
		}

		const confirm = await Swal.fire({
			icon: "question",
			title: "¿Estás seguro de posponer esta cita?",
			text: `${formatFecha(selectedDisponibilidad.fecha)} a las ${formatHora(selectedDisponibilidad.hora_inicio)}`,
			showCancelButton: true,
			confirmButtonText: "Sí, posponer",
			cancelButtonText: "Cancelar",
			confirmButtonColor: "#0f766e",
		});

		if (!confirm.isConfirmed) return;

		// Posponer la cita usando la fecha y hora de la disponibilidad
		try {
			// Normalizar la fecha a formato YYYY-MM-DD
			const fechaNormalizada = normalizeFecha(selectedDisponibilidad.fecha);

			await posponerCita({
				id_cita: cita.id_cita,
				fecha_cita: fechaNormalizada,
				hora_cita: selectedDisponibilidad.hora_inicio,
				id_especialista: selectedEspecialistaId,
				id_disponibilidad: selectedDisponibilidad.id_disponibilidad,
			}).unwrap();

			await Swal.fire({
				icon: "success",
				title: "Cita pospuesta",
				text: "La cita ha sido pospuesta exitosamente.",
				timer: 2000,
				showConfirmButton: false,
			});

			onSuccess?.();
			onClose();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudo posponer la cita",
			});
		}
	};

	if (!cita) return null;

	const isLoading = isPosponiendo || isAprobando;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="relative w-full max-w-2xl max-h-[90vh] rounded-xl bg-paper shadow-lg flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-mist p-4">
					<h2 className="text-base font-semibold text-brand-900">Posponer cita</h2>
					<button
						onClick={onClose}
						className="rounded-lg p-1 text-brand-800 hover:bg-cloud"
						aria-label="Cerrar"
						disabled={isLoading}
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-4">
					<div className="space-y-4">
						{/* Información de la cita actual */}
						<div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
							<p className="mb-2 text-sm font-semibold text-brand-700">Cita actual</p>
							<p className="text-base font-medium text-brand-900">
								{cita.paciente_nombre} {cita.paciente_apellido}
							</p>
							<div className="mt-2 space-y-1 text-sm text-brand-600">
								<p>
									<span className="font-medium">Especialista:</span> {cita.especialista_nombre}{" "}
									{cita.especialista_apellido}
								</p>
								<p>
									<span className="font-medium">Tipo de eco:</span> {cita.eco_nombre}
								</p>
								<p>
									<span className="font-medium">Fecha y hora:</span> {formatFecha(cita.fecha_cita)}{" "}
									a las {formatHora(cita.hora_cita)}
								</p>
							</div>
						</div>

						{/* Lista de disponibilidades */}
						<div>
							<label className="mb-2 block text-sm font-medium text-slate-500">
								Ecografista
							</label>
							<select
								value={selectedEspecialistaId}
								onChange={(e) => setSelectedEspecialistaId(e.target.value)}
								disabled={isLoading || isLoadingEspecialistas}
								className="mb-3 h-10 w-full rounded-lg border border-brand-300 bg-paper px-3 text-base text-brand-900 outline-none focus:border-brand-700 disabled:opacity-50"
							>
								<option value="">Selecciona un ecografista</option>
								{especialistas.map((esp) => (
									<option key={esp.id_especialista} value={esp.id_especialista}>
										{esp.nombre} {esp.apellido}
									</option>
								))}
							</select>

							<label className="mb-2 block text-sm font-medium text-slate-500">
								Selecciona un día
							</label>
							{!selectedEspecialistaId ? (
								<div className="rounded-lg border border-brand-200 bg-paper p-4 text-center">
									<p className="text-base text-brand-600">
										Selecciona un ecografista para ver disponibilidades.
									</p>
								</div>
							) : isLoadingDisponibilidades ? (
								<div className="text-center py-8 text-brand-600 text-base">
									Cargando disponibilidades...
								</div>
							) : disponibilidadesFiltradas.length === 0 ? (
								<div className="rounded-lg border border-brand-200 bg-paper p-4 text-center">
									<p className="text-base text-brand-600">
										No hay disponibilidades disponibles para este ecografista y tipo de eco.
									</p>
									{disponibilidades.length > 0 && (
										<p className="text-sm text-brand-500 mt-2">
											Se encontraron {disponibilidades.length} disponibilidades del especialista, pero ninguna coincide con el tipo de eco de la cita.
										</p>
									)}
								</div>
							) : (
								<>
									<div className="mb-3 flex flex-wrap items-center gap-2">
										<button
											type="button"
											onClick={() => setDayOffset((prev) => Math.max(0, prev - 5))}
											disabled={!canGoPrevDays}
											className="rounded-lg border border-brand-300 bg-paper px-3 py-1.5 text-base font-medium text-brand-800 hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-50"
										>
											← Anteriores 5 días
										</button>

										<div className="flex flex-wrap items-center gap-2">
											{diasVisibles.map((dayKey) => {
												const selected = dayKey === selectedDayKey;
												const count = cantidadPorDia.get(dayKey) ?? 0;
												return (
													<button
														key={dayKey}
														type="button"
														onClick={() => setSelectedDayKey(dayKey)}
														className={`rounded-lg border px-3 py-1.5 text-base font-medium transition-colors ${selected
																? "border-brand-700 bg-brand-700 text-paper"
																: "border-brand-300 bg-paper text-brand-800 hover:bg-cloud"
															}`}
													>
														{formatFechaConDia(dayKey)}
														<span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-sm text-brand-800">
															{count}
														</span>
													</button>
												);
											})}
										</div>

										<button
											type="button"
											onClick={() => setDayOffset((prev) => prev + 5)}
											disabled={!canGoNextDays}
											className="rounded-lg border border-brand-300 bg-paper px-3 py-1.5 text-base font-medium text-brand-800 hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-50"
										>
											Siguientes 5 días →
										</button>
									</div>

									<label className="mb-2 block text-sm font-medium text-slate-500">
										Horarios disponibles del día
									</label>
									{disponibilidadesDelDia.length === 0 ? (
										<div className="rounded-lg border border-brand-200 bg-paper p-4 text-center">
											<p className="text-base text-brand-600">
												No hay horarios para el día seleccionado.
											</p>
										</div>
									) : (
										<div className="space-y-2 max-h-[400px] overflow-y-auto">
											{disponibilidadesDelDia.map((disp: DisponibilidadItem) => {
												const isPendiente = disp.estado === 0;
												const isAprobada = disp.estado === 1;
												const isSelected = selectedDisponibilidad?.id_disponibilidad === disp.id_disponibilidad;

												return (
													<div
														key={disp.id_disponibilidad}
														onClick={() => !isLoading && setSelectedDisponibilidad(disp)}
														className={`w-full rounded-lg border p-3 text-left transition-all ${isSelected
																? "border-brand-700 bg-brand-50"
																: isPendiente
																	? "border-amber-300 bg-amber-50 hover:border-amber-400 hover:bg-amber-100"
																	: "border-brand-200 bg-paper hover:border-brand-300 hover:bg-cloud"
															} ${isLoading ? "opacity-50" : "cursor-pointer"}`}
													>
														<div className="flex items-center justify-between">
															<div className="flex items-center gap-3">
																<Calendar className="h-4 w-4 text-brand-600" />
																<div>
																	<p className="text-base font-medium text-brand-900">
																		{formatDateKeyLocal(selectedDayKey)}
																	</p>
																	<div className="flex items-center gap-1 mt-0.5">
																		<Clock className="h-3 w-3 text-brand-600" />
																		<p className="text-sm text-brand-600">
																			{formatHora(disp.hora_inicio)} - {formatHora(disp.hora_fin)}
																		</p>
																	</div>
																</div>
															</div>
															<div className="flex items-center gap-2">
																{isSelected && (
																	<span className="rounded-full bg-brand-700 px-2 py-0.5 text-sm font-medium text-paper">
																		Seleccionada
																	</span>
																)}
																{isPendiente && (
																	<span className="rounded-full bg-amber-400 px-2 py-0.5 text-sm font-medium text-brand-900">
																		Pendiente
																	</span>
																)}
																{isAprobada && (
																	<span className="rounded-full bg-brand-700 px-2 py-0.5 text-sm font-medium text-paper">
																		Aprobada
																	</span>
																)}
																<button
																	type="button"
																	onClick={(event) => {
																		event.stopPropagation();
																		handleAceptarFecha(disp);
																	}}
																	disabled={isLoading}
																	className="rounded-lg border border-brand-300 bg-paper px-3 py-1 text-sm font-medium text-brand-800 hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-50"
																>
																	{isPendiente ? "Aceptar fecha" : isSelected ? "Fecha aceptada" : "Seleccionar fecha"}
																</button>
															</div>
														</div>
													</div>
												);
											})}
										</div>
									)}
								</>
							)}
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="border-t border-mist p-4 flex justify-end gap-2">
					<button
						type="button"
						onClick={handlePosponerCita}
						disabled={isLoading || !selectedDisponibilidad || !selectedEspecialistaId || selectedDisponibilidad.estado === 0}
						className="rounded-lg bg-brand-700 px-4 py-2 text-base font-medium text-paper transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Posponer cita
					</button>
					<button
						type="button"
						onClick={onClose}
						disabled={isLoading}
						className="rounded-lg border border-mist bg-paper px-4 py-2 text-base font-medium text-brand-800 transition-colors hover:bg-cloud disabled:opacity-50"
					>
						Cancelar
					</button>
				</div>
			</div>
		</div>
	);
};

export default PosponerCitaModal;
