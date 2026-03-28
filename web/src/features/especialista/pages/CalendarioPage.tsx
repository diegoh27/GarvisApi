import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { FileDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth, formatFechaLocal } from "../../../shared";
import {
	type FilterOption,
	type Disponibilidad,
	type TimeOption,
	CalendarGrid,
	DisponibilidadForm,
	BloquesList,
} from "../../calendario";
import type { SlotPreview } from "../../calendario/utils/slotUtils";
import { generateSlotsRange } from "../../calendario/utils/slotUtils";
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

const formatShortDayUpper = (date: Date) => {
	const weekday = date
		.toLocaleDateString("es-VE", { weekday: "short" })
		.replace(".", "")
		.toUpperCase();
	const short = weekday.length > 3 ? weekday.slice(0, 3) : weekday;
	return `${short} ${date.getDate()}`;
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
	const [cancelingId, setCancelingId] = useState<string | null>(null);
	const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "done">(
		"idle",
	);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState("todas");
	const [page, setPage] = useState(1);

	const [fechaDesde, setFechaDesde] = useState("");
	const [fechaHasta, setFechaHasta] = useState("");
	const [horaInicioRango, setHoraInicioRango] = useState("");
	const [horaFinRango, setHoraFinRango] = useState("");

	const [citaPopover, setCitaPopover] = useState<{
		bloque: Disponibilidad;
		x: number;
		y: number;
	} | null>(null);

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

	const previewEcoLabel = useMemo(() => {
		if (idEcos.length === 0) return "Vista previa";
		if (idEcos.length === 1) {
			const n = ecos.find((e) => e.id_eco === idEcos[0])?.nombre;
			return n ? `Vista previa · ${n}` : "Vista previa";
		}
		return `Vista previa · ${idEcos.length} ecos`;
	}, [idEcos, ecos]);

	const rangeDays = useMemo(() => {
		if (!fechaDesde || !fechaHasta) return 0;
		const startDate = new Date(`${fechaDesde}T00:00:00`);
		const endDate = new Date(`${fechaHasta}T00:00:00`);
		if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
		const diffMs = endDate.getTime() - startDate.getTime();
		return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
	}, [fechaDesde, fechaHasta]);

	const rangeError = useMemo(() => {
		if (!fechaDesde || !fechaHasta) return null;
		const startDate = new Date(`${fechaDesde}T00:00:00`);
		const endDate = new Date(`${fechaHasta}T00:00:00`);
		if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
			return "Fecha inválida";
		}
		if (endDate < startDate) return "La fecha hasta debe ser mayor o igual a la fecha desde";
		if (rangeDays > 31) return "El rango máximo permitido es de 31 días";
		return null;
	}, [fechaDesde, fechaHasta, rangeDays]);

	const previewSlots = useMemo((): SlotPreview[] => {
		if (!fechaDesde || !fechaHasta || !horaInicioRango || !horaFinRango) return [];
		if (rangeError) return [];
		return generateSlotsRange(fechaDesde, fechaHasta, horaInicioRango, horaFinRango);
	}, [fechaDesde, fechaHasta, horaInicioRango, horaFinRango, rangeError]);

	const highlightSlotKeys = useMemo(() => {
		const set = new Set<string>();
		for (const slot of previewSlots) {
			const hourKey =
				slot.hora_inicio.length === 5 ? `${slot.hora_inicio}:00` : slot.hora_inicio;
			set.add(`${slot.fecha}|${hourKey}`);
		}
		return set;
	}, [previewSlots]);

	const timeOptions = useMemo<TimeOption[]>(() => {
		const options: TimeOption[] = [];
		for (let hour = 6; hour < 20; hour += 1) {
			for (let minute = 0; minute < 60; minute += 20) {
				const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
				options.push({
					value,
					label: buildTimeLabel(hour, minute),
				});
			}
		}
		return options;
	}, []);

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
		return `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}:00`;
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
			const ecosSeleccionados = ecos.filter((eco) => exitosos.includes(eco.id_eco));
			const nombresEcos = ecosSeleccionados.map((eco) => eco.nombre);
			const ecosTexto =
				nombresEcos.length === 1
					? `con el eco "${nombresEcos[0]}"`
					: `con los ecos: ${nombresEcos.join(", ")}`;

			await Swal.fire({
				icon: "success",
				title: "Disponibilidad agregada",
				text: `La disponibilidad para el ${formatFecha(payload.fecha)} a las ${formatHora(payload.hora_inicio)} ${ecosTexto} ha sido agregada exitosamente.`,
				timer: 3000,
				showConfirmButton: false,
				confirmButtonColor: "#1C837F",
			});
		}

		if (lastError) {
			const err: unknown = lastError;
			const apiMessage =
				(err as { data?: { message?: string } })?.data?.message ||
				(err as Error).message ||
				"No se pudo enviar una o más disponibilidades";

			if ((err as { status?: number }).status === 409) {
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

	const clearRango = useCallback(() => {
		setFechaDesde("");
		setFechaHasta("");
		setHoraInicioRango("");
		setHoraFinRango("");
	}, []);

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
			setFecha("");
			setHoraInicio("");
			setIdEcos([]);
			clearRango();
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
		await submitDisponibilidad({
			fecha,
			hora_inicio: horaInicio,
			id_ecos: idEcos,
		});
		setFecha("");
		setHoraInicio("");
		setIdEcos([]);
	};

	const onRangeSelectFromGrid = useCallback(
		(payload: {
			fechaDesde: string;
			fechaHasta: string;
			horaInicio: string;
			horaFin: string;
		}) => {
			setFechaDesde(payload.fechaDesde);
			setFechaHasta(payload.fechaHasta);
			setHoraInicioRango(payload.horaInicio);
			setHoraFinRango(payload.horaFin);
		},
		[],
	);

	const days = useMemo(() => {
		return Array.from({ length: 7 }, (_, idx) => {
			const date = new Date(weekStart);
			date.setDate(date.getDate() + idx);
			return date;
		});
	}, [weekStart]);

	const dayKeys = useMemo(() => days.map(getLocalDateKey), [days]);

	const dayLabels = useMemo(() => days.map((day) => formatShortDayUpper(day)), [days]);

	const weekRangeLabel = useMemo(() => {
		const start = days[0];
		const end = days[6];
		if (!start || !end) return "";
		const startLabel = start.toLocaleDateString("es-VE", {
			day: "2-digit",
			month: "long",
		});
		const endLabel = end.toLocaleDateString("es-VE", {
			day: "2-digit",
			month: "long",
			year: "numeric",
		});
		return `${startLabel} — ${endLabel}`;
	}, [days]);

	const bloquesMap = useMemo(() => {
		const map = new Map<string, Disponibilidad>();
		const counts = new Map<string, number>();

		bloques.forEach((bloque) => {
			const dateKey = getDateKey(bloque.fecha);
			const hourKey =
				bloque.hora_inicio.length === 5 ? `${bloque.hora_inicio}:00` : bloque.hora_inicio;
			const cellKeyStr = `${dateKey}|${hourKey}`;

			const disponibilidad: Disponibilidad = {
				...bloque,
				fecha:
					typeof bloque.fecha === "string"
						? bloque.fecha
						: bloque.fecha.toISOString().split("T")[0],
			};

			const existing = map.get(cellKeyStr);
			if (!existing) {
				map.set(cellKeyStr, disponibilidad);
				counts.set(cellKeyStr, 1);
			} else {
				const newCount = (counts.get(cellKeyStr) || 1) + 1;
				counts.set(cellKeyStr, newCount);
				map.set(cellKeyStr, {
					...existing,
					eco_nombre: newCount > 1 ? "Varios ecos" : existing.eco_nombre,
				});
			}
		});

		citas.forEach((cita) => {
			const dateKey = getDateKey(cita.fecha_cita);
			const hourKey =
				cita.hora_cita.length === 5 ? `${cita.hora_cita}:00` : cita.hora_cita;
			const cellKeyStr = `${dateKey}|${hourKey}`;
			const horaFin = computeHoraFin(hourKey);
			map.set(cellKeyStr, {
				id_disponibilidad: `cita-${cita.id_cita}`,
				fecha: dateKey,
				hora_inicio: hourKey,
				hora_fin: horaFin,
				estado: 4,
				estado_pago: Number(cita.estado_pago),
				estado_cita: Number(cita.estado_cita),
				eco_nombre: cita.eco_nombre,
				paciente_nombre: cita.paciente_nombre,
				paciente_apellido: cita.paciente_apellido,
			});
		});

		for (const slot of previewSlots) {
			if (!dayKeys.includes(slot.fecha)) continue;
			const hourKey =
				slot.hora_inicio.length === 5 ? `${slot.hora_inicio}:00` : slot.hora_inicio;
			const cellKeyStr = `${slot.fecha}|${hourKey}`;
			if (map.has(cellKeyStr)) continue;
			const horaFinSlot =
				slot.hora_fin.length === 5 ? `${slot.hora_fin}:00` : slot.hora_fin;
			map.set(cellKeyStr, {
				id_disponibilidad: `preview-${cellKeyStr}`,
				fecha: slot.fecha,
				hora_inicio: hourKey,
				hora_fin: horaFinSlot,
				estado: -2,
				eco_nombre: previewEcoLabel,
			});
		}

		return map;
	}, [bloques, citas, previewSlots, dayKeys, previewEcoLabel]);

	const handleCitaPopoverOpen = useCallback(
		(bloque: Disponibilidad, anchor: { x: number; y: number }) => {
			setCitaPopover({ bloque, x: anchor.x, y: anchor.y });
		},
		[],
	);

	const closeCitaPopover = useCallback(() => setCitaPopover(null), []);

	useEffect(() => {
		if (!citaPopover) return;
		const close = () => setCitaPopover(null);
		const id = window.setTimeout(() => {
			document.addEventListener("click", close);
		}, 0);
		return () => {
			window.clearTimeout(id);
			document.removeEventListener("click", close);
		};
	}, [citaPopover]);

	const handleMarcarAtendidaFromPopover = async () => {
		if (!citaPopover) return;
		const bloque = citaPopover.bloque;
		const dateKey = getDateKey(bloque.fecha);
		closeCitaPopover();

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
	};

	const handleBloqueDisponibilidadClick = async (bloque: Disponibilidad) => {
		if (bloque.estado === 4 || bloque.estado === 2 || bloque.estado === 3) return;
		const confirmResult = await Swal.fire({
			title: "¿Cancelar disponibilidad?",
			text: "Este bloque pasará a estado cancelado.",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Sí, cancelar",
			cancelButtonText: "No",
			footer:
				"<span style=\"font-size:12px;color:#3f5b5a;\">Si deseas volver a solicitar la fecha, puedes hacerlo desde el formulario.</span>",
			confirmButtonColor: "#1C837F",
			cancelButtonColor: "#9FD8E1",
		});
		if (!confirmResult.isConfirmed) return;
		setCancelingId(bloque.id_disponibilidad);
		try {
			await cancelarDisponibilidad(bloque.id_disponibilidad).unwrap();
		} catch (err) {
			setError((err as Error).message ?? "No se pudo cancelar el bloque");
		} finally {
			setCancelingId(null);
		}
	};

	const mergedBloques = useMemo(() => {
		const normalizedBloques: Disponibilidad[] = bloques.map((bloque) => ({
			...bloque,
			fecha:
				typeof bloque.fecha === "string"
					? bloque.fecha
					: bloque.fecha.toISOString().split("T")[0],
		}));

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

	const popoverPaciente =
		citaPopover?.bloque.paciente_nombre || citaPopover?.bloque.paciente_apellido
			? `${citaPopover.bloque.paciente_nombre ?? ""} ${citaPopover.bloque.paciente_apellido ?? ""}`.trim()
			: "Paciente";

	return (
		<div className="min-w-0">
			<div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
				<div>
					<h1 className="font-headline text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl">
						Mi agenda y disponibilidad
					</h1>
					<p className="mt-2 font-medium text-slate-500">
						Gestiona tus jornadas laborales y solicitudes de servicio.
					</p>
				</div>
				<button
					type="button"
					className="inline-flex items-center gap-2 self-start rounded-xl bg-cloud px-5 py-2.5 text-sm font-semibold text-brand-800 transition hover:bg-mist sm:self-auto"
					onClick={() => {
						void Swal.fire({
							icon: "info",
							title: "Exportar",
							text: "La exportación estará disponible próximamente.",
							confirmButtonColor: "#1C837F",
						});
					}}
				>
					<FileDown className="h-4 w-4" />
					Exportar
				</button>
			</div>

			<div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-10">
				<section className="min-w-0 space-y-4 xl:col-span-7">
					<div className="rounded-3xl border border-mist/80 bg-paper p-6 shadow-sm">
						<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex flex-wrap items-center gap-3">
								<h2 className="font-headline text-lg font-bold capitalize text-brand-900 sm:text-xl">
									{weekRangeLabel}
								</h2>
								<div className="flex rounded-lg bg-cloud p-1">
									<button
										type="button"
										className="rounded p-1 transition hover:bg-paper hover:shadow-sm"
										onClick={() => {
											const prev = new Date(weekStart);
											prev.setDate(prev.getDate() - 7);
											setWeekStart(prev);
										}}
										aria-label="Semana anterior"
									>
										<ChevronLeft className="h-5 w-5 text-slate-600" />
									</button>
									<button
										type="button"
										className="rounded p-1 transition hover:bg-paper hover:shadow-sm"
										onClick={() => {
											const next = new Date(weekStart);
											next.setDate(next.getDate() + 7);
											setWeekStart(next);
										}}
										aria-label="Semana siguiente"
									>
										<ChevronRight className="h-5 w-5 text-slate-600" />
									</button>
								</div>
							</div>
							<div className="flex rounded-xl bg-cloud p-1 text-sm font-semibold">
								<button
									type="button"
									disabled
									className="rounded-lg px-4 py-1.5 text-slate-400"
								>
									Día
								</button>
								<button
									type="button"
									className="rounded-lg bg-paper px-4 py-1.5 text-brand-800 shadow-sm"
								>
									Semana
								</button>
								<button
									type="button"
									disabled
									className="rounded-lg px-4 py-1.5 text-slate-400"
								>
									Mes
								</button>
							</div>
						</div>

						<CalendarGrid
							dayLabels={dayLabels}
							dayKeys={dayKeys}
							timeOptions={timeOptions}
							bloquesMap={bloquesMap}
							isEspecialista={isEspecialista}
							minFecha={minFecha}
							cancelingId={cancelingId}
							highlightSlotKeys={highlightSlotKeys}
							formatHora={formatHora}
							onCitaClick={handleCitaPopoverOpen}
							onBloqueDisponibilidadClick={(bloque) => {
								void handleBloqueDisponibilidadClick(bloque);
							}}
							onRangeSelect={onRangeSelectFromGrid}
						/>
					</div>

					<div className="rounded-2xl border border-mist/60 bg-paper p-4">
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
					</div>
				</section>

				<aside className="min-w-0 space-y-6 xl:col-span-3">
					{citaPopover ? (
						<div
							className="fixed z-[200] w-[min(92vw,280px)] rounded-2xl border border-mist bg-paper p-4 shadow-2xl"
							style={{
								left: Math.min(
									typeof window !== "undefined" ? window.innerWidth - 300 : 0,
									citaPopover.x + 8,
								),
								top: citaPopover.y + 8,
							}}
							onClick={(e) => e.stopPropagation()}
							role="dialog"
							aria-label="Detalle de cita"
						>
							<p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
								Cita
							</p>
							<p className="mt-1 font-headline text-base font-bold text-brand-900">
								{popoverPaciente}
							</p>
							<p className="mt-2 text-sm text-slate-600">
								<span className="font-semibold text-slate-700">Hora: </span>
								{formatHora(citaPopover.bloque.hora_inicio)}
							</p>
							<p className="mt-1 text-sm text-slate-600">
								<span className="font-semibold text-slate-700">Tipo de eco: </span>
								{citaPopover.bloque.eco_nombre ?? "—"}
							</p>
							{citaPopover.bloque.estado_pago === 1 &&
								citaPopover.bloque.estado_cita !== 3 &&
								getDateKey(citaPopover.bloque.fecha) <=
									new Date().toISOString().slice(0, 10) && (
									<button
										type="button"
										className="mt-4 w-full rounded-xl bg-brand-800 py-2.5 text-sm font-semibold text-paper"
										onClick={() => void handleMarcarAtendidaFromPopover()}
									>
										Marcar como atendida
									</button>
								)}
						</div>
					) : null}

					{isEspecialista ? (
						<DisponibilidadForm
							fecha={fecha}
							horaInicio={horaInicio}
							idEcos={idEcos}
							minFecha={minFecha}
							timeOptions={timeOptions}
							fechaDesde={fechaDesde}
							fechaHasta={fechaHasta}
							horaInicioRango={horaInicioRango}
							horaFinRango={horaFinRango}
							onFechaDesdeChange={setFechaDesde}
							onFechaHastaChange={setFechaHasta}
							onHoraInicioRangoChange={setHoraInicioRango}
							onHoraFinRangoChange={setHoraFinRango}
							onClearSelection={clearRango}
							onSubmitMacro={handleSubmitMacro}
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
								fecha ||
								horaInicio ||
								idEcos.length ||
								fechaDesde ||
								fechaHasta ||
								horaInicioRango ||
								horaFinRango
									? () => {
											setFecha("");
											setHoraInicio("");
											setIdEcos([]);
											clearRango();
										}
									: undefined
							}
						/>
					) : (
						<div className="rounded-2xl bg-paper p-4 text-center text-xs text-brand-800 shadow-sm">
							Este calendario es interactivo solo para especialistas.
						</div>
					)}
				</aside>
			</div>
		</div>
	);
};

export default CalendarioPage;
