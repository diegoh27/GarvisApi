import { useState, useMemo, useEffect } from "react";
import Swal from "sweetalert2";
import { PageShell, formatFechaLocal } from "../../../shared";
import {
	useGetCitasAtendidasConResultadosQuery,
	useUploadResultadoMutation,
} from "../../resultados/resultadosApi";
import type { CitaAtendidaConResultado } from "../../resultados/resultadosApi";
import { useGetCitaByIdQuery, useGetAllPacientesQuery, type PacienteData } from "../moderadoresApi";
import SubirResultadoModal from "../../especialista/components/SubirResultadoModal";
import VerCitaModal from "../components/VerCitaModal";
import VerResultadosModal from "../components/VerResultadosModal";
import HistorialCitasModal from "../components/HistorialCitasModal";
import AsignarCitaModal from "../components/AsignarCitaModal";

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

// Función para parsear el archivo (puede ser string simple o JSON array)
const parseResultadoArchivo = (archivo: string | null | undefined): string[] => {
	if (!archivo) return [];
	try {
		const parsed = JSON.parse(archivo);
		const urls = Array.isArray(parsed) ? parsed : [archivo];
		// Validar y corregir URLs que no tengan protocolo
		return urls.map((url) => {
			if (!url) return url;
			const trimmedUrl = url.trim();
			if (!trimmedUrl.match(/^https?:\/\//i)) {
				return `https://${trimmedUrl}`;
			}
			return trimmedUrl;
		});
	} catch {
		// Si no es JSON, tratar como string simple
		const trimmedUrl = archivo.trim();
		if (!trimmedUrl.match(/^https?:\/\//i)) {
			return [`https://${trimmedUrl}`];
		}
		return [trimmedUrl];
	}
};

type FilterOption = {
	id: string;
	label: string;
};

const PacientesPage = () => {
	const { data: citas = [], isLoading: loadingCitas, refetch: refetchCitas } = useGetCitasAtendidasConResultadosQuery();
	const { data: todosPacientes = [], isLoading: loadingPacientes, refetch: refetchPacientes } = useGetAllPacientesQuery();
	const [uploadResultado, { isLoading: isUploading }] = useUploadResultadoMutation();
	const [selectedCita, setSelectedCita] = useState<CitaAtendidaConResultado | null>(null);
	const [selectedCitaIdForView, setSelectedCitaIdForView] = useState<string | null>(null);
	const [selectedCitaForResultados, setSelectedCitaForResultados] = useState<{
		archivos: string[];
		pacienteNombre: string;
		ecoNombre: string;
		idCita: string;
	} | null>(null);
	const [selectedPacienteForHistorial, setSelectedPacienteForHistorial] = useState<{
		id_paciente: string;
		nombre: string;
		apellido: string;
	} | null>(null);
	const [selectedPacienteForAsignar, setSelectedPacienteForAsignar] = useState<PacienteData | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [filter, setFilter] = useState("todas");
	const [search, setSearch] = useState("");
	const itemsPerPage = 5;

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
		{ id: "sin-resultado", label: "Sin resultado" },
		{ id: "con-resultado", label: "Con resultado" },
	];

	// Filtrar citas según el filtro seleccionado
	const filteredCitas = useMemo(() => {
		let citasFiltradas = citas;
		if (filter === "sin-resultado") {
			citasFiltradas = citas.filter((cita) => {
				const archivos = parseResultadoArchivo(cita.resultado_archivo);
				return archivos.length === 0;
			});
		}
		if (filter === "con-resultado") {
			citasFiltradas = citas.filter((cita) => {
				const archivos = parseResultadoArchivo(cita.resultado_archivo);
				return archivos.length > 0;
			});
		}
		return citasFiltradas;
	}, [citas, filter]);

	// Crear mapa de pacientes con sus citas
	const pacientesConCitas = useMemo(() => {
		const pacientesMap = new Map<string, {
			id_paciente: string;
			nombre: string;
			apellido: string;
			citas: CitaAtendidaConResultado[];
		}>();

		filteredCitas.forEach((cita) => {
			const key = cita.id_paciente;
			if (!pacientesMap.has(key)) {
				pacientesMap.set(key, {
					id_paciente: cita.id_paciente,
					nombre: cita.paciente_nombre,
					apellido: cita.paciente_apellido,
					citas: [],
				});
			}
			pacientesMap.get(key)!.citas.push(cita);
		});

		return pacientesMap;
	}, [filteredCitas]);

	// Combinar todos los pacientes con información de citas
	const pacientesAgrupados = useMemo(() => {
		return todosPacientes.map((paciente) => {
			const pacienteConCitas = pacientesConCitas.get(paciente.id_paciente);
			return {
				id_paciente: paciente.id_paciente,
				nombre: paciente.nombre,
				apellido: paciente.apellido,
				cedula: paciente.cedula,
				correo: paciente.correo,
				citas: pacienteConCitas?.citas || [],
			};
		}).sort((a, b) => {
			const nombreA = `${a.nombre} ${a.apellido}`.toLowerCase();
			const nombreB = `${b.nombre} ${b.apellido}`.toLowerCase();
			return nombreA.localeCompare(nombreB);
		});
	}, [todosPacientes, pacientesConCitas]);

	// Aplicar búsqueda por nombre, apellido, cédula o correo
	const pacientesFiltrados = useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term) return pacientesAgrupados;

		return pacientesAgrupados.filter((paciente) => {
			const nombreCompleto = `${paciente.nombre} ${paciente.apellido}`.toLowerCase();
			const cedula = (paciente.cedula || "").toLowerCase();
			const correo = (paciente.correo || "").toLowerCase();

			return (
				nombreCompleto.includes(term) ||
				cedula.includes(term) ||
				correo.includes(term)
			);
		});
	}, [pacientesAgrupados, search]);

	// Paginación de pacientes
	const totalPages = Math.max(1, Math.ceil(pacientesFiltrados.length / itemsPerPage));
	const paginatedPacientes = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return pacientesFiltrados.slice(startIndex, startIndex + itemsPerPage);
	}, [pacientesFiltrados, currentPage, itemsPerPage]);

	// Resetear a página 1 cuando cambian los datos o el filtro
	useEffect(() => {
		setCurrentPage(1);
	}, [pacientesFiltrados.length, filter, search]);

	const handleSubirResultado = async (id_cita: string, archivos: File[]) => {
		try {
			await uploadResultado({
				id_cita,
				archivos,
				nombre: selectedCita
					? `${selectedCita.paciente_nombre}_${selectedCita.eco_nombre}_${selectedCita.fecha_cita}`
					: undefined,
			}).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Resultados subidos",
				text: `Se subieron ${archivos.length} archivo${archivos.length > 1 ? "s" : ""} exitosamente.`,
				timer: 2000,
				showConfirmButton: false,
			});
			setSelectedCita(null);
			refetch();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudieron subir los resultados",
			});
		}
	};

	return (
		<PageShell
			title="Pacientes"
			description="Subir resultados (ecos) para citas atendidas. Ver y gestionar archivos de resultados."
		>
			<div className="space-y-4">
				{/* Filtros y búsqueda */}
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-wrap gap-2">
						{filterOptions.map((option) => (
							<button
								key={option.id}
								onClick={() => setFilter(option.id)}
								className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${filter === option.id
									? "bg-brand-700 text-paper"
									: "bg-cloud text-brand-800 hover:bg-brand-100"
									}`}
							>
								{option.label}
							</button>
						))}
					</div>
					<input
						type="text"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Buscar por nombre, apellido, cédula o correo..."
						className="h-10 w-full max-w-xs rounded-lg border border-mist bg-cloud px-3 text-sm text-brand-900 outline-none focus:border-brand-700"
					/>
				</div>

				{(loadingPacientes || loadingCitas) ? (
					<div className="text-center py-8 text-brand-600">
						Cargando pacientes...
					</div>
				) : pacientesAgrupados.length === 0 ? (
					<div className="rounded-lg border border-brand-200 bg-paper p-8 text-center">
						<p className="text-brand-600">
							No hay pacientes {filter !== "todas" ? `con el filtro seleccionado` : ""}.
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{paginatedPacientes.map((paciente) => {
							const fullName = `${paciente.nombre} ${paciente.apellido}`;
							const totalCitas = paciente.citas.length;
							const citasConResultado = paciente.citas.filter((cita) => {
								const archivos = parseResultadoArchivo(cita.resultado_archivo);
								return archivos.length > 0;
							}).length;

							return (
								<div
									key={paciente.id_paciente}
									className="rounded-lg border border-brand-200 bg-paper p-4"
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div>
												<h3 className="font-semibold text-brand-900">{fullName}</h3>
												<p className="text-sm text-brand-600 mt-1">
													{totalCitas} cita{totalCitas !== 1 ? "s" : ""} • {citasConResultado} con resultado{citasConResultado !== 1 ? "s" : ""}
												</p>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() =>
													setSelectedPacienteForAsignar({
														id_paciente: paciente.id_paciente,
														nombre: paciente.nombre,
														apellido: paciente.apellido,
														genero: paciente.genero,
														cedula: paciente.cedula,
														correo: paciente.correo,
														telefono: paciente.telefono,
														activo: paciente.activo,
														fecha_nacimiento: paciente.fecha_nacimiento,
														tipo_sangre: paciente.tipo_sangre,
														descripcion: paciente.descripcion,
														direccion: paciente.direccion,
														contacto_emergencia_nombre: paciente.contacto_emergencia_nombre,
														contacto_emergencia_telefono: paciente.contacto_emergencia_telefono,
													})
												}
												className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-green-700"
											>
												Asignar cita
											</button>
											<button
												type="button"
												onClick={() =>
													setSelectedPacienteForHistorial({
														id_paciente: paciente.id_paciente,
														nombre: paciente.nombre,
														apellido: paciente.apellido,
													})
												}
												className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-brand-800"
											>
												Ver historial de citas
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}

				{/* Paginación */}
				{pacientesFiltrados.length > 0 && (
					<div className="flex items-center justify-between border-t border-mist pt-4">
						<div className="text-sm text-brand-800">
							Mostrando {paginatedPacientes.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} -{" "}
							{Math.min(currentPage * itemsPerPage, pacientesFiltrados.length)} de{" "}
							{pacientesFiltrados.length} paciente{pacientesFiltrados.length !== 1 ? "s" : ""}
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
								disabled={currentPage >= totalPages}
								className="rounded-full border border-mist bg-paper px-3 py-1.5 text-xs text-brand-800 transition-colors hover:bg-cloud disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Siguiente
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Modal para subir resultados */}
			{selectedCita && (
				<SubirResultadoModal
					cita={{
						id_cita: selectedCita.id_cita,
						paciente_nombre: selectedCita.paciente_nombre,
						paciente_apellido: selectedCita.paciente_apellido,
						eco_nombre: selectedCita.eco_nombre,
						fecha_cita: selectedCita.fecha_cita,
					}}
					onClose={() => setSelectedCita(null)}
					onUpload={handleSubirResultado}
					isUploading={isUploading}
				/>
			)}

			{/* Modal para ver detalles de la cita */}
			{selectedCitaIdForView && (
				<VerCitaModal
					cita={loadingCita ? null : citaData || null}
					error={citaError ? "No se pudo cargar la información de la cita" : null}
					onClose={() => setSelectedCitaIdForView(null)}
				/>
			)}

			{/* Modal para ver resultados */}
			{selectedCitaForResultados && (
				<VerResultadosModal
					archivos={selectedCitaForResultados.archivos}
					pacienteNombre={selectedCitaForResultados.pacienteNombre}
					ecoNombre={selectedCitaForResultados.ecoNombre}
					idCita={selectedCitaForResultados.idCita}
					onClose={() => setSelectedCitaForResultados(null)}
					onArchivoDeleted={async () => {
						// Refrescar los datos del servidor
						await refetch();
						// Buscar la cita actualizada en los nuevos datos
						const nuevasCitas = await refetch();
						if (nuevasCitas.data) {
							const citaActualizada = nuevasCitas.data.find((c) => c.id_cita === selectedCitaForResultados.idCita);
							if (citaActualizada) {
								const nuevosArchivos = parseResultadoArchivo(citaActualizada.resultado_archivo);
								if (nuevosArchivos.length === 0) {
									// Si no quedan archivos, cerrar el modal
									setSelectedCitaForResultados(null);
								} else {
									// Actualizar el estado con los nuevos archivos
									setSelectedCitaForResultados((prev) =>
										prev ? { ...prev, archivos: nuevosArchivos } : null
									);
								}
							}
						}
					}}
				/>
			)}

			{/* Modal para asignar cita */}
			{selectedPacienteForAsignar && (
				<AsignarCitaModal
					pacientePreSeleccionado={selectedPacienteForAsignar}
					onClose={() => setSelectedPacienteForAsignar(null)}
					onSuccess={async () => {
						await refetchPacientes();
						await refetchCitas();
					}}
				/>
			)}

			{/* Modal para ver historial de citas */}
			{selectedPacienteForHistorial && (
				<HistorialCitasModal
					paciente={selectedPacienteForHistorial}
					citas={filteredCitas.filter((c) => c.id_paciente === selectedPacienteForHistorial.id_paciente)}
					formatFecha={formatFecha}
					formatHora={formatHora}
					parseResultadoArchivo={parseResultadoArchivo}
					onClose={() => setSelectedPacienteForHistorial(null)}
					onRefetch={async () => {
						await refetch();
					}}
				/>
			)}
		</PageShell>
	);
};

export default PacientesPage;
