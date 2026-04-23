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
import {
	FileText,
	Check,
	X,
	MoreVertical,
	Search,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
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

const getInitials = (fullName: string) => {
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
};

const getAvatarToneClass = (seed: string) => {
	const tones = [
		"bg-teal-50 text-teal-700",
		"bg-zinc-100 text-zinc-600",
		"bg-orange-50 text-orange-700",
		"bg-emerald-50 text-emerald-700",
	];
	let h = 0;
	for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % 997;
	return tones[h % tones.length];
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
		studyUid?: string | null;
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
					return archivos.length > 0 || !!cita.resultado_study_uid;
				});
			} else if (filterResultado === "sin-resultado") {
				citasFiltradas = citasFiltradas.filter((cita) => {
					const archivos = parseResultadoArchivo(cita.resultado_archivo);
					return archivos.length === 0 && !cita.resultado_study_uid;
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

	const activeFilterChips = useMemo(() => {
		const chips: { key: string; label: string; onRemove: () => void }[] = [];
		if (filterPago !== "todas") {
			const opt = filterOptionsPago.find((o) => o.id === filterPago);
			chips.push({
				key: "pago",
				label: opt?.label ?? filterPago,
				onRemove: () => setFilterPago("todas"),
			});
		}
		if (filterResultado !== "todas") {
			const opt = filterOptionsResultado.find((o) => o.id === filterResultado);
			chips.push({
				key: "res",
				label: opt?.label ?? filterResultado,
				onRemove: () => setFilterResultado("todas"),
			});
		}
		if (filterInforme !== "todas") {
			const opt = filterOptionsInforme.find((o) => o.id === filterInforme);
			chips.push({
				key: "inf",
				label: opt?.label ?? filterInforme,
				onRemove: () => setFilterInforme("todas"),
			});
		}
		if (filterAtencion !== "todas") {
			const opt = filterOptionsAtencion.find((o) => o.id === filterAtencion);
			chips.push({
				key: "aten",
				label: opt?.label ?? filterAtencion,
				onRemove: () => setFilterAtencion("todas"),
			});
		}
		if (filterOrigen !== "todas") {
			const opt = filterOptionsOrigen.find((o) => o.id === filterOrigen);
			chips.push({
				key: "orig",
				label: opt?.label ?? filterOrigen,
				onRemove: () => setFilterOrigen("todas"),
			});
		}
		if (ordenFecha !== "reciente") {
			chips.push({
				key: "orden",
				label: "Orden: más antiguas primero",
				onRemove: () => setOrdenFecha("reciente"),
			});
		}
		if (query.trim()) {
			chips.push({
				key: "q",
				label: `Búsqueda: ${query.trim()}`,
				onRemove: () => setQuery(""),
			});
		}
		return chips;
	}, [
		filterPago,
		filterResultado,
		filterInforme,
		filterAtencion,
		filterOrigen,
		ordenFecha,
		query,
	]);

	const visiblePages = useMemo(() => {
		const total = totalPages;
		const cur = currentPage;
		const out: number[] = [];
		const windowSize = 5;
		let start = Math.max(1, cur - Math.floor(windowSize / 2));
		let end = Math.min(total, start + windowSize - 1);
		start = Math.max(1, end - windowSize + 1);
		for (let i = start; i <= end; i++) out.push(i);
		return out;
	}, [currentPage, totalPages]);

	const clearAllFilters = () => {
		setFilterPago("todas");
		setFilterResultado("todas");
		setFilterInforme("todas");
		setFilterAtencion("todas");
		setFilterOrigen("todas");
		setOrdenFecha("reciente");
		setQuery("");
	};

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

	const selectFilterClass =
		"w-full cursor-pointer rounded-lg border-none bg-white py-2 pl-3 pr-8 text-sm text-brand-900 shadow-sm ring-1 ring-brand-200/50 focus:outline-none focus:ring-2 focus:ring-brand-700/25";

	return (
		<PageShell title="Todas las citas" hideHeader>
			<div className="relative font-[Inter,sans-serif]">
				<div className="mb-8">
					<span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-brand-800">
						Administración
					</span>
					<h2 className="font-headline text-3xl font-extrabold tracking-tight text-zinc-900">
						Todas las citas
					</h2>
					<p className="mt-1 max-w-2xl text-base text-zinc-500">
						Gestione el flujo de pacientes, el estado de los informes médicos y el historial de pagos desde un
						solo panel curado.
					</p>
				</div>

				<section className="mb-8 flex flex-col gap-6 rounded-2xl border border-brand-200/40 bg-mist/60 p-6 shadow-sm ring-1 ring-brand-100/50">
					<div className="relative w-full">
						<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
						<input
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Buscar pacientes, expedientes o estudios..."
							className="h-11 w-full rounded-xl border-none bg-white pl-12 pr-4 text-base text-brand-900 shadow-sm ring-1 ring-brand-200/50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-700/25"
						/>
					</div>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
						<div className="flex flex-col gap-1.5">
							<label className="px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
								Estado de pago
							</label>
							<select
								value={filterPago}
								onChange={(e) => setFilterPago(e.target.value)}
								className={selectFilterClass}
							>
								{filterOptionsPago.map((option) => (
									<option key={option.id} value={option.id}>
										{option.label}
									</option>
								))}
							</select>
						</div>
						<div className="flex flex-col gap-1.5">
							<label className="px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
								Resultados
							</label>
							<select
								value={filterResultado}
								onChange={(e) => setFilterResultado(e.target.value)}
								className={selectFilterClass}
							>
								{filterOptionsResultado.map((option) => (
									<option key={option.id} value={option.id}>
										{option.label}
									</option>
								))}
							</select>
						</div>
						<div className="flex flex-col gap-1.5">
							<label className="px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
								Informe
							</label>
							<select
								value={filterInforme}
								onChange={(e) => setFilterInforme(e.target.value)}
								className={selectFilterClass}
							>
								{filterOptionsInforme.map((option) => (
									<option key={option.id} value={option.id}>
										{option.label}
									</option>
								))}
							</select>
						</div>
						<div className="flex flex-col gap-1.5">
							<label className="px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
								Asistencia
							</label>
							<select
								value={filterAtencion}
								onChange={(e) => setFilterAtencion(e.target.value)}
								className={selectFilterClass}
							>
								{filterOptionsAtencion.map((option) => (
									<option key={option.id} value={option.id}>
										{option.label}
									</option>
								))}
							</select>
						</div>
						<div className="flex flex-col gap-1.5">
							<label className="px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
								Fuente
							</label>
							<select
								value={filterOrigen}
								onChange={(e) => setFilterOrigen(e.target.value)}
								className={selectFilterClass}
							>
								{filterOptionsOrigen.map((option) => (
									<option key={option.id} value={option.id}>
										{option.label}
									</option>
								))}
							</select>
						</div>
						<div className="flex flex-col gap-1.5">
							<label className="px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
								Orden por fecha
							</label>
							<select
								value={ordenFecha}
								onChange={(e) => setOrdenFecha(e.target.value as "reciente" | "antigua")}
								className={selectFilterClass}
							>
								<option value="reciente">Más recientes primero</option>
								<option value="antigua">Más antiguas primero</option>
							</select>
						</div>
					</div>

					{activeFilterChips.length > 0 ? (
						<div className="flex flex-wrap items-center gap-2 border-t border-zinc-200/50 pt-2">
							<span className="mr-2 text-[11px] font-semibold text-zinc-400">Filtros activos:</span>
							{activeFilterChips.map((chip) => (
								<span
									key={chip.key}
									className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-100/40 px-3 py-1 text-[11px] font-semibold text-brand-800"
								>
									{chip.label}
									<button
										type="button"
										onClick={chip.onRemove}
										className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-brand-200/60"
										aria-label={`Quitar filtro ${chip.label}`}
									>
										<X className="h-3 w-3" />
									</button>
								</span>
							))}
							<button
								type="button"
								onClick={clearAllFilters}
								className="ml-auto text-[11px] font-bold text-brand-800 hover:underline"
							>
								Limpiar filtros
							</button>
						</div>
					) : null}
				</section>

				{isLoading ? (
					<div className="rounded-3xl border border-zinc-100 bg-white py-16 text-center text-zinc-500 shadow-sm">
						Cargando citas...
					</div>
				) : filteredCitas.length === 0 ? (
					<div className="rounded-3xl border border-zinc-100 bg-white p-8 text-center shadow-sm">
						<p className="text-zinc-600">
							{query.trim()
								? "No se encontraron citas con los criterios de búsqueda."
								: `No hay citas ${filterPago !== "todas" || filterResultado !== "todas" || filterInforme !== "todas" || filterAtencion !== "todas" || filterOrigen !== "todas" ? `con los filtros seleccionados` : ""}.`}
						</p>
					</div>
				) : (
					<>
						<div className="overflow-hidden rounded-3xl bg-white shadow-sm shadow-zinc-200/50">
							<div className="custom-scrollbar overflow-x-auto">
								<table className="w-full min-w-[900px] border-collapse text-left">
									<thead>
										<tr className="border-b border-zinc-100 bg-zinc-50">
											<th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
												Paciente
											</th>
											<th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
												Estudio / Especialista
											</th>
											<th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
												Fecha y Hora
											</th>
											<th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
												Importe
											</th>
											<th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
												Estados
											</th>
											<th className="px-4 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
												Acciones
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-zinc-50">
							{paginatedCitas.map((cita) => {
								const archivos = parseResultadoArchivo(cita.resultado_archivo);
								const tieneDicom = !!cita.resultado_study_uid;
								const tieneResultado = archivos.length > 0 || tieneDicom;
								const totalResultados = archivos.length + (tieneDicom ? 1 : 0);
								const tieneInforme = cita.id_informe !== null;
								const fullName = `${cita.paciente_nombre} ${cita.paciente_apellido}`;
								const especialistaFullName = `${cita.especialista_nombre} ${cita.especialista_apellido}`;
								const estadoPago = toNumber(cita.estado_pago);
								const estadoCita = toNumber(cita.estado_cita);
								const pagoBadgeClass =
									estadoPago === 0
										? "bg-red-50 text-red-700"
										: estadoPago === 1
											? "bg-blue-50 text-blue-700"
											: "bg-red-100 text-red-800";
								const citaFlujoBadge =
									estadoCita === 3
										? { label: "Atendida", cls: "bg-green-50 text-green-700" }
										: estadoCita === 2
											? { label: "Cancelada", cls: "bg-zinc-200 text-zinc-700" }
											: estadoCita === 1
												? { label: "En espera", cls: "bg-yellow-50 text-yellow-700" }
												: { label: "Pendiente", cls: "bg-red-50 text-red-700" };
								const informeBadge = tieneInforme
									? { label: "Con informe", cls: "bg-zinc-100 text-zinc-600" }
									: { label: "Sin informe", cls: "bg-orange-50 text-orange-700" };
								const rowHighlight =
									estadoPago === 0 && estadoCita !== 2 && estadoCita !== 3
										? "border-l-4 border-amber-400"
										: "";

								return (
									<tr
										key={cita.id_cita}
										className={`group transition-colors hover:bg-mist/50 ${rowHighlight}`}
									>
										<td className="px-4 py-4 align-top">
											<div className="flex items-center gap-3">
												<div
													className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${getAvatarToneClass(fullName)}`}
												>
													{getInitials(fullName)}
												</div>
												<div>
													<p className="text-base font-semibold text-zinc-900">{fullName}</p>
													<p className="text-sm text-zinc-400">ID: {cita.paciente_cedula}</p>
													<p className="text-sm text-zinc-400">Telf: {cita.paciente_telefono}</p>
													<p className="font-mono text-[10px] text-zinc-400">
														Ref. cita: {cita.id_cita.slice(0, 8)}…
													</p>
												</div>
											</div>
										</td>
										<td className="px-4 py-4 align-top">
											<div className="space-y-0.5">
												<p className="text-base font-medium text-zinc-700">{cita.eco_nombre}</p>
												<p className="text-[11px] font-semibold text-brand-800">{especialistaFullName}</p>
											</div>
										</td>
										<td className="px-4 py-4 align-top">
											<div className="space-y-0.5">
												<p className="text-base text-zinc-700">{formatFecha(cita.fecha_cita)}</p>
												<p className="text-sm text-zinc-400">{formatHora(cita.hora_cita)}</p>
											</div>
										</td>
										<td className="px-4 py-4 align-top">
											<div className="flex flex-col gap-0.5">
												{cita.pago_monto_usd && Number(cita.pago_monto_usd) > 0 ? (
													<>
														<p className="text-base font-bold text-zinc-900">
															${Number(cita.pago_monto_usd).toFixed(2)}
														</p>
														{(cita.pago_monto_bs && Number(cita.pago_monto_bs) > 0) || cita.pago_tasa_dia_bcv ? (
															<p className="text-[10px] text-zinc-500 font-semibold" title={`Tasa BCV: Bs. ${Number(cita.pago_tasa_dia_bcv).toFixed(4)}`}>
																Bs. {(Number(cita.pago_monto_bs || (Number(cita.pago_monto_usd) * Number(cita.pago_tasa_dia_bcv)))).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
															</p>
														) : null}
													</>
												) : (
													<p className="text-base font-bold text-zinc-900">
														{cita.pago_monto != null && cita.pago_monto !== ""
															? formatMonto(cita.pago_monto)
															: "—"}
													</p>
												)}
											</div>
										</td>
										<td className="px-4 py-4 align-top">
											<div className="flex max-w-[280px] flex-wrap gap-2">
												<span
													className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter ${pagoBadgeClass}`}
												>
													{getEstadoPagoLabel(estadoPago)}
												</span>
												<span
													className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter ${citaFlujoBadge.cls}`}
													title={
														estadoCita === 3
															? "La cita ya fue atendida por el especialista"
															: "Estado de la cita en el flujo de atención"
													}
												>
													{citaFlujoBadge.label}
												</span>
												<span
													className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter ${informeBadge.cls}`}
												>
													{informeBadge.label}
												</span>
												{estadoCita !== 3 && estadoCita !== 2 ? (
													<span
														className="inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter text-violet-700 bg-violet-100"
														title="La cita aún no ha sido atendida por el especialista"
													>
														<X className="h-3 w-3" /> No atendida
													</span>
												) : null}
												<span
													className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter ${cita.origen_cita === "mostrador" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-700"}`}
												>
													{cita.origen_cita === "mostrador" ? "Mostrador" : "Web"}
												</span>
												{archivos.length > 0 ? (
													<span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter text-emerald-700">
														{archivos.length} archivo{archivos.length > 1 ? "s" : ""}
													</span>
												) : null}
												{tieneDicom ? (
													<span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter text-purple-800">
														DICOM
													</span>
												) : null}
												{tieneResultado ? (
													<span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter text-emerald-800">
														Con resultado
													</span>
												) : null}
												{cita.id_representado ? (
													<span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter text-emerald-700" title="Cita para representado">
														<Check className="h-3 w-3" /> Representado
													</span>
												) : (
													<span className="inline-flex items-center gap-0.5 rounded bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter text-brand-700" title="Cita para el paciente">
														<X className="h-3 w-3" /> No representado
													</span>
												)}
											</div>
										</td>
										<td className="px-4 py-4 text-right align-top">
											<div
												className="relative inline-flex"
												ref={openAccionesCitaId === cita.id_cita ? accionesDropdownRef : undefined}
											>
												<button
													type="button"
													onClick={() =>
														setOpenAccionesCitaId((id) => (id === cita.id_cita ? null : cita.id_cita))
													}
													className="rounded-lg p-2 text-zinc-400 transition-all hover:bg-white hover:text-brand-800"
													aria-label="Acciones"
													aria-expanded={openAccionesCitaId === cita.id_cita}
												>
													<MoreVertical className="h-5 w-5" />
												</button>
												{openAccionesCitaId === cita.id_cita && (
													<div className="absolute right-0 top-full z-50 mt-1 flex min-w-[220px] flex-col items-stretch rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
														<button
															type="button"
															onClick={() => {
																setSelectedCitaIdForView(cita.id_cita);
																setOpenAccionesCitaId(null);
															}}
															className="flex w-full items-center gap-2 px-4 py-2 text-left text-base text-brand-800 hover:bg-cloud"
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
																className="flex w-full items-center gap-2 px-4 py-2 text-left text-base text-brand-800 hover:bg-cloud"
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
																	className="flex w-full items-center gap-2 px-4 py-2 text-left text-base text-brand-700 hover:bg-cloud disabled:opacity-50"
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
																	className="flex w-full items-center gap-2 px-4 py-2 text-left text-base text-red-600 hover:bg-red-50 disabled:opacity-50"
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
																		studyUid: cita.resultado_study_uid,
																		pacienteNombre: fullName,
																		ecoNombre: cita.eco_nombre,
																			idCita: cita.id_cita,
																		});
																		setOpenAccionesCitaId(null);
																	}}
																	className="flex w-full items-center gap-2 px-4 py-2 text-left text-base text-brand-800 hover:bg-cloud"
																>
																	Ver {totalResultados} resultado{totalResultados !== 1 ? "s" : ""}
																</button>
																<button
																	type="button"
																	onClick={() => {
																		setSelectedCitaForUpload(cita);
																		setOpenAccionesCitaId(null);
																	}}
																	className="flex w-full items-center gap-2 px-4 py-2 text-left text-base text-brand-700 hover:bg-cloud"
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
																className="flex w-full items-center gap-2 px-4 py-2 text-left text-base text-brand-700 hover:bg-cloud"
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
																className="flex w-full items-center gap-2 px-4 py-2 text-left text-base text-blue-600 hover:bg-blue-50"
															>
																<FileText className="h-4 w-4 shrink-0" />
																Ver informe
															</button>
														) : (
															<div className="w-full px-4 py-2 text-left text-base text-brand-500">
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
																	className="flex w-full items-center gap-2 px-4 py-2 text-left text-base text-amber-600 hover:bg-amber-50"
																>
																	Posponer cita
																</button>
																<button
																	type="button"
																	onClick={() => {
																		handleCancelarCita(cita.id_cita, fullName);
																		setOpenAccionesCitaId(null);
																	}}
																	className="flex w-full items-center gap-2 px-4 py-2 text-left text-base text-red-600 hover:bg-red-50"
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
																	className="flex w-full items-center gap-2 px-4 py-2 text-left text-base text-green-600 hover:bg-green-50 disabled:opacity-50"
																>
																	{isMarkingAtendida ? "Marcando..." : "Marcar atendida"}
																</button>
															</>
														)}
													</div>
												)}
											</div>
										</td>
									</tr>
								);
							})}
									</tbody>
								</table>
							</div>
							<div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50 px-4 py-3">
								<p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">
									Mostrando{" "}
									{filteredCitas.length === 0
										? 0
										: (currentPage - 1) * itemsPerPage + 1}{" "}
									- {Math.min(currentPage * itemsPerPage, filteredCitas.length)} de{" "}
									{filteredCitas.length} registros
								</p>
								{totalPages > 1 ? (
									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
											disabled={currentPage === 1}
											className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
											aria-label="Página anterior"
										>
											<ChevronLeft className="h-4 w-4" />
										</button>
										{visiblePages.map((page) => (
											<button
												key={page}
												type="button"
												onClick={() => setCurrentPage(page)}
												className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
													currentPage === page
														? "bg-brand-800 text-white"
														: "text-zinc-600 hover:bg-zinc-200"
												}`}
											>
												{page}
											</button>
										))}
										<button
											type="button"
											onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
											disabled={currentPage >= totalPages}
											className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
											aria-label="Página siguiente"
										>
											<ChevronRight className="h-4 w-4" />
										</button>
									</div>
								) : null}
							</div>
						</div>
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
				studyUid={selectedCitaForResultados.studyUid}
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
