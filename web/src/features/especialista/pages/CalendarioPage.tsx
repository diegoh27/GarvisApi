import { type FormEvent, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { useAuth } from "../../../shared";
import type {
	FilterOption,
	Disponibilidad,
	TimeOption,
} from "../../../components/calendario/types";
import CalendarHeader from "../../../components/calendario/CalendarHeader";
import CalendarLegend from "../../../components/calendario/CalendarLegend";
import CalendarGrid from "../../../components/calendario/CalendarGrid";
import DisponibilidadForm from "../../../components/calendario/DisponibilidadForm";
import BloquesList from "../../../components/calendario/BloquesList";
import {
	useCancelarDisponibilidadMutation,
	useCrearDisponibilidadMutation,
	useGetMisBloquesQuery,
	useGetMisCitasQuery,
	useMarcarAtendidaMutation,
} from "../especialistaApi";
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

const buildHourLabel = (hour24: number) => {
	const period = hour24 >= 12 ? "PM" : "AM";
	const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
	return `${hour12}:00 ${period}`;
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

const formatFecha = (value: string) => {
	if (!value) return "";
	const dateKey = getDateKey(value);
	const date = new Date(`${dateKey}T00:00:00`);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString("es-VE", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
};

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
	const [idEco, setIdEco] = useState("");
	const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
	const [busyCell, setBusyCell] = useState<string | null>(null);
	const [cancelingId, setCancelingId] = useState<string | null>(null);
	const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "done">(
		"idle",
	);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState("todas");
	const [page, setPage] = useState(1);
	const [selectedCell, setSelectedCell] = useState<string | null>(null);

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
	const [cancelarDisponibilidad] = useCancelarDisponibilidadMutation();
	const [marcarAtendida] = useMarcarAtendidaMutation();
	const { data: ecos = [] } = useGetEcosQuery();

	const timeOptions = useMemo<TimeOption[]>(
		() =>
			Array.from({ length: 14 }, (_, idx) => {
				const hour = 6 + idx;
				return {
					value: `${String(hour).padStart(2, "0")}:00:00`,
					label: buildHourLabel(hour),
				};
			}),
		[],
	);

	const computeHoraFin = (hora: string) => {
		const [h, m] = hora.split(":").map(Number);
		if (Number.isNaN(h) || Number.isNaN(m)) return "";
		const nextHour = h + 1;
		return `${String(nextHour).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
	};

	const submitDisponibilidad = async (payload: {
		fecha: string;
		hora_inicio: string;
		id_eco?: string;
	}) => {
		setError(null);
		if (!payload.fecha || !payload.hora_inicio) {
			setError("Completa fecha y hora de inicio");
			return;
		}
		if (!payload.id_eco) {
			setError("Selecciona un tipo de eco");
			return;
		}
		const hora_fin = computeHoraFin(payload.hora_inicio);
		if (!hora_fin) {
			setError("Hora invalida");
			return;
		}
		setSubmitStatus("loading");
		try {
			await crearDisponibilidad({
				fecha: payload.fecha,
				hora_inicio: payload.hora_inicio,
				hora_fin,
				id_eco: payload.id_eco,
			}).unwrap();
			setSubmitStatus("done");
			setSelectedCell(null);
			
			// Obtener el nombre del eco
			const ecoSeleccionado = ecos.find((eco) => eco.id_eco === payload.id_eco);
			const ecoNombre = ecoSeleccionado?.nombre || "Eco seleccionado";
			
			await Swal.fire({
				icon: "success",
				title: "Disponibilidad agregada",
				text: `La disponibilidad para el ${formatFecha(payload.fecha)} a las ${formatHora(payload.hora_inicio)} con el eco "${ecoNombre}" ha sido agregada exitosamente.`,
				timer: 3000,
				showConfirmButton: false,
				confirmButtonColor: "#1C837F",
			});
		} catch (err) {
			setError((err as Error).message ?? "No se pudo enviar disponibilidad");
		} finally {
			setSubmitStatus("idle");
		}
	};

	const handleSubmitDisponibilidad = async (event: FormEvent) => {
		event.preventDefault();
		await submitDisponibilidad({
			fecha,
			hora_inicio: horaInicio,
			id_eco: idEco,
		});
		setFecha("");
		setHoraInicio("");
		setIdEco("");
		setSelectedCell(null);
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
		bloques.forEach((bloque) => {
			const dateKey = getDateKey(bloque.fecha);
			const hourKey =
				bloque.hora_inicio.length === 5
					? `${bloque.hora_inicio}:00`
					: bloque.hora_inicio;
			// Convertir al tipo Disponibilidad del calendario (fecha debe ser string)
			const disponibilidad: Disponibilidad = {
				...bloque,
				fecha: typeof bloque.fecha === "string" ? bloque.fecha : bloque.fecha.toISOString().split("T")[0],
			};
			map.set(`${dateKey}|${hourKey}`, disponibilidad);
		});
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
		return map;
	}, [bloques, citas]);

	const handleCellClick = async (dateKey: string, hourValue: string) => {
		if (!isEspecialista) return;
		if (dateKey < minFecha) return;
		const cellKey = `${dateKey}|${hourValue}`;
		const bloque = bloquesMap.get(cellKey);
		if (bloque) {
			const isCita = bloque.id_disponibilidad.startsWith("cita-");
			if (bloque.estado === 4 && isCita) {
				if (bloque.estado_pago === 0) {
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
		// Mostrar formulario para seleccionar eco y marcar celda como seleccionada
		setFecha(dateKey);
		setHoraInicio(hourValue);
		setIdEco("");
		setSelectedCell(cellKey);
	};

	const mergedBloques = useMemo(() => {
		const map = new Map<string, Disponibilidad>();
		bloques.forEach((bloque) => {
			const dateKey = getDateKey(bloque.fecha);
			const hourKey =
				bloque.hora_inicio.length === 5
					? `${bloque.hora_inicio}:00`
					: bloque.hora_inicio;
			map.set(`${dateKey}|${hourKey}`, bloque);
		});
		citas.forEach((cita) => {
			const dateKey = getDateKey(cita.fecha_cita);
			const hourKey =
				cita.hora_cita.length === 5 ? `${cita.hora_cita}:00` : cita.hora_cita;
			const key = `${dateKey}|${hourKey}`;
			const horaFin = computeHoraFin(hourKey);
			map.set(key, {
				id_disponibilidad: `cita-${cita.id_cita}`,
				fecha: dateKey,
				hora_inicio: hourKey,
				hora_fin: horaFin,
				estado: 4,
				estado_pago: Number(cita.estado_pago),
				estado_cita: Number(cita.estado_cita),
			});
		});
		return Array.from(map.values());
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

				<div className="rounded-2xl bg-paper p-4 shadow-sm">
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
						selectedCell={selectedCell}
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
						idEco={idEco}
						minFecha={minFecha}
						timeOptions={timeOptions}
						error={
							error ??
							(bloquesError as Error | undefined)?.message ??
							(citasError as Error | undefined)?.message ??
							null
						}
						submitStatus={submitStatus}
						onFechaChange={setFecha}
						onHoraInicioChange={setHoraInicio}
						onIdEcoChange={setIdEco}
						onSubmit={handleSubmitDisponibilidad}
						onCancel={
							fecha || horaInicio || idEco
								? () => {
										setFecha("");
										setHoraInicio("");
										setIdEco("");
										setSelectedCell(null);
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
