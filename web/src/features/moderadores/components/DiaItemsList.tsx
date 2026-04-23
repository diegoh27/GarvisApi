import { useState, useMemo, useEffect } from "react";
import type { DisponibilidadConFecha, CitaConFecha } from "../moderadoresApi";
import {
	useAprobarDisponibilidadMutation,
	useRechazarDisponibilidadMutation,
} from "../../disponibilidad/disponibilidadApi";
import {
	useUpdateEstadoPagoMutation,
	useCancelCitaMutation,
	useMarcarAtendidaMutation,
} from "../../citas/citasApi";
import { useGetPagoByCitaQuery, useGetCitaByIdQuery } from "../moderadoresApi";
import VerPagoModal from "./VerPagoModal";
import VerCitaModal from "./VerCitaModal";
import RechazarPagoModal from "./RechazarPagoModal";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { formatFechaLocal } from "../../../shared";

type DiaItemsListProps = {
	fecha: string;
	disponibilidades: DisponibilidadConFecha[];
	citas: CitaConFecha[];
	loading: boolean;
};

type FilterOption = {
	id: string;
	label: string;
};

const toNumber = (value: unknown) => Number(value);

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

const DiaItemsList = ({ fecha, disponibilidades, citas, loading }: DiaItemsListProps) => {
	const [filter, setFilter] = useState("todas");
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedCitaId, setSelectedCitaId] = useState<string | null>(null);
	const [selectedCitaIdForView, setSelectedCitaIdForView] = useState<string | null>(null);
	const [aprobarDisponibilidad] = useAprobarDisponibilidadMutation();
	const [rechazarDisponibilidad] = useRechazarDisponibilidadMutation();
	const [updateEstadoPago, { isLoading: isUpdatingPago }] = useUpdateEstadoPagoMutation();
	const [cancelCita] = useCancelCitaMutation();
	const [marcarAtendida, { isLoading: isMarkingAtendida }] = useMarcarAtendidaMutation();
	const [citaToReject, setCitaToReject] = useState<{ id_cita: string; nombre: string } | null>(null);

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
		{ id: "pendientes", label: "Pendientes" },
		{ id: "citas", label: "Citas" },
		{ id: "aprobadas", label: "Aprobadas" },
		{ id: "rechazadas", label: "Rechazadas" },
	];

	// Filtrar items según el filtro seleccionado
	const filteredItems = useMemo(() => {
		if (filter === "todas") {
			return {
				disponibilidades: disponibilidades.filter((d) => toNumber(d.estado) !== 4), // Excluir las que son citas
				citas: citas,
			};
		}
		if (filter === "pendientes") {
			return {
				disponibilidades: disponibilidades.filter((d) => toNumber(d.estado) === 0),
				citas: [],
			};
		}
		if (filter === "citas") {
			return {
				disponibilidades: [],
				citas: citas,
			};
		}
		if (filter === "aprobadas") {
			return {
				disponibilidades: disponibilidades.filter((d) => toNumber(d.estado) === 1),
				citas: [],
			};
		}
		if (filter === "rechazadas") {
			return {
				disponibilidades: disponibilidades.filter((d) => toNumber(d.estado) === 2),
				citas: [],
			};
		}
		return { disponibilidades: [], citas: [] };
	}, [filter, disponibilidades, citas]);

	// Combinar todos los items para paginación
	const allItems = useMemo(() => {
		const items: Array<{
			type: "disponibilidad" | "cita";
			id: string;
			data: any;
		}> = [];

		// Agregar disponibilidades
		filteredItems.disponibilidades.forEach((disp) => {
			items.push({
				type: "disponibilidad",
				id: disp.id_disponibilidad,
				data: disp,
			});
		});

		// Ordenar por hora
		items.sort((a, b) => {
			const horaA = a.type === "disponibilidad" ? a.data.hora_inicio : a.data.hora_cita;
			const horaB = b.type === "disponibilidad" ? b.data.hora_inicio : b.data.hora_cita;
			return horaA.localeCompare(horaB);
		});

		// Agregar citas
		filteredItems.citas.forEach((cita) => {
			items.push({
				type: "cita",
				id: cita.id_cita,
				data: cita,
			});
		});

		// Reordenar todo por hora
		items.sort((a, b) => {
			const horaA = a.type === "disponibilidad" ? a.data.hora_inicio : a.data.hora_cita;
			const horaB = b.type === "disponibilidad" ? b.data.hora_inicio : b.data.hora_cita;
			return horaA.localeCompare(horaB);
		});

		return items;
	}, [filteredItems]);

	// Paginación: 5 items por página
	const itemsPerPage = 5;
	const totalPages = Math.max(1, Math.ceil(allItems.length / itemsPerPage));
	const paginatedItems = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return allItems.slice(startIndex, startIndex + itemsPerPage);
	}, [allItems, currentPage, itemsPerPage]);

	// Resetear a página 1 cuando cambia el filtro
	useEffect(() => {
		setCurrentPage(1);
	}, [filter]);

	const handleAprobarDisponibilidad = async (id: string) => {
		const confirmResult = await Swal.fire({
			title: "¿Aprobar disponibilidad?",
			text: "Esta acción confirmará la disponibilidad propuesta por el especialista.",
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Sí, aprobar",
			cancelButtonText: "Cancelar",
			confirmButtonColor: "#1C837F",
			cancelButtonColor: "#9FD8E1",
		});

		if (!confirmResult.isConfirmed) return;

		try {
			await aprobarDisponibilidad(id).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Disponibilidad aprobada",
				text: "La disponibilidad ha sido aprobada exitosamente.",
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (err: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: err?.data?.message || "No se pudo aprobar la disponibilidad",
			});
		}
	};

	const handleRechazarDisponibilidad = async (id: string) => {
		const confirmResult = await Swal.fire({
			title: "¿Rechazar disponibilidad?",
			text: "Esta acción cancelará la fecha propuesta por el especialista. ¿Estás seguro?",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Sí, rechazar",
			cancelButtonText: "Cancelar",
			confirmButtonColor: "#dc2626",
			cancelButtonColor: "#9FD8E1",
		});

		if (!confirmResult.isConfirmed) return;

		try {
			await rechazarDisponibilidad(id).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Disponibilidad rechazada",
				text: "La disponibilidad ha sido rechazada.",
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (err: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: err?.data?.message || "No se pudo rechazar la disponibilidad",
			});
		}
	};

	const handleAprobarPago = async (id: string) => {
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
			await updateEstadoPago({ id_cita: id, estado_pago: 1 }).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Pago aprobado",
				text: "El pago ha sido aprobado y la cita confirmada.",
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (err: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: err?.data?.message || "No se pudo aprobar el pago",
			});
		}
	};

	const handleRechazarPago = (id_cita: string) => {
		const cita = citas.find((c) => c.id_cita === id_cita);
		const nombrePaciente = cita
			? `${cita.paciente_nombre ?? ""} ${cita.paciente_apellido ?? ""}`.trim()
			: "";
		setCitaToReject({ id_cita, nombre: nombrePaciente });
	};

	const handleConfirmRechazar = async (motivo: string) => {
		if (!citaToReject) return;

		try {
			await updateEstadoPago({
				id_cita: citaToReject.id_cita,
				estado_pago: 2,
				motivo_rechazo: motivo,
			}).unwrap();

			setCitaToReject(null);

			await Swal.fire({
				icon: "success",
				title: "Pago rechazado",
				text: "El pago ha sido rechazado y el paciente ha sido notificado.",
				timer: 2500,
				showConfirmButton: false,
			});
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
		} catch (err: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: err?.data?.message || "No se pudo cancelar la cita",
			});
		}
	};

	const handleMarcarAtendida = async (id: string, pacienteNombre: string) => {
		const confirmResult = await Swal.fire({
			title: "¿Marcar cita como atendida?",
			text: `Se marcará como atendida la cita de ${pacienteNombre}.`,
			icon: "question",
			showCancelButton: true,
			confirmButtonText: "Sí, marcar atendida",
			cancelButtonText: "Cancelar",
			confirmButtonColor: "#1C837F",
			cancelButtonColor: "#9FD8E1",
		});

		if (!confirmResult.isConfirmed) return;

		try {
			await marcarAtendida(id).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Cita marcada como atendida",
				text: "La cita fue actualizada exitosamente.",
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (err: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: err?.data?.message || "No se pudo marcar la cita como atendida",
			});
		}
	};


	return (
		<div className="rounded-2xl bg-paper p-4 shadow-sm">
			<div className="flex items-center justify-between">
				<h3 className="text-base font-semibold text-brand-900">
					{formatFecha(fecha)}
				</h3>
				{loading ? (
					<span className="text-[11px] text-brand-800">Cargando...</span>
				) : null}
			</div>

			{/* Filtros */}
			<div className="mt-3 flex flex-wrap gap-2 text-[11px] text-brand-800">
				{filterOptions.map((item) => (
					<button
						key={item.id}
						onClick={() => setFilter(item.id)}
						className={`rounded-full px-3 py-1 ${filter === item.id
								? "bg-brand-700 text-paper"
								: "bg-cloud text-brand-800"
							}`}
					>
						{item.label}
					</button>
				))}
			</div>

			{/* Lista de items */}
			{loading ? (
				<p className="mt-4 text-[11px] text-brand-800">Cargando...</p>
			) : allItems.length === 0 ? (
				<p className="mt-4 rounded-xl bg-paper p-3 text-[11px] text-brand-800">
					No hay items para mostrar en esta fecha.
				</p>
			) : (
				<>
					<div className="mt-4 space-y-3">
						{/* Renderizar items paginados */}
						{paginatedItems.map((item) => {
							if (item.type === "disponibilidad") {
								const disp = item.data;
								const estadoDisponibilidad = toNumber(disp.estado);
								return (
									<div
										key={disp.id_disponibilidad}
										className="rounded-2xl bg-paper p-3 shadow-sm border border-mist"
									>
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<p className="text-sm font-semibold text-brand-900">
													{formatHora(disp.hora_inicio)} - {formatHora(disp.hora_fin)}
												</p>
												<p className="text-[11px] text-brand-800 mt-1">
													{disp.nombre} {disp.apellido} - {disp.especialidad}
												</p>
												{disp.eco_nombre && (
													<p className="text-[11px] font-medium text-brand-700 mt-1">
														Eco: {disp.eco_nombre}
													</p>
												)}
												<span
													className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] ${estadoDisponibilidad === 0
															? "bg-accent text-paper"
															: estadoDisponibilidad === 1
																? "bg-brand-700 text-paper"
																: "bg-red-500 text-paper"
														}`}
												>
													{estadoDisponibilidad === 0
														? "Pendiente"
														: estadoDisponibilidad === 1
															? "Aprobada"
															: "Rechazada"}
												</span>
											</div>
											{estadoDisponibilidad === 0 && (
												<div className="flex gap-2 ml-2">
													<button
														onClick={() => handleAprobarDisponibilidad(disp.id_disponibilidad)}
														className="rounded-lg bg-brand-700 px-2 py-1 text-[10px] text-paper hover:bg-brand-800"
													>
														✓
													</button>
													<button
														onClick={() => handleRechazarDisponibilidad(disp.id_disponibilidad)}
														className="rounded-lg bg-red-500 px-2 py-1 text-[10px] text-paper hover:bg-red-600"
													>
														✕
													</button>
												</div>
											)}
										</div>
									</div>
								);
							} else {
								const cita = item.data;
								const estadoPago = toNumber(cita.estado_pago);
								const estadoCita = toNumber(cita.estado_cita);
								return (
									<div
										key={cita.id_cita}
										className="rounded-2xl bg-paper p-3 shadow-sm border border-mist"
									>
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<p className="text-sm font-semibold text-brand-900">
													{formatHora(cita.hora_cita)}
												</p>
												<p className="text-[11px] text-brand-800 mt-1">
													Paciente: {cita.paciente_nombre} {cita.paciente_apellido}
												</p>
												<p className="text-[11px] text-brand-800">
													Especialista: {cita.especialista_nombre} {cita.especialista_apellido}
												</p>
												<p className="text-[11px] font-medium text-brand-700 mt-1">
													Eco: {cita.eco_nombre}
												</p>
												<span
													className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] ${estadoCita === 3
															? "bg-green-600 text-paper"
															: estadoPago === 0
																? "bg-amber-400 text-brand-900"
																: "bg-sky-500 text-paper"
														}`}
												>
													{estadoCita === 3 ? "Atendida" : estadoPago === 0 ? "Pago pendiente" : "Cita aprobada"}
												</span>
											</div>
											<div className="ml-2 flex flex-col gap-2">
												{estadoPago === 0 && (
													<button
														onClick={() => handleAprobarPago(cita.id_cita)}
														className="rounded-lg bg-brand-700 px-3 py-1 text-[10px] text-paper hover:bg-brand-800"
													>
														Aprobar pago
													</button>
												)}
												<button
													onClick={() => setSelectedCitaIdForView(cita.id_cita)}
													className="rounded-lg border border-brand-700 bg-paper px-3 py-1 text-[10px] text-brand-700 hover:bg-brand-50"
												>
													Ver cita
												</button>
												<button
													onClick={() => setSelectedCitaId(cita.id_cita)}
													className="rounded-lg border border-brand-700 bg-paper px-3 py-1 text-[10px] text-brand-700 hover:bg-brand-50"
												>
													Ver pago
												</button>
												{estadoCita !== 2 && estadoCita !== 3 && (
													<>
														<button
															onClick={() =>
																handleMarcarAtendida(
																	cita.id_cita,
																	`${cita.paciente_nombre} ${cita.paciente_apellido}`,
																)
															}
															disabled={isMarkingAtendida}
															className="rounded-lg bg-green-600 px-3 py-1 text-[10px] text-paper hover:bg-green-700 disabled:opacity-50"
														>
															{isMarkingAtendida ? "Marcando..." : "Marcar atendida"}
														</button>
														<button
															onClick={() =>
																handleCancelarCita(
																	cita.id_cita,
																	`${cita.paciente_nombre} ${cita.paciente_apellido}`,
																)
															}
															className="rounded-lg bg-red-500 px-3 py-1 text-[10px] text-paper hover:bg-red-600"
														>
															Cancelar cita
														</button>
													</>
												)}
											</div>
										</div>
									</div>
								);
							}
						})}
					</div>

					{/* Paginación */}
					{allItems.length > 5 && (
						<div className="mt-4 flex items-center justify-between border-t border-mist pt-4">
							<div className="text-[11px] text-brand-800">
								Mostrando {paginatedItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} -{" "}
								{Math.min(currentPage * itemsPerPage, allItems.length)} de {allItems.length} items
							</div>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
									disabled={currentPage === 1}
									className="rounded-full border border-mist bg-paper px-3 py-1.5 text-[11px] text-brand-800 transition-colors hover:bg-cloud disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Anterior
								</button>
								<span className="text-[11px] text-brand-800">
									Página {currentPage} de {totalPages}
								</span>
								<button
									type="button"
									onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
									disabled={currentPage === totalPages}
									className="rounded-full border border-mist bg-paper px-3 py-1.5 text-[11px] text-brand-800 transition-colors hover:bg-cloud disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Siguiente
								</button>
							</div>
						</div>
					)}
				</>
			)}

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
					showAcciones
					id_cita={selectedCitaId}
					onAprobar={handleAprobarPago}
					onRechazar={handleRechazarPago}
					isUpdating={isUpdatingPago}
					onClose={() => setSelectedCitaId(null)}
				/>
			)}

			{/* Modal de rechazar pago */}
			{citaToReject && (
				<RechazarPagoModal
					onClose={() => setCitaToReject(null)}
					onConfirm={handleConfirmRechazar}
					isLoading={isUpdatingPago}
					nombrePaciente={citaToReject.nombre}
				/>
			)}
		</div>
	);
};

export default DiaItemsList;
