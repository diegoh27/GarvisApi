import { useState, useMemo, useEffect } from "react";
import Swal from "sweetalert2";
import {
	ClipboardList,
	ChevronLeft,
	ChevronRight,
	Search,
	UserPlus,
	Users,
} from "lucide-react";
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
import CrearPacienteModal from "../components/CrearPacienteModal";

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

const calcularEdadPaciente = (fechaNacimiento: string | null | undefined): number | null => {
	if (!fechaNacimiento) return null;
	const nac = new Date(`${String(fechaNacimiento).slice(0, 10)}T00:00:00`);
	if (Number.isNaN(nac.getTime())) return null;
	const hoy = new Date();
	let edad = hoy.getFullYear() - nac.getFullYear();
	const m = hoy.getMonth() - nac.getMonth();
	if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
	return edad;
};

const getPaginationRange = (current: number, total: number): (number | "ellipsis")[] => {
	if (total <= 1) return [1];
	const pages = new Set<number>();
	pages.add(1);
	pages.add(total);
	for (let i = current - 1; i <= current + 1; i++) {
		if (i >= 1 && i <= total) pages.add(i);
	}
	const sorted = [...pages].sort((a, b) => a - b);
	const out: (number | "ellipsis")[] = [];
	for (let i = 0; i < sorted.length; i++) {
		if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("ellipsis");
		out.push(sorted[i]);
	}
	return out;
};

type FilterOption = {
	id: string;
	label: string;
};

type EstadoPacienteUi = {
	label: string;
	badgeClass: string;
	dotClass: string;
};

const getEstadoPacienteUi = (p: {
	activo: number;
	totalCitas: number;
	citasConResultado: number;
}): EstadoPacienteUi => {
	if (p.activo === 0) {
		return {
			label: "Inactivo",
			badgeClass: "bg-[#e3e2e2] text-[#3e4948]",
			dotClass: "bg-slate-300",
		};
	}
	if (p.totalCitas === 0) {
		return {
			label: "Nuevo",
			badgeClass: "bg-cyan-100/80 text-cyan-950",
			dotClass: "bg-sky-400",
		};
	}
	if (p.citasConResultado < p.totalCitas) {
		return {
			label: "Pendiente",
			badgeClass: "bg-red-100 text-red-900",
			dotClass: "bg-amber-400",
		};
	}
	return {
		label: "Al día",
		badgeClass: "bg-teal-100 text-teal-900",
		dotClass: "bg-emerald-500",
	};
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
	const [crearPacienteOpen, setCrearPacienteOpen] = useState(false);
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
		{ id: "todas", label: "Todos" },
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
		return todosPacientes
			.map((paciente) => {
				const pacienteConCitas = pacientesConCitas.get(paciente.id_paciente);
				return {
					...paciente,
					citas: pacienteConCitas?.citas || [],
				};
			})
			.sort((a, b) => {
				const nombreA = `${a.nombre} ${a.apellido}`.toLowerCase();
				const nombreB = `${b.nombre} ${b.apellido}`.toLowerCase();
				return nombreA.localeCompare(nombreB);
			});
	}, [todosPacientes, pacientesConCitas]);

	const totalPacientesKpi = todosPacientes.length;
	const sinResultadosKpi = useMemo(
		() =>
			pacientesAgrupados.filter((p) =>
				p.citas.some((cita) => parseResultadoArchivo(cita.resultado_archivo).length === 0),
			).length,
		[pacientesAgrupados],
	);

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

	const paginationItems = useMemo(
		() => getPaginationRange(currentPage, totalPages),
		[currentPage, totalPages],
	);

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
			await refetchCitas();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudieron subir los resultados",
			});
		}
	};

	return (
		<PageShell title="Pacientes">
			<div className="relative space-y-8 pb-36">
				<section className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-6">
					<div className="flex min-h-[5.5rem] min-w-[220px] flex-1 items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
						<div
							className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-100/90"
							aria-hidden
						>
							<Users className="h-7 w-7 text-[#006965]" strokeWidth={2} />
						</div>
						<div className="flex min-w-0 flex-1 flex-col gap-1">
							<p className="font-sans text-[11px] font-semibold uppercase tracking-widest text-slate-500">
								Total pacientes
							</p>
							<p className="font-headline text-3xl font-bold leading-none tabular-nums text-[#006965]">
								{totalPacientesKpi.toLocaleString("es-VE")}
							</p>
						</div>
					</div>
					<div className="flex min-h-[5.5rem] min-w-[220px] flex-1 items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
						<div
							className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100/90"
							aria-hidden
						>
							<ClipboardList className="h-7 w-7 text-[#ae2b30]" strokeWidth={2} />
						</div>
						<div className="flex min-w-0 flex-1 flex-col gap-1">
							<p className="font-sans text-[11px] font-semibold uppercase tracking-widest text-slate-500">
								Sin resultados
							</p>
							<p className="font-headline text-3xl font-bold leading-none tabular-nums text-[#ae2b30]">
								{sinResultadosKpi.toLocaleString("es-VE")}
							</p>
						</div>
					</div>
				</section>

				<section className="space-y-6 rounded-2xl bg-[#f4f3f3] p-6 md:p-8">
					<div className="flex flex-col items-center gap-6 md:flex-row">
						<div className="relative w-full flex-1">
							<div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
								<Search className="h-5 w-5" aria-hidden />
							</div>
							<input
								id="paciente-search"
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Buscar por nombre, apellido, cédula o correo..."
								className="w-full rounded-xl border-none bg-white py-4 pl-12 pr-4 text-base text-brand-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006965]/20"
							/>
						</div>
						<div className="flex w-full flex-wrap items-center justify-center gap-2 rounded-full border border-slate-200/80 bg-white/50 p-1.5 md:w-auto">
							{filterOptions.map((option) => (
								<button
									key={option.id}
									type="button"
									onClick={() => setFilter(option.id)}
									className={`rounded-full px-6 py-2.5 text-base font-medium transition-all ${filter === option.id
										? "bg-[#006965] text-white shadow-md shadow-[#006965]/20"
										: "text-slate-600 hover:bg-white/80"
										}`}
								>
									{option.label}
								</button>
							))}
						</div>
					</div>
				</section>

				<section className="space-y-6">
					<div className="px-2 sm:flex sm:justify-end">
						<p className="text-base text-slate-500">
							{pacientesFiltrados.length === 0
								? "Mostrando 0 de 0 registros"
								: `Mostrando ${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, pacientesFiltrados.length)} de ${pacientesFiltrados.length.toLocaleString("es-VE")} registros`}
						</p>
					</div>

					{loadingPacientes || loadingCitas ? (
						<div className="py-16 text-center text-slate-600">Cargando pacientes...</div>
					) : todosPacientes.length === 0 ? (
						<div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
							<p className="text-slate-600">
								No hay pacientes {filter !== "todas" ? "con el filtro seleccionado" : ""}.
							</p>
						</div>
					) : pacientesFiltrados.length === 0 ? (
						<div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
							<p className="text-slate-600">No hay resultados para la búsqueda o filtro actual.</p>
						</div>
					) : (
						<div className="grid grid-cols-1 gap-4">
							{paginatedPacientes.map((paciente) => {
								const fullName = `${paciente.nombre} ${paciente.apellido}`;
								const totalCitas = paciente.citas.length;
								const citasConResultado = paciente.citas.filter((cita) => {
									const archivos = parseResultadoArchivo(cita.resultado_archivo);
									return archivos.length > 0;
								}).length;
								const edad = calcularEdadPaciente(paciente.fecha_nacimiento);
								const estadoUi = getEstadoPacienteUi({
									activo: paciente.activo,
									totalCitas,
									citasConResultado,
								});
								const { citas: _c, ...pacienteParaModal } = paciente;

								return (
									<div
										key={paciente.id_paciente}
										className="group flex flex-col justify-between rounded-2xl border border-slate-100/80 bg-white p-6 shadow-sm transition-all duration-300 hover:bg-white hover:shadow-md md:flex-row md:items-center"
									>
										<div className="flex flex-1 min-w-0 items-center gap-6 md:pr-4">
											<div className="relative shrink-0">
												<div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 font-headline text-lg font-bold text-slate-500 grayscale transition-all group-hover:grayscale-0">
													{(paciente.nombre?.[0] ?? "").toUpperCase()}
													{(paciente.apellido?.[0] ?? "").toUpperCase()}
												</div>
												<div
													className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white ${estadoUi.dotClass}`}
												/>
											</div>
											<div className="min-w-0">
												<h4 className="font-headline text-lg font-bold text-brand-900 transition-colors group-hover:text-[#006965] truncate">
													{fullName}
												</h4>
												<p className="text-base text-slate-500 truncate">
													C.I. {paciente.cedula}
													{edad != null ? ` • ${edad} años` : ""}
													{paciente.correo ? ` • ${paciente.correo}` : ""}
												</p>
												<p className="mt-1 text-sm text-slate-400 truncate">
													{totalCitas} cita{totalCitas !== 1 ? "s" : ""} en historial •{" "}
													{citasConResultado} con resultado{citasConResultado !== 1 ? "s" : ""}
												</p>
											</div>
										</div>
										<div className="mt-4 flex shrink-0 flex-col gap-6 px-0 md:mt-0 md:flex-row md:items-center md:gap-8 md:px-4 lg:gap-12">
											<div className="flex items-center gap-8 md:gap-10">
												<div className="w-12 text-center shrink-0">
													<p className="mb-1 font-sans text-[10px] uppercase tracking-widest text-slate-400">
														Citas
													</p>
													<p className="font-headline text-lg font-bold text-slate-700">{totalCitas}</p>
												</div>
												<div className="w-20 text-center shrink-0">
													<p className="mb-1 font-sans text-[10px] uppercase tracking-widest text-slate-400">
														Resultados
													</p>
													<p
														className={`font-headline text-lg font-bold ${citasConResultado === 0 && totalCitas > 0 ? "text-[#ae2b30]" : "text-slate-700"}`}
													>
														{String(citasConResultado).padStart(2, "0")}
													</p>
												</div>
												<div className="hidden h-10 w-px bg-slate-100 lg:block shrink-0" />
												<div className="hidden lg:flex xl:w-24 shrink-0 text-center justify-center">
													<span
														className={`rounded-full px-3 py-1 w-full text-center text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${estadoUi.badgeClass}`}
													>
														{estadoUi.label}
													</span>
												</div>
											</div>
											<div className="flex w-full gap-3 md:mt-0 md:w-[260px] md:items-center shrink-0">
												<button
													type="button"
													onClick={() =>
														setSelectedPacienteForHistorial({
															id_paciente: paciente.id_paciente,
															nombre: paciente.nombre,
															apellido: paciente.apellido,
														})
													}
													className="flex-1 rounded-xl border border-[#006965]/20 px-4 py-3 text-base font-semibold text-[#006965] transition-colors hover:bg-teal-50 active:scale-95 md:flex-none text-center whitespace-nowrap"
												>
													Ver historial
												</button>
												<button
													type="button"
													onClick={() => setSelectedPacienteForAsignar(pacienteParaModal)}
													className="flex-1 rounded-xl bg-[#006965] px-4 py-3 text-base font-semibold text-white shadow-lg shadow-[#006965]/10 transition-all hover:shadow-[#006965]/20 active:scale-95 md:flex-none text-center whitespace-nowrap"
												>
													Asignar cita
												</button>
											</div>
										</div>
										<div className="mt-3 lg:hidden">
											<span
												className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${estadoUi.badgeClass}`}
											>
												{estadoUi.label}
											</span>
										</div>
									</div>
								);
							})}
						</div>
					)}

					{pacientesFiltrados.length > 0 && (
						<div className="flex flex-wrap items-center justify-center gap-2 pt-4">
							<button
								type="button"
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								disabled={currentPage === 1}
								className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-[#eeeeed] disabled:opacity-40"
								aria-label="Página anterior"
							>
								<ChevronLeft className="h-5 w-5" />
							</button>
							{paginationItems.map((item, idx) =>
								item === "ellipsis" ? (
									<span key={`e-${idx}`} className="px-2 text-slate-400">
										...
									</span>
								) : (
									<button
										key={item}
										type="button"
										onClick={() => setCurrentPage(item)}
										className={`flex h-10 w-10 items-center justify-center rounded-xl text-base font-medium transition-colors ${currentPage === item
											? "bg-[#006965] font-bold text-white shadow-md shadow-[#006965]/20"
											: "text-slate-600 hover:bg-[#eeeeed]"
											}`}
									>
										{item}
									</button>
								),
							)}
							<button
								type="button"
								onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
								disabled={currentPage >= totalPages}
								className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-[#eeeeed] disabled:opacity-40"
								aria-label="Página siguiente"
							>
								<ChevronRight className="h-5 w-5" />
							</button>
						</div>
					)}
				</section>
			</div>

			<button
				type="button"
				onClick={() => setCrearPacienteOpen(true)}
				className="fixed bottom-8 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#006965] text-white shadow-2xl shadow-[#006965]/40 transition-all hover:scale-110 active:scale-95"
				aria-label="Crear nuevo paciente"
				title="Crear nuevo paciente"
			>
				<UserPlus className="h-8 w-8" aria-hidden />
			</button>

			<CrearPacienteModal
				isOpen={crearPacienteOpen}
				onClose={() => setCrearPacienteOpen(false)}
				onSuccess={async () => {
					await refetchPacientes();
					await refetchCitas();
				}}
			/>

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
						await refetchCitas();
						// Buscar la cita actualizada en los nuevos datos
						const nuevasCitas = await refetchCitas();
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
						await refetchCitas();
					}}
				/>
			)}
		</PageShell>
	);
};

export default PacientesPage;
