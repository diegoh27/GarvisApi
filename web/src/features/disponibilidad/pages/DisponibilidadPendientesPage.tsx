import { useState, useMemo, useEffect } from "react";
import Swal from "sweetalert2";
import { PageShell } from "../../../shared";
import {
	useGetDisponibilidadPendientesQuery,
	useAprobarDisponibilidadMutation,
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

const ITEMS_PER_PAGE = 5;

const DEFAULT_FILTROS: FiltrosDisponibilidadPendientesValues = {
	query: "",
	ordenFecha: "reciente",
	fechaDesde: "",
	fechaHasta: "",
	ecoId: "",
};

const DisponibilidadPendientesPage = () => {
	const { data: disponibilidades = [], isLoading, refetch } =
		useGetDisponibilidadPendientesQuery();
	const [aprobarDisponibilidad, { isLoading: isAprobando }] =
		useAprobarDisponibilidadMutation();
	const [rechazarDisponibilidad, { isLoading: isRechazando }] =
		useRechazarDisponibilidadMutation();
	const [filtros, setFiltros] = useState<FiltrosDisponibilidadPendientesValues>(DEFAULT_FILTROS);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);

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
							filtros.ecoId
								? "No hay resultados con los filtros aplicados."
								: "No hay disponibilidades pendientes de aprobar."}
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
									isAprobando={isAprobando}
									isRechazando={isRechazando}
									selectedId={selectedId}
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
