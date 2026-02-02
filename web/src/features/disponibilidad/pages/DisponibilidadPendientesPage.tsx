import { useState, useMemo, useEffect } from "react";
import Swal from "sweetalert2";
import { PageShell } from "../../../shared";
import {
	useGetDisponibilidadPendientesQuery,
	useAprobarDisponibilidadMutation,
	useAprobarDisponibilidadLoteMutation,
	useAprobarDisponibilidadPorCriteriosMutation,
	useRechazarDisponibilidadMutation,
} from "../disponibilidadApi";
import type { DisponibilidadPendiente } from "../disponibilidadApi";
import { toDateKey } from "../utils/dateUtils";
import {
	FiltrosDisponibilidadPendientes,
	FiltroFechaCard,
	DisponibilidadPendienteCard,
	type FiltrosDisponibilidadPendientesValues,
} from "../components";

const ITEMS_PER_PAGE = 25;

const DEFAULT_FILTROS: FiltrosDisponibilidadPendientesValues = {
	query: "",
	ordenFecha: "reciente",
	fechaDesde: "",
	fechaHasta: "",
	horaDesde: "",
	horaHasta: "",
	ecoId: "",
};

const DisponibilidadPendientesPage = () => {
	const { data: disponibilidades = [], isLoading, refetch } =
		useGetDisponibilidadPendientesQuery();
	const [aprobarDisponibilidad, { isLoading: isAprobando }] =
		useAprobarDisponibilidadMutation();
	const [aprobarDisponibilidadLote, { isLoading: isAprobandoLote }] =
		useAprobarDisponibilidadLoteMutation();
	const [aprobarPorCriterios, { isLoading: isAprobandoPorCriterios }] =
		useAprobarDisponibilidadPorCriteriosMutation();
	const [rechazarDisponibilidad, { isLoading: isRechazando }] =
		useRechazarDisponibilidadMutation();
	const [filtros, setFiltros] = useState<FiltrosDisponibilidadPendientesValues>(DEFAULT_FILTROS);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [currentPage, setCurrentPage] = useState(1);
	// Aprobar por criterios (especialista + rango fechas + rango horas)
	const [criteriosEspecialista, setCriteriosEspecialista] = useState("");
	const [criteriosFechaDesde, setCriteriosFechaDesde] = useState("");
	const [criteriosFechaHasta, setCriteriosFechaHasta] = useState("");
	const [criteriosHoraDesde, setCriteriosHoraDesde] = useState("");
	const [criteriosHoraHasta, setCriteriosHoraHasta] = useState("");

	const toggleSelect = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const selectPageIds = (ids: string[]) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			ids.forEach((id) => next.add(id));
			return next;
		});
	};

	const clearSelection = () => setSelectedIds(new Set());

	// Opciones de eco: únicos a partir de los datos
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
		return list.sort((a, b) => a.label.localeCompare(b.label));
	}, [disponibilidades]);

	// Especialistas únicos (para aprobar por criterios)
	const especialistaOptions = useMemo(() => {
		const seen = new Set<string>();
		const list: { id: string; label: string }[] = [];
		for (const d of disponibilidades) {
			if (seen.has(d.id_especialista)) continue;
			seen.add(d.id_especialista);
			list.push({
				id: d.id_especialista,
				label: `${d.nombre} ${d.apellido}`.trim(),
			});
		}
		return list.sort((a, b) => a.label.localeCompare(b.label));
	}, [disponibilidades]);

	// Filtrar y ordenar
	const filteredAndSorted = useMemo(() => {
		let list = [...disponibilidades];

		// Búsqueda por eco, especialista o fecha
		if (filtros.query.trim()) {
			const q = filtros.query.toLowerCase().trim();
			list = list.filter((d) => {
				const especialista = `${d.nombre} ${d.apellido}`.toLowerCase();
				const eco = (d.eco_nombre ?? "").toLowerCase();
				const fechaStr = toDateKey(d.fecha);
				return (
					especialista.includes(q) ||
					eco.includes(q) ||
					fechaStr.includes(q)
				);
			});
		}

		// Rango de fechas
		if (filtros.fechaDesde) {
			list = list.filter((d) => toDateKey(d.fecha) >= filtros.fechaDesde);
		}
		if (filtros.fechaHasta) {
			list = list.filter((d) => toDateKey(d.fecha) <= filtros.fechaHasta);
		}

		// Filtro por eco
		if (filtros.ecoId) {
			list = list.filter(
				(d) => (d.eco_nombre ?? "") === filtros.ecoId || d.id_eco === filtros.ecoId,
			);
		}

		// Filtro por rango de horas (hora_inicio del bloque)
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
				const h = (d.hora_inicio ?? "").padEnd(8, ":00").slice(0, 8);
				return h <= hasta;
			});
		}

		// Orden por fecha (y hora)
		list.sort((a, b) => {
			const keyA = `${toDateKey(a.fecha)}T${a.hora_inicio}`;
			const keyB = `${toDateKey(b.fecha)}T${b.hora_inicio}`;
			if (filtros.ordenFecha === "reciente") {
				return keyB.localeCompare(keyA);
			}
			return keyA.localeCompare(keyB);
		});

		return list;
	}, [disponibilidades, filtros]);

	// Paginación
	const totalPages = Math.max(
		1,
		Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE),
	);
	const paginated = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return filteredAndSorted.slice(start, start + ITEMS_PER_PAGE);
	}, [filteredAndSorted, currentPage]);

	useEffect(() => {
		setCurrentPage(1);
	}, [filtros.query, filtros.ordenFecha, filtros.fechaDesde, filtros.fechaHasta, filtros.ecoId]);

	const handleAprobar = async (id: string) => {
		setSelectedId(id);
		try {
			await aprobarDisponibilidad(id).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Disponibilidad aprobada",
				text: "El bloque de disponibilidad ha sido aprobado exitosamente.",
				timer: 2000,
				showConfirmButton: false,
			});
			refetch();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudo aprobar la disponibilidad",
			});
		} finally {
			setSelectedId(null);
		}
	};

	const handleRechazar = async (id: string) => {
		const result = await Swal.fire({
			icon: "warning",
			title: "¿Rechazar disponibilidad?",
			text: "Esta acción marcará el bloque como rechazado.",
			showCancelButton: true,
			confirmButtonText: "Sí, rechazar",
			cancelButtonText: "Cancelar",
			confirmButtonColor: "#dc2626",
		});

		if (!result.isConfirmed) return;

		setSelectedId(id);
		try {
			await rechazarDisponibilidad(id).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Disponibilidad rechazada",
				text: "El bloque ha sido marcado como rechazado.",
				timer: 2000,
				showConfirmButton: false,
			});
			refetch();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudo rechazar la disponibilidad",
			});
		} finally {
			setSelectedId(null);
		}
	};

	const handleAprobarLote = async () => {
		const ids = Array.from(selectedIds);
		if (ids.length === 0) return;
		const result = await Swal.fire({
			icon: "question",
			title: "Aprobar en lote",
			text: `Se aprobarán ${ids.length} bloque${ids.length !== 1 ? "s" : ""} de disponibilidad. ¿Continuar?`,
			showCancelButton: true,
			confirmButtonText: "Sí, aprobar",
			cancelButtonText: "Cancelar",
			confirmButtonColor: "#1a365d",
		});
		if (!result.isConfirmed) return;
		setSelectedId("lote");
		try {
			await aprobarDisponibilidadLote({ ids }).unwrap();
			setSelectedIds(new Set());
			await Swal.fire({
				icon: "success",
				title: "Disponibilidades aprobadas",
				text: `Se aprobaron ${ids.length} bloque${ids.length !== 1 ? "s" : ""} correctamente.`,
				timer: 2000,
				showConfirmButton: false,
			});
			refetch();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudo aprobar en lote",
			});
		} finally {
			setSelectedId(null);
		}
	};

	const handleAprobarPorCriterios = async () => {
		if (!criteriosEspecialista.trim()) {
			Swal.fire({
				icon: "warning",
				title: "Selecciona un especialista",
				text: "El especialista es obligatorio para aprobar por criterios.",
			});
			return;
		}
		const result = await Swal.fire({
			icon: "question",
			title: "Aprobar por criterios",
			text: "Se aprobarán todas las disponibilidades pendientes del especialista seleccionado que coincidan con el rango de fechas (si lo indicaste). ¿Continuar?",
			showCancelButton: true,
			confirmButtonText: "Sí, aprobar",
			cancelButtonText: "Cancelar",
			confirmButtonColor: "#1a365d",
		});
		if (!result.isConfirmed) return;
		setSelectedId("criterios");
		try {
			const data = await aprobarPorCriterios({
				id_especialista: criteriosEspecialista,
				fecha_desde: criteriosFechaDesde || undefined,
				fecha_hasta: criteriosFechaHasta || undefined,
				hora_desde: criteriosHoraDesde || undefined,
				hora_hasta: criteriosHoraHasta || undefined,
			}).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Aprobación por criterios",
				text:
					data.aprobados === 0
						? "No hay bloques pendientes que coincidan con los criterios."
						: `Se aprobaron ${data.aprobados} bloque${data.aprobados !== 1 ? "s" : ""} correctamente.`,
				timer: 2000,
				showConfirmButton: false,
			});
			refetch();
			setCriteriosEspecialista("");
			setCriteriosFechaDesde("");
			setCriteriosFechaHasta("");
			setCriteriosHoraDesde("");
			setCriteriosHoraHasta("");
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudo aprobar por criterios",
			});
		} finally {
			setSelectedId(null);
		}
	};

	return (
		<PageShell
			title="Aprobar disponibilidades"
			description="Revisar y aprobar bloques de disponibilidad propuestos por especialistas."
		>
			<div className="space-y-4">
				<FiltrosDisponibilidadPendientes
					value={filtros}
					onChange={setFiltros}
					ecoOptions={ecoOptions}
				/>

				<FiltroFechaCard
					fechaDesde={filtros.fechaDesde}
					fechaHasta={filtros.fechaHasta}
				/>

				{/* Aprobar por criterios: especialista + rango fechas + rango horas */}
				<div className="rounded-lg border border-brand-200 bg-brand-50/30 p-4">
					<h3 className="mb-3 text-sm font-semibold text-brand-800">
						Aprobar por criterios
					</h3>
					<p className="mb-3 text-xs text-brand-700">
						Aprobar de una vez todas las pendientes de un especialista (y opcionalmente rango de fechas y/o de horas). Ideal cuando solicitó muchos bloques (ej. 2 días todo el día y todos los ecos).
					</p>
					<div className="flex flex-wrap items-end gap-3">
						<div className="min-w-[180px]">
							<label className="mb-1 block text-xs font-medium text-brand-700">
								Especialista <span className="text-red-500">*</span>
							</label>
							<select
								value={criteriosEspecialista}
								onChange={(e) => setCriteriosEspecialista(e.target.value)}
								className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-sm text-brand-900 outline-none focus:border-brand-700"
							>
								<option value="">Seleccionar...</option>
								{especialistaOptions.map((opt) => (
									<option key={opt.id} value={opt.id}>
										{opt.label}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="mb-1 block text-xs font-medium text-brand-700">
								Desde fecha
							</label>
							<input
								type="date"
								value={criteriosFechaDesde}
								onChange={(e) => setCriteriosFechaDesde(e.target.value)}
								className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-sm text-brand-900 outline-none focus:border-brand-700"
							/>
						</div>
						<div>
							<label className="mb-1 block text-xs font-medium text-brand-700">
								Hasta fecha
							</label>
							<input
								type="date"
								value={criteriosFechaHasta}
								onChange={(e) => setCriteriosFechaHasta(e.target.value)}
								className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-sm text-brand-900 outline-none focus:border-brand-700"
							/>
						</div>
						<div>
							<label className="mb-1 block text-xs font-medium text-brand-700">
								Desde hora
							</label>
							<input
								type="time"
								value={criteriosHoraDesde}
								onChange={(e) => setCriteriosHoraDesde(e.target.value)}
								className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-sm text-brand-900 outline-none focus:border-brand-700"
							/>
						</div>
						<div>
							<label className="mb-1 block text-xs font-medium text-brand-700">
								Hasta hora
							</label>
							<input
								type="time"
								value={criteriosHoraHasta}
								onChange={(e) => setCriteriosHoraHasta(e.target.value)}
								className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-sm text-brand-900 outline-none focus:border-brand-700"
							/>
						</div>
						<button
							type="button"
							onClick={handleAprobarPorCriterios}
							disabled={
								!criteriosEspecialista.trim() ||
								isAprobandoPorCriterios ||
								selectedId === "criterios"
							}
							className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-paper hover:bg-brand-800 disabled:opacity-50"
						>
							{isAprobandoPorCriterios && selectedId === "criterios"
								? "Procesando..."
								: "Aprobar todas las que coincidan"}
						</button>
					</div>
				</div>

				{isLoading ? (
					<div className="py-8 text-center text-brand-600">
						Cargando disponibilidades pendientes...
					</div>
				) : filteredAndSorted.length === 0 ? (
					<div className="rounded-lg border border-brand-200 bg-paper p-8 text-center">
						<p className="text-brand-600">
							{filtros.query.trim() ||
								filtros.fechaDesde ||
								filtros.fechaHasta ||
								filtros.horaDesde ||
								filtros.horaHasta ||
								filtros.ecoId
								? "No hay resultados con los filtros aplicados."
								: "No hay disponibilidades pendientes de aprobar."}
						</p>
					</div>
				) : (
					<>
						<div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2">
							<button
								type="button"
								onClick={() => selectPageIds(paginated.map((d) => d.id_disponibilidad))}
								className="rounded-full border border-brand-300 bg-paper px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
							>
								Seleccionar página
							</button>
							<button
								type="button"
								onClick={() =>
									setSelectedIds(
										new Set(filteredAndSorted.map((d) => d.id_disponibilidad)),
									)
								}
								className="rounded-full border border-brand-300 bg-paper px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
							>
								Seleccionar todas ({filteredAndSorted.length})
							</button>
							{selectedIds.size > 0 && (
								<>
									<button
										type="button"
										onClick={clearSelection}
										className="rounded-full border border-brand-300 bg-paper px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
									>
										Limpiar selección
									</button>
									<button
										type="button"
										onClick={handleAprobarLote}
										disabled={isAprobandoLote || selectedId === "lote"}
										className="rounded-full bg-brand-700 px-3 py-1.5 text-xs font-semibold text-paper hover:bg-brand-800 disabled:opacity-50"
									>
										{isAprobandoLote && selectedId === "lote"
											? "Procesando..."
											: `Aprobar seleccionados (${selectedIds.size})`}
									</button>
								</>
							)}
						</div>
						<div className="space-y-3">
							{paginated.map((disp: DisponibilidadPendiente) => (
								<DisponibilidadPendienteCard
									key={disp.id_disponibilidad}
									disp={disp}
									onAprobar={handleAprobar}
									onRechazar={handleRechazar}
									isAprobando={isAprobando}
									isRechazando={isRechazando}
									selectedId={selectedId}
									showCheckbox
									selected={selectedIds.has(disp.id_disponibilidad)}
									onToggleSelect={() => toggleSelect(disp.id_disponibilidad)}
								/>
							))}
						</div>

						{totalPages > 1 && (
							<div className="mt-4 flex items-center justify-between border-t border-mist pt-4">
								<div className="text-xs text-brand-800">
									Mostrando{" "}
									{(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
									{Math.min(
										currentPage * ITEMS_PER_PAGE,
										filteredAndSorted.length,
									)}{" "}
									de {filteredAndSorted.length} disponibilidades
								</div>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() =>
											setCurrentPage((p) => Math.max(1, p - 1))
										}
										disabled={currentPage === 1}
										className="rounded-full border border-mist bg-paper px-3 py-1.5 text-xs text-brand-800 transition-colors hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-50"
									>
										Anterior
									</button>
									<span className="text-xs text-brand-800">
										Página {currentPage} de {totalPages}
									</span>
									<button
										type="button"
										onClick={() =>
											setCurrentPage((p) => Math.min(totalPages, p + 1))
										}
										disabled={currentPage === totalPages}
										className="rounded-full border border-mist bg-paper px-3 py-1.5 text-xs text-brand-800 transition-colors hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-50"
									>
										Siguiente
									</button>
								</div>
							</div>
						)}
					</>
				)}
			</div>
		</PageShell>
	);
};

export default DisponibilidadPendientesPage;
