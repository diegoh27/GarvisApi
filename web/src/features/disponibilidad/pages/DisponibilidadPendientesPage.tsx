import { useState, useMemo, useEffect } from "react";
import Swal from "sweetalert2";
import { PageShell } from "../../../shared";
import {
	useGetDisponibilidadAdminQuery,
	useAprobarDisponibilidadMutation,
	useAprobarDisponibilidadLoteMutation,
	useRechazarDisponibilidadMutation,
	useCancelarDisponibilidadAdminMutation,
	useCancelarDisponibilidadLoteMutation,
	useEliminarDisponibilidadPasadaMutation,
	useEliminarDisponibilidadPorCriteriosMutation,
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
	estado: "todas",
	fechaDesde: "",
	fechaHasta: "",
	horaDesde: "",
	horaHasta: "",
	ecoId: "",
};

const DisponibilidadPendientesPage = () => {
	const { data: disponibilidades = [], isLoading, refetch } =
		useGetDisponibilidadAdminQuery();
	const [aprobarDisponibilidad, { isLoading: isAprobando }] =
		useAprobarDisponibilidadMutation();
	const [aprobarDisponibilidadLote, { isLoading: isAprobandoLote }] =
		useAprobarDisponibilidadLoteMutation();
	const [rechazarDisponibilidad, { isLoading: isRechazando }] =
		useRechazarDisponibilidadMutation();
	const [cancelarDisponibilidad, { isLoading: isCancelando }] =
		useCancelarDisponibilidadAdminMutation();
	const [cancelarDisponibilidadLote, { isLoading: isCancelandoLote }] =
		useCancelarDisponibilidadLoteMutation();
	const [eliminarDisponibilidadPasada, { isLoading: isEliminandoPasada }] =
		useEliminarDisponibilidadPasadaMutation();
	const [eliminarDisponibilidadPorCriterios, { isLoading: isEliminandoPorCriterios }] =
		useEliminarDisponibilidadPorCriteriosMutation();
	const [filtros, setFiltros] = useState<FiltrosDisponibilidadPendientesValues>(DEFAULT_FILTROS);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [currentPage, setCurrentPage] = useState(1);

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
	const clearFiltros = () => setFiltros(DEFAULT_FILTROS);

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

	// Filtrar y ordenar
	const filteredAndSorted = useMemo(() => {
		let list = [...disponibilidades];

		switch (filtros.estado) {
			case "pendientes":
				list = list.filter((d) => d.estado === 0);
				break;
			case "aprobadas":
				list = list.filter((d) => d.estado === 1);
				break;
			case "rechazadas":
				list = list.filter((d) => d.estado === 2);
				break;
			case "canceladas":
				list = list.filter((d) => d.estado === 3);
				break;
			case "citas":
				list = list.filter((d) => d.estado === 4);
				break;
			default:
				break;
		}

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

		// Filtro por rango de horas
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

	const filteredIds = useMemo(
		() => filteredAndSorted.map((d) => d.id_disponibilidad),
		[filteredAndSorted],
	);

	useEffect(() => {
		setCurrentPage(1);
	}, [
		filtros.query,
		filtros.ordenFecha,
		filtros.fechaDesde,
		filtros.fechaHasta,
		filtros.ecoId,
		filtros.estado,
	]);

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
		const selectedItems = filteredAndSorted.filter((d) =>
			selectedIds.has(d.id_disponibilidad),
		);
		const ids = selectedItems
			.filter((d) => d.estado === 0)
			.map((d) => d.id_disponibilidad);
		if (ids.length === 0) {
			await Swal.fire({
				icon: "warning",
				title: "No hay pendientes seleccionadas",
				text: "Selecciona bloques en estado pendiente para aprobar en lote.",
			});
			return;
		}
		const skipped = selectedIds.size - ids.length;
		const result = await Swal.fire({
			icon: "question",
			title: "Aprobar en lote",
			text: `Se aprobarán ${ids.length} bloque${ids.length !== 1 ? "s" : ""
				} de disponibilidad${skipped > 0 ? ` (se omiten ${skipped})` : ""}. ¿Continuar?`,
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

	const handleCancelar = async (id: string) => {
		const result = await Swal.fire({
			icon: "warning",
			title: "¿Cancelar disponibilidad?",
			text: "Esta acción marcará el bloque como cancelado.",
			showCancelButton: true,
			confirmButtonText: "Sí, cancelar",
			cancelButtonText: "Volver",
			confirmButtonColor: "#dc2626",
		});

		if (!result.isConfirmed) return;

		setSelectedId(id);
		try {
			await cancelarDisponibilidad(id).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Disponibilidad cancelada",
				text: "El bloque ha sido marcado como cancelado.",
				timer: 2000,
				showConfirmButton: false,
			});
			refetch();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudo cancelar la disponibilidad",
			});
		} finally {
			setSelectedId(null);
		}
	};

	const handleCancelarLote = async () => {
		const selectedItems = filteredAndSorted.filter((d) =>
			selectedIds.has(d.id_disponibilidad),
		);
		const ids = selectedItems
			.filter((d) => d.estado === 0 || d.estado === 1)
			.map((d) => d.id_disponibilidad);
		if (ids.length === 0) {
			await Swal.fire({
				icon: "warning",
				title: "No hay bloques cancelables",
				text: "Selecciona bloques pendientes o aprobados para cancelar en lote.",
			});
			return;
		}
		const skipped = selectedIds.size - ids.length;
		const result = await Swal.fire({
			icon: "warning",
			title: "Cancelar en lote",
			text: `Se cancelarán ${ids.length} bloque${ids.length !== 1 ? "s" : ""
				}${skipped > 0 ? ` (se omiten ${skipped})` : ""}. ¿Continuar?`,
			showCancelButton: true,
			confirmButtonText: "Sí, cancelar",
			cancelButtonText: "Volver",
			confirmButtonColor: "#dc2626",
		});
		if (!result.isConfirmed) return;
		setSelectedId("cancel-lote");
		try {
			const response = await cancelarDisponibilidadLote({ ids }).unwrap();
			const data = (response as { data?: { cancelados?: number; reservados?: string[] } })?.data;
			const cancelados = data?.cancelados ?? ids.length;
			const reservados = data?.reservados?.length ?? 0;
			await Swal.fire({
				icon: "success",
				title: "Disponibilidades canceladas",
				text:
					reservados > 0
						? `Se cancelaron ${cancelados} bloque${cancelados !== 1 ? "s" : ""}. ${reservados} no se pudieron cancelar porque tienen cita.`
						: `Se cancelaron ${cancelados} bloque${cancelados !== 1 ? "s" : ""} correctamente.`,
				timer: 2000,
				showConfirmButton: false,
			});
			setSelectedIds(new Set());
			refetch();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudo cancelar en lote",
			});
		} finally {
			setSelectedId(null);
		}
	};

	const handleEliminarPasada = async () => {
		const result = await Swal.fire({
			icon: "warning",
			title: "Eliminar disponibilidad pasada",
			text: "Se eliminarán todos los bloques con fecha anterior a hoy que no tengan cita asignada (pendientes, aprobados, cancelados, rechazados). No se eliminarán los que ya tienen cita. ¿Continuar?",
			showCancelButton: true,
			confirmButtonText: "Sí, eliminar",
			cancelButtonText: "Cancelar",
			confirmButtonColor: "#dc2626",
		});
		if (!result.isConfirmed) return;
		setSelectedId("eliminar-pasada");
		try {
			const res = await eliminarDisponibilidadPasada().unwrap();
			const eliminados = (res as { data?: { eliminados?: number } })?.data?.eliminados ?? res?.eliminados ?? 0;
			await Swal.fire({
				icon: "success",
				title: "Limpieza completada",
				text: eliminados === 0
					? "No había bloques pasados sin citas para eliminar."
					: `Se eliminaron ${eliminados} bloque${eliminados !== 1 ? "s" : ""} de disponibilidad pasada.`,
				timer: 2000,
				showConfirmButton: false,
			});
			refetch();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudo eliminar la disponibilidad pasada",
			});
		} finally {
			setSelectedId(null);
		}
	};

	const handleEliminarPorCriterios = async () => {
		const fechaDesde = filtros.fechaDesde?.trim() || undefined;
		const fechaHasta = filtros.fechaHasta?.trim() || undefined;
		const horaDesde = filtros.horaDesde?.trim() || undefined;
		const horaHasta = filtros.horaHasta?.trim() || undefined;
		if (!fechaDesde && !fechaHasta && !horaDesde && !horaHasta) {
			await Swal.fire({
				icon: "warning",
				title: "Indica al menos un criterio",
				text: "Usa fecha desde/hasta o hora desde/hasta en los filtros para eliminar solo esos bloques (sin citas asignadas).",
			});
			return;
		}
		const result = await Swal.fire({
			icon: "warning",
			title: "Eliminar por filtro",
			text: "Se eliminarán los bloques que coincidan con los filtros actuales y que no tengan cita asignada. ¿Continuar?",
			showCancelButton: true,
			confirmButtonText: "Sí, eliminar",
			cancelButtonText: "Cancelar",
			confirmButtonColor: "#dc2626",
		});
		if (!result.isConfirmed) return;
		setSelectedId("eliminar-criterios");
		try {
			const res = await eliminarDisponibilidadPorCriterios({
				fecha_desde: fechaDesde,
				fecha_hasta: fechaHasta,
				hora_desde: horaDesde,
				hora_hasta: horaHasta,
			}).unwrap();
			const eliminados = (res as { data?: { eliminados?: number } })?.data?.eliminados ?? res?.eliminados ?? 0;
			await Swal.fire({
				icon: "success",
				title: "Eliminación completada",
				text: eliminados === 0
					? "No hay bloques que coincidan con los criterios (o todos tienen citas asignadas)."
					: `Se eliminaron ${eliminados} bloque${eliminados !== 1 ? "s" : ""}.`,
				timer: 2000,
				showConfirmButton: false,
			});
			refetch();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudo eliminar por criterios",
			});
		} finally {
			setSelectedId(null);
		}
	};

	return (
		<PageShell
			title="Gestionar disponibilidades"
			description="Revisar, aprobar o cancelar bloques de disponibilidad propuestos por especialistas."
		>
			<div className="flex flex-col xl:flex-row gap-6 items-start">
				
				{/* Columna Izquierda: Contenido principal (Lista y acciones masivas) */}
				<div className="flex-1 space-y-4 min-w-0 w-full">
					{/* Panel Unificado de Acciones Masivas — una sola fila */}
					<div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/50 px-3 py-2 shadow-sm">
						{/* Selección */}
						{!isLoading && filteredAndSorted.length > 0 && (
							<>
								<button
									type="button"
									onClick={() => selectPageIds(paginated.map((d) => d.id_disponibilidad))}
									className="rounded-lg border border-brand-300 bg-paper px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 transition-colors"
								>
									Seleccionar página
								</button>
								<button
									type="button"
									onClick={() => setSelectedIds(new Set(filteredIds))}
									className="rounded-lg border border-brand-300 bg-paper px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 transition-colors"
								>
									Seleccionar filtrados ({filteredAndSorted.length})
								</button>
							</>
						)}

						{/* Eliminación — empujados a la derecha */}
						<div className="ml-auto flex flex-wrap items-center gap-2">
						<button
							type="button"
							onClick={handleEliminarPasada}
							disabled={isEliminandoPasada || selectedId === "eliminar-pasada"}
							className="rounded-lg border border-red-400 bg-paper px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
							title="Borra todo lo anterior a hoy (pendientes, aprobados, cancelados, rechazados sin cita)"
						>
							{isEliminandoPasada && selectedId === "eliminar-pasada" ? "Procesando..." : "Eliminar pasada"}
						</button>
						<button
							type="button"
							onClick={handleEliminarPorCriterios}
							disabled={isEliminandoPorCriterios || selectedId === "eliminar-criterios"}
							className="rounded-lg border border-red-400 bg-paper px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
							title="Usa fecha/hora desde-hasta del filtro; no elimina bloques con cita"
						>
							{isEliminandoPorCriterios && selectedId === "eliminar-criterios" ? "Procesando..." : "Eliminar por filtro"}
						</button>
						</div>

						{/* Acciones con seleccionados (aparecen dinámicamente) */}
						{selectedIds.size > 0 && (
							<>
								<div className="hidden h-5 w-px bg-brand-300 sm:block" />
								<span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">{selectedIds.size} selec.</span>
								<button
									type="button"
									onClick={clearSelection}
									className="rounded-lg border border-brand-300 bg-paper px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 transition-colors"
								>
									Deseleccionar
								</button>
								<button
									type="button"
									onClick={handleAprobarLote}
									disabled={isAprobandoLote || selectedId === "lote"}
									className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-medium text-paper hover:bg-brand-800 disabled:opacity-50 transition-colors"
								>
									{isAprobandoLote && selectedId === "lote" ? "Procesando..." : "Aprobar lote"}
								</button>
								<button
									type="button"
									onClick={handleCancelarLote}
									disabled={isCancelandoLote || selectedId === "cancel-lote"}
									className="rounded-lg border border-amber-500 bg-paper px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-colors"
								>
									{isCancelandoLote && selectedId === "cancel-lote" ? "Procesando..." : "Cancelar lote"}
								</button>
							</>
						)}
					</div>

					{isLoading ? (
						<div className="py-8 text-center text-brand-600">
							Cargando disponibilidades...
						</div>
					) : filteredAndSorted.length === 0 ? (
						<div className="rounded-xl border border-brand-200 bg-paper p-8 text-center shadow-sm">
							<p className="text-brand-600">
								{filtros.query.trim() ||
									filtros.fechaDesde ||
									filtros.fechaHasta ||
									filtros.horaDesde ||
									filtros.horaHasta ||
									filtros.ecoId
									? "No hay resultados con los filtros aplicados."
									: filtros.estado === "pendientes"
										? "No hay disponibilidades pendientes de aprobar."
										: "No hay disponibilidades para mostrar."}
							</p>
						</div>
					) : (
						<>
							<div className="space-y-3">
								{paginated.map((disp: DisponibilidadPendiente) => (
									<DisponibilidadPendienteCard
										key={disp.id_disponibilidad}
										disp={disp}
										onAprobar={handleAprobar}
										onRechazar={handleRechazar}
										onCancelar={handleCancelar}
										isAprobando={isAprobando}
										isRechazando={isRechazando}
										isCancelando={isCancelando}
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

				{/* Columna Derecha: Sidebar de Filtros */}
				<div className="w-full xl:w-72 shrink-0 space-y-4 xl:sticky xl:top-4 order-first xl:order-last">
					<FiltrosDisponibilidadPendientes
						value={filtros}
						onChange={setFiltros}
						ecoOptions={ecoOptions}
						onReset={clearFiltros}
					/>

					<FiltroFechaCard
						fechaDesde={filtros.fechaDesde}
						fechaHasta={filtros.fechaHasta}
					/>
				</div>
			</div>
		</PageShell>
	);
};

export default DisponibilidadPendientesPage;
