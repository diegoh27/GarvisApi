import { useState, useMemo, useEffect } from "react";
import Swal from "sweetalert2";
import { PageShell, formatFechaLocal } from "../../../shared";
import {
	useGetCitasPendientesPagoQuery,
	useUpdateEstadoPagoMutation,
	useCancelCitaMutation,
} from "../../citas/citasApi";
import type { CitaPendientePago } from "../../citas/citasApi";
import { useGetPagoByCitaQuery, useGetCitaByIdQuery } from "../../moderadores/moderadoresApi";
import VerPagoModal from "../../moderadores/components/VerPagoModal";
import VerCitaModal from "../../moderadores/components/VerCitaModal";
import PosponerCitaModal from "../../moderadores/components/PosponerCitaModal";
import RechazarPagoModal from "../../moderadores/components/RechazarPagoModal";

const formatFecha = (value: string) => (value ? formatFechaLocal(value) : "");

const formatHora = (value: string) => {
	if (!value) return "";
	const [hourStr, minuteStr = "00"] = value.split(":");
	const hour = Number(hourStr);
	if (Number.isNaN(hour)) return value;
	const period = hour >= 12 ? "PM" : "AM";
	const hour12 = hour % 12 === 0 ? 12 : hour % 12;
	return `${hour12}:${minuteStr} ${period}`;
};

const PagosPage = () => {
	const { data: citas = [], isLoading, refetch } = useGetCitasPendientesPagoQuery();
	const [updateEstadoPago, { isLoading: isUpdating }] = useUpdateEstadoPagoMutation();
	const [cancelCita] = useCancelCitaMutation();
	const [selectedCita, setSelectedCita] = useState<string | null>(null);
	const [selectedCitaId, setSelectedCitaId] = useState<string | null>(null);
	const [selectedCitaIdForVerificar, setSelectedCitaIdForVerificar] = useState<string | null>(null);
	const [selectedCitaIdForView, setSelectedCitaIdForView] = useState<string | null>(null);
	const [selectedCitaForPosponer, setSelectedCitaForPosponer] = useState<CitaPendientePago | null>(null);
	const [citaToReject, setCitaToReject] = useState<{ id_cita: string; nombre: string } | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [query, setQuery] = useState("");
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

	// Filtrar citas según búsqueda (la API ya devuelve solo pendientes ordenados por fecha más vieja primero)
	const filteredCitas = useMemo(() => {
		let citasFiltradas = citas;

		// Filtro por búsqueda
		if (query.trim()) {
			const searchLower = query.toLowerCase().trim();
			citasFiltradas = citasFiltradas.filter((cita) => {
				const fullName = `${cita.paciente_nombre} ${cita.paciente_apellido}`.toLowerCase();
				const especialistaFullName = `${cita.especialista_nombre} ${cita.especialista_apellido}`.toLowerCase();
				return (
					fullName.includes(searchLower) ||
					cita.paciente_nombre.toLowerCase().includes(searchLower) ||
					cita.paciente_apellido.toLowerCase().includes(searchLower) ||
					cita.paciente_cedula.toLowerCase().includes(searchLower) ||
					cita.paciente_telefono.toLowerCase().includes(searchLower) ||
					especialistaFullName.includes(searchLower) ||
					cita.especialista_nombre.toLowerCase().includes(searchLower) ||
					cita.especialista_apellido.toLowerCase().includes(searchLower) ||
					cita.eco_nombre.toLowerCase().includes(searchLower)
				);
			});
		}

		return citasFiltradas;
	}, [citas, query]);

	// Paginación
	const totalPages = Math.max(1, Math.ceil(filteredCitas.length / itemsPerPage));
	const paginatedCitas = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return filteredCitas.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredCitas, currentPage, itemsPerPage]);

	// Resetear a página 1 cuando cambian los datos o la búsqueda
	useEffect(() => {
		setCurrentPage(1);
	}, [citas.length, query]);

	const handleAprobarPago = async (id_cita: string): Promise<boolean> => {
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

		if (!confirmResult.isConfirmed) return false;

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
			return true;
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudo aprobar el pago",
			});
			return false;
		}
	};

	const handleRechazarPago = async (id_cita: string): Promise<boolean> => {
		// Buscar nombre del paciente para mostrar en el modal
		const cita = citas.find(c => c.id_cita === id_cita);
		const nombrePaciente = cita
			? `${cita.paciente_nombre ?? ""} ${cita.paciente_apellido ?? ""}`.trim()
			: undefined;

		// Abrir modal para ingresar motivo de rechazo
		setCitaToReject({ id_cita, nombre: nombrePaciente || "" });
		return false; // No cerrar modales todavía
	};

	const handleConfirmRechazar = async (motivo: string) => {
		if (!citaToReject) return;

		try {
			await updateEstadoPago({
				id_cita: citaToReject.id_cita,
				estado_pago: 2,
				motivo_rechazo: motivo
			}).unwrap();

			setCitaToReject(null);
			setSelectedCitaId(null);
			setSelectedCitaIdForVerificar(null);

			await Swal.fire({
				icon: "success",
				title: "Pago rechazado",
				text: "El pago ha sido rechazado y el paciente ha sido notificado.",
				timer: 2500,
				showConfirmButton: false,
			});

			refetch();
		} catch (error: any) {
			setCitaToReject(null);
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
				{/* Barra de búsqueda */}
				<div className="rounded-lg border border-brand-300 bg-paper p-4">
					<input
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Buscar por nombre, apellido, cédula, teléfono, especialista o eco..."
						className="h-10 w-full rounded-lg border border-brand-300 bg-cloud px-4 text-sm text-brand-900 outline-none focus:border-brand-700"
					/>
				</div>

				{isLoading ? (
					<div className="text-center py-8 text-brand-600">
						Cargando pagos pendientes...
					</div>
				) : filteredCitas.length === 0 ? (
					<div className="rounded-lg border border-brand-200 bg-paper p-8 text-center">
						<p className="text-brand-600">
							{query.trim() ? "No se encontraron citas pendientes con los criterios de búsqueda." : "No hay pagos pendientes de verificar."}
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
										<div className="flex flex-col gap-2 sm:flex-row flex-wrap">
											{/* Un solo botón: "Verificar pago" si está pendiente (abre modal con Aprobar/Rechazar), "Ver pago" si ya está procesado */}
											<button
												onClick={() => {
													setSelectedCitaId(cita.id_cita);
													setSelectedCitaIdForVerificar(cita.estado_pago === 0 ? cita.id_cita : null);
												}}
												className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${cita.estado_pago === 0
													? "bg-amber-500 text-white hover:bg-amber-600"
													: "border border-brand-700 bg-paper text-brand-700 hover:bg-brand-50"
													}`}
											>
												{cita.estado_pago === 0 ? "Verificar pago" : "Ver pago"}
											</button>
											<button
												onClick={() => setSelectedCitaIdForView(cita.id_cita)}
												className="rounded-lg border border-brand-700 bg-paper px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
											>
												Ver cita
											</button>
											{cita.estado_cita !== 2 && cita.estado_cita !== 3 && (
												<button
													onClick={() => setSelectedCitaForPosponer(cita)}
													className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
												>
													Posponer cita
												</button>
											)}
											{cita.estado_cita !== 2 && cita.estado_cita !== 3 && cita.estado_pago !== 1 && (
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

			{/* Modal de ver pago / verificar pago */}
			{selectedCitaId && (
				<VerPagoModal
					pago={loadingPago ? null : pagoData || null}
					error={pagoError ? "No se pudo cargar la información del pago" : null}
					onClose={() => {
						setSelectedCitaId(null);
						setSelectedCitaIdForVerificar(null);
					}}
					showAcciones={!!selectedCitaIdForVerificar}
					id_cita={selectedCitaId}
					onAprobar={(id_cita) => {
						handleAprobarPago(id_cita).then((ok) => {
							if (ok) {
								setSelectedCitaId(null);
								setSelectedCitaIdForVerificar(null);
							}
						});
					}}
					onRechazar={(id_cita) => {
						handleRechazarPago(id_cita).then((ok) => {
							if (ok) {
								setSelectedCitaId(null);
								setSelectedCitaIdForVerificar(null);
							}
						});
					}}
					isUpdating={isUpdating}
				/>
			)}

			{/* Modal de posponer cita */}
			{selectedCitaForPosponer && (
				<PosponerCitaModal
					cita={selectedCitaForPosponer}
					onClose={() => setSelectedCitaForPosponer(null)}
					onSuccess={() => {
						refetch();
						setSelectedCitaForPosponer(null);
					}}
				/>
			)}

			{/* Modal de rechazar pago */}
			{citaToReject && (
				<RechazarPagoModal
					onClose={() => setCitaToReject(null)}
					onConfirm={handleConfirmRechazar}
					isLoading={isUpdating}
					nombrePaciente={citaToReject.nombre}
				/>
			)}
		</PageShell>
	);
};

export default PagosPage;
