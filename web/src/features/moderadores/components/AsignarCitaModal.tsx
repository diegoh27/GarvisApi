import { useState, useMemo, useEffect } from "react";
import { X, Clock, Calendar } from "lucide-react";
import type { PacienteData, EspecialistaData } from "../moderadoresApi";
import {
	useGetAllPacientesQuery,
	useGetAllEspecialistasQuery,
	useGetDisponibilidadesByEspecialistaQuery,
	useAsignarCitaCompletaMutation,
} from "../moderadoresApi";
import { useGetEcosQuery } from "../../ecos/ecosApi";
import { useAprobarDisponibilidadMutation } from "../../disponibilidad/disponibilidadApi";
import { FormularioPago, type PagoFormData } from "../../../shared";
import { getToken } from "../../../shared/utils/token";
import Swal from "sweetalert2";
import type { Eco } from "../../ecos/ecosApi";

type AsignarCitaModalProps = {
	onClose: () => void;
	onSuccess?: () => void;
	pacientePreSeleccionado?: PacienteData | null;
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
	let fechaStr = fecha;
	if (fecha.includes("T") || fecha.includes("Z")) {
		fechaStr = fecha.split("T")[0].split("Z")[0];
	}
	let date = new Date(fecha);
	if (Number.isNaN(date.getTime())) {
		date = new Date(`${fechaStr}T00:00:00`);
	}
	if (Number.isNaN(date.getTime())) {
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

const normalizeFecha = (fecha: string): string => {
	if (!fecha) return "";
	if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
		return fecha;
	}
	let fechaStr = fecha;
	if (fecha.includes("T") || fecha.includes("Z")) {
		fechaStr = fecha.split("T")[0].split("Z")[0];
	}
	const date = new Date(fechaStr);
	if (Number.isNaN(date.getTime())) {
		const date2 = new Date(`${fechaStr}T00:00:00`);
		if (Number.isNaN(date2.getTime())) {
			return fechaStr;
		}
		return date2.toISOString().split("T")[0];
	}
	return date.toISOString().split("T")[0];
};

const AsignarCitaModal = ({ onClose, onSuccess, pacientePreSeleccionado }: AsignarCitaModalProps) => {
	const [step, setStep] = useState<"paciente" | "eco" | "especialista" | "fecha" | "pago">(
		pacientePreSeleccionado ? "eco" : "paciente"
	);
	const [selectedPaciente, setSelectedPaciente] = useState<PacienteData | null>(
		pacientePreSeleccionado || null
	);
	const [selectedEco, setSelectedEco] = useState<Eco | null>(null);
	const [selectedEspecialista, setSelectedEspecialista] = useState<EspecialistaData | null>(null);
	const [selectedDisponibilidad, setSelectedDisponibilidad] = useState<DisponibilidadItem | null>(null);
	
	// Archivo de imagen comprimido (para subir cuando se asigne la cita)
	const [imagenComprimida, setImagenComprimida] = useState<File | null>(null);
	// Archivo de orden médica comprimido (para subir cuando se asigne la cita)
	const [ordenMedicaComprimida, setOrdenMedicaComprimida] = useState<File | null>(null);
	
	// Datos del formulario de pago
	const [pagoData, setPagoData] = useState<PagoFormData>({
		metodo: "Transferencia",
		imagen: "",
		orden_medica: "",
		banco_origen: "",
		banco_destino: "",
		monto: "",
		cedula_pagador: "",
		telefono_pagador: "",
		referencia: "",
	});

	const { data: pacientes = [], isLoading: loadingPacientes } = useGetAllPacientesQuery();
	const { data: especialistas = [], isLoading: loadingEspecialistas } = useGetAllEspecialistasQuery();
	const { data: ecos = [], isLoading: loadingEcos } = useGetEcosQuery();
	const {
		data: disponibilidades = [],
		isLoading: loadingDisponibilidades,
	} = useGetDisponibilidadesByEspecialistaQuery(selectedEspecialista?.id_especialista || "", {
		skip: !selectedEspecialista,
	});
	const [aprobarDisponibilidad, { isLoading: isAprobando }] = useAprobarDisponibilidadMutation();
	const [asignarCita, { isLoading: isAsignando }] = useAsignarCitaCompletaMutation();

	// Estado para almacenar los ecos de cada especialista
	const [especialistasConEcos, setEspecialistasConEcos] = useState<Map<string, Eco[]>>(new Map());
	const [loadingEcosEspecialistas, setLoadingEcosEspecialistas] = useState(false);

	// Cargar ecos de todos los especialistas cuando se selecciona un eco
	useEffect(() => {
		if (!selectedEco || especialistas.length === 0) {
			setEspecialistasConEcos(new Map());
			return;
		}
		
		setLoadingEcosEspecialistas(true);
		const loadEcos = async () => {
			const ecosMap = new Map<string, Eco[]>();
			const token = getToken();
			const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
			
			if (!token) {
				console.error("No hay token de autenticación");
				setLoadingEcosEspecialistas(false);
				return;
			}
			
			try {
				const promises = especialistas.map(async (esp) => {
					try {
						const response = await fetch(`${baseUrl}/especialista-ecos/${esp.id_especialista}`, {
							headers: {
								Authorization: `Bearer ${token}`,
								"Content-Type": "application/json",
							},
						});
						
						if (response.ok) {
							const data = await response.json();
							const ecos = data.data || [];
							ecosMap.set(esp.id_especialista, ecos);
							console.log(`Ecos de ${esp.nombre} ${esp.apellido}:`, ecos.map((e: Eco) => `${e.nombre} (${e.id_eco})`));
						} else {
							const errorText = await response.text();
							console.error(`Error en respuesta para ${esp.nombre} ${esp.apellido} (${esp.id_especialista}):`, response.status, errorText);
						}
					} catch (error) {
						console.error(`Error cargando ecos de ${esp.nombre} ${esp.apellido}:`, error);
					}
				});
				await Promise.all(promises);
				console.log("Mapa completo de ecos:", Array.from(ecosMap.entries()).map(([id, ecos]) => [id, ecos.map(e => e.nombre)]));
				console.log(`Eco seleccionado: ${selectedEco.nombre} (${selectedEco.id_eco})`);
				setEspecialistasConEcos(ecosMap);
			} catch (error) {
				console.error("Error cargando ecos de especialistas:", error);
			} finally {
				setLoadingEcosEspecialistas(false);
			}
		};
		loadEcos();
	}, [selectedEco, especialistas]);

	// Filtrar especialistas que tienen el eco seleccionado
	const especialistasFiltrados = useMemo(() => {
		if (!selectedEco) return [];
		
		// Si aún se están cargando los ecos, retornar array vacío para evitar mostrar error prematuro
		if (loadingEcosEspecialistas) return [];
		
		// Si el mapa está vacío pero ya terminó de cargar, puede ser que no haya ecos o hubo un error
		if (especialistasConEcos.size === 0 && especialistas.length > 0) {
			console.warn("El mapa de ecos está vacío después de cargar");
		}
		
		const filtrados = especialistas.filter((esp) => {
			const ecos = especialistasConEcos.get(esp.id_especialista) || [];
			// Comparación estricta de IDs
			const tieneEco = ecos.some((eco) => {
				const match = eco.id_eco === selectedEco.id_eco;
				if (match) {
					console.log(`✓ ${esp.nombre} ${esp.apellido} tiene el eco ${selectedEco.nombre}`);
				}
				return match;
			});
			if (ecos.length > 0 && !tieneEco) {
				console.log(`✗ ${esp.nombre} ${esp.apellido} tiene ${ecos.length} ecos pero no incluye ${selectedEco.nombre} (${selectedEco.id_eco})`);
				console.log(`  Ecos del especialista:`, ecos.map(e => `${e.nombre} (${e.id_eco})`));
			}
			return tieneEco;
		});
		
		console.log(`Total especialistas: ${especialistas.length}, Filtrados para ${selectedEco.nombre}: ${filtrados.length}`);
		if (filtrados.length === 0 && especialistas.length > 0) {
			console.warn("No se encontraron especialistas con el eco seleccionado. Verifica que los ecos estén asignados correctamente.");
		}
		return filtrados;
	}, [especialistas, especialistasConEcos, selectedEco, loadingEcosEspecialistas]);

	// Filtrar disponibilidades por el eco seleccionado
	// Mostrar TODAS las disponibilidades del especialista que tengan el mismo eco o sean genéricas (sin eco)
	const disponibilidadesFiltradas = useMemo(() => {
		if (!selectedEco || !selectedEspecialista) return [];
		
		// Si no hay disponibilidades, retornar array vacío
		if (!disponibilidades || disponibilidades.length === 0) {
			return [];
		}
		
		// Mostrar TODAS las disponibilidades del especialista que:
		// 1. Tengan el mismo id_eco que el eco seleccionado (coincidencia exacta)
		// 2. No tengan id_eco asignado (null/undefined) - disponibilidades genéricas
		// Esto permite ver todas las opciones relacionadas con ese tipo de eco
		const filtradas = disponibilidades
			.filter((disp: DisponibilidadItem) => {
				// Incluir todas las disponibilidades que:
				// - Tengan el mismo eco que el seleccionado
				// - O no tengan eco asignado (disponibilidades genéricas)
				return disp.id_eco === selectedEco.id_eco || disp.id_eco === null || disp.id_eco === undefined;
			})
			.sort((a: DisponibilidadItem, b: DisponibilidadItem) => {
				// Priorizar las que tienen el mismo eco del seleccionado
				const aMatchesEco = a.id_eco === selectedEco.id_eco;
				const bMatchesEco = b.id_eco === selectedEco.id_eco;
				if (aMatchesEco && !bMatchesEco) return -1;
				if (!aMatchesEco && bMatchesEco) return 1;
				// Ordenar por fecha primero, luego por hora
				if (a.fecha !== b.fecha) {
					return a.fecha.localeCompare(b.fecha);
				}
				return a.hora_inicio.localeCompare(b.hora_inicio);
			});
		
		return filtradas;
	}, [disponibilidades, selectedEco, selectedEspecialista]);

	const handleSelectDisponibilidad = async (disponibilidad: DisponibilidadItem) => {
		// Si está pendiente, aprobarla primero
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
		setSelectedDisponibilidad(disponibilidad);
		setStep("pago");
	};

	const handleAsignarCita = async () => {
		if (!selectedPaciente || !selectedEco || !selectedEspecialista || !selectedDisponibilidad) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: "Por favor complete todos los pasos",
			});
			return;
		}

		// Validar datos del pago
		if (!pagoData.banco_origen || !pagoData.banco_destino || !pagoData.monto || !pagoData.cedula_pagador || !pagoData.telefono_pagador || !pagoData.referencia) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: "Por favor complete todos los campos del pago",
			});
			return;
		}

		// Validar que se haya subido la orden médica
		if (!pagoData.orden_medica && !ordenMedicaComprimida) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: "Por favor suba la orden médica",
			});
			return;
		}

		// Si hay una imagen comprimida pero aún no se ha subido, subirla primero
		let imagenUrl = pagoData.imagen;
		if (imagenComprimida && !pagoData.imagen) {
			try {
				const token = getToken();
				const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

				const formData = new FormData();
				formData.append("comprobante", imagenComprimida);

				const response = await fetch(`${baseUrl}/pagos/upload-comprobante`, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
					},
					body: formData,
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.message || "Error al subir la imagen");
				}

				const data = await response.json();
				imagenUrl = data.data.url;
			} catch (error: any) {
				Swal.fire({
					icon: "error",
					title: "Error",
					text: error.message || "No se pudo subir la imagen del comprobante",
				});
				return;
			}
		}

		// Si hay una orden médica comprimida pero aún no se ha subido, subirla primero
		let ordenMedicaUrl = pagoData.orden_medica;
		if (ordenMedicaComprimida && !pagoData.orden_medica) {
			try {
				const token = getToken();
				const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

				const formData = new FormData();
				formData.append("orden_medica", ordenMedicaComprimida);

				const response = await fetch(`${baseUrl}/citas/upload-orden-medica`, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
					},
					body: formData,
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.message || "Error al subir la orden médica");
				}

				const data = await response.json();
				ordenMedicaUrl = data.data.url;
			} catch (error: any) {
				Swal.fire({
					icon: "error",
					title: "Error",
					text: error.message || "No se pudo subir la orden médica",
				});
				return;
			}
		}

		try {
			const fechaNormalizada = normalizeFecha(selectedDisponibilidad.fecha);
			await asignarCita({
				id_paciente: selectedPaciente.id_paciente,
				id_representado: null,
				id_eco: selectedEco.id_eco,
				id_especialista: selectedEspecialista.id_especialista,
				id_disponibilidad: selectedDisponibilidad.id_disponibilidad,
				orden_medica: ordenMedicaUrl, // URL de la orden médica
				metodo: pagoData.metodo,
				imagen: imagenUrl,
				banco_origen: pagoData.banco_origen,
				banco_destino: pagoData.banco_destino,
				monto: parseFloat(pagoData.monto),
				cedula_pagador: pagoData.cedula_pagador,
				telefono_pagador: pagoData.telefono_pagador,
				referencia: pagoData.referencia,
			}).unwrap();

			await Swal.fire({
				icon: "success",
				title: "Cita asignada",
				text: "La cita ha sido asignada exitosamente con pago y resultado.",
				timer: 2000,
				showConfirmButton: false,
			});

			onSuccess?.();
			onClose();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudo asignar la cita",
			});
		}
	};

	const isLoading = isAsignando || isAprobando;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="relative w-full max-w-3xl max-h-[90vh] rounded-xl bg-paper shadow-lg flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-mist p-4">
					<h2 className="text-lg font-semibold text-brand-900">Asignar cita</h2>
					<button
						onClick={onClose}
						className="rounded-lg p-1 text-brand-800 hover:bg-cloud"
						aria-label="Cerrar"
						disabled={isLoading}
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6">
					{/* Paso 1: Seleccionar paciente */}
					{step === "paciente" && (
						<div className="space-y-4">
							<h3 className="text-base font-semibold text-brand-900">1. Seleccionar paciente</h3>
							{loadingPacientes ? (
								<div className="text-center py-8 text-brand-600">Cargando pacientes...</div>
							) : pacientes.length === 0 ? (
								<div className="text-center py-8 text-brand-600">No hay pacientes disponibles</div>
							) : (
								<div className="space-y-2 max-h-96 overflow-y-auto">
									{pacientes.map((paciente) => (
										<button
											key={paciente.id_paciente}
											onClick={() => {
												setSelectedPaciente(paciente);
												setStep("eco");
											}}
											className="w-full rounded-lg border border-brand-200 bg-paper p-4 text-left hover:bg-cloud transition-colors"
										>
											<p className="font-medium text-brand-900">
												{paciente.nombre} {paciente.apellido}
											</p>
											<p className="text-sm text-brand-600 mt-1">
												Cédula: {paciente.cedula} • Tel: {paciente.telefono}
											</p>
										</button>
									))}
								</div>
							)}
						</div>
					)}

					{/* Paso 2: Seleccionar eco */}
					{step === "eco" && (
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<button
									onClick={() => {
										setStep("paciente");
										setSelectedEco(null);
									}}
									className="text-sm text-brand-600 hover:text-brand-800"
								>
									← Volver
								</button>
								<h3 className="text-base font-semibold text-brand-900">2. Seleccionar tipo de eco</h3>
							</div>
							{selectedPaciente && (
								<div className="rounded-lg border border-brand-200 bg-brand-50 p-3 mb-4">
									<p className="text-sm font-medium text-brand-900">
										Paciente: {selectedPaciente.nombre} {selectedPaciente.apellido}
									</p>
								</div>
							)}
							{loadingEcos ? (
								<div className="text-center py-8 text-brand-600">Cargando ecos...</div>
							) : ecos.length === 0 ? (
								<div className="text-center py-8 text-brand-600">No hay ecos disponibles</div>
							) : (
								<div className="space-y-2 max-h-96 overflow-y-auto">
									{ecos.map((eco) => (
										<button
											key={eco.id_eco}
											onClick={() => {
												setSelectedEco(eco);
												setStep("especialista");
											}}
											className="w-full rounded-lg border border-brand-200 bg-paper p-4 text-left hover:bg-cloud transition-colors"
										>
											<p className="font-medium text-brand-900">{eco.nombre}</p>
											<p className="text-sm text-brand-600 mt-1">
												Precio: {eco.precio} Bs • Duración: {eco.duracion_min} min
											</p>
										</button>
									))}
								</div>
							)}
						</div>
					)}

					{/* Paso 3: Seleccionar especialista */}
					{step === "especialista" && (
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<button
									onClick={() => {
										setStep("eco");
										setSelectedEspecialista(null);
									}}
									className="text-sm text-brand-600 hover:text-brand-800"
								>
									← Volver
								</button>
								<h3 className="text-base font-semibold text-brand-900">3. Seleccionar especialista</h3>
							</div>
							{selectedEco && (
								<div className="rounded-lg border border-brand-200 bg-brand-50 p-3 mb-4">
									<p className="text-sm font-medium text-brand-900">
										Eco: {selectedEco.nombre} ({selectedEco.precio} Bs)
									</p>
								</div>
							)}
							{loadingEspecialistas ? (
								<div className="text-center py-8 text-brand-600">Cargando especialistas...</div>
							) : loadingEcosEspecialistas ? (
								<div className="text-center py-8 text-brand-600">
									Verificando ecos disponibles...
								</div>
							) : especialistasFiltrados.length === 0 ? (
								<div className="text-center py-8 text-brand-600">
									No hay especialistas disponibles para este tipo de eco
								</div>
							) : (
								<div className="space-y-2 max-h-96 overflow-y-auto">
									{especialistasFiltrados.map((especialista) => (
										<button
											key={especialista.id_especialista}
											onClick={() => {
												setSelectedEspecialista(especialista);
												setStep("fecha");
											}}
											className="w-full rounded-lg border border-brand-200 bg-paper p-4 text-left hover:bg-cloud transition-colors"
										>
											<p className="font-medium text-brand-900">
												{especialista.nombre} {especialista.apellido}
											</p>
											<p className="text-sm text-brand-600 mt-1">
												Especialidad: {especialista.especialidad}
											</p>
										</button>
									))}
								</div>
							)}
						</div>
					)}

					{/* Paso 4: Seleccionar fecha/hora */}
					{step === "fecha" && (
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<button
									onClick={() => {
										setStep("especialista");
										setSelectedDisponibilidad(null);
									}}
									className="text-sm text-brand-600 hover:text-brand-800"
								>
									← Volver
								</button>
								<h3 className="text-base font-semibold text-brand-900">4. Seleccionar fecha y hora</h3>
							</div>
							<div className="rounded-lg border border-brand-200 bg-brand-50 p-3 mb-4 space-y-1">
								<p className="text-sm font-medium text-brand-900">
									Especialista: {selectedEspecialista?.nombre} {selectedEspecialista?.apellido}
								</p>
								<p className="text-sm text-brand-600">Eco: {selectedEco?.nombre}</p>
							</div>
							{loadingDisponibilidades ? (
								<div className="text-center py-8 text-brand-600">Cargando disponibilidades...</div>
							) : disponibilidadesFiltradas.length === 0 ? (
								<div className="text-center py-8 text-brand-600">
									No hay disponibilidades para este especialista y tipo de eco
								</div>
							) : (
								<div className="space-y-2 max-h-96 overflow-y-auto">
									{disponibilidadesFiltradas.map((disp: DisponibilidadItem) => (
										<button
											key={disp.id_disponibilidad}
											onClick={() => handleSelectDisponibilidad(disp)}
											disabled={isLoading}
											className={`w-full rounded-lg border p-4 text-left transition-colors ${
												selectedDisponibilidad?.id_disponibilidad === disp.id_disponibilidad
													? "border-brand-700 bg-brand-100"
													: "border-brand-200 bg-paper hover:bg-cloud"
											} ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
										>
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-3">
													<Calendar className="h-4 w-4 text-brand-600" />
													<span className="font-medium text-brand-900">
														{formatFecha(disp.fecha)}
													</span>
													<Clock className="h-4 w-4 text-brand-600 ml-2" />
													<span className="text-brand-700">
														{formatHora(disp.hora_inicio)} - {formatHora(disp.hora_fin)}
													</span>
												</div>
												{disp.estado === 0 && (
													<span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
														Pendiente
													</span>
												)}
												{disp.estado === 1 && (
													<span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
														Aprobada
													</span>
												)}
											</div>
										</button>
									))}
								</div>
							)}
						</div>
					)}

					{/* Paso 5: Formulario de pago */}
					{step === "pago" && (
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<button
									onClick={() => {
										setStep("fecha");
										setSelectedDisponibilidad(null);
									}}
									className="text-sm text-brand-600 hover:text-brand-800"
									disabled={isLoading}
								>
									← Volver
								</button>
								<h3 className="text-base font-semibold text-brand-900">5. Datos del pago</h3>
							</div>
							<div className="rounded-lg border border-brand-200 bg-brand-50 p-3 mb-4 space-y-1">
								<p className="text-sm font-medium text-brand-900">
									{formatFecha(selectedDisponibilidad?.fecha || "")} a las{" "}
									{formatHora(selectedDisponibilidad?.hora_inicio || "")}
								</p>
								<p className="text-sm text-brand-600">
									{selectedPaciente?.nombre} {selectedPaciente?.apellido} • {selectedEco?.nombre}
								</p>
							</div>

							{/* Formulario de pago reutilizable */}
							<FormularioPago
								precioEcoUSD={selectedEco?.precio || null}
								onChange={(data) => setPagoData(data)}
								onImageReady={(file) => setImagenComprimida(file)}
								onOrdenMedicaReady={(file) => setOrdenMedicaComprimida(file)}
								autoUpload={false}
								isLoading={isLoading}
								disabled={isLoading}
							/>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-3 border-t border-mist p-4">
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg border border-brand-300 bg-paper px-4 py-2 text-sm font-medium text-brand-800 transition-colors hover:bg-cloud"
						disabled={isLoading}
					>
						Cancelar
					</button>
					{step === "pago" && (
						<button
							type="button"
							onClick={handleAsignarCita}
							disabled={isLoading}
							className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? "Asignando..." : "Asignar cita"}
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default AsignarCitaModal;
