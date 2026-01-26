import { useState, useMemo, useEffect } from "react";
import Swal from "sweetalert2";
import { PageShell } from "../../../shared";
import {
	useGetDisponibilidadPendientesQuery,
	useAprobarDisponibilidadMutation,
	useRechazarDisponibilidadMutation,
} from "../disponibilidadApi";
import type { DisponibilidadPendiente } from "../disponibilidadApi";

const formatFecha = (value: string) => {
	if (!value) return "";
	const dateKey = value.includes("T") ? value.split("T")[0] : value.slice(0, 10);
	const date = new Date(`${dateKey}T00:00:00`);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString("es-VE", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		weekday: "long",
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

const DisponibilidadPendientesPage = () => {
	const { data: disponibilidades = [], isLoading, refetch } =
		useGetDisponibilidadPendientesQuery();
	const [aprobarDisponibilidad, { isLoading: isAprobando }] =
		useAprobarDisponibilidadMutation();
	const [rechazarDisponibilidad, { isLoading: isRechazando }] =
		useRechazarDisponibilidadMutation();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 5;

	const handleAprobar = async (id: string) => {
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
		}
	};

	// Paginación
	const totalPages = Math.max(1, Math.ceil(disponibilidades.length / itemsPerPage));
	const paginatedDisponibilidades = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return disponibilidades.slice(startIndex, startIndex + itemsPerPage);
	}, [disponibilidades, currentPage, itemsPerPage]);

	// Resetear a página 1 cuando cambian los datos
	useEffect(() => {
		setCurrentPage(1);
	}, [disponibilidades.length]);

	return (
		<PageShell
			title="Aprobar disponibilidades"
			description="Revisar y aprobar bloques de disponibilidad propuestos por especialistas."
		>
			<div className="space-y-4">
				{isLoading ? (
					<div className="text-center py-8 text-brand-600">
						Cargando disponibilidades pendientes...
					</div>
				) : disponibilidades.length === 0 ? (
					<div className="rounded-lg border border-brand-200 bg-paper p-8 text-center">
						<p className="text-brand-600">
							No hay disponibilidades pendientes de aprobar.
						</p>
					</div>
				) : (
					<>
						<div className="space-y-3">
							{paginatedDisponibilidades.map((disp: DisponibilidadPendiente) => (
								<div
									key={disp.id_disponibilidad}
									className="rounded-lg border border-brand-200 bg-paper p-4"
								>
									<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
										<div className="flex-1 space-y-2">
											<div className="flex items-center gap-2">
												<h3 className="font-semibold text-brand-900">
													{disp.nombre} {disp.apellido}
												</h3>
												<span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-paper">
													{disp.especialidad}
												</span>
											</div>
											<div className="space-y-1 text-sm text-brand-600">
												<div>
													<span className="font-medium">Fecha:</span>{" "}
													{formatFecha(disp.fecha)}
												</div>
												<div>
													<span className="font-medium">Horario:</span>{" "}
													{formatHora(disp.hora_inicio)} -{" "}
													{formatHora(disp.hora_fin)}
												</div>
												{disp.eco_nombre && (
													<div>
														<span className="font-medium">Eco:</span>{" "}
														{disp.eco_nombre}
													</div>
												)}
											</div>
										</div>
										<div className="flex gap-2 sm:flex-col">
											<button
												onClick={() => {
													setSelectedId(disp.id_disponibilidad);
													handleAprobar(disp.id_disponibilidad);
												}}
												disabled={
													isAprobando ||
													isRechazando ||
													selectedId === disp.id_disponibilidad
												}
												className="flex-1 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-brand-800 disabled:opacity-50"
											>
												{isAprobando && selectedId === disp.id_disponibilidad
													? "Procesando..."
													: "Aprobar"}
											</button>
											<button
												onClick={() => {
													setSelectedId(disp.id_disponibilidad);
													handleRechazar(disp.id_disponibilidad);
												}}
												disabled={
													isAprobando ||
													isRechazando ||
													selectedId === disp.id_disponibilidad
												}
												className="flex-1 rounded-lg border border-red-500 bg-paper px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
											>
												Rechazar
											</button>
										</div>
									</div>
								</div>
							))}
						</div>

						{/* Paginación */}
						{disponibilidades.length > 5 && (
							<div className="mt-4 flex items-center justify-between border-t border-mist pt-4">
								<div className="text-xs text-brand-800">
									Mostrando {paginatedDisponibilidades.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} -{" "}
									{Math.min(currentPage * itemsPerPage, disponibilidades.length)} de{" "}
									{disponibilidades.length} disponibilidades
								</div>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
										disabled={currentPage === 1}
										className="rounded-full border border-mist bg-paper px-3 py-1.5 text-xs text-brand-800 transition-colors hover:bg-cloud disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Anterior
									</button>
									<span className="text-xs text-brand-800">
										Página {currentPage} de {totalPages}
									</span>
									<button
										type="button"
										onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
										disabled={currentPage === totalPages}
										className="rounded-full border border-mist bg-paper px-3 py-1.5 text-xs text-brand-800 transition-colors hover:bg-cloud disabled:opacity-50 disabled:cursor-not-allowed"
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
