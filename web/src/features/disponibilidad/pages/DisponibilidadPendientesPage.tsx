import { useState, useMemo, useEffect } from "react";
import Swal from "sweetalert2";
import {
	Calendar,
	Filter,
	Plus,
	Stethoscope,
	TrendingUp,
	ScanHeart,
} from "lucide-react";
import { PageShell } from "../../../shared";
import {
	useGetDisponibilidadAdminQuery,
	useAprobarDisponibilidadLoteMutation,
	useRechazarDisponibilidadMutation,
	useAprobarSolicitudMacroMutation,
	useRechazarSolicitudMacroMutation,
	useCrearSolicitudMacroManualMutation,
	type DisponibilidadSolicitudMacro,
} from "../disponibilidadApi";
import { useGetAllEspecialistasQuery } from "../../moderadores/moderadoresApi";
import { useGetEcosQuery } from "../../ecos/ecosApi";
import { toDateKey } from "../utils/dateUtils";
import {
	groupDisponibilidadSegmentos,
	type DisponibilidadSegmento,
} from "../utils/groupDisponibilidadSegmentos";
import {
	FiltrosDisponibilidadPendientes,
	FiltroFechaCard,
	JornadaSolicitudCard,
	SolicitudMacroCard,
	type FiltrosDisponibilidadPendientesValues,
} from "../components";

const ITEMS_PER_PAGE = 12;

const DEFAULT_FILTROS: FiltrosDisponibilidadPendientesValues = {
	query: "",
	ordenFecha: "reciente",
	estado: "pendientes",
	fechaDesde: "",
	fechaHasta: "",
	horaDesde: "",
	horaHasta: "",
	ecoId: "",
};

/** Inicio de semana (lunes) y fin (domingo) en hora local, para KPI. */
function rangoSemanaActual(): { desde: string; hasta: string } {
	const ahora = new Date();
	const dow = ahora.getDay();
	const diff = dow === 0 ? -6 : 1 - dow;
	const lun = new Date(ahora);
	lun.setDate(ahora.getDate() + diff);
	lun.setHours(0, 0, 0, 0);
	const dom = new Date(lun);
	dom.setDate(lun.getDate() + 6);
	const toKey = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
	return { desde: toKey(lun), hasta: toKey(dom) };
}

type UnifiedItem =
	| { kind: "macro"; id: string; solicitud: DisponibilidadSolicitudMacro }
	| { kind: "segmento"; id: string; segmento: DisponibilidadSegmento };

const DisponibilidadPendientesPage = () => {
	const { data: gestion, isLoading, refetch } = useGetDisponibilidadAdminQuery();
	const disponibilidades = gestion?.bloques ?? [];
	const solicitudesAll = gestion?.solicitudes ?? [];
	const [aprobarDisponibilidadLote, { isLoading: isAprobandoLote }] =
		useAprobarDisponibilidadLoteMutation();
	const [rechazarDisponibilidad, { isLoading: isRechazando }] =
		useRechazarDisponibilidadMutation();
	const [aprobarSolicitudMacro, { isLoading: isAprobandoMacro }] =
		useAprobarSolicitudMacroMutation();
	const [rechazarSolicitudMacro] = useRechazarSolicitudMacroMutation();
	const [crearSolicitudManual, { isLoading: isCreandoManual }] =
		useCrearSolicitudMacroManualMutation();
	const { data: especialistasLista = [] } = useGetAllEspecialistasQuery();
	const { data: ecosLista = [] } = useGetEcosQuery();

	const [filtros, setFiltros] = useState<FiltrosDisponibilidadPendientesValues>(DEFAULT_FILTROS);
	const [idEspecialistaFiltro, setIdEspecialistaFiltro] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [busySegment, setBusySegment] = useState<string | null>(null);
	const [showManual, setShowManual] = useState(false);
	const [manualForm, setManualForm] = useState({
		id_especialista: "",
		fecha_desde: "",
		fecha_hasta: "",
		hora_inicio: "07:00:00",
		hora_fin: "12:00:00",
		id_eco: "",
	});

	const clearFiltros = () => {
		setFiltros(DEFAULT_FILTROS);
		setIdEspecialistaFiltro("");
	};

	const ecoOptions = useMemo(() => {
		const seen = new Set<string>();
		const list: { id: string; label: string }[] = [];
		for (const d of disponibilidades) {
			const nombre = d.eco_nombre ?? "";
			if (nombre && !seen.has(nombre)) {
				seen.add(nombre);
				list.push({ id: nombre, label: nombre });
			}
		}
		for (const s of solicitudesAll) {
			const nombre = s.eco_nombre ?? "";
			if (nombre && !seen.has(nombre)) {
				seen.add(nombre);
				list.push({ id: nombre, label: nombre });
			}
		}
		return list.sort((a, b) => a.label.localeCompare(b.label));
	}, [disponibilidades, solicitudesAll]);

	const especialistaOptions = useMemo(() => {
		const m = new Map<string, string>();
		for (const d of disponibilidades) {
			const label = `${d.nombre} ${d.apellido}`.trim();
			m.set(d.id_especialista, label);
		}
		for (const s of solicitudesAll) {
			const label = `${s.nombre} ${s.apellido}`.trim();
			m.set(s.id_especialista, label);
		}
		return Array.from(m.entries())
			.map(([id, label]) => ({ id, label }))
			.sort((a, b) => a.label.localeCompare(b.label));
	}, [disponibilidades, solicitudesAll]);

	const applyEstadoBloque = (list: typeof disponibilidades) => {
		switch (filtros.estado) {
			case "pendientes":
				return list.filter((d) => d.estado === 0);
			case "aprobadas":
				return list.filter((d) => d.estado === 1);
			case "historial":
				return list.filter((d) => d.estado === 2 || d.estado === 3);
			case "rechazadas":
				return list.filter((d) => d.estado === 2);
			case "canceladas":
				return list.filter((d) => d.estado === 3);
			case "citas":
				return list.filter((d) => d.estado === 4);
			default:
				return list;
		}
	};

	const applyEstadoSolicitud = (list: DisponibilidadSolicitudMacro[]) => {
		switch (filtros.estado) {
			case "pendientes":
				return list.filter((s) => s.estado === 0);
			case "aprobadas":
				return list.filter((s) => s.estado === 1);
			case "historial":
				return list.filter((s) => s.estado === 2 || s.estado === 3);
			case "rechazadas":
				return list.filter((s) => s.estado === 2);
			case "canceladas":
				return list.filter((s) => s.estado === 3);
			case "citas":
				return [];
			default:
				return list;
		}
	};

	const filteredBloques = useMemo(() => {
		let list = applyEstadoBloque([...disponibilidades]);
		if (idEspecialistaFiltro) {
			list = list.filter((d) => d.id_especialista === idEspecialistaFiltro);
		}
		if (filtros.query.trim()) {
			const q = filtros.query.toLowerCase().trim();
			list = list.filter((d) => {
				const especialista = `${d.nombre} ${d.apellido}`.toLowerCase();
				const eco = (d.eco_nombre ?? "").toLowerCase();
				const fechaStr = toDateKey(d.fecha);
				return especialista.includes(q) || eco.includes(q) || fechaStr.includes(q);
			});
		}
		if (filtros.fechaDesde) {
			list = list.filter((d) => toDateKey(d.fecha) >= filtros.fechaDesde);
		}
		if (filtros.fechaHasta) {
			list = list.filter((d) => toDateKey(d.fecha) <= filtros.fechaHasta);
		}
		if (filtros.ecoId) {
			list = list.filter(
				(d) => (d.eco_nombre ?? "") === filtros.ecoId || d.id_eco === filtros.ecoId,
			);
		}
		if (filtros.horaDesde) {
			const desde = filtros.horaDesde.padEnd(8, ":00").slice(0, 8);
			list = list.filter((d) => {
				const h = (d.hora_inicio ?? "").padEnd(8, ":00").slice(0, 8);
				return h >= desde;
			});
		}
		if (filtros.horaHasta) {
			const hasta = filtros.horaHasta.padEnd(8, ":00").slice(0, 8);
			list = list.filter((d) => {
				const h = (d.hora_fin ?? "").padEnd(8, ":00").slice(0, 8);
				return h <= hasta;
			});
		}
		list.sort((a, b) => {
			const keyA = `${toDateKey(a.fecha)}T${a.hora_inicio}`;
			const keyB = `${toDateKey(b.fecha)}T${b.hora_inicio}`;
			if (filtros.ordenFecha === "reciente") return keyB.localeCompare(keyA);
			return keyA.localeCompare(keyB);
		});
		return list;
	}, [disponibilidades, filtros, idEspecialistaFiltro]);

	const filteredSolicitudes = useMemo(() => {
		let list = applyEstadoSolicitud([...solicitudesAll]);
		if (idEspecialistaFiltro) {
			list = list.filter((s) => s.id_especialista === idEspecialistaFiltro);
		}
		if (filtros.query.trim()) {
			const q = filtros.query.toLowerCase().trim();
			list = list.filter((s) => {
				const especialista = `${s.nombre} ${s.apellido}`.toLowerCase();
				const eco = (s.eco_nombre ?? "").toLowerCase();
				return (
					especialista.includes(q) ||
					eco.includes(q) ||
					s.fecha_desde.includes(q) ||
					s.fecha_hasta.includes(q)
				);
			});
		}
		if (filtros.fechaDesde) {
			list = list.filter((s) => s.fecha_hasta >= filtros.fechaDesde);
		}
		if (filtros.fechaHasta) {
			list = list.filter((s) => s.fecha_desde <= filtros.fechaHasta);
		}
		if (filtros.ecoId) {
			list = list.filter(
				(s) =>
					(s.eco_nombre ?? "") === filtros.ecoId || s.id_eco === filtros.ecoId,
			);
		}
		if (filtros.horaDesde) {
			const desde = filtros.horaDesde.padEnd(8, ":00").slice(0, 8);
			list = list.filter((s) => {
				const h = (s.hora_inicio ?? "").padEnd(8, ":00").slice(0, 8);
				return h >= desde;
			});
		}
		if (filtros.horaHasta) {
			const hasta = filtros.horaHasta.padEnd(8, ":00").slice(0, 8);
			list = list.filter((s) => {
				const h = (s.hora_fin ?? "").padEnd(8, ":00").slice(0, 8);
				return h <= hasta;
			});
		}
		list.sort((a, b) => {
			const keyA = `${a.fecha_desde}T${a.hora_inicio}`;
			const keyB = `${b.fecha_desde}T${b.hora_inicio}`;
			if (filtros.ordenFecha === "reciente") return keyB.localeCompare(keyA);
			return keyA.localeCompare(keyB);
		});
		return list;
	}, [solicitudesAll, filtros, idEspecialistaFiltro]);

	const unifiedItems = useMemo((): UnifiedItem[] => {
		const macros: UnifiedItem[] = filteredSolicitudes.map((s) => ({
			kind: "macro",
			id: `s-${s.id_solicitud}`,
			solicitud: s,
		}));
		const segmentos = groupDisponibilidadSegmentos(filteredBloques);
		const segs: UnifiedItem[] = segmentos.map((seg) => ({
			kind: "segmento",
			id: seg.ids.join(","),
			segmento: seg,
		}));
		const sortKey = (u: UnifiedItem) => {
			if (u.kind === "macro") {
				return `${u.solicitud.fecha_desde}T${u.solicitud.hora_inicio}`;
			}
			return `${u.segmento.fecha}T${u.segmento.hora_inicio}`;
		};
		const merged = [...macros, ...segs];
		merged.sort((a, b) => {
			const ka = sortKey(a);
			const kb = sortKey(b);
			if (filtros.ordenFecha === "reciente") return kb.localeCompare(ka);
			return ka.localeCompare(kb);
		});
		return merged;
	}, [filteredSolicitudes, filteredBloques, filtros.ordenFecha]);

	const totalPages = Math.max(1, Math.ceil(unifiedItems.length / ITEMS_PER_PAGE));
	const paginatedItems = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return unifiedItems.slice(start, start + ITEMS_PER_PAGE);
	}, [unifiedItems, currentPage]);

	const { desde: semDesde, hasta: semHasta } = rangoSemanaActual();
	const totalSolicitudesPendientes = useMemo(() => {
		const macrosPend = solicitudesAll.filter((s) => s.estado === 0);
		const pendBloques = disponibilidades.filter((d) => d.estado === 0);
		const seg = groupDisponibilidadSegmentos(pendBloques);
		return macrosPend.length + seg.length;
	}, [solicitudesAll, disponibilidades]);

	const ratioAprobacionSemana = useMemo(() => {
		const enSem = disponibilidades.filter(
			(d) =>
				toDateKey(d.fecha) >= semDesde &&
				toDateKey(d.fecha) <= semHasta &&
				(d.estado === 0 || d.estado === 1),
		);
		const aprob = enSem.filter((d) => d.estado === 1).length;
		const total = enSem.length;
		if (total === 0) return 0;
		return Math.round((aprob / total) * 100);
	}, [disponibilidades, semDesde, semHasta]);

	useEffect(() => {
		setCurrentPage(1);
	}, [
		filtros.query,
		filtros.ordenFecha,
		filtros.fechaDesde,
		filtros.fechaHasta,
		filtros.ecoId,
		filtros.estado,
		idEspecialistaFiltro,
	]);

	const setTab = (tab: "pendientes" | "aprobadas" | "historial") => {
		const estado =
			tab === "pendientes"
				? "pendientes"
				: tab === "aprobadas"
					? "aprobadas"
					: "historial";
		setFiltros((f) => ({ ...f, estado }));
	};

	const tabActivo = (): "pendientes" | "aprobadas" | "historial" => {
		if (filtros.estado === "aprobadas") return "aprobadas";
		if (filtros.estado === "historial") return "historial";
		return "pendientes";
	};

	const handleAprobarSegmento = async (ids: string[]) => {
		const key = ids.join(",");
		setBusySegment(key);
		try {
			const res = await aprobarDisponibilidadLote({ ids }).unwrap();
			const d = res.data;
			const auto = d.rechazados_automatico ?? 0;
			const apr = d.aprobados ?? 0;
			let text: string;
			if (auto > 0 && apr > 0) {
				text = `Se aprobaron ${apr} bloque${apr !== 1 ? "s" : ""}; ${auto} quedaron archivado${auto !== 1 ? "s" : ""} por conflicto en el mismo equipo.`;
			} else if (auto > 0 && apr === 0) {
				text =
					auto === 1
						? "Ese horario ya estaba ocupado por otro especialista en el mismo equipo; se archivó como rechazado."
						: `${auto} bloques quedaron archivados por conflicto en el mismo equipo.`;
			} else {
				text =
					ids.length > 1
						? `Se aprobaron ${apr} bloque${apr !== 1 ? "s" : ""} de esta jornada.`
						: "La disponibilidad fue aprobada.";
			}
			await Swal.fire({
				icon: auto > 0 && apr === 0 ? "info" : "success",
				title: auto > 0 && apr === 0 ? "Solicitud archivada" : "Turno aprobado",
				text,
				timer: 2600,
				showConfirmButton: false,
			});
			refetch();
		} catch (error: unknown) {
			const msg =
				(error as { data?: { message?: string } })?.data?.message ||
				"No se pudo aprobar.";
			Swal.fire({ icon: "error", title: "Error", text: msg });
		} finally {
			setBusySegment(null);
		}
	};

	const handleArchivarSegmento = async (ids: string[]) => {
		const result = await Swal.fire({
			icon: "warning",
			title: "¿Archivar solicitud?",
			text: "Se marcarán como rechazados los bloques de esta jornada.",
			showCancelButton: true,
			confirmButtonText: "Sí, archivar",
			cancelButtonText: "Cancelar",
			confirmButtonColor: "#64748b",
		});
		if (!result.isConfirmed) return;
		const key = ids.join(",");
		setBusySegment(key);
		try {
			for (const id of ids) {
				await rechazarDisponibilidad(id).unwrap();
			}
			await Swal.fire({
				icon: "success",
				title: "Archivado",
				timer: 1800,
				showConfirmButton: false,
			});
			refetch();
		} catch (error: unknown) {
			const msg =
				(error as { data?: { message?: string } })?.data?.message ||
				"No se pudo archivar.";
			Swal.fire({ icon: "error", title: "Error", text: msg });
		} finally {
			setBusySegment(null);
		}
	};

	const handleAprobarMacro = async (idSolicitud: string) => {
		setBusySegment(`s-${idSolicitud}`);
		try {
			const res = await aprobarSolicitudMacro(idSolicitud).unwrap();
			const d = res.data;
			await Swal.fire({
				icon: "success",
				title: "Jornada procesada",
				text: `Se generaron ${d.bloques_creados} bloque(s) de 20 min. Omitidos por conflicto: ${d.bloques_omitidos}.`,
				timer: 3800,
				showConfirmButton: false,
			});
			refetch();
		} catch (error: unknown) {
			const msg =
				(error as { data?: { message?: string } })?.data?.message ||
				"No se pudo aprobar la solicitud.";
			Swal.fire({ icon: "error", title: "Error", text: msg });
		} finally {
			setBusySegment(null);
		}
	};

	const handleArchivarMacro = async (idSolicitud: string) => {
		const result = await Swal.fire({
			icon: "warning",
			title: "¿Rechazar solicitud de jornada?",
			text: "La solicitud macro se marcará como rechazada (no se generarán bloques).",
			showCancelButton: true,
			confirmButtonText: "Sí, rechazar",
			confirmButtonColor: "#dc2626",
			cancelButtonColor: "#64748b",
		});
		if (!result.isConfirmed) return;
		setBusySegment(`s-${idSolicitud}`);
		try {
			await rechazarSolicitudMacro(idSolicitud).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Solicitud rechazada",
				timer: 1800,
				showConfirmButton: false,
			});
			refetch();
		} catch (error: unknown) {
			const msg =
				(error as { data?: { message?: string } })?.data?.message ||
				"No se pudo rechazar la solicitud.";
			Swal.fire({ icon: "error", title: "Error", text: msg });
		} finally {
			setBusySegment(null);
		}
	};

	const handleSubmitManual = async () => {
		if (
			!manualForm.id_especialista ||
			!manualForm.fecha_desde ||
			!manualForm.fecha_hasta
		) {
			await Swal.fire({
				icon: "warning",
				title: "Datos incompletos",
				text: "Selecciona especialista y rango de fechas.",
			});
			return;
		}
		try {
			await crearSolicitudManual({
				id_especialista: manualForm.id_especialista,
				fecha_desde: manualForm.fecha_desde,
				fecha_hasta: manualForm.fecha_hasta,
				hora_inicio: manualForm.hora_inicio,
				hora_fin: manualForm.hora_fin,
				id_eco: manualForm.id_eco || null,
			}).unwrap();
			setShowManual(false);
			await Swal.fire({
				icon: "success",
				title: "Solicitud registrada",
				text: "Quedó pendiente de aprobación como las demás.",
				timer: 2400,
				showConfirmButton: false,
			});
			refetch();
		} catch (error: unknown) {
			const msg =
				(error as { data?: { message?: string } })?.data?.message ||
				"No se pudo crear la solicitud.";
			Swal.fire({ icon: "error", title: "Error", text: msg });
		}
	};

	const tab = tabActivo();
	const busy =
		isAprobandoLote ||
		isRechazando ||
		isAprobandoMacro ||
		isCreandoManual ||
		busySegment !== null;

	return (
		<PageShell
			title="Gestionar disponibilidades"
			description="Coordine solicitudes de jornada: un solo vistazo por médico y franja horaria. Un dispositivo: no pueden solaparse dos especialistas en el mismo horario al aprobar."
		>
			<div className="space-y-10">
				{/* Tabs */}
				<nav className="flex gap-10 border-b border-zinc-200/80">
					{(
						[
							["pendientes", "Pendientes"],
							["aprobadas", "Aprobadas"],
							["historial", "Historial"],
						] as const
					).map(([key, label]) => (
						<button
							key={key}
							type="button"
							onClick={() => setTab(key)}
							className={`pb-4 text-base transition-all ${
								tab === key
									? "border-b-2 border-[#006965] font-semibold text-[#006965]"
									: "font-medium text-zinc-400 hover:text-zinc-600"
							}`}
						>
							{label}
						</button>
					))}
				</nav>

				{/* Filtros estilo Bento (sin tocar layout global Sidebar/Header) */}
				<section className="grid grid-cols-1 gap-4 p-2 md:grid-cols-4">
					<div className="group relative">
						<label className="absolute -top-2.5 left-4 z-[1] bg-[#faf9f9] px-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
							Especialista
						</label>
						<div className="flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white/50 px-4 py-3.5 transition-all focus-within:border-[#006965]/30 group-hover:bg-white">
							<Stethoscope className="h-5 w-5 shrink-0 text-zinc-400" />
							<select
								value={idEspecialistaFiltro}
								onChange={(e) => setIdEspecialistaFiltro(e.target.value)}
								className="w-full border-none bg-transparent p-0 text-base text-zinc-700 focus:ring-0"
							>
								<option value="">Todos los especialistas</option>
								{especialistaOptions.map((o) => (
									<option key={o.id} value={o.id}>
										{o.label}
									</option>
								))}
							</select>
						</div>
					</div>
					<div className="group relative md:col-span-2">
						<label className="absolute -top-2.5 left-4 z-[1] bg-[#faf9f9] px-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
							Rango de fecha
						</label>
						<div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200/80 bg-white/50 px-4 py-3 transition-all focus-within:border-[#006965]/30 group-hover:bg-white">
							<Calendar className="h-5 w-5 shrink-0 text-zinc-400" />
							<input
								type="date"
								value={filtros.fechaDesde}
								onChange={(e) =>
									setFiltros((f) => ({ ...f, fechaDesde: e.target.value }))
								}
								className="min-w-0 flex-1 border-none bg-transparent text-base text-zinc-700 focus:ring-0"
							/>
							<span className="text-zinc-400">—</span>
							<input
								type="date"
								value={filtros.fechaHasta}
								onChange={(e) =>
									setFiltros((f) => ({ ...f, fechaHasta: e.target.value }))
								}
								className="min-w-0 flex-1 border-none bg-transparent text-base text-zinc-700 focus:ring-0"
							/>
						</div>
					</div>
					<div className="group relative">
						<label className="absolute -top-2.5 left-4 z-[1] bg-[#faf9f9] px-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
							Eco / estudio
						</label>
						<div className="flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white/50 px-4 py-3.5 transition-all focus-within:border-[#006965]/30 group-hover:bg-white">
							<ScanHeart className="h-5 w-5 shrink-0 text-zinc-400" />
							<select
								value={filtros.ecoId}
								onChange={(e) => setFiltros((f) => ({ ...f, ecoId: e.target.value }))}
								className="w-full border-none bg-transparent p-0 text-base text-zinc-700 focus:ring-0"
							>
								<option value="">Cualquier eco</option>
								{ecoOptions.map((o) => (
									<option key={o.id} value={o.id}>
										{o.label}
									</option>
								))}
							</select>
						</div>
					</div>
				</section>

				<div className="flex justify-end">
					<button
						type="button"
						onClick={() => refetch()}
						className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#006965] px-6 py-3 text-base font-semibold text-white shadow-sm shadow-[#006965]/20 transition-all hover:opacity-90"
					>
						<Filter className="h-4 w-4" />
						Aplicar / actualizar
					</button>
				</div>

				{isLoading ? (
					<div className="py-16 text-center text-zinc-500">Cargando solicitudes…</div>
				) : (
					<section className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
						{unifiedItems.length === 0 ? (
							<div className="col-span-1 flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
								<p className="text-base font-medium text-zinc-600">
									{filtros.query.trim() ||
									filtros.fechaDesde ||
									filtros.fechaHasta ||
									idEspecialistaFiltro ||
									filtros.ecoId
										? "No hay resultados con los filtros aplicados."
										: filtros.estado === "pendientes"
											? "No hay solicitudes pendientes."
											: "No hay datos para mostrar."}
								</p>
							</div>
						) : (
							paginatedItems.map((item) =>
								item.kind === "macro" ? (
									<SolicitudMacroCard
										key={item.id}
										solicitud={item.solicitud}
										onAprobar={handleAprobarMacro}
										onArchivar={handleArchivarMacro}
										disabled={busy || busySegment === item.id}
									/>
								) : (
									<JornadaSolicitudCard
										key={item.id}
										segmento={item.segmento}
										onAprobar={handleAprobarSegmento}
										onArchivar={handleArchivarSegmento}
										disabled={busy || busySegment === item.segmento.ids.join(",")}
									/>
								),
							)
						)}

						{filtros.estado === "pendientes" && (
							<button
								type="button"
								onClick={() => setShowManual(true)}
								className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200/80 bg-zinc-100/30 p-8 transition-all hover:border-[#006965]/20 hover:bg-white"
							>
								<div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
									<Plus className="h-6 w-6 text-[#006965]" />
								</div>
								<p className="mt-4 font-bold text-zinc-400 transition-colors hover:text-[#006965]">
									Nueva solicitud manual
								</p>
								<p className="mt-2 max-w-xs text-center text-sm text-zinc-400">
									Disponibilidad extraordinaria (suplencias), sin flujo automático del médico.
								</p>
							</button>
						)}

						<div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#006965] p-6 text-white shadow-xl shadow-[#006965]/10">
							<div className="absolute -bottom-4 -right-4 opacity-10">
								<ScanHeart className="h-32 w-32" />
							</div>
							<div className="relative z-[1]">
								<span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">
									Resumen global
								</span>
								<h4 className="mt-4 font-headline text-3xl font-bold">{totalSolicitudesPendientes}</h4>
								<p className="mt-1 text-base text-emerald-100/80">Solicitudes pendientes por procesar</p>
							</div>
							<div className="relative z-[1] mt-8 flex items-end justify-between">
								<div className="space-y-1">
									<div className="h-1.5 w-24 overflow-hidden rounded-full bg-emerald-800">
										<div
											className="h-full rounded-full bg-emerald-400 transition-all"
											style={{ width: `${ratioAprobacionSemana}%` }}
										/>
									</div>
									<p className="text-[10px] font-medium uppercase text-emerald-200">
										{ratioAprobacionSemana}% aprobadas (en semana)
									</p>
								</div>
								<TrendingUp className="h-8 w-8 text-emerald-400" />
							</div>
						</div>
					</section>
				)}

				{!isLoading && unifiedItems.length > 0 && totalPages > 1 && (
					<div className="flex items-center justify-between border-t border-zinc-200 pt-6">
						<p className="text-sm text-zinc-500">
							Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
							{Math.min(currentPage * ITEMS_PER_PAGE, unifiedItems.length)} de {unifiedItems.length}{" "}
							jornadas
						</p>
						<div className="flex gap-2">
							<button
								type="button"
								disabled={currentPage === 1}
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-sm text-zinc-700 disabled:opacity-40"
							>
								Anterior
							</button>
							<button
								type="button"
								disabled={currentPage === totalPages}
								onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
								className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-sm text-zinc-700 disabled:opacity-40"
							>
								Siguiente
							</button>
						</div>
					</div>
				)}

				<details className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
					<summary className="cursor-pointer text-base font-semibold text-zinc-700">
						Filtros avanzados
					</summary>
					<div className="mt-4 flex flex-col gap-6 lg:flex-row">
						<div className="flex-1 space-y-3">
							<p className="text-sm text-zinc-500">
								Búsqueda, horas y orden (vista detallada).
							</p>
							<FiltrosDisponibilidadPendientes
								value={filtros}
								onChange={setFiltros}
								ecoOptions={ecoOptions}
								onReset={clearFiltros}
							/>
						</div>
						<div className="w-full shrink-0 space-y-3 lg:w-72">
							<FiltroFechaCard fechaDesde={filtros.fechaDesde} fechaHasta={filtros.fechaHasta} />
						</div>
					</div>
				</details>

				{showManual && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
						<div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
							<h3 className="text-lg font-bold text-zinc-800">Nueva solicitud manual</h3>
							<p className="mt-1 text-base text-zinc-500">
								Cargue una jornada en nombre de un especialista (suplencias u horas extraordinarias).
							</p>
							<div className="mt-4 space-y-3">
								<label className="block text-sm font-semibold text-zinc-600">Especialista</label>
								<select
									value={manualForm.id_especialista}
									onChange={(e) =>
										setManualForm((f) => ({ ...f, id_especialista: e.target.value }))
									}
									className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-base"
								>
									<option value="">Seleccione…</option>
									{especialistasLista.map((e) => (
										<option key={e.id_especialista} value={e.id_especialista}>
											{e.nombre} {e.apellido}
										</option>
									))}
								</select>
								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="text-sm font-semibold text-zinc-600">Desde</label>
										<input
											type="date"
											value={manualForm.fecha_desde}
											onChange={(e) =>
												setManualForm((f) => ({ ...f, fecha_desde: e.target.value }))
											}
											className="mt-1 w-full rounded-xl border border-zinc-200 px-2 py-2 text-base"
										/>
									</div>
									<div>
										<label className="text-sm font-semibold text-zinc-600">Hasta</label>
										<input
											type="date"
											value={manualForm.fecha_hasta}
											onChange={(e) =>
												setManualForm((f) => ({ ...f, fecha_hasta: e.target.value }))
											}
											className="mt-1 w-full rounded-xl border border-zinc-200 px-2 py-2 text-base"
										/>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="text-sm font-semibold text-zinc-600">Hora inicio</label>
										<input
											type="time"
											value={manualForm.hora_inicio.slice(0, 5)}
											onChange={(e) =>
												setManualForm((f) => ({
													...f,
													hora_inicio: `${e.target.value}:00`,
												}))
											}
											className="mt-1 w-full rounded-xl border border-zinc-200 px-2 py-2 text-base"
										/>
									</div>
									<div>
										<label className="text-sm font-semibold text-zinc-600">Hora fin</label>
										<input
											type="time"
											value={manualForm.hora_fin.slice(0, 5)}
											onChange={(e) =>
												setManualForm((f) => ({
													...f,
													hora_fin: `${e.target.value}:00`,
												}))
											}
											className="mt-1 w-full rounded-xl border border-zinc-200 px-2 py-2 text-base"
										/>
									</div>
								</div>
								<div>
									<label className="text-sm font-semibold text-zinc-600">Eco (opcional)</label>
									<select
										value={manualForm.id_eco}
										onChange={(e) =>
											setManualForm((f) => ({ ...f, id_eco: e.target.value }))
										}
										className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base"
									>
										<option value="">Sin especificar</option>
										{ecosLista.map((eco) => (
											<option key={eco.id_eco} value={eco.id_eco}>
												{eco.nombre}
											</option>
										))}
									</select>
								</div>
							</div>
							<div className="mt-6 flex justify-end gap-2">
								<button
									type="button"
									onClick={() => setShowManual(false)}
									className="rounded-xl px-4 py-2 text-base text-zinc-600 hover:bg-zinc-100"
								>
									Cancelar
								</button>
								<button
									type="button"
									disabled={isCreandoManual}
									onClick={() => void handleSubmitManual()}
									className="rounded-xl bg-[#006965] px-5 py-2 text-base font-semibold text-white hover:opacity-90 disabled:opacity-50"
								>
									{isCreandoManual ? "Guardando…" : "Guardar solicitud"}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</PageShell>
	);
};

export default DisponibilidadPendientesPage;
