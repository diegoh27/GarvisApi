import { useState, useMemo, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { PageShell, formatFechaLocal } from "../../../shared";
import {
	useGetAllCitasQuery,
	useUpdateEstadoPagoMutation,
	useCancelCitaMutation,
	useMarcarAtendidaMutation,
} from "../../citas/citasApi";
import type { CitaCompleta } from "../../citas/citasApi";
import { useGetCitaByIdQuery, useGetPagoByCitaQuery } from "../moderadoresApi";
import { useUploadResultadoMutation } from "../../resultados/resultadosApi";
import VerCitaModal from "../components/VerCitaModal";
import VerResultadosModal from "../components/VerResultadosModal";
import VerPagoModal from "../components/VerPagoModal";
import SubirResultadoModal from "../../especialista/components/SubirResultadoModal";
import PosponerCitaModal from "../components/PosponerCitaModal";
import RechazarPagoModal from "../components/RechazarPagoModal";
import { FileText, Download, Eye, Check, X, ChevronDown } from "lucide-react";
import type { CitaPendientePago } from "../../citas/citasApi";

const formatFecha = (value: string) => formatFechaLocal(value);

const formatHora = (value: string) => {
	if (!value) return "";
	const [hourStr, minuteStr = "00"] = value.split(":");
	const hour = Number(hourStr);
	if (Number.isNaN(hour)) return value;
	const period = hour >= 12 ? "PM" : "AM";
	const hour12 = hour % 12 === 0 ? 12 : hour % 12;
	return `${hour12}:${minuteStr} ${period}`;
};

const formatMonto = (monto: number | string | null | undefined) => {
	if (monto === null || monto === undefined) return "N/A";
	const num = typeof monto === "string" ? parseFloat(monto) : monto;
	if (Number.isNaN(num)) return "N/A";
	// Formatear como VES (Bolívares) ya que los pagos se hacen en VES
	return `Bs. ${num.toLocaleString("es-VE", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
};

// Función para parsear el archivo (puede ser string simple o JSON array)
const parseResultadoArchivo = (archivo: string | null | undefined): string[] => {
	if (!archivo) return [];
	try {
		const parsed = JSON.parse(archivo);
		const urls = Array.isArray(parsed) ? parsed : [archivo];
		return urls.map((url) => {
			if (!url) return url;
			const trimmedUrl = url.trim();
			if (!trimmedUrl.match(/^https?:\/\//i)) {
				return `https://${trimmedUrl}`;
			}
			return trimmedUrl;
		});
	} catch {
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
	estado?: number;
};

const toNumber = (value: number | string | null | undefined) => Number(value);

const TodasLasCitasPage = () => {
	const { data: citas = [], isLoading, refetch } = useGetAllCitasQuery();
	const [updateEstadoPago, { isLoading: isUpdating }] = useUpdateEstadoPagoMutation();
	const [cancelCita] = useCancelCitaMutation();
	const [marcarAtendida, { isLoading: isMarkingAtendida }] = useMarcarAtendidaMutation();
	const [uploadResultado, { isLoading: isUploading }] = useUploadResultadoMutation();
	const [selectedCitaIdForView, setSelectedCitaIdForView] = useState<string | null>(null);
	const [selectedCitaForResultados, setSelectedCitaForResultados] = useState<{
		archivos: string[];
		pacienteNombre: string;
		ecoNombre: string;
		idCita: string;
	} | null>(null);
	const [selectedCitaForPago, setSelectedCitaForPago] = useState<string | null>(null);
	const [selectedCitaForUpload, setSelectedCitaForUpload] = useState<CitaCompleta | null>(null);
	const [selectedCitaForPosponer, setSelectedCitaForPosponer] = useState<CitaPendientePago | null>(null);
	const [selectedCita, setSelectedCita] = useState<string | null>(null);
	const [citaToReject, setCitaToReject] = useState<{ id_cita: string; nombre: string } | null>(null);
	const [openAccionesCitaId, setOpenAccionesCitaId] = useState<string | null>(null);
	const accionesDropdownRef = useRef<HTMLDivElement>(null);

	// Obtener datos del pago cuando se selecciona una cita
	const {
		data: pagoData,
		isLoading: loadingPago,
		error: pagoError,
	} = useGetPagoByCitaQuery(selectedCitaForPago || "", {
		skip: !selectedCitaForPago,
	});

	// Cerrar menú Acciones al hacer clic fuera
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				openAccionesCitaId &&
				accionesDropdownRef.current &&
				!accionesDropdownRef.current.contains(event.target as Node)
			) {
				setOpenAccionesCitaId(null);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [openAccionesCitaId]);

	const [currentPage, setCurrentPage] = useState(1);
	const [filterPago, setFilterPago] = useState("todas");
	const [filterResultado, setFilterResultado] = useState("todas");
	const [filterInforme, setFilterInforme] = useState("todas");
	const [filterAtencion, setFilterAtencion] = useState("todas");
	const [filterOrigen, setFilterOrigen] = useState("todas");
	const [ordenFecha, setOrdenFecha] = useState<"reciente" | "antigua">("reciente");
	const [query, setQuery] = useState("");
	const itemsPerPage = 10;

	// Obtener datos completos de la cita cuando se selecciona para ver
	const {
		data: citaData,
		isLoading: loadingCita,
		error: citaError,
	} = useGetCitaByIdQuery(selectedCitaIdForView || "", {
		skip: !selectedCitaIdForView,
	});

	const filterOptionsPago: FilterOption[] = [
		{ id: "todas", label: "Todas" },
		{ id: "pagadas", label: "Pagadas", estado: 1 },
		{ id: "pendiente", label: "Pendiente de pago", estado: 0 },
		{ id: "rechazado", label: "Rechazado", estado: 2 },
		{ id: "canceladas", label: "Canceladas", estado: 2 },
	];

	const filterOptionsResultado: FilterOption[] = [
		{ id: "todas", label: "Todas" },
		{ id: "con-resultado", label: "Con resultado" },
		{ id: "sin-resultado", label: "Sin resultado" },
	];

	const filterOptionsInforme: FilterOption[] = [
		{ id: "todas", label: "Todas" },
		{ id: "con-informe", label: "Con informe" },
		{ id: "sin-informe", label: "Sin informe" },
	];

	const filterOptionsAtencion: FilterOption[] = [
		{ id: "todas", label: "Todas" },
		{ id: "atendidas", label: "Atendidas" },
		{ id: "no-atendidas", label: "No atendidas" },
	];

	const filterOptionsOrigen = [
		{ id: "todas", label: "Todas" },
		{ id: "web", label: "Web" },
		{ id: "mostrador", label: "Mostrador" },
	];

	// Filtrar citas según los filtros seleccionados y búsqueda
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
					(cita.paciente_correo && cita.paciente_correo.toLowerCase().includes(searchLower)) ||
					cita.paciente_telefono.toLowerCase().includes(searchLower) ||
					especialistaFullName.includes(searchLower) ||
					cita.especialista_nombre.toLowerCase().includes(searchLower) ||
					cita.especialista_apellido.toLowerCase().includes(searchLower) ||
					cita.eco_nombre.toLowerCase().includes(searchLower)
				);
			});
		}

		// Filtro por estado de pago o canceladas
		if (filterPago !== "todas") {
			if (filterPago === "canceladas") {
				// Filtrar por estado de cita cancelada
				citasFiltradas = citasFiltradas.filter((cita) => toNumber(cita.estado_cita) === 2);
			} else {
				const filterOption = filterOptionsPago.find((opt) => opt.id === filterPago);
				if (filterOption?.estado !== undefined) {
					citasFiltradas = citasFiltradas.filter(
						(cita) => toNumber(cita.estado_pago) === filterOption.estado,
					);
				}
			}
		}

		// Filtro por resultados
		if (filterResultado !== "todas") {
			if (filterResultado === "con-resultado") {
				citasFiltradas = citasFiltradas.filter((cita) => {
					const archivos = parseResultadoArchivo(cita.resultado_archivo);
					return archivos.length > 0;
				});
			} else if (filterResultado === "sin-resultado") {
				citasFiltradas = citasFiltradas.filter((cita) => {
					const archivos = parseResultadoArchivo(cita.resultado_archivo);
					return archivos.length === 0;
				});
			}
		}

		// Filtro por informe
		if (filterInforme !== "todas") {
			if (filterInforme === "con-informe") {
				citasFiltradas = citasFiltradas.filter((cita) => cita.id_informe !== null);
			} else if (filterInforme === "sin-informe") {
				citasFiltradas = citasFiltradas.filter((cita) => cita.id_informe === null);
			}
		}

		// Filtro por atención del especialista
		if (filterAtencion !== "todas") {
			if (filterAtencion === "atendidas") {
				citasFiltradas = citasFiltradas.filter(
					(cita) => toNumber(cita.estado_cita) === 3,
				);
			} else if (filterAtencion === "no-atendidas") {
				citasFiltradas = citasFiltradas.filter(
					(cita) => toNumber(cita.estado_cita) !== 3,
				);
			}
		}

		// Filtro por origen de cita
		if (filterOrigen !== "todas") {
			citasFiltradas = citasFiltradas.filter(
				(cita) => (cita.origen_cita || "web") === filterOrigen,
			);
		}

		// Ordenamiento por fecha
		citasFiltradas = [...citasFiltradas].sort((a, b) => {
			// Parsear fecha y hora correctamente
			const fechaAStr = a.fecha_cita.includes("T") ? a.fecha_cita.split("T")[0] : a.fecha_cita;
			const fechaBStr = b.fecha_cita.includes("T") ? b.fecha_cita.split("T")[0] : b.fecha_cita;
			const horaAStr = a.hora_cita || "00:00:00";
			const horaBStr = b.hora_cita || "00:00:00";

			// Asegurar formato correcto de hora (HH:MM:SS)
			const horaA = horaAStr.length === 5 ? `${horaAStr}:00` : horaAStr;
			const horaB = horaBStr.length === 5 ? `${horaBStr}:00` : horaBStr;

			// Crear objetos Date para comparar
			const fechaA = new Date(`${fechaAStr}T${horaA}`);
			const fechaB = new Date(`${fechaBStr}T${horaB}`);

			// Si alguna fecha es inválida, mantener el orden original
			if (Number.isNaN(fechaA.getTime()) || Number.isNaN(fechaB.getTime())) {
				return 0;
			}

			// Comparar fechas
			const timeA = fechaA.getTime();
			const timeB = fechaB.getTime();

			// Más reciente primero: orden descendente (timeB - timeA)
			// Más antigua primero: orden ascendente (timeA - timeB)
			if (ordenFecha === "reciente") {
				// Orden descendente: más reciente primero
				return timeB - timeA;
			} else {
				// Orden ascendente: más antigua primero
				return timeA - timeB;
			}
		});

		return citasFiltradas;
	}, [citas, filterPago, filterResultado, filterInforme, filterAtencion, filterOrigen, ordenFecha, filterOptionsPago, query]);

	// Paginación
	const totalPages = Math.max(1, Math.ceil(filteredCitas.length / itemsPerPage));
	const paginatedCitas = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return filteredCitas.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredCitas, currentPage, itemsPerPage]);

	// Resetear a página 1 cuando cambian los datos, los filtros o la búsqueda
	useEffect(() => {
		setCurrentPage(1);
	}, [citas.length, filterPago, filterResultado, filterInforme, filterAtencion, filterOrigen, ordenFecha, query]);

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
		// Buscar nombre del paciente para mostrar en el modal
		const cita = citas.find(c => c.id_cita === id_cita);
		const nombrePaciente = cita
			? `${cita.paciente_nombre ?? ""} ${cita.paciente_apellido ?? ""}`.trim()
			: "";

		// Abrir modal para ingresar motivo de rechazo
		setCitaToReject({ id_cita, nombre: nombrePaciente });
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
			refetch();
		} catch (err: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: err?.data?.message || "No se pudo marcar la cita como atendida",
			});
		}
	};

	const handleSubirResultado = async (id_cita: string, archivos: File[]) => {
		try {
			const cita = citas.find((c) => c.id_cita === id_cita);
			await uploadResultado({
				id_cita,
				archivos,
				nombre: cita
					? `${cita.paciente_nombre}_${cita.eco_nombre}_${cita.fecha_cita}`
					: undefined,
			}).unwrap();
			await Swal.fire({
				icon: "success",
				title: "Resultados subidos",
				text: `Se subieron ${archivos.length} archivo${archivos.length > 1 ? "s" : ""} exitosamente.`,
				timer: 2000,
				showConfirmButton: false,
			});
			setSelectedCitaForUpload(null);
			refetch();
		} catch (error: any) {
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error?.data?.message || "No se pudieron subir los resultados",
			});
		}
	};

	const handleViewOrdenMedica = (orden: string | null) => {
		if (!orden) {
			Swal.fire({
				icon: "warning",
				title: "Sin orden médica",
				text: "Esta cita no tiene orden médica disponible.",
			});
			return;
		}
		window.open(orden, "_blank", "noopener,noreferrer");
	};

	const handleViewInforme = (informePdfUrl: string | null) => {
		if (!informePdfUrl) {
			Swal.fire({
				icon: "warning",
				title: "Sin informe",
				text: "Esta cita no tiene informe disponible.",
			});
			return;
		}
		window.open(informePdfUrl, "_blank", "noopener,noreferrer");
	};

	const getEstadoPagoLabel = (estado: number) => {
		switch (estado) {
			case 0:
				return "Pendiente";
			case 1:
				return "Pagado";
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

	const getEstadoCitaLabel = (estado: number) => {
		switch (estado) {
			case 0:
				return "Pendiente";
			case 1:
				return "Confirmada";
			case 2:
				return "Cancelada";
			case 3:
				return "Atendida";
			default:
				return "Desconocido";
		}
	};

	const getEstadoCitaColor = (estado: number) => {
		switch (estado) {
			case 0:
				return "bg-amber-400 text-brand-900";
			case 1:
				return "bg-blue-500 text-paper";
			case 2:
				return "bg-red-500 text-paper";
			case 3:
				return "bg-green-500 text-paper";
			default:
				return "bg-cloud text-brand-800";
		}
	};

	return (
		<PageShell
			title="Todas las citas"
			description="Vista general de todas las citas. Filtrar por estado de pago, resultados e informes."
		>
			<div className="space-y-4">
				{/* Barra de búsqueda */}
				<div className="rounded-lg border border-brand-300 bg-paper p-4">
					<input
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Buscar por nombre, apellido, cédula, correo, teléfono, especialista o eco..."
						className="h-10 w-full rounded-lg border border-brand-300 bg-cloud px-4 text-sm text-brand-900 outline-none focus:border-brand-700"
					/>
				</div>

				{/* Filtros en grid para ocupar menos altura */}
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
					<div>
						<label className="mb-1.5 block text-xs font-medium text-brand-700">Estado de pago</label>
						<div className="flex flex-wrap gap-1.5">
							{filterOptionsPago.map((option) => (
								<button
									key={option.id}
									onClick={() => setFilterPago(option.id)}
									className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterPago === option.id
										? "bg-brand-700 text-paper"
										: "bg-cloud text-brand-800 hover:bg-mist"
										}`}
								>
									{option.label}
								</button>
							))}
						</div>
					</div>
					<div>
						<label className="mb-1.5 block text-xs font-medium text-brand-700">Resultados</label>
						<div className="flex flex-wrap gap-1.5">
							{filterOptionsResultado.map((option) => (
								<button
									key={option.id}
									onClick={() => setFilterResultado(option.id)}
									className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterResultado === option.id
										? "bg-brand-700 text-paper"
										: "bg-cloud text-brand-800 hover:bg-mist"
										}`}
								>
									{option.label}
								</button>
							))}
						</div>
					</div>
					<div>
						<label className="mb-1.5 block text-xs font-medium text-brand-700">Informe</label>
						<div className="flex flex-wrap gap-1.5">
							{filterOptionsInforme.map((option) => (
								<button
									key={option.id}
									onClick={() => setFilterInforme(option.id)}
									className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterInforme === option.id
										? "bg-brand-700 text-paper"
										: "bg-cloud text-brand-800 hover:bg-mist"
										}`}
								>
									{option.label}
								</button>
							))}
						</div>
					</div>
					<div>
						<label className="mb-1.5 block text-xs font-medium text-brand-700">Atención</label>
						<div className="flex flex-wrap gap-1.5">
							{filterOptionsAtencion.map((option) => (
								<button
									key={option.id}
									onClick={() => setFilterAtencion(option.id)}
									className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterAtencion === option.id
										? "bg-brand-700 text-paper"
										: "bg-cloud text-brand-800 hover:bg-mist"
										}`}
								>
									{option.label}
								</button>
							))}
						</div>
					</div>
					<div>
						<label className="mb-1.5 block text-xs font-medium text-brand-700">Origen</label>
						<div className="flex flex-wrap gap-1.5">
							{filterOptionsOrigen.map((option) => (
								<button
									key={option.id}
									onClick={() => setFilterOrigen(option.id)}
									className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterOrigen === option.id
										? "bg-brand-700 text-paper"
										: "bg-cloud text-brand-800 hover:bg-mist"
										}`}
								>
									{option.label}
								</button>
							))}
						</div>
					</div>
					<div>
						<label className="mb-1.5 block text-xs font-medium text-brand-700">Orden fecha</label>
						<div className="flex flex-wrap gap-1.5">
							<button
								onClick={() => setOrdenFecha("reciente")}
								className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${ordenFecha === "reciente"
									? "bg-brand-700 text-paper"
									: "bg-cloud text-brand-800 hover:bg-mist"
									}`}
							>
								Reciente
							</button>
							<button
								onClick={() => setOrdenFecha("antigua")}
								className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${ordenFecha === "antigua"
									? "bg-brand-700 text-paper"
									: "bg-cloud text-brand-800 hover:bg-mist"
									}`}
							>
								Antigua
							</button>
						</div>
					</div>
				</div>

				{isLoading ? (
					<div className="text-center py-8 text-brand-600">
						Cargando citas...
					</div>
				) : filteredCitas.length === 0 ? (
					<div className="rounded-lg border border-brand-200 bg-paper p-8 text-center">
						<p className="text-brand-600">
							{query.trim() ? "No se encontraron citas con los criterios de búsqueda." : `No hay citas ${filterPago !== "todas" || filterResultado !== "todas" || filterInforme !== "todas" || filterAtencion !== "todas" || filterOrigen !== "todas" ? `con los filtros seleccionados` : ""}.`}
						</p>
					</div>
				) : (
					<>
						<div className="space-y-3">
							{paginatedCitas.map((cita) => {
								const archivos = parseResultadoArchivo(cita.resultado_archivo);
								const tieneResultado = archivos.length > 0;
								const tieneInforme = cita.id_informe !== null;
								const fullName = `${cita.paciente_nombre} ${cita.paciente_apellido}`;
								const especialistaFullName = `${cita.especialista_nombre} ${cita.especialista_apellido}`;
								const estadoPago = toNumber(cita.estado_pago);
								const estadoCita = toNumber(cita.estado_cita);

								return (
									<div
										key={cita.id_cita}
										className="rounded-lg border border-brand-200 bg-paper p-4"
									>
										<div className="space-y-4">
											<div className="flex items-center justify-between flex-wrap gap-2">
												<div className="flex items-center gap-2 flex-wrap">
													<h3 className="font-semibold text-brand-900">{fullName}</h3>
													<span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-paper">
														{cita.eco_nombre}
													</span>
													<span
														className={`rounded-full px-2 py-0.5 text-xs font-medium ${cita.origen_cita === "mostrador"
																? "bg-violet-100 text-violet-700"
																: "bg-slate-100 text-slate-700"
															}`}
													>
														{cita.origen_cita === "mostrador" ? "Mostrador" : "Web"}
													</span>
													<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getEstadoPagoColor(estadoPago)}`}>
														{getEstadoPagoLabel(estadoPago)}
													</span>
													{estadoCita === 2 && (
														<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getEstadoCitaColor(estadoCita)}`}>
															{getEstadoCitaLabel(estadoCita)}
														</span>
													)}
													{estadoCita === 3 ? (
														<span className="inline-flex items-center gap-0.5 rounded-full bg-green-600 px-2 py-0.5 text-xs font-medium text-paper" title="La cita ya fue atendida por el especialista">
															<Check className="h-3 w-3" /> Atendida
														</span>
													) : (
														<span className="inline-flex items-center gap-0.5 rounded-full bg-violet-500 px-2 py-0.5 text-xs font-medium text-paper" title="La cita aún no ha sido atendida por el especialista">
															<X className="h-3 w-3" /> No atendida
														</span>
													)}
													{tieneResultado && (
														<span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-medium text-paper">
															{archivos.length} archivo{archivos.length > 1 ? "s" : ""}
														</span>
													)}
													{tieneInforme && (
														<span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-medium text-paper">
															Con informe
														</span>
													)}
													{cita.id_representado ? (
														<span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700" title="Cita para representado">
															<Check className="h-3 w-3" /> Representado
														</span>
													) : (
														<span className="inline-flex items-center gap-0.5 rounded-full bg-brand-200 px-2 py-0.5 text-xs font-medium text-brand-600" title="Cita para el paciente">
															<X className="h-3 w-3" /> No representado
														</span>
													)}
												</div>
												<div className="text-xs text-brand-500 font-mono">
													ID: {cita.id_cita.slice(0, 8)}...
												</div>
											</div>
											<div className="grid gap-2 text-sm text-brand-600 sm:grid-cols-2 lg:grid-cols-3">
												<div>
													<span className="font-medium">Especialista:</span> {especialistaFullName}
												</div>
												<div>
													<span className="font-medium">Fecha y hora:</span> {formatFecha(cita.fecha_cita)} a las{" "}
													{formatHora(cita.hora_cita)}
												</div>
												<div>
													<span className="font-medium">Cédula:</span> {cita.paciente_cedula}
												</div>
												<div>
													<span className="font-medium">Teléfono:</span> {cita.paciente_telefono}
												</div>
												{cita.pago_monto && (
													<div>
														<span className="font-medium">Monto:</span> {formatMonto(cita.pago_monto)}
													</div>
												)}
											</div>
											<div
												className="relative"
												ref={openAccionesCitaId === cita.id_cita ? accionesDropdownRef : undefined}
											>
												<button
													type="button"
													onClick={() =>
														setOpenAccionesCitaId((id) => (id === cita.id_cita ? null : cita.id_cita))
													}
													className="inline-flex items-center gap-2 rounded-lg border border-brand-700 bg-paper px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
												>
													Acciones
													<ChevronDown
														className={`h-4 w-4 transition-transform ${openAccionesCitaId === cita.id_cita ? "rotate-180" : ""}`}
													/>
												</button>
												{openAccionesCitaId === cita.id_cita && (
													<div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-lg border border-mist bg-paper py-1 shadow-lg">
														<button
															type="button"
															onClick={() => {
																setSelectedCitaIdForView(cita.id_cita);
																setOpenAccionesCitaId(null);
															}}
															className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-brand-800 hover:bg-cloud"
														>
															Ver cita
														</button>
														{cita.id_pago && (
															<button
																type="button"
																onClick={() => {
																	setSelectedCitaForPago(cita.id_cita);
																	setOpenAccionesCitaId(null);
																}}
																className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-brand-800 hover:bg-cloud"
															>
																Ver pago
															</button>
														)}
														{estadoPago === 0 && cita.id_pago && (
															<>
																<button
																	type="button"
																	onClick={() => {
																		setSelectedCita(cita.id_cita);
																		handleAprobarPago(cita.id_cita);
																		setOpenAccionesCitaId(null);
																	}}
																	disabled={isUpdating || selectedCita === cita.id_cita}
																	className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-brand-700 hover:bg-cloud disabled:opacity-50"
																>
																	{isUpdating && selectedCita === cita.id_cita ? "Procesando..." : "Aprobar pago"}
																</button>
																<button
																	type="button"
																	onClick={() => {
																		setSelectedCita(cita.id_cita);
																		handleRechazarPago(cita.id_cita);
																		setOpenAccionesCitaId(null);
																	}}
																	disabled={isUpdating || selectedCita === cita.id_cita}
																	className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
																>
																	Rechazar
																</button>
															</>
														)}
														{tieneResultado ? (
															<>
																<button
																	type="button"
																	onClick={() => {
																		setSelectedCitaForResultados({
																			archivos,
																			pacienteNombre: fullName,
																			ecoNombre: cita.eco_nombre,
																			idCita: cita.id_cita,
																		});
																		setOpenAccionesCitaId(null);
																	}}
																	className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-brand-800 hover:bg-cloud"
																>
																	Ver {archivos.length} resultado{archivos.length > 1 ? "s" : ""}
																</button>
																<button
																	type="button"
																	onClick={() => {
																		setSelectedCitaForUpload(cita);
																		setOpenAccionesCitaId(null);
																	}}
																	className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-brand-700 hover:bg-cloud"
																>
																	Subir más archivos
																</button>
															</>
														) : (
															<button
																type="button"
																onClick={() => {
																	setSelectedCitaForUpload(cita);
																	setOpenAccionesCitaId(null);
																}}
																className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-brand-700 hover:bg-cloud"
															>
																Subir resultados
															</button>
														)}
														{tieneInforme ? (
															<button
																type="button"
																onClick={() => {
																	handleViewInforme(cita.informe_pdf_url);
																	setOpenAccionesCitaId(null);
																}}
																className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50"
															>
																<FileText className="h-4 w-4 shrink-0" />
																Ver informe
															</button>
														) : (
															<div className="px-4 py-2 text-sm text-brand-500">
																Sin informe
															</div>
														)}
														{estadoCita !== 2 && estadoCita !== 3 && (
															<>
																<button
																	type="button"
																	onClick={() => {
																		const citaParaPosponer: CitaPendientePago = {
																			id_cita: cita.id_cita,
																			id_paciente: cita.id_paciente,
																			id_representado: cita.id_representado,
																			id_especialista: cita.id_especialista,
																			id_eco: cita.id_eco,
																			fecha_cita: cita.fecha_cita,
																			hora_cita: cita.hora_cita,
																			estado_cita: estadoCita,
																			estado_pago: estadoPago,
																			id_disponibilidad: cita.id_disponibilidad,
																			orden: cita.orden,
																			paciente_nombre: cita.paciente_nombre,
																			paciente_apellido: cita.paciente_apellido,
																			paciente_cedula: cita.paciente_cedula,
																			paciente_telefono: cita.paciente_telefono,
																			especialista_nombre: cita.especialista_nombre,
																			especialista_apellido: cita.especialista_apellido,
																			eco_nombre: cita.eco_nombre,
																		};
																		setSelectedCitaForPosponer(citaParaPosponer);
																		setOpenAccionesCitaId(null);
																	}}
																	className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-amber-600 hover:bg-amber-50"
																>
																	Posponer cita
																</button>
																<button
																	type="button"
																	onClick={() => {
																		handleCancelarCita(cita.id_cita, fullName);
																		setOpenAccionesCitaId(null);
																	}}
																	className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
																>
																	Cancelar cita
																</button>
																<button
																	type="button"
																	onClick={() => {
																		handleMarcarAtendida(cita.id_cita, fullName);
																		setOpenAccionesCitaId(null);
																	}}
																	disabled={isMarkingAtendida}
																	className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 disabled:opacity-50"
																>
																	{isMarkingAtendida ? "Marcando..." : "Marcar atendida"}
																</button>
															</>
														)}
													</div>
												)}
											</div>
										</div>
									</div>
								);
							})}
						</div>

						{/* Paginación */}
						{filteredCitas.length > itemsPerPage && (
							<div className="mt-4 flex items-center justify-between border-t border-mist pt-4">
								<div className="text-sm text-brand-800">
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
										disabled={currentPage >= totalPages}
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

			{/* Modal para ver detalles de la cita */}
			{selectedCitaIdForView && (
				<VerCitaModal
					cita={loadingCita ? null : citaData || null}
					error={citaError ? "No se pudo cargar la información de la cita" : null}
					onClose={() => setSelectedCitaIdForView(null)}
				/>
			)}

			{/* Modal para ver pago */}
			{selectedCitaForPago && (
				<VerPagoModal
					pago={loadingPago ? null : pagoData || null}
					error={pagoError ? "No se pudo cargar la información del pago" : null}
					onClose={() => setSelectedCitaForPago(null)}
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
						await refetch();
					}}
				/>
			)}

			{/* Modal para subir resultados */}
			{selectedCitaForUpload && (
				<SubirResultadoModal
					cita={{
						id_cita: selectedCitaForUpload.id_cita,
						paciente_nombre: selectedCitaForUpload.paciente_nombre,
						paciente_apellido: selectedCitaForUpload.paciente_apellido,
						eco_nombre: selectedCitaForUpload.eco_nombre,
						fecha_cita: selectedCitaForUpload.fecha_cita,
					}}
					onClose={() => setSelectedCitaForUpload(null)}
					onUpload={handleSubirResultado}
					isUploading={isUploading}
				/>
			)}

			{/* Modal para posponer cita */}
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

export default TodasLasCitasPage;
