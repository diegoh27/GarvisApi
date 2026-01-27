import { useMemo } from "react";
import { X, Clock, Calendar } from "lucide-react";
import type { CitaPendientePago } from "../../citas/citasApi";
import { usePosponerCitaMutation } from "../../citas/citasApi";
import { useGetDisponibilidadesByEspecialistaQuery } from "../moderadoresApi";
import { useAprobarDisponibilidadMutation } from "../../disponibilidad/disponibilidadApi";
import Swal from "sweetalert2";

type PosponerCitaModalProps = {
	cita: CitaPendientePago | null;
	onClose: () => void;
	onSuccess?: () => void;
};

type DisponibilidadItem = {
	id_disponibilidad: string;
	fecha: string;
	hora_inicio: string;
	hora_fin: string;
	estado: number;
	id_eco?: string | null;
	eco_nombre?: string | null;
};

const formatFecha = (fecha: string) => {
	if (!fecha) return "";
	
	// Si la fecha ya incluye información de tiempo (ISO format), extraer solo la parte de fecha
	let fechaStr = fecha;
	if (fecha.includes("T") || fecha.includes("Z")) {
		// Extraer solo la parte YYYY-MM-DD antes de T o Z
		fechaStr = fecha.split("T")[0].split("Z")[0];
	}
	
	// Intentar parsear la fecha directamente primero
	let date = new Date(fecha);
	if (Number.isNaN(date.getTime())) {
		// Si falla, intentar con formato YYYY-MM-DD
		date = new Date(`${fechaStr}T00:00:00`);
	}
	
	if (Number.isNaN(date.getTime())) {
		// Si aún falla, devolver la fecha original
		return fecha;
	}
	
	return date.toLocaleDateString("es-VE", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
};

const formatHora = (hora: string) => {
	if (!hora) return "";
	const [hourStr, minuteStr = "00"] = hora.split(":");
	const hour = Number(hourStr);
	if (Number.isNaN(hour)) return hora;
	const period = hour >= 12 ? "PM" : "AM";
	const hour12 = hour % 12 === 0 ? 12 : hour % 12;
	return `${hour12}:${minuteStr} ${period}`;
};

// Normalizar fecha a formato YYYY-MM-DD para el API
const normalizeFecha = (fecha: string): string => {
	if (!fecha) return "";
	
	// Si ya está en formato YYYY-MM-DD, retornarlo directamente
	if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
		return fecha;
	}
	
	// Si incluye información de tiempo (ISO format), extraer solo la parte de fecha
	let fechaStr = fecha;
	if (fecha.includes("T") || fecha.includes("Z")) {
		fechaStr = fecha.split("T")[0].split("Z")[0];
	}
	
	// Intentar parsear la fecha
	const date = new Date(fechaStr);
	if (Number.isNaN(date.getTime())) {
		// Si falla, intentar con formato YYYY-MM-DD
		const date2 = new Date(`${fechaStr}T00:00:00`);
		if (Number.isNaN(date2.getTime())) {
			// Si aún falla, devolver la fecha original (aunque puede causar error)
			return fechaStr;
		}
		return date2.toISOString().split("T")[0];
	}
	
	// Convertir a formato YYYY-MM-DD
	return date.toISOString().split("T")[0];
};

const PosponerCitaModal = ({ cita, onClose, onSuccess }: PosponerCitaModalProps) => {
	const [posponerCita, { isLoading: isPosponiendo }] = usePosponerCitaMutation();
	const [aprobarDisponibilidad, { isLoading: isAprobando }] = useAprobarDisponibilidadMutation();

	// Obtener disponibilidades del especialista
	const {
		data: disponibilidades = [],
		isLoading: isLoadingDisponibilidades,
	} = useGetDisponibilidadesByEspecialistaQuery(cita?.id_especialista || "", {
		skip: !cita?.id_especialista,
	});

	// Filtrar disponibilidades por el mismo eco y ordenar por fecha y hora
	const disponibilidadesFiltradas = useMemo(() => {
		if (!cita) return [];
		
		// Si no hay disponibilidades, retornar array vacío
		if (!disponibilidades || disponibilidades.length === 0) {
			return [];
		}
		
		// Mostrar TODAS las disponibilidades del especialista que tengan el mismo tipo de eco
		// Priorizar las que tienen el mismo eco, pero también incluir las que no tienen eco asignado
		const filtradas = disponibilidades
			.filter((disp: DisponibilidadItem) => {
				// Si la cita tiene un eco específico
				if (cita.id_eco) {
					// Incluir todas las disponibilidades que:
					// 1. Tengan el mismo id_eco que la cita (coincidencia exacta)
					// 2. No tengan id_eco asignado (null/undefined) - disponibilidades genéricas
					// Esto permite ver todas las opciones relacionadas con ese tipo de eco
					return disp.id_eco === cita.id_eco || disp.id_eco === null || disp.id_eco === undefined;
				}
				// Si la cita no tiene eco, mostrar todas las disponibilidades
				return true;
			})
			.sort((a: DisponibilidadItem, b: DisponibilidadItem) => {
				// Priorizar las que tienen el mismo eco de la cita
				if (cita.id_eco) {
					const aMatchesEco = a.id_eco === cita.id_eco;
					const bMatchesEco = b.id_eco === cita.id_eco;
					if (aMatchesEco && !bMatchesEco) return -1;
					if (!aMatchesEco && bMatchesEco) return 1;
				}
				// Ordenar por fecha primero, luego por hora
				if (a.fecha !== b.fecha) {
					return a.fecha.localeCompare(b.fecha);
				}
				return a.hora_inicio.localeCompare(b.hora_inicio);
			});
		
		return filtradas;
	}, [disponibilidades, cita]);

	const handleSelectDisponibilidad = async (disponibilidad: DisponibilidadItem) => {
		if (!cita) return;

		// Si la disponibilidad está pendiente (estado 0), aprobarla primero
		if (disponibilidad.estado === 0) {
			try {
				await aprobarDisponibilidad(disponibilidad.id_disponibilidad).unwrap();
				await Swal.fire({
					icon: "success",
					title: "Disponibilidad aprobada",
					text: "La disponibilidad ha sido aprobada.",
					timer: 1500,
					showConfirmButton: false,
				});
			} catch (error: any) {
				Swal.fire({
					icon: "error",
					title: "Error",
					text: error?.data?.message || "No se pudo aprobar la disponibilidad",
				});
				return;
			}
		}

		// Posponer la cita usando la fecha y hora de la disponibilidad
		try {
			// Normalizar la fecha a formato YYYY-MM-DD
			const fechaNormalizada = normalizeFecha(disponibilidad.fecha);
			
			await posponerCita({
				id_cita: cita.id_cita,
				fecha_cita: fechaNormalizada,
				hora_cita: disponibilidad.hora_inicio,
			}).unwrap();

			await Swal.fire({
				icon: "success",
				title: "Cita pospuesta",
				text: "La cita ha sido pospuesta exitosamente.",
				timer: 2000,
				showConfirmButton: false,
			});

			onSuccess?.();
			onClose();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudo posponer la cita",
			});
		}
	};

	if (!cita) return null;

	const isLoading = isPosponiendo || isAprobando;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="relative w-full max-w-2xl max-h-[90vh] rounded-xl bg-paper shadow-lg flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-mist p-4">
					<h2 className="text-base font-semibold text-brand-900">Posponer cita</h2>
					<button
						onClick={onClose}
						className="rounded-lg p-1 text-brand-800 hover:bg-cloud"
						aria-label="Cerrar"
						disabled={isLoading}
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-4">
					<div className="space-y-4">
						{/* Información de la cita actual */}
						<div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
							<p className="mb-2 text-xs font-semibold text-brand-700">Cita actual</p>
							<p className="text-sm font-medium text-brand-900">
								{cita.paciente_nombre} {cita.paciente_apellido}
							</p>
							<div className="mt-2 space-y-1 text-xs text-brand-600">
								<p>
									<span className="font-medium">Especialista:</span> {cita.especialista_nombre}{" "}
									{cita.especialista_apellido}
								</p>
								<p>
									<span className="font-medium">Tipo de eco:</span> {cita.eco_nombre}
								</p>
								<p>
									<span className="font-medium">Fecha y hora:</span> {formatFecha(cita.fecha_cita)}{" "}
									a las {formatHora(cita.hora_cita)}
								</p>
							</div>
						</div>

						{/* Lista de disponibilidades */}
						<div>
							<label className="mb-2 block text-xs font-medium text-slate-500">
								Selecciona una nueva fecha y hora disponible
							</label>
							{isLoadingDisponibilidades ? (
								<div className="text-center py-8 text-brand-600 text-sm">
									Cargando disponibilidades...
								</div>
							) : disponibilidadesFiltradas.length === 0 ? (
								<div className="rounded-lg border border-brand-200 bg-paper p-4 text-center">
									<p className="text-sm text-brand-600">
										No hay disponibilidades disponibles para este especialista y tipo de eco.
									</p>
									{disponibilidades.length > 0 && (
										<p className="text-xs text-brand-500 mt-2">
											Se encontraron {disponibilidades.length} disponibilidades del especialista, pero ninguna coincide con el tipo de eco de la cita.
										</p>
									)}
								</div>
							) : (
								<div className="space-y-2 max-h-[400px] overflow-y-auto">
									{disponibilidadesFiltradas.map((disp: DisponibilidadItem) => {
										const isPendiente = disp.estado === 0;
										const isAprobada = disp.estado === 1;

										return (
											<button
												key={disp.id_disponibilidad}
												type="button"
												onClick={() => handleSelectDisponibilidad(disp)}
												disabled={isLoading}
												className={`w-full rounded-lg border p-3 text-left transition-all ${
													isPendiente
														? "border-amber-300 bg-amber-50 hover:border-amber-400 hover:bg-amber-100"
														: "border-brand-200 bg-paper hover:border-brand-300 hover:bg-cloud"
												} ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
											>
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-3">
														<Calendar className="h-4 w-4 text-brand-600" />
														<div>
															<p className="text-sm font-medium text-brand-900">
																{formatFecha(disp.fecha)}
															</p>
															<div className="flex items-center gap-1 mt-0.5">
																<Clock className="h-3 w-3 text-brand-600" />
																<p className="text-xs text-brand-600">
																	{formatHora(disp.hora_inicio)} - {formatHora(disp.hora_fin)}
																</p>
															</div>
														</div>
													</div>
													<div className="flex items-center gap-2">
														{isPendiente && (
															<span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-medium text-brand-900">
																Pendiente
															</span>
														)}
														{isAprobada && (
															<span className="rounded-full bg-brand-700 px-2 py-0.5 text-xs font-medium text-paper">
																Aprobada
															</span>
														)}
													</div>
												</div>
											</button>
										);
									})}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="border-t border-mist p-4 flex justify-end gap-2">
					<button
						type="button"
						onClick={onClose}
						disabled={isLoading}
						className="rounded-lg border border-mist bg-paper px-4 py-2 text-sm font-medium text-brand-800 transition-colors hover:bg-cloud disabled:opacity-50"
					>
						Cancelar
					</button>
				</div>
			</div>
		</div>
	);
};

export default PosponerCitaModal;
