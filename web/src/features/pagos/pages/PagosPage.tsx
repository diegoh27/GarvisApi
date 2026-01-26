import { useState, useMemo, useEffect } from "react";
import Swal from "sweetalert2";
import { PageShell } from "../../../shared";
import {
	useGetCitasConPagosQuery,
	useUpdateEstadoPagoMutation,
	useCancelCitaMutation,
} from "../../citas/citasApi";
import type { CitaPendientePago } from "../../citas/citasApi";
import { useGetPagoByCitaQuery, useGetCitaByIdQuery } from "../../moderadores/moderadoresApi";
import VerPagoModal from "../../moderadores/components/VerPagoModal";
import VerCitaModal from "../../moderadores/components/VerCitaModal";

const formatFecha = (value: string) => {
	if (!value) return "";
	const dateKey = value.includes("T") ? value.split("T")[0] : value.slice(0, 10);
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

type FilterOption = {
	id: string;
	label: string;
	estado?: number;
};

const PagosPage = () => {
	const { data: citas = [], isLoading, refetch } = useGetCitasConPagosQuery();
	const [updateEstadoPago, { isLoading: isUpdating }] = useUpdateEstadoPagoMutation();
	const [cancelCita] = useCancelCitaMutation();
	const [selectedCita, setSelectedCita] = useState<string | null>(null);
	const [selectedCitaId, setSelectedCitaId] = useState<string | null>(null);
	const [selectedCitaIdForView, setSelectedCitaIdForView] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [filter, setFilter] = useState("todas");
	const itemsPerPage = 5;

	// Obtener datos del pago cuando se selecciona una cita
	const {
		data: pagoData,
		isLoading: loadingPago,
		error: pagoError,
	} = useGetPagoByCitaQuery(selectedCitaId || "", {
		skip: !selectedCitaId,
	});

	// Obtener datos completos de la cita cuando se selecciona para ver
	const {
		data: citaData,
		isLoading: loadingCita,
		error: citaError,
	} = useGetCitaByIdQuery(selectedCitaIdForView || "", {
		skip: !selectedCitaIdForView,
	});

	const filterOptions: FilterOption[] = [
		{ id: "todas", label: "Todas" },
		{ id: "pendiente", label: "Pendiente", estado: 0 },
		{ id: "aprobado", label: "Aprobado", estado: 1 },
		{ id: "rechazado", label: "Rechazado", estado: 2 },
	];

	// Filtrar citas según el filtro seleccionado
	const filteredCitas = useMemo(() => {
		if (filter === "todas") {
			return citas;
		}
		const filterOption = filterOptions.find((opt) => opt.id === filter);
		if (filterOption?.estado !== undefined) {
			return citas.filter((cita) => cita.estado_pago === filterOption.estado);
		}
		return citas;
	}, [citas, filter, filterOptions]);

	// Paginación
	const totalPages = Math.max(1, Math.ceil(filteredCitas.length / itemsPerPage));
	const paginatedCitas = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return filteredCitas.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredCitas, currentPage, itemsPerPage]);

	// Resetear a página 1 cuando cambian los datos o el filtro
	useEffect(() => {
		setCurrentPage(1);
	}, [citas.length, filter]);

	const handleAprobarPago = async (id_cita: string) => {
		const confirmResult = await Swal.fire({
			title: "¿Aprobar pago y confirmar cita?",
			text: "Esta acción confirmará el pago y aprobará la cita. ¿Estás seguro?",
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Sí, aprobar",
			cancelButtonText: "Cancelar",
			confirmButtonColor: "#1C837F",
			cancelButtonColor: "#9FD8E1",
		});

		if (!confirmResult.isConfirmed) return;

		try {
			await updateEstadoPago({ id_cita, estado_pago: 1 }).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Pago aprobado",
				text: "La cita ha sido confirmada exitosamente.",
				timer: 2000,
				showConfirmButton: false,
			});
			refetch();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudo aprobar el pago",
			});
		}
	};

	const handleRechazarPago = async (id_cita: string) => {
		const result = await Swal.fire({
			icon: "warning",
			title: "¿Rechazar pago?",
			text: "Esta acción marcará el pago como rechazado.",
			showCancelButton: true,
			confirmButtonText: "Sí, rechazar",
			cancelButtonText: "Cancelar",
			confirmButtonColor: "#dc2626",
		});

		if (!result.isConfirmed) return;

		try {
			await updateEstadoPago({ id_cita, estado_pago: 2 }).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Pago rechazado",
				text: "El pago ha sido marcado como rechazado.",
				timer: 2000,
				showConfirmButton: false,
			});
			refetch();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudo rechazar el pago",
			});
		}
	};

	const handleCancelarCita = async (id: string, pacienteNombre: string) => {
		const confirmResult = await Swal.fire({
			title: "¿Cancelar cita?",
			text: `Esta acción cancelará la cita del paciente ${pacienteNombre}. ¿Estás seguro?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Sí, cancelar",
			cancelButtonText: "No",
			confirmButtonColor: "#dc2626",
			cancelButtonColor: "#9FD8E1",
		});

		if (!confirmResult.isConfirmed) return;

		try {
			await cancelCita(id).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Cita cancelada",
				text: "La cita ha sido cancelada exitosamente.",
				timer: 2000,
				showConfirmButton: false,
			});
			refetch();
		} catch (err: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: err?.data?.message || "No se pudo cancelar la cita",
			});
		}
	};

	const getEstadoPagoLabel = (estado: number) => {
		switch (estado) {
			case 0:
				return "Pendiente";
			case 1:
				return "Aprobado";
			case 2:
				return "Rechazado";
			default:
				return "Desconocido";
		}
	};

	const getEstadoPagoColor = (estado: number) => {
		switch (estado) {
			case 0:
				return "bg-amber-400 text-brand-900";
			case 1:
				return "bg-brand-700 text-paper";
			case 2:
				return "bg-red-500 text-paper";
			default:
				return "bg-cloud text-brand-800";
		}
	};

	return (
		<PageShell
			title="Verificación de pagos"
			description="Revisar y aprobar pagos de citas. Ver detalles de citas y pagos."
		>
			<div className="space-y-4">
				{/* Filtros */}
				<div className="flex flex-wrap gap-2">
					{filterOptions.map((option) => (
						<button
							key={option.id}
							onClick={() => setFilter(option.id)}
							className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
								filter === option.id
									? "bg-brand-700 text-paper"
									: "bg-cloud text-brand-800 hover:bg-mist"
							}`}
						>
							{option.label}
						</button>
					))}
				</div>

				{isLoading ? (
					<div className="text-center py-8 text-brand-600">
						Cargando citas con pagos...
					</div>
				) : filteredCitas.length === 0 ? (
					<div className="rounded-lg border border-brand-200 bg-paper p-8 text-center">
						<p className="text-brand-600">
							No hay citas {filter !== "todas" ? `con estado ${filterOptions.find((opt) => opt.id === filter)?.label.toLowerCase()}` : "con pagos"}.
						</p>
					</div>
				) : (
					<>
						<div className="space-y-3">
							{paginatedCitas.map((cita: CitaPendientePago) => (
								<div
									key={cita.id_cita}
									className="rounded-lg border border-brand-200 bg-paper p-4"
								>
									<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
										<div className="flex-1 space-y-2">
											<div className="flex items-center gap-2">
												<h3 className="font-semibold text-brand-900">
													{cita.paciente_nombre} {cita.paciente_apellido}
												</h3>
												<span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-paper">
													{cita.eco_nombre}
												</span>
												<span
													className={`rounded-full px-2 py-0.5 text-xs font-medium ${getEstadoPagoColor(
														cita.estado_pago,
													)}`}
												>
													{getEstadoPagoLabel(cita.estado_pago)}
												</span>
											</div>
											<div className="space-y-1 text-sm text-brand-600">
												<div>
													<span className="font-medium">Especialista:</span>{" "}
													{cita.especialista_nombre} {cita.especialista_apellido}
												</div>
												<div>
													<span className="font-medium">Fecha y hora:</span>{" "}
													{formatFecha(cita.fecha_cita)} a las{" "}
													{formatHora(cita.hora_cita)}
												</div>
												<div>
													<span className="font-medium">Cédula:</span>{" "}
													{cita.paciente_cedula}
												</div>
												<div>
													<span className="font-medium">Teléfono:</span>{" "}
													{cita.paciente_telefono}
												</div>
											</div>
										</div>
										<div className="flex flex-col gap-2 sm:flex-row">
											{cita.estado_pago === 0 && (
												<>
													<button
														onClick={() => {
															setSelectedCita(cita.id_cita);
															handleAprobarPago(cita.id_cita);
														}}
														disabled={isUpdating || selectedCita === cita.id_cita}
														className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-brand-800 disabled:opacity-50"
													>
														{isUpdating && selectedCita === cita.id_cita
															? "Procesando..."
															: "Aprobar pago"}
													</button>
													<button
														onClick={() => {
															setSelectedCita(cita.id_cita);
															handleRechazarPago(cita.id_cita);
														}}
														disabled={isUpdating || selectedCita === cita.id_cita}
														className="rounded-lg border border-red-500 bg-paper px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
													>
														Rechazar
													</button>
												</>
											)}
											<button
												onClick={() => setSelectedCitaIdForView(cita.id_cita)}
												className="rounded-lg border border-brand-700 bg-paper px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
											>
												Ver cita
											</button>
											<button
												onClick={() => setSelectedCitaId(cita.id_cita)}
												className="rounded-lg border border-brand-700 bg-paper px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
											>
												Ver pago
											</button>
											{cita.estado_cita !== 2 && cita.estado_cita !== 3 && (
												<button
													onClick={() =>
														handleCancelarCita(
															cita.id_cita,
															`${cita.paciente_nombre} ${cita.paciente_apellido}`,
														)
													}
													className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-red-600"
												>
													Cancelar cita
												</button>
											)}
										</div>
									</div>
								</div>
							))}
						</div>

						{/* Paginación */}
						{filteredCitas.length > itemsPerPage && (
							<div className="mt-4 flex items-center justify-between border-t border-mist pt-4">
								<div className="text-xs text-brand-800">
									Mostrando {paginatedCitas.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} -{" "}
									{Math.min(currentPage * itemsPerPage, filteredCitas.length)} de{" "}
									{filteredCitas.length} citas
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

			{/* Modal de ver cita */}
			{selectedCitaIdForView && (
				<VerCitaModal
					cita={loadingCita ? null : citaData || null}
					error={citaError ? "No se pudo cargar la información de la cita" : null}
					onClose={() => setSelectedCitaIdForView(null)}
				/>
			)}

			{/* Modal de ver pago */}
			{selectedCitaId && (
				<VerPagoModal
					pago={loadingPago ? null : pagoData || null}
					error={pagoError ? "No se pudo cargar la información del pago" : null}
					onClose={() => setSelectedCitaId(null)}
				/>
			)}
		</PageShell>
	);
};

export default PagosPage;
