import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { useAuth, formatFechaLocal } from "../../../shared";
import {
	type FilterOption,
	type Disponibilidad,
	type TimeOption,
	CalendarHeader,
	CalendarLegend,
	CalendarGrid,
	DisponibilidadForm,
	BloquesList,
} from "../../calendario";
import type { SlotPreview } from "../../calendario/components/DisponibilidadForm";
import {
	useCancelarDisponibilidadMutation,
	useCrearDisponibilidadMutation,
	useGetMisBloquesQuery,
	useGetMisCitasQuery,
	useMarcarAtendidaMutation,
} from "../especialistaApi";
import { useCrearSolicitudMacroMutation } from "../../disponibilidad/disponibilidadApi";
import { useGetEcosQuery } from "../../ecos/ecosApi";

const estadoLabel: Record<number, string> = {
	0: "Propuesta",
	1: "Aprobada",
	2: "Rechazada",
	3: "Cancelada",
	4: "Cita",
};

const estadoColor: Record<number, string> = {
	0: "bg-accent text-paper",
	1: "bg-brand-700 text-paper",
	2: "bg-red-500 text-paper",
	3: "bg-brand-900 text-paper",
	4: "bg-sky-500 text-paper",
};

const buildTimeLabel = (hour24: number, minute: number) => {
	const period = hour24 >= 12 ? "PM" : "AM";
	const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
	return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
};

const getLocalDateKey = (date: Date) => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const getDateKey = (value: string | Date) => {
	if (!value) return "";
	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}
	return value.includes("T") ? value.split("T")[0] : value;
};

const formatShortDay = (date: Date) => {
	const weekday = date
		.toLocaleDateString("es-VE", { weekday: "short" })
		.replace(".", "");
	const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
	return `${capitalized} ${date.getDate()}`;
};

const startOfWeek = (base: Date) => {
	const date = new Date(base);
	const day = date.getDay();
	const diff = (day + 6) % 7;
	date.setDate(date.getDate() - diff);
	date.setHours(0, 0, 0, 0);
	return date;
};

const formatFecha = (value: string) => formatFechaLocal(value);

const formatHora = (value: string) => {
	if (!value) return "";
	const [hourStr, minuteStr = "00"] = value.split(":");
	const hour = Number(hourStr);
	if (Number.isNaN(hour)) return value;
	const period = hour >= 12 ? "PM" : "AM";
	const hour12 = hour % 12 === 0 ? 12 : hour % 12;
	return `${hour12}:${minuteStr} ${period}`;
};

const CalendarioPage = () => {
	const { user, token } = useAuth();
	const [fecha, setFecha] = useState("");
	const [horaInicio, setHoraInicio] = useState("");
	const [idEcos, setIdEcos] = useState<string[]>([]);
	const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
	const [busyCell] = useState<string | null>(null);
	const [cancelingId, setCancelingId] = useState<string | null>(null);
	const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "done">(
		"idle",
	);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState("todas");
	const [page, setPage] = useState(1);
	const [selectedCells, setSelectedCells] = useState<string[]>([]);
	const [previewSlots, setPreviewSlots] = useState<SlotPreview[]>([]);

	const isEspecialista = user?.rol === "especialista";
	const minFecha = useMemo(() => getLocalDateKey(new Date()), []);
	const shouldFetch = isEspecialista && !!token;

	const {
		data: bloques = [],
		isFetching: loadingBloques,
		error: bloquesError,
	} = useGetMisBloquesQuery(undefined, { skip: !shouldFetch });
	const { data: citas = [], error: citasError } = useGetMisCitasQuery(undefined, {
		skip: !shouldFetch,
	});
	const [crearDisponibilidad] = useCrearDisponibilidadMutation();
	const [crearSolicitudMacro] = useCrearSolicitudMacroMutation();
	const [cancelarDisponibilidad] = useCancelarDisponibilidadMutation();
	const [marcarAtendida] = useMarcarAtendidaMutation();
	const { data: ecos = [] } = useGetEcosQuery();

	const onPreviewSlotsChange = useCallback((slots: SlotPreview[] | null) => {
		setPreviewSlots(slots ?? []);
	}, []);

	const previewEcoLabel = useMemo(() => {
		if (idEcos.length === 0) return "Vista previa";
		if (idEcos.length === 1) {
			const n = ecos.find((e) => e.id_eco === idEcos[0])?.nombre;
			return n ? `Vista previa · ${n}` : "Vista previa";
		}
		return `Vista previa · ${idEcos.length} ecos`;
	}, [idEcos, ecos]);

	const timeOptions = useMemo<TimeOption[]>(
		() => {
			const options: TimeOption[] = [];
			// Desde 06:00 hasta 19:40 en intervalos de 20 minutos
			for (let hour = 6; hour < 20; hour += 1) {
				for (let minute = 0; minute < 60; minute += 20) {
					const value = `${String(hour).padStart(2, "0")}:${String(
						minute,
					).padStart(2, "0")}:00`;
					options.push({
						value,
						label: buildTimeLabel(hour, minute),
					});
				}
			}
			return options;
		},
		[],
	);

	const showConflict = async (message: string) => {
		await Swal.fire({
			icon: "error",
			title: "Conflicto de horario",
			text: message,
			confirmButtonText: "Entendido",
			confirmButtonColor: "#1C837F",
		});
	};

	const computeHoraFin = (hora: string) => {
		const [hStr, mStr] = hora.split(":");
		const h = Number(hStr);
		const m = Number(mStr);
		if (Number.isNaN(h) || Number.isNaN(m)) return "";
		const totalMinutes = h * 60 + m + 20;
		const endHour = Math.floor(totalMinutes / 60);
		const endMinute = totalMinutes % 60;
		return `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(
			2,
			"0",
		)}:00`;
	};

	const submitDisponibilidad = async (payload: {
		fecha: string;
		hora_inicio: string;
		id_ecos: string[];
	}) => {
		setError(null);
		if (!payload.fecha || !payload.hora_inicio) {
			setError("Completa fecha y hora de inicio");
			return;
		}
		if (!payload.id_ecos || payload.id_ecos.length === 0) {
			setError("Selecciona al menos un tipo de eco");
			return;
		}
		const hora_fin = computeHoraFin(payload.hora_inicio);
		if (!hora_fin) {
			setError("Hora inválida");
			return;
		}

		setSubmitStatus("loading");
		setError(null);

		const exitosos: string[] = [];
		let lastError: unknown = null;

		for (const id_eco of payload.id_ecos) {
			try {
				await crearDisponibilidad({
					fecha: payload.fecha,
					hora_inicio: payload.hora_inicio,
					hora_fin,
					id_eco,
				}).unwrap();
				exitosos.push(id_eco);
			} catch (err) {
				lastError = err;
			}
		}

		if (exitosos.length > 0) {
			setSubmitStatus("done");
			setSelectedCells([]);

			const ecosSeleccionados = ecos.filter((eco) =>
				exitosos.includes(eco.id_eco),
			);
			const nombresEcos = ecosSeleccionados.map((eco) => eco.nombre);
			const ecosTexto =
				nombresEcos.length === 1
					? `con el eco "${nombresEcos[0]}"`
					: `con los ecos: ${nombresEcos.join(", ")}`;

			await Swal.fire({
				icon: "success",
				title: "Disponibilidad agregada",
				text: `La disponibilidad para el ${formatFecha(
					payload.fecha,
				)} a las ${formatHora(payload.hora_inicio)} ${ecosTexto} ha sido agregada exitosamente.`,
				timer: 3000,
				showConfirmButton: false,
				confirmButtonColor: "#1C837F",
			});
		}

		if (lastError) {
			const err: any = lastError;
			const apiMessage =
				err?.data?.message ||
				err?.error ||
				(err as Error).message ||
				"No se pudo enviar una o más disponibilidades";

			if (err?.status === 409) {
				const conflictMessage =
					apiMessage ||
					"Ya solicitaste este eco en ese horario, o ya hay una cita en ese horario.";
				setError(conflictMessage);
				await showConflict(conflictMessage);
			} else {
				setError(apiMessage);
			}
		}

		setSubmitStatus("idle");
	};

	const handleSubmitMacro = async (payload: {
		fecha_desde: string;
		fecha_hasta: string;
		hora_inicio: string;
		hora_fin: string;
		id_ecos: string[];
	}) => {
		setError(null);
		setSubmitStatus("loading");
		try {
			await crearSolicitudMacro({
				fecha_desde: payload.fecha_desde,
				fecha_hasta: payload.fecha_hasta,
				hora_inicio: payload.hora_inicio,
				hora_fin: payload.hora_fin,
				id_ecos: payload.id_ecos,
			}).unwrap();
			setSubmitStatus("done");
			setSelectedCells([]);
			setPreviewSlots([]);
			setFecha("");
			setHoraInicio("");
			setIdEcos([]);
			await Swal.fire({
				icon: "success",
				title: "Solicitud enviada",
				text: `Se registró la jornada del ${formatFecha(payload.fecha_desde)} al ${formatFecha(payload.fecha_hasta)}. Pendiente de aprobación del moderador.`,
				timer: 3000,
				showConfirmButton: false,
				confirmButtonColor: "#1C837F",
			});
			setSubmitStatus("idle");
		} catch (err: unknown) {
			const e = err as { data?: { message?: string }; status?: number };
			setSubmitStatus("idle");
			setError(
				e?.data?.message ||
					(e?.status === 409
						? "Ya existe una solicitud pendiente que se solapa con este rango y equipo."
						: "No se pudo registrar la solicitud."),
			);
			throw err;
		}
	};

	const handleSubmitDisponibilidad = async (event: FormEvent) => {
		event.preventDefault();
		if (idEcos.length === 0) {
			setError("Selecciona al menos un tipo de eco");
			return;
		}
		setError(null);

		if (selectedCells.length > 0) {
			setSubmitStatus("loading");
			let creados = 0;
			let lastError: unknown = null;
			for (const cellKey of selectedCells) {
				const [dateKey, hourValue] = cellKey.split("|");
				if (!dateKey || !hourValue) continue;
				const hora_fin = computeHoraFin(hourValue);
				if (!hora_fin) continue;
				for (const id_eco of idEcos) {
					try {
						await crearDisponibilidad({
							fecha: dateKey,
							hora_inicio: hourValue,
							hora_fin,
							id_eco,
						}).unwrap();
						creados += 1;
					} catch (err) {
						lastError = err;
					}
				}
			}
			setSubmitStatus("done");
			setSelectedCells([]);
			setIdEcos([]);
			if (creados > 0) {
				await Swal.fire({
					icon: "success",
					title: "Disponibilidad agregada",
					text: `Se agregaron ${creados} bloque${creados !== 1 ? "s" : ""} exitosamente.`,
					timer: 3000,
					showConfirmButton: false,
					confirmButtonColor: "#1C837F",
				});
			}
			if (lastError) {
				const err: any = lastError;
				const apiMessage =
					err?.data?.message ||
					err?.error ||
					(err as Error).message ||
					"No se pudo enviar una o más disponibilidades";
				if (err?.status === 409) {
					const conflictMessage =
						apiMessage ||
						"Ya solicitaste este eco en uno o mas horarios, o ya hay citas en esos horarios.";
					setError(conflictMessage);
					await showConflict(conflictMessage);
				} else {
					setError(apiMessage);
				}
			}
			setSubmitStatus("idle");
			return;
		}

		await submitDisponibilidad({
			fecha,
			hora_inicio: horaInicio,
			id_ecos: idEcos,
		});
		setFecha("");
		setHoraInicio("");
		setIdEcos([]);
	};

	const days = useMemo(() => {
		return Array.from({ length: 7 }, (_, idx) => {
			const date = new Date(weekStart);
			date.setDate(date.getDate() + idx);
			return date;
		});
	}, [weekStart]);

	const dayKeys = useMemo(() => days.map(getLocalDateKey), [days]);

	const dayLabels = useMemo(
		() => days.map((day) => formatShortDay(day)),
		[days],
	);

	const weekRangeLabel = useMemo(() => {
		const start = days[0];
		const end = days[6];
		if (!start || !end) return "";
		const startLabel = start.toLocaleDateString("es-VE", {
			day: "2-digit",
			month: "short",
		});
		const endLabel = end.toLocaleDateString("es-VE", {
			day: "2-digit",
			month: "short",
		});
		return `${startLabel} - ${endLabel}`;
	}, [days]);

	const bloquesMap = useMemo(() => {
		const map = new Map<string, Disponibilidad>();
		const counts = new Map<string, number>();

		// Mapear bloques de disponibilidad (propuestas / aprobadas)
		bloques.forEach((bloque) => {
			const dateKey = getDateKey(bloque.fecha);
			const hourKey =
				bloque.hora_inicio.length === 5
					? `${bloque.hora_inicio}:00`
					: bloque.hora_inicio;
			const cellKey = `${dateKey}|${hourKey}`;

			// Convertir al tipo Disponibilidad del calendario (fecha debe ser string)
			const disponibilidad: Disponibilidad = {
				...bloque,
				fecha:
					typeof bloque.fecha === "string"
						? bloque.fecha
						: bloque.fecha.toISOString().split("T")[0],
			};

			const existing = map.get(cellKey);
			if (!existing) {
				map.set(cellKey, disponibilidad);
				counts.set(cellKey, 1);
			} else {
				const newCount = (counts.get(cellKey) || 1) + 1;
				counts.set(cellKey, newCount);

				// Si hay más de un eco para este horario, mostrar un label genérico
				map.set(cellKey, {
					...existing,
					eco_nombre: newCount > 1 ? "Varios ecos" : existing.eco_nombre,
				});
			}
		});

		// Mapear citas (tienen prioridad visual sobre bloques de disponibilidad)
		citas.forEach((cita) => {
			const dateKey = getDateKey(cita.fecha_cita);
			const hourKey =
				cita.hora_cita.length === 5 ? `${cita.hora_cita}:00` : cita.hora_cita;
			const cellKey = `${dateKey}|${hourKey}`;
			const horaFin = computeHoraFin(hourKey);
			map.set(cellKey, {
				id_disponibilidad: `cita-${cita.id_cita}`,
				fecha: dateKey,
				hora_inicio: hourKey,
				hora_fin: horaFin,
				estado: 4,
				estado_pago: Number(cita.estado_pago),
				estado_cita: Number(cita.estado_cita),
			});
		});

		for (const slot of previewSlots) {
			if (!dayKeys.includes(slot.fecha)) continue;
			const hourKey =
				slot.hora_inicio.length === 5
					? `${slot.hora_inicio}:00`
					: slot.hora_inicio;
			const cellKey = `${slot.fecha}|${hourKey}`;
			if (map.has(cellKey)) continue;
			const horaFinSlot =
				slot.hora_fin.length === 5 ? `${slot.hora_fin}:00` : slot.hora_fin;
			map.set(cellKey, {
				id_disponibilidad: `preview-${cellKey}`,
				fecha: slot.fecha,
				hora_inicio: hourKey,
				hora_fin: horaFinSlot,
				estado: -2,
				eco_nombre: previewEcoLabel,
			});
		}

		return map;
	}, [bloques, citas, previewSlots, dayKeys, previewEcoLabel]);

	const handleCellClick = async (dateKey: string, hourValue: string) => {
		if (!isEspecialista) return;
		const cellKey = `${dateKey}|${hourValue}`;
		const bloque = bloquesMap.get(cellKey);
		if (bloque?.estado === -2) {
			return;
		}
		if (bloque) {
			const isCita = bloque.id_disponibilidad.startsWith("cita-");
			if (bloque.estado === 4 && isCita) {
				if (bloque.estado_pago !== 1) {
					await Swal.fire({
						title: "Pago pendiente",
						text: "No puedes marcar esta cita hasta que el pago sea aprobado.",
						icon: "info",
						confirmButtonText: "Entendido",
						confirmButtonColor: "#1C837F",
					});
					return;
				}
				if (bloque.estado_cita === 3) {
					await Swal.fire({
						title: "Cita ya atendida",
						icon: "info",
						confirmButtonText: "Listo",
						confirmButtonColor: "#1C837F",
					});
					return;
				}
				const today = new Date().toISOString().slice(0, 10);
				if (dateKey > today) {
					await Swal.fire({
						title: "Aún no puedes marcar esta cita",
						text: "Solo puedes marcar como atendida cuando llegue el día.",
						icon: "info",
						confirmButtonText: "Entendido",
						confirmButtonColor: "#1C837F",
					});
					return;
				}
				const confirmResult = await Swal.fire({
					title: "¿Marcar cita como atendida?",
					text: "Esta acción confirma que el paciente fue atendido.",
					icon: "question",
					showCancelButton: true,
					confirmButtonText: "Sí, atender",
					cancelButtonText: "No",
					confirmButtonColor: "#1C837F",
					cancelButtonColor: "#9FD8E1",
				});
				if (!confirmResult.isConfirmed) return;
				try {
					const citaId = bloque.id_disponibilidad.replace("cita-", "");
					await marcarAtendida(citaId).unwrap();
				} catch (err) {
					setError((err as Error).message ?? "No se pudo marcar como atendida");
				}
				return;
			}
			if (bloque.estado === 4 || bloque.estado === 2 || bloque.estado === 3) return;
			const confirmResult = await Swal.fire({
				title: "¿Cancelar disponibilidad?",
				text: "Este bloque pasará a estado cancelado.",
				icon: "warning",
				showCancelButton: true,
				confirmButtonText: "Sí, cancelar",
				cancelButtonText: "No",
				footer:
					"<span style=\"font-size:12px;color:#3f5b5a;\">Si deseas volver a solicitar la fecha, puedes hacerlo desde el select.</span>",
				confirmButtonColor: "#1C837F",
				cancelButtonColor: "#9FD8E1",
			});
			if (!confirmResult.isConfirmed) {
				return;
			}
			setCancelingId(bloque.id_disponibilidad);
			try {
				await cancelarDisponibilidad(bloque.id_disponibilidad).unwrap();
			} catch (err) {
				setError((err as Error).message ?? "No se pudo cancelar el bloque");
			} finally {
				setCancelingId(null);
			}
			return;
		}
		if (dateKey < minFecha) return;
		// Toggle celda vacía en la selección múltiple
		setSelectedCells((prev) =>
			prev.includes(cellKey)
				? prev.filter((k) => k !== cellKey)
				: [...prev, cellKey],
		);
	};

	const mergedBloques = useMemo(() => {
		// Normalizar bloques de disponibilidad (asegurar que fecha sea string)
		const normalizedBloques: Disponibilidad[] = bloques.map((bloque) => ({
			...bloque,
			fecha:
				typeof bloque.fecha === "string"
					? bloque.fecha
					: bloque.fecha.toISOString().split("T")[0],
		}));

		// Convertir citas a elementos tipo Disponibilidad independientes
		const citaBloques: Disponibilidad[] = citas.map((cita) => {
			const dateKey = getDateKey(cita.fecha_cita);
			const hourKey =
				cita.hora_cita.length === 5 ? `${cita.hora_cita}:00` : cita.hora_cita;
			const horaFin = computeHoraFin(hourKey);
			return {
				id_disponibilidad: `cita-${cita.id_cita}`,
				fecha: dateKey,
				hora_inicio: hourKey,
				hora_fin: horaFin,
				estado: 4,
				estado_pago: Number(cita.estado_pago),
				estado_cita: Number(cita.estado_cita),
			} as Disponibilidad;
		});

		// Para el listado de "Mis bloques" queremos ver cada bloque individual,
		// por eso NO colapsamos por celda como en el calendario visual.
		return [...normalizedBloques, ...citaBloques];
	}, [bloques, citas]);

	const filteredBloques = useMemo(() => {
		const normalized = [...mergedBloques].sort((a, b) => {
			const keyA = `${getDateKey(a.fecha)} ${a.hora_inicio}`;
			const keyB = `${getDateKey(b.fecha)} ${b.hora_inicio}`;
			return keyA.localeCompare(keyB);
		});
		const todayKey = getLocalDateKey(new Date());
		switch (filter) {
			case "pendientes":
				return normalized.filter((b) => b.estado === 0);
			case "citas":
				return normalized.filter(
					(b) =>
						b.estado === 4 &&
						b.estado_cita !== 3 &&
						getDateKey(b.fecha) >= todayKey,
				);
			case "aprobadas":
				return normalized.filter((b) => b.estado === 1);
			case "rechazadas":
				return normalized.filter((b) => b.estado === 2);
			case "canceladas":
				return normalized.filter((b) => b.estado === 3);
			default:
				return normalized;
		}
	}, [mergedBloques, filter]);

	const itemsPerPage = 6;
	const totalPages = Math.max(1, Math.ceil(filteredBloques.length / itemsPerPage));
	const currentPage = Math.min(page, totalPages);
	const pagedBloques = filteredBloques.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage,
	);

	useEffect(() => {
		setPage(1);
	}, [filter]);

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
			<section className="space-y-6 min-w-0">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold text-brand-900">Calendario</h1>
					<p className="text-sm text-brand-800">
						Agenda semanal y gestión de disponibilidades.
					</p>
				</div>

				<div className="rounded-2xl bg-paper p-4 shadow-sm max-h-[60vh] overflow-y-auto">
					<CalendarHeader
						weekRangeLabel={weekRangeLabel}
						onPrevWeek={() => {
							const prev = new Date(weekStart);
							prev.setDate(prev.getDate() - 7);
							setWeekStart(prev);
						}}
						onNextWeek={() => {
							const next = new Date(weekStart);
							next.setDate(next.getDate() + 7);
							setWeekStart(next);
						}}
					/>
					<CalendarLegend
						items={[
							{ label: "Aprobada", colorClass: "bg-brand-700" },
							{ label: "Pendiente", colorClass: "bg-accent" },
							{ label: "Cita", colorClass: "bg-sky-500" },
							{ label: "Pago pendiente", colorClass: "bg-amber-400" },
							{ label: "Atendida", colorClass: "bg-emerald-500" },
							{ label: "Cancelada", colorClass: "bg-brand-900" },
							{ label: "Rechazada", colorClass: "bg-red-500" },
							...(selectedCells.length > 0
								? [{ label: "Seleccionada (clic para quitar)", colorClass: "bg-brand-200" }]
								: []),
						]}
					/>
					<CalendarGrid
						dayLabels={dayLabels}
						dayKeys={dayKeys}
						timeOptions={timeOptions}
						bloquesMap={bloquesMap}
						isEspecialista={isEspecialista}
						minFecha={minFecha}
						busyCell={busyCell}
						cancelingId={cancelingId}
						selectedCells={selectedCells}
						estadoColor={estadoColor}
						estadoLabel={estadoLabel}
						formatHora={formatHora}
						formatFecha={formatFecha}
						onCellClick={handleCellClick}
					/>
				</div>
			</section>

			<aside className="space-y-4 min-w-0">
				{isEspecialista ? (
					<DisponibilidadForm
						fecha={fecha}
						horaInicio={horaInicio}
						idEcos={idEcos}
						minFecha={minFecha}
						timeOptions={timeOptions}
						selectedCellsCount={selectedCells.length}
						onClearSelection={() => setSelectedCells([])}
						onSubmitMacro={handleSubmitMacro}
						onPreviewSlotsChange={onPreviewSlotsChange}
						error={
							error ??
							(bloquesError as Error | undefined)?.message ??
							(citasError as Error | undefined)?.message ??
							null
						}
						submitStatus={submitStatus}
						onFechaChange={setFecha}
						onHoraInicioChange={setHoraInicio}
						onIdEcosChange={setIdEcos}
						onSubmit={handleSubmitDisponibilidad}
						onCancel={
							fecha || horaInicio || idEcos.length || selectedCells.length > 0
								? () => {
									setFecha("");
									setHoraInicio("");
									setIdEcos([]);
									setSelectedCells([]);
									setPreviewSlots([]);
								}
								: undefined
						}
					/>
				) : (
					<div className="rounded-2xl bg-paper p-4 text-center text-xs text-brand-800 shadow-sm">
						Este calendario es interactivo solo para especialistas.
					</div>
				)}

				<BloquesList
					bloques={pagedBloques}
					loading={loadingBloques}
					filter={filter}
					filterOptions={
						[
							{ id: "todas", label: "Todas" },
							{ id: "pendientes", label: "Pendientes" },
							{ id: "citas", label: "Citas" },
							{ id: "aprobadas", label: "Aprobadas" },
							{ id: "rechazadas", label: "Rechazadas" },
							{ id: "canceladas", label: "Canceladas" },
						] as FilterOption[]
					}
					currentPage={currentPage}
					totalPages={totalPages}
					onFilterChange={setFilter}
					onPageChange={setPage}
					formatFecha={formatFecha}
					formatHora={formatHora}
					estadoLabel={estadoLabel}
					estadoColor={estadoColor}
				/>
			</aside>
		</div>
	);
};

export default CalendarioPage;
