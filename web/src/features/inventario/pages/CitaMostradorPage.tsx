import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import Swal from "sweetalert2";
import {
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Info,
	Lock,
	Search,
	Sun,
	Sunset,
	UserPlus,
} from "lucide-react";
import { PageShell, CedulaField, validarRangoCedula, MENSAJE_RANGO_CEDULA } from "../../../shared";
import { useGetEspecialistasInventarioQuery } from "../api/especialistasApi";
import { useCrearCitaMostradorMutation, useCrearPacienteMostradorMutation } from "../api/comisionesApi";
import { useGetEspecialidadesQuery } from "../../especialidades/especialidadesApi";
import { useCitaMostradorForm } from "../hooks/useCitaMostradorForm";
import { METODO_UI_OPTIONS, isMorningSlot, idsCoinciden } from "../utils/citaMostradorUtils";
import { useUpdatePacientePhoneMostradorMutation } from "../../citas/citasApi";

const PRIMARY = "#006965";

function splitNombreCompleto(raw: string) {
	const t = raw.trim().replace(/\s+/g, " ");
	if (!t) return { nombre: "", apellido: "" };
	const parts = t.split(" ");
	if (parts.length === 1) return { nombre: parts[0], apellido: "" };
	return { nombre: parts.slice(0, -1).join(" "), apellido: parts[parts.length - 1] ?? "" };
}

const MESES = [
	"Enero",
	"Febrero",
	"Marzo",
	"Abril",
	"Mayo",
	"Junio",
	"Julio",
	"Agosto",
	"Septiembre",
	"Octubre",
	"Noviembre",
	"Diciembre",
];

const DIAS_CORTO = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"];

/** Lunes = 0 … Domingo = 6 */
function mondayIndex(jsGetDay: number) {
	return (jsGetDay + 6) % 7;
}

function formatResumenFecha(iso: string) {
	const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
	if (!y || !m || !d) return iso;
	return `${String(d).padStart(2, "0")} ${MESES[m - 1]?.slice(0, 3) ?? ""}`;
}

export default function CitaMostradorPage() {
	const {
		data: especialistasData = [],
		isLoading: loadingEsp,
		isError: errorCargaEspecialistas,
	} = useGetEspecialistasInventarioQuery();
	const { data: especialidades = [] } = useGetEspecialidadesQuery();
	const [crearCitaMostrador, { isLoading: isSaving }] = useCrearCitaMostradorMutation();
	const [crearPacienteMostrador, { isLoading: isCreatingPatient }] = useCrearPacienteMostradorMutation();

	const [paso, setPaso] = useState(1);
	const [idEspecialidad, setIdEspecialidad] = useState("");
	const [repAccordionOpen, setRepAccordionOpen] = useState(false);
	/** Texto libre para "Nombre completo" (permite espacios); se parte en nombre/apellido al blur y al enviar. */
	const [nombreCompletoDraft, setNombreCompletoDraft] = useState("");

	const [updatePhone] = useUpdatePacientePhoneMostradorMutation();

	const {
		form,
		idPacienteWeb,
		originalPhone,
		setOriginalPhone,
		setForm,
		fieldErrors,
		error,
		mensajeCargaAnterior,
		pacienteIdentificadoEnSistema,
		citaActivaError,
		setCitaActivaError,
		vincularRepresentado,
		vincularCitaAlTitular,
		setVincularCitaAlTitular,
		searchRepNombre,
		setSearchRepNombre,
		searchRepApellido,
		setSearchRepApellido,
		resultadosRep,
		loadingBuscarRep,
		loadingCrearRep,
		showCrearRepresentadoForm,
		setShowCrearRepresentadoForm,
		repForm,
		setRepForm,
		repFormErrors,
		setRepFormErrors,
		titularYaRegistrado,
		setTitularYaRegistrado,
		loadingDatosPorCedula,
		dolarOficial,
		loadingDolar,
		ecos,
		loadingEcos,
		loadingOcupacion,
		horaOcupada,
		ocupados,
		horaDisponible,
		selectedEco,
		isMetodoEnBs,
		monedaRegistro,
		setMonedaRegistro,
		setMontoRegistroDesdeBs,
		handleChange,
		handleBuscarRepresentadoPorNombre,
		handleSeleccionarRepresentado,
		handleAbrirCrearRepresentado,
		handleVerificarTitular,
		handleCrearRepresentadoSubmit,
		handleCargarDatosAnteriores,
		validateRepForm,
		handleSubmit,
		puedeCargarAnterior,
		HORA_OPTIONS,
		inputError,
	} = useCitaMostradorForm({
		onSave: async (p) => {
			try {
				await crearCitaMostrador(p).unwrap();
				await Swal.fire({
					icon: "success",
					title: "Cita registrada",
					text: "La cita de mostrador quedó registrada como pagada y atendida.",
					timer: 2200,
					showConfirmButton: false,
				});
			} catch (err: unknown) {
				const apiErr = typeof err === "object" && err !== null && "data" in err
					? (err as { data?: { message?: string; code?: string } }).data
					: null;
				// R2: cita activa — mostrar alerta inline, no SweetAlert
				if (apiErr?.code === "CITA_ACTIVA") {
					setCitaActivaError(
						apiErr.message || "Este paciente ya tiene una cita en proceso en el sistema.",
					);
					return; // no re-lanzar ni SweetAlert
				}
				const msg = apiErr?.message || "No se pudo registrar la cita.";
				await Swal.fire({ icon: "error", title: "Error", text: msg });
				throw err;
			}
		},
	});

	useEffect(() => {
		setForm((prev) => ({ ...prev, id_especialista: "", id_eco: "" }));
	}, [idEspecialidad, setForm]);

	useEffect(() => {
		setNombreCompletoDraft([form.nombre, form.apellido].filter(Boolean).join(" "));
	}, [form.nombre, form.apellido]);

	const especialistasFiltrados = useMemo(() => {
		if (!idEspecialidad) return especialistasData;
		return especialistasData.filter((e) => idsCoinciden(e.id_especialidad, idEspecialidad));
	}, [especialistasData, idEspecialidad]);

	const nombreCompletoDisplay = [form.nombre, form.apellido].filter(Boolean).join(" ");

	const tasaNum =
		Number(form.tasa_dia_bcv) > 0
			? Number(form.tasa_dia_bcv)
			: Number(dolarOficial?.promedio) > 0
				? Number(dolarOficial?.promedio)
				: 0;
	const montoNum = Number(form.monto);
	const montoUsdDisplay =
		isMetodoEnBs && tasaNum > 0 && Number.isFinite(montoNum) ? (montoNum / tasaNum).toFixed(2) : form.monto;
	const montoBsDisplay =
		!isMetodoEnBs && tasaNum > 0 && Number.isFinite(montoNum)
			? (montoNum * tasaNum).toFixed(2)
			: isMetodoEnBs
				? form.monto
				: tasaNum > 0 && Number.isFinite(montoNum)
					? (montoNum * tasaNum).toFixed(2)
					: "0.00";

	const montoPrincipalLabel = isMetodoEnBs
		? "Monto en Bs"
		: monedaRegistro === "bs"
			? "Monto en Bs"
			: "Monto en USD";
	const equivalentePagoLabel = isMetodoEnBs
		? "Equivalente USD"
		: monedaRegistro === "bs"
			? "Equivalente USD"
			: "Equivalente Bs";
	const equivalentePagoValue = isMetodoEnBs
		? `$ ${montoUsdDisplay}`
		: monedaRegistro === "bs"
			? `$ ${form.monto.trim() === "" ? "—" : Number(form.monto).toFixed(2)}`
			: `Bs. ${montoBsDisplay}`;

	const especialistaSel = especialistasData.find((e) => idsCoinciden(e.id_especialista, form.id_especialista));
	const espNombre = idEspecialidad
		? especialidades.find((e) => idsCoinciden(e.id_especialidad, idEspecialidad))?.nombre ?? "—"
		: especialistaSel?.especialidad ?? "—";
	const horaLabel = HORA_OPTIONS.find((h) => h.value === form.hora_cita)?.label ?? form.hora_cita;

	const resumenTexto = useMemo(() => {
		const pac =
			!pacienteIdentificadoEnSistema && nombreCompletoDraft.trim()
				? nombreCompletoDraft.trim()
				: [form.nombre, form.apellido].filter(Boolean).join(" ").trim() || "—";
		const eco = selectedEco?.nombre ?? "—";
		const fecha = form.fecha_cita ? formatResumenFecha(form.fecha_cita) : "—";
		return { pac, eco, fecha, hora: horaLabel };
	}, [
		pacienteIdentificadoEnSistema,
		nombreCompletoDraft,
		form.nombre,
		form.apellido,
		form.fecha_cita,
		selectedEco,
		horaLabel,
	]);

	const [calYear, setCalYear] = useState(() => new Date(form.fecha_cita + "T12:00:00").getFullYear());
	const [calMonth, setCalMonth] = useState(() => new Date(form.fecha_cita + "T12:00:00").getMonth());

	useEffect(() => {
		const d = new Date(form.fecha_cita + "T12:00:00");
		if (!Number.isNaN(d.getTime())) {
			setCalYear(d.getFullYear());
			setCalMonth(d.getMonth());
		}
	}, [form.fecha_cita]);

	const calendarCells = useMemo(() => {
		const first = new Date(calYear, calMonth, 1);
		const startPad = mondayIndex(first.getDay());
		const dim = new Date(calYear, calMonth + 1, 0).getDate();
		const prevDim = new Date(calYear, calMonth, 0).getDate();
		const cells: { day: number; inMonth: boolean; iso?: string }[] = [];
		for (let i = 0; i < startPad; i++) {
			cells.push({ day: prevDim - startPad + i + 1, inMonth: false });
		}
		for (let d = 1; d <= dim; d++) {
			const iso = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
			cells.push({ day: d, inMonth: true, iso });
		}
		let n = 1;
		while (cells.length < 42) {
			cells.push({ day: n++, inMonth: false });
		}
		return cells;
	}, [calYear, calMonth]);

	const morningSlots = HORA_OPTIONS.filter((o) => isMorningSlot(o.value));
	const afternoonSlots = HORA_OPTIONS.filter((o) => !isMorningSlot(o.value));

	const inputBase =
		"w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base font-medium text-slate-800 shadow-sm focus:border-[#006965] focus:outline-none focus:ring-2 focus:ring-[#006965]/20";
	const labelBase = "mb-2 ml-1 block text-base font-bold uppercase tracking-wider text-neutral-500";

	const cedulaNumeroInvalida =
		form.cedula.trim().length >= 5 && !validarRangoCedula(form.cedula.trim());
	const cedulaErrorText = fieldErrors.cedula || (cedulaNumeroInvalida ? MENSAJE_RANGO_CEDULA : undefined);

	const aplicarNombreCompletoAlForm = () => {
		if (pacienteIdentificadoEnSistema) return;
		const { nombre, apellido } = splitNombreCompleto(nombreCompletoDraft);
		flushSync(() => {
			setForm((prev) => ({ ...prev, nombre, apellido }));
		});
	};

	const onFormSubmit = (e: React.FormEvent) => {
		aplicarNombreCompletoAlForm();
		handleSubmit(e);
	};

	// === Wizard: validación por paso ===
	const PASO_LABELS = ["Paciente", "Servicios", "Fecha y Hora", "Pago"];

	const validatePaso = async (p: number): Promise<boolean> => {
		if (p === 1) {
			aplicarNombreCompletoAlForm();
			const n = form.nombre.trim() || splitNombreCompleto(nombreCompletoDraft).nombre.trim();
			const a = form.apellido.trim() || splitNombreCompleto(nombreCompletoDraft).apellido.trim();
			if (!form.cedula.trim() || !n || !a) {
				await Swal.fire({ icon: "warning", title: "Datos incompletos", text: "Ingresa la cédula y nombre del paciente." });
				return false;
			}
			
			// Modal de confirmación para cambiar el teléfono si hay uno guardado en BD y se modificó
			if (idPacienteWeb && form.telefono !== originalPhone && form.telefono?.trim()) {
				const confirmPhone = await Swal.fire({
					title: '¿Actualizar teléfono?',
					text: '¿Deseas actualizar el número de teléfono del usuario en su perfil permanente?',
					icon: 'question',
					showCancelButton: true,
					confirmButtonText: 'Sí, actualizar',
					cancelButtonText: 'No, dejar el anterior',
					confirmButtonColor: PRIMARY,
				});

				if (confirmPhone.isConfirmed) {
					try {
						await updatePhone({ id_paciente: idPacienteWeb, telefono: form.telefono }).unwrap();
						setOriginalPhone(form.telefono);
					} catch (e) {
						await Swal.fire({ icon: "error", title: "Error", text: "No se pudo actualizar el teléfono." });
						return false; // Evitamos avanzar si hubo error al actualizar, o podríamos dejarlo avanzar y revertir visualmente. Mejor no avanzamos.
					}
				} else {
					setForm(prev => ({ ...prev, telefono: originalPhone }));
				}
			}

			if (!pacienteIdentificadoEnSistema) {
				try {
					const result = await crearPacienteMostrador({
						cedula: form.cedula.trim(),
						nombre: n,
						apellido: a,
						telefono: form.telefono?.trim() || undefined,
						tipo_cedula: form.tipo_cedula,
					}).unwrap();
					if (result.data.citaActiva) {
						setCitaActivaError("Este paciente ya tiene una cita activa en el sistema.");
						return false;
					}
					setForm((prev) => ({ ...prev, id_paciente_resolved: result.data.id_paciente }));
				} catch {
					await Swal.fire({ icon: "error", title: "Error", text: "No se pudo registrar al paciente." });
					return false;
				}
			} else if (citaActivaError) {
				return false;
			}
			return true;
		}
		if (p === 2) {
			if (!form.id_especialista || !form.id_eco) {
				await Swal.fire({ icon: "warning", title: "Selecciona servicio", text: "Elige un médico y un estudio." });
				return false;
			}
			return true;
		}
		if (p === 3) {
			if (!form.fecha_cita || !form.hora_cita) {
				await Swal.fire({ icon: "warning", title: "Selecciona horario", text: "Elige una fecha y hora para la cita." });
				return false;
			}
			return true;
		}
		return true;
	};

	const handleNext = async () => {
		const ok = await validatePaso(paso);
		if (ok && paso < 4) setPaso((p) => p + 1);
	};
	const handlePrev = () => { if (paso > 1) setPaso((p) => p - 1); };

	return (
		<div className="relative pb-36 bg-slate-50 min-h-screen">
			<PageShell
				hideHeader
				title="Cita de Mostrador"
				description="Registro rápido de pacientes presenciales."
			/>
			<div className="mx-auto max-w-5xl space-y-8 pb-8 pt-6">
				<div className="space-y-2 px-4 sm:px-0">
					<h1 className="font-headline text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
						Cita de Mostrador
					</h1>
					<p className="text-lg text-slate-600">Registro rápido de pacientes presenciales en el sistema Garvis.</p>
				</div>

				{/* === STEPPER === */}
				<div className="flex items-center justify-center gap-0 px-4 sm:px-0">
					{PASO_LABELS.map((label, idx) => {
						const n = idx + 1;
						const done = paso > n;
						const active = paso === n;
						return (
							<div key={label} className="flex items-center">
								<div className="flex flex-col items-center">
									<div
										className={`flex h-10 w-10 items-center justify-center rounded-full text-base font-bold transition-all duration-300 ${
											done
												? "bg-[#006965] text-white shadow-md"
												: active
													? "border-2 border-[#006965] bg-white text-[#006965] shadow-sm"
													: "border border-slate-300 bg-slate-100 text-slate-400"
										}`}
									>
										{done ? <CheckCircle2 className="h-5 w-5" /> : n}
									</div>
									<span className={`mt-1 text-[11px] font-semibold ${active ? "text-[#006965]" : done ? "text-slate-700" : "text-slate-400"}`}>
										{label}
									</span>
								</div>
								{idx < 3 && (
									<div className={`mx-2 h-0.5 w-8 sm:w-16 transition-all duration-300 ${done ? "bg-[#006965]" : "bg-slate-200"}`} />
								)}
							</div>
						);
					})}
				</div>

				<form id="form-cita-mostrador" onSubmit={onFormSubmit} className="flex flex-col gap-6 px-4 sm:px-0">
					{/* 1 Paciente */}
					{paso === 1 && (
					<section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 flex flex-col gap-6">
						<div className="flex items-center gap-3 border-b border-slate-100 pb-4">
							<div
								className="flex shrink-0 h-8 w-8 items-center justify-center rounded-full text-base font-bold text-white"
								style={{ backgroundColor: PRIMARY }}
							>
								1
							</div>
							<h2 className="font-headline text-xl font-bold" style={{ color: PRIMARY }}>
								Registro de Paciente
							</h2>
						</div>

						<div className="rounded-3xl border border-neutral-100 bg-white/80 p-6 shadow-sm">
							<label className={labelBase}>Buscar paciente por cédula</label>
							<div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
								<div className="relative flex-1">
									<Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
									<input
										type="search"
										className={`${inputBase} h-14 pl-12 text-lg ${cedulaNumeroInvalida ? "border-red-400 focus:border-red-500 focus:ring-red-200" : ""}`}
										placeholder="Ej. 12345678"
										value={form.cedula}
										maxLength={8}
										onChange={(e) =>
											handleChange({
												target: { name: "cedula", value: e.target.value.replace(/\D/g, "").slice(0, 8) },
											} as React.ChangeEvent<HTMLInputElement>)
										}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												void handleCargarDatosAnteriores();
											}
										}}
										aria-invalid={cedulaNumeroInvalida}
										aria-describedby={cedulaNumeroInvalida ? "cedula-busqueda-error" : undefined}
									/>
								</div>
								<button
									type="button"
									onClick={() => void handleCargarDatosAnteriores()}
									disabled={!puedeCargarAnterior || loadingDatosPorCedula}
									className="flex h-14 shrink-0 items-center justify-center gap-2 rounded-2xl border border-[#006965]/10 bg-slate-100 px-6 text-base font-bold text-[#006965] transition hover:bg-[#1c837f] hover:text-white disabled:opacity-50"
								>
									<UserPlus className="h-5 w-5" />
									{loadingDatosPorCedula ? "Buscando…" : "Cargar Paciente"}
								</button>
							</div>
							{cedulaNumeroInvalida && (
								<p id="cedula-busqueda-error" className="mt-2 text-base text-red-600" role="alert">
									{MENSAJE_RANGO_CEDULA}
								</p>
							)}
						</div>

						<div id="bloque-paciente-datos" className="space-y-6">
							<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
								<div className="lg:col-span-3">
									<label className={labelBase}>Cédula</label>
									<CedulaField
										label=""
										value={`${form.tipo_cedula}${form.cedula}`}
										onChange={(tipo, numero) => {
											handleChange({
												target: { name: "tipo_cedula", value: tipo },
											} as React.ChangeEvent<HTMLSelectElement>);
											handleChange({
												target: { name: "cedula", value: numero.replace(/\D/g, "").slice(0, 8) },
											} as React.ChangeEvent<HTMLInputElement>);
										}}
										error={cedulaErrorText}
										required={false}
										disabled={pacienteIdentificadoEnSistema}
										inputClassName={`h-14 rounded-2xl border border-neutral-200 text-lg ${cedulaErrorText ? inputError : ""} ${pacienteIdentificadoEnSistema ? "bg-slate-100" : ""}`}
										selectClassName={`h-14 rounded-2xl border border-neutral-200 font-bold text-[#006965] ${pacienteIdentificadoEnSistema ? "bg-slate-100" : ""}`}
									/>
								</div>
								<div className="lg:col-span-3">
									<label className={labelBase}>RIF</label>
									<input
										type="text"
										name="rif"
										value={form.rif}
										onChange={handleChange}
										readOnly={pacienteIdentificadoEnSistema}
										className={`${inputBase} h-14 ${pacienteIdentificadoEnSistema ? "bg-slate-100" : ""}`}
										placeholder="J-00000000-0"
									/>
								</div>
								<div className="lg:col-span-6">
									<label className={labelBase}>Nombre completo</label>
									<div className="relative">
										<input
											type="text"
											className={`${inputBase} h-14 pl-11 text-lg ${fieldErrors.nombre || fieldErrors.apellido ? inputError : ""} ${pacienteIdentificadoEnSistema ? "bg-slate-100" : ""}`}
											value={pacienteIdentificadoEnSistema ? nombreCompletoDisplay : nombreCompletoDraft}
											readOnly={pacienteIdentificadoEnSistema}
											onChange={(e) => {
												if (!pacienteIdentificadoEnSistema) {
													setNombreCompletoDraft(e.target.value);
												}
											}}
											onBlur={() => {
												if (pacienteIdentificadoEnSistema) return;
												const { nombre, apellido } = splitNombreCompleto(nombreCompletoDraft);
												setForm((prev) => ({ ...prev, nombre, apellido }));
											}}
											placeholder="Ej. María Alejandra Pérez"
										/>
									</div>
									{(fieldErrors.nombre || fieldErrors.apellido) && (
										<p className="mt-1 text-base text-red-500">{fieldErrors.nombre || fieldErrors.apellido}</p>
									)}
								</div>
							</div>

							{/* Teléfono (opcional) */}
							<div className="flex flex-col">
								<label className={labelBase}>Teléfono (opcional)</label>
								<div
									className={`flex h-14 items-stretch overflow-hidden rounded-2xl border bg-white shadow-sm transition-all focus-within:border-[#006965] focus-within:ring-2 focus-within:ring-[#006965]/20 ${
										pacienteIdentificadoEnSistema ? "bg-slate-100 border-neutral-200" : fieldErrors.telefono ? "border-red-400" : "border-neutral-200"
									}`}
								>
									<select
										className={`w-[5.5rem] shrink-0 border-r border-neutral-200 bg-transparent px-3 text-lg font-bold text-[#006965] focus:outline-none ${
											pacienteIdentificadoEnSistema ? "cursor-not-allowed opacity-70" : "cursor-pointer"
										}`}
										value={form.telefono ? form.telefono.substring(0, 4) : "0412"}
										disabled={pacienteIdentificadoEnSistema}
										onChange={(e) => {
											const currentNum = form.telefono ? form.telefono.substring(4) : "";
											handleChange({
												target: { name: "telefono", value: currentNum ? e.target.value + currentNum : e.target.value }
											} as any);
										}}
									>
										<option value="0412">0412</option>
										<option value="0414">0414</option>
										<option value="0416">0416</option>
										<option value="0422">0422</option>
										<option value="0424">0424</option>
										<option value="0426">0426</option>
									</select>
									<input
										type="tel"
										value={form.telefono ? form.telefono.substring(4) : ""}
										onChange={(e) => {
											const val = e.target.value.replace(/\D/g, "").slice(0, 7);
											const prefix = form.telefono ? form.telefono.substring(0, 4) : "0412";
											if (val) {
												handleChange({
													target: { name: "telefono", value: prefix + val }
												} as any);
											} else {
												handleChange({
													target: { name: "telefono", value: "" }
												} as any);
											}
										}}
										readOnly={pacienteIdentificadoEnSistema}
										className="flex-1 border-none bg-transparent px-4 font-medium text-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0"
										placeholder="000 0000"
										maxLength={7}
									/>
								</div>
								{fieldErrors.telefono && (
									<p className="mt-1 text-base text-red-500">{fieldErrors.telefono}</p>
								)}
							</div>
						</div>

						{mensajeCargaAnterior && (
							<p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-700">
								{mensajeCargaAnterior}
							</p>
						)}

						{citaActivaError && (
							<div className="rounded-2xl border border-red-400 bg-red-50 px-4 py-3 text-base font-semibold text-red-700" role="alert">
								⚠️ {citaActivaError}
							</div>
						)}

						{/* Representado accordion */}
						<div className="border-t border-neutral-100 pt-6">
							<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
								<div>
									<h3 className="font-headline font-bold text-slate-800">Representado (opcional)</h3>
									<p className="text-base text-slate-500">Menor de edad o dependiente de un titular.</p>
								</div>
								<button
									type="button"
									onClick={() => setRepAccordionOpen((o) => !o)}
									className="inline-flex items-center gap-2 rounded-full border border-[#006965]/10 bg-slate-50 px-4 py-2 text-base font-bold uppercase tracking-widest text-[#006965] transition hover:bg-slate-100"
								>
									<span className="text-lg leading-none">+</span>
									{repAccordionOpen ? "Cerrar registro" : "Abrir registro"}
								</button>
							</div>

							{repAccordionOpen && (
								<div className="space-y-6 rounded-3xl border border-dashed border-neutral-200 bg-slate-50/50 p-6">
									<div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4">
										<p className="text-base font-medium text-teal-900">¿Representado nuevo o menor sin cédula?</p>
										<p className="mt-1 text-base text-teal-800">
											Crea el representado con el titular o búscalo por nombre.
										</p>
										{!showCrearRepresentadoForm ? (
											<button
												type="button"
												onClick={handleAbrirCrearRepresentado}
												className="mt-2 text-base font-semibold text-teal-700 underline"
											>
												Crear representado nuevo y asignarlo al titular
											</button>
										) : (
											<div className="mt-3 space-y-3">
												{repFormErrors._form && <p className="text-base text-red-600">{repFormErrors._form}</p>}
												<CedulaField
													label="Cédula del titular (paciente) *"
													value={repForm.cedula_titular}
													onChange={(tipo, numero) => {
														setRepForm((p) => ({ ...p, cedula_titular: `${tipo}${numero}` }));
														setTitularYaRegistrado(null);
													}}
													error={repFormErrors.cedula_titular}
													required
													inputClassName={`h-10 rounded border px-2 text-base ${repFormErrors.cedula_titular ? "border-red-500" : "border-teal-300"}`}
													selectClassName="h-10 rounded border-teal-300 text-base"
												/>
												<button
													type="button"
													onClick={() => void handleVerificarTitular()}
													disabled={loadingDatosPorCedula || repForm.cedula_titular.replace(/\D/g, "").length < 6}
													className="text-base text-teal-700 underline disabled:opacity-50"
												>
													{loadingDatosPorCedula ? "Verificando…" : "Verificar titular en sistema"}
												</button>
												{titularYaRegistrado && (
													<p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-base text-green-800">
														Titular ya registrado: {titularYaRegistrado.nombre} {titularYaRegistrado.apellido}
													</p>
												)}
												<div className="space-y-2 border-b border-teal-200 pb-3">
													<p className="text-base font-semibold text-teal-900">Datos del titular</p>
													<p className="text-base text-teal-800">
														Si el titular no está registrado, completa nombre, apellido, género y fecha de nacimiento.
													</p>
													<div className="grid gap-3 sm:grid-cols-2">
														<div>
															<label className="text-base text-teal-900">Nombre del titular *</label>
															<input
																value={repForm.nombre_titular}
																onChange={(e) => setRepForm((p) => ({ ...p, nombre_titular: e.target.value }))}
																className={`mt-1 w-full rounded border px-2 py-2 text-base ${repFormErrors.nombre_titular ? "border-red-500" : "border-teal-300"}`}
															/>
															{repFormErrors.nombre_titular && (
																<p className="text-base text-red-500">{repFormErrors.nombre_titular}</p>
															)}
														</div>
														<div>
															<label className="text-base text-teal-900">Apellido del titular *</label>
															<input
																value={repForm.apellido_titular}
																onChange={(e) => setRepForm((p) => ({ ...p, apellido_titular: e.target.value }))}
																className={`mt-1 w-full rounded border px-2 py-2 text-base ${repFormErrors.apellido_titular ? "border-red-500" : "border-teal-300"}`}
															/>
															{repFormErrors.apellido_titular && (
																<p className="text-base text-red-500">{repFormErrors.apellido_titular}</p>
															)}
														</div>
														<div>
															<label className="text-base text-teal-900">Género del titular *</label>
															<select
																value={repForm.genero_titular}
																onChange={(e) =>
																	setRepForm((p) => ({ ...p, genero_titular: e.target.value as typeof repForm.genero_titular }))
																}
																className={`mt-1 w-full rounded border px-2 py-2 text-base ${repFormErrors.genero_titular ? "border-red-500" : "border-teal-300"}`}
															>
																<option value="">Selecciona</option>
																<option value="Masculino">Masculino</option>
																<option value="Femenino">Femenino</option>
															</select>
															{repFormErrors.genero_titular && (
																<p className="text-base text-red-500">{repFormErrors.genero_titular}</p>
															)}
														</div>
														<div>
															<label className="text-base text-teal-900">Fecha nac. titular *</label>
															<input
																type="date"
																value={repForm.fecha_nacimiento_titular}
																onChange={(e) => setRepForm((p) => ({ ...p, fecha_nacimiento_titular: e.target.value }))}
																className={`mt-1 w-full rounded border px-2 py-2 text-base ${repFormErrors.fecha_nacimiento_titular ? "border-red-500" : "border-teal-300"}`}
															/>
															{repFormErrors.fecha_nacimiento_titular && (
																<p className="text-base text-red-500">{repFormErrors.fecha_nacimiento_titular}</p>
															)}
														</div>
													</div>
												</div>
												<div className="space-y-2 pt-2">
													<p className="text-base font-semibold text-teal-900">Datos del representado</p>
													<div className="grid gap-3 sm:grid-cols-2">
														<div>
															<label className="text-base font-medium text-teal-900">Nombre *</label>
															<input
																value={repForm.nombre}
																onChange={(e) => setRepForm((p) => ({ ...p, nombre: e.target.value }))}
																className={`mt-1 w-full rounded border px-2 py-2 text-base ${repFormErrors.nombre ? "border-red-500" : "border-teal-300"}`}
															/>
															{repFormErrors.nombre && <p className="text-base text-red-500">{repFormErrors.nombre}</p>}
														</div>
														<div>
															<label className="text-base font-medium text-teal-900">Apellido *</label>
															<input
																value={repForm.apellido}
																onChange={(e) => setRepForm((p) => ({ ...p, apellido: e.target.value }))}
																className={`mt-1 w-full rounded border px-2 py-2 text-base ${repFormErrors.apellido ? "border-red-500" : "border-teal-300"}`}
															/>
															{repFormErrors.apellido && <p className="text-base text-red-500">{repFormErrors.apellido}</p>}
														</div>
														<div>
															<label className="text-base font-medium text-teal-900">Fecha nacimiento *</label>
															<input
																type="date"
																value={repForm.fecha_nacimiento}
																onChange={(e) => setRepForm((p) => ({ ...p, fecha_nacimiento: e.target.value }))}
																className={`mt-1 w-full rounded border px-2 py-2 text-base ${repFormErrors.fecha_nacimiento ? "border-red-500" : "border-teal-300"}`}
															/>
															{repFormErrors.fecha_nacimiento && (
																<p className="text-base text-red-500">{repFormErrors.fecha_nacimiento}</p>
															)}
														</div>
														<div>
															<label className="text-base font-medium text-teal-900">Género *</label>
															<select
																value={repForm.genero}
																onChange={(e) => setRepForm((p) => ({ ...p, genero: e.target.value as typeof repForm.genero }))}
																className={`mt-1 w-full rounded border px-2 py-2 text-base ${repFormErrors.genero ? "border-red-500" : "border-teal-300"}`}
															>
																<option value="">Selecciona</option>
																<option value="Masculino">Masculino</option>
																<option value="Femenino">Femenino</option>
															</select>
															{repFormErrors.genero && <p className="text-base text-red-500">{repFormErrors.genero}</p>}
														</div>
														<div>
															<label className="text-base font-medium text-teal-900">Parentesco (opcional)</label>
															<input
																value={repForm.parentesco}
																onChange={(e) => setRepForm((p) => ({ ...p, parentesco: e.target.value }))}
																placeholder="Ej. Hijo/a"
																className="mt-1 w-full rounded border border-teal-300 px-2 py-2 text-base"
															/>
														</div>
														<div className="sm:col-span-2">
															<CedulaField
																label="Cédula del representado (opcional)"
																value={`${repForm.tipo_cedula_rep}${repForm.cedula_rep}`}
																onChange={(tipo, numero) => setRepForm((p) => ({ ...p, tipo_cedula_rep: tipo, cedula_rep: numero }))}
																error={repFormErrors.cedula_rep}
																required={false}
																inputClassName={`h-10 rounded border px-2 text-base ${repFormErrors.cedula_rep ? "border-red-500" : "border-teal-300"}`}
																selectClassName="h-10 rounded border-teal-300 text-base"
															/>
														</div>
													</div>
												</div>
												<div className="flex flex-wrap gap-2">
													<button
														type="button"
														disabled={loadingCrearRep}
														onClick={(e) => {
															e.preventDefault();
															if (validateRepForm() && !loadingCrearRep)
																void handleCrearRepresentadoSubmit(e as unknown as React.FormEvent);
														}}
														className="rounded-lg bg-teal-600 px-4 py-2 text-base font-medium text-white hover:bg-teal-700 disabled:opacity-50"
													>
														{loadingCrearRep ? "Creando…" : "Crear representado"}
													</button>
													<button
														type="button"
														onClick={() => {
															setShowCrearRepresentadoForm(false);
															setRepFormErrors({});
														}}
														className="rounded-lg border border-teal-300 px-4 py-2 text-base text-teal-800"
													>
														Cancelar
													</button>
												</div>
											</div>
										)}
									</div>

									<div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
										<p className="text-base font-medium text-amber-900">Buscar representado por nombre</p>
										<div className="mt-2 flex flex-wrap gap-2">
											<input
												placeholder="Nombre"
												value={searchRepNombre}
												onChange={(e) => setSearchRepNombre(e.target.value)}
												className="min-w-[8rem] flex-1 rounded-lg border border-amber-300 px-3 py-2 text-base"
											/>
											<input
												placeholder="Apellido"
												value={searchRepApellido}
												onChange={(e) => setSearchRepApellido(e.target.value)}
												className="min-w-[8rem] flex-1 rounded-lg border border-amber-300 px-3 py-2 text-base"
											/>
											<button
												type="button"
												onClick={() => void handleBuscarRepresentadoPorNombre()}
												disabled={loadingBuscarRep || (!searchRepNombre.trim() && !searchRepApellido.trim())}
												className="rounded-lg bg-amber-600 px-4 py-2 text-base font-medium text-white disabled:opacity-50"
											>
												{loadingBuscarRep ? "…" : "Buscar"}
											</button>
										</div>
										{resultadosRep.length > 0 && (
											<ul className="mt-2 max-h-36 overflow-y-auto rounded border border-amber-200 bg-white">
												{resultadosRep.map((rep) => (
													<li key={rep.id_representado}>
														<button
															type="button"
															className="w-full px-3 py-2 text-left text-base hover:bg-amber-100"
															onClick={() => handleSeleccionarRepresentado(rep)}
														>
															{rep.nombre} {rep.apellido}{" "}
															<span className="text-amber-800">
																(titular: {rep.titular_nombre} {rep.titular_apellido})
															</span>
														</button>
													</li>
												))}
											</ul>
										)}
									</div>

									{vincularRepresentado && (
										<label className="flex items-start gap-2 text-base text-slate-700">
											<input
												type="checkbox"
												checked={vincularCitaAlTitular}
												onChange={(e) => setVincularCitaAlTitular(e.target.checked)}
												className="mt-1 rounded border-slate-300"
											/>
											<span>Vincular esta cita al titular (Mis citas del representado / titular según reglas del sistema).</span>
										</label>
									)}
								</div>
							)}
						</div>
					</section>
					)}

					{/* 2 Servicios */}
					{paso === 2 && (
					<section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 flex flex-col gap-6">
						<div className="flex items-center gap-3 border-b border-slate-100 pb-4">
							<div
								className="flex shrink-0 h-8 w-8 items-center justify-center rounded-full text-base font-bold text-white"
								style={{ backgroundColor: PRIMARY }}
							>
								2
							</div>
							<h2 className="font-headline text-xl font-bold" style={{ color: PRIMARY }}>
								Servicios Médicos
							</h2>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<label className={labelBase}>Especialidad</label>
								<div className="relative">
									<select
										className={`${inputBase} appearance-none pr-10`}
										value={idEspecialidad}
										onChange={(e) => setIdEspecialidad(e.target.value)}
									>
										<option value="">Todas / seleccione</option>
										{especialidades.map((esp) => (
											<option key={esp.id_especialidad} value={esp.id_especialidad}>
												{esp.nombre}
											</option>
										))}
									</select>
								</div>
							</div>
							<div>
								<label className={labelBase}>Médico tratante</label>
								<select
									name="id_especialista"
									value={form.id_especialista}
									onChange={handleChange}
									disabled={loadingEsp}
									className={`${inputBase} ${fieldErrors.id_especialista ? inputError : ""}`}
								>
									<option value="">{loadingEsp ? "Cargando…" : "Seleccione médico"}</option>
									{especialistasFiltrados.map((esp) => (
										<option key={esp.id_especialista} value={esp.id_especialista}>
											{esp.nombre} {esp.apellido}
										</option>
									))}
								</select>
								{errorCargaEspecialistas && (
									<p className="mt-1 text-base text-amber-800">
										No se pudieron cargar los médicos. Comprueba la API o vuelve a cargar la página.
									</p>
								)}
								{!errorCargaEspecialistas &&
									idEspecialidad &&
									!loadingEsp &&
									especialistasFiltrados.length === 0 && (
										<p className="mt-1 text-base text-slate-600">
											No hay médicos registrados para esta especialidad. Prueba otra especialidad o revisa en
											Finanzas → Comisiones que existan especialistas con esa especialidad.
										</p>
									)}
								{fieldErrors.id_especialista && (
									<p className="mt-1 text-base text-red-500">{fieldErrors.id_especialista}</p>
								)}
							</div>
							<div>
								<label className={labelBase}>Estudio médico (Eco)</label>
								<select
									name="id_eco"
									value={form.id_eco}
									onChange={handleChange}
									disabled={!form.id_especialista || loadingEcos}
									className={`${inputBase} ${fieldErrors.id_eco ? inputError : ""}`}
								>
									<option value="">{loadingEcos ? "Cargando…" : "Seleccione eco"}</option>
									{ecos.map((eco) => (
										<option key={eco.id_eco} value={eco.id_eco}>
											{eco.nombre}
										</option>
									))}
								</select>
								{fieldErrors.id_eco && <p className="mt-1 text-base text-red-500">{fieldErrors.id_eco}</p>}
							</div>
						</div>
					</section>
					)}

					{/* Pago (paso 4) */}
					{paso === 4 && (
					<section id="paso-pago" className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 flex flex-col gap-6">
						<div className="flex items-center gap-3 border-b border-slate-100 pb-4">
							<div
								className="flex shrink-0 h-8 w-8 items-center justify-center rounded-full text-base font-bold text-white"
								style={{ backgroundColor: PRIMARY }}
							>
								4
							</div>
							<h2 className="font-headline text-xl font-bold" style={{ color: PRIMARY }}>
								Información de Pago
							</h2>
						</div>
						{!isMetodoEnBs && (
							<div className="mb-4 flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-slate-50/90 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
								<span className="text-base font-bold uppercase tracking-wider text-neutral-500">
									Registrar monto en
								</span>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => setMonedaRegistro("usd")}
										className={`rounded-xl px-4 py-2 text-base font-semibold transition ${
											monedaRegistro === "usd"
												? "bg-[#006965] text-white shadow-sm"
												: "bg-white text-slate-700 ring-1 ring-neutral-200 hover:bg-slate-100"
										}`}
									>
										Dólares (USD)
									</button>
									<button
										type="button"
										onClick={() => setMonedaRegistro("bs")}
										className={`rounded-xl px-4 py-2 text-base font-semibold transition ${
											monedaRegistro === "bs"
												? "bg-[#006965] text-white shadow-sm"
												: "bg-white text-slate-700 ring-1 ring-neutral-200 hover:bg-slate-100"
										}`}
									>
										Bolívares (Bs)
									</button>
								</div>
								<p className="text-base text-slate-600 sm:ml-auto sm:max-w-md">
									El backend guarda USD/Bs según la tasa BCV. Puedes capturar primero en la moneda que uses en caja.
								</p>
							</div>
						)}
						<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
							<div>
								<label className={labelBase}>Método de pago</label>
								<select
									name="metodo"
									value={form.metodo}
									onChange={handleChange}
									className={`${inputBase} appearance-none`}
								>
									{METODO_UI_OPTIONS.map(({ label, value }) => (
										<option key={value} value={value}>
											{label}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className={labelBase}>Referencia</label>
								<input
									type="text"
									name="referencia"
									value={form.referencia}
									onChange={handleChange}
									maxLength={80}
									className={`${inputBase} ${fieldErrors.referencia ? inputError : ""}`}
									placeholder="Número de referencia"
								/>
							</div>
							<div>
								<label className={labelBase}>Tasa BCV (hoy)</label>
								<div className="relative">
									<input
										type="text"
										readOnly
										value={
											form.tasa_dia_bcv
												? `${form.tasa_dia_bcv} VES/$`
												: loadingDolar
													? "…"
													: dolarOficial
														? `${dolarOficial.promedio} VES/$`
														: "—"
										}
										className={`${inputBase} bg-slate-100 pr-10`}
									/>
									<Lock className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
								</div>
							</div>
						</div>
						<div className="rounded-xl bg-slate-50 p-5 mt-2 border border-slate-100 grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<label className={labelBase}>{montoPrincipalLabel}</label>
								{isMetodoEnBs && (
									<input
										type="number"
										name="monto"
										value={form.monto}
										onChange={handleChange}
										min={0}
										step={0.01}
										className={`${inputBase} font-bold bg-white text-[#006965] ${fieldErrors.monto ? inputError : ""}`}
									/>
								)}
								{!isMetodoEnBs && monedaRegistro === "usd" && (
									<input
										type="number"
										name="monto"
										value={form.monto}
										onChange={handleChange}
										min={0}
										step={0.01}
										className={`${inputBase} font-bold bg-white text-[#006965] ${fieldErrors.monto ? inputError : ""}`}
									/>
								)}
								{!isMetodoEnBs && monedaRegistro === "bs" && (
									<input
										type="number"
										value={form.monto.trim() === "" ? "" : montoBsDisplay}
										onChange={(e) => setMontoRegistroDesdeBs(e.target.value)}
										min={0}
										step={0.01}
										disabled={tasaNum <= 0}
										placeholder={tasaNum <= 0 ? "Indica tasa BCV primero" : "Ej. 4739.18"}
										className={`${inputBase} font-bold bg-white text-[#006965] ${fieldErrors.monto ? inputError : ""} disabled:opacity-50`}
									/>
								)}
								{fieldErrors.monto && <p className="mt-1 text-base text-red-500">{fieldErrors.monto}</p>}
							</div>
							<div>
								<label className={labelBase}>{equivalentePagoLabel}</label>
								<input
									type="text"
									readOnly
									value={equivalentePagoValue}
									className={`${inputBase} bg-slate-100 font-bold text-slate-700 hover:border-neutral-200 focus:ring-0`}
								/>
							</div>
						</div>
					</section>
					)}

					{/* Agenda (paso 3) */}
					{paso === 3 && (
					<section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 flex flex-col gap-6">
						<div className="flex items-center gap-3 border-b border-slate-100 pb-4">
							<div
								className="flex shrink-0 h-8 w-8 items-center justify-center rounded-full text-base font-bold text-white"
								style={{ backgroundColor: PRIMARY }}
							>
								3
							</div>
							<h2 className="font-headline text-xl font-bold" style={{ color: PRIMARY }}>
								Fecha y Hora
							</h2>
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
							<div className="w-full lg:col-span-4 rounded-2xl border border-slate-100 bg-slate-50 p-6">
								<div className="mb-4 flex items-center justify-between">
									<h3 className="text-base font-bold text-slate-800">
										{MESES[calMonth]} {calYear}
									</h3>
									<div className="flex gap-1">
										<button
											type="button"
											className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100"
											onClick={() => {
												const nm = calMonth === 0 ? 11 : calMonth - 1;
												const ny = calMonth === 0 ? calYear - 1 : calYear;
												setCalMonth(nm);
												setCalYear(ny);
											}}
										>
											<ChevronLeft className="h-4 w-4" />
										</button>
										<button
											type="button"
											className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100"
											onClick={() => {
												const nm = calMonth === 11 ? 0 : calMonth + 1;
												const ny = calMonth === 11 ? calYear + 1 : calYear;
												setCalMonth(nm);
												setCalYear(ny);
											}}
										>
											<ChevronRight className="h-4 w-4" />
										</button>
									</div>
								</div>
								<div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-neutral-400">
									{DIAS_CORTO.map((d) => (
										<div key={d}>{d}</div>
									))}
								</div>
								<div className="grid grid-cols-7 gap-y-1 text-center text-base">
									{calendarCells.map((cell, idx) => {
										if (!cell.inMonth || !cell.iso) {
											return (
												<div key={`pad-${idx}`} className="py-2 text-neutral-300">
													{cell.day}
												</div>
											);
										}
										const selected = form.fecha_cita === cell.iso;
										const hoyStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
										const isPastDate = cell.iso < hoyStr;

										return (
											<button
												key={cell.iso}
												type="button"
												disabled={isPastDate}
												onClick={() =>
													setForm((prev) => ({
														...prev,
														fecha_cita: cell.iso!,
													}))
												}
												className={`rounded-xl py-2 font-medium transition ${
													selected
														? "bg-[#006965] font-bold text-white shadow-md"
														: isPastDate
															? "text-slate-300 cursor-not-allowed"
															: "hover:bg-slate-100"
												}`}
											>
												{cell.day}
											</button>
										);
									})}
								</div>
							</div>

					<div className="lg:col-span-8 flex-1 space-y-8">
					{/* Leyenda de disponibilidad */}
					{form.id_especialista && (
						<div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-base text-slate-600">
							<span className="flex items-center gap-1.5">
								<span className="inline-block h-3 w-3 rounded-sm bg-[#006965]" />
								Disponible
							</span>
							<span className="flex items-center gap-1.5">
								<span className="inline-block h-3 w-3 rounded-sm bg-slate-300" />
								Ocupado (no disponible)
							</span>
							{loadingOcupacion ? (
								<span className="ml-auto text-slate-400">Cargando disponibilidad…</span>
							) : ocupados.length > 0 ? (
								<span className="ml-auto font-semibold text-red-500">{ocupados.length} horario{ocupados.length !== 1 ? "s" : ""} ocupado{ocupados.length !== 1 ? "s" : ""}</span>
							) : form.fecha_cita ? (
								<span className="ml-auto text-emerald-600 font-semibold">Todos los horarios disponibles</span>
							) : null}
						</div>
					)}
					<div>
						<div className="mb-3 flex items-center gap-2 text-neutral-500">
							<Sun className="h-4 w-4" />
							<span className="text-base font-bold uppercase tracking-widest">Horarios de mañana</span>
						</div>
									<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
										{morningSlots.filter(opt => horaDisponible(opt.value)).map((opt) => {
											const hoyStr = new Date().toLocaleDateString('en-CA');
											const isToday = form.fecha_cita === hoyStr;
											const isPastTime = isToday && (opt.value <= new Date().toTimeString().slice(0, 8));
											
											const sel = form.hora_cita === opt.value;
											return (
												<button
													key={opt.value}
													type="button"
													disabled={isPastTime}
													title={isPastTime ? "Horario ya transcurrido" : undefined}
													onClick={() =>
														setForm((p) => ({
															...p,
															hora_cita: opt.value,
														}))
													}
													className={`rounded-2xl py-3 text-base font-semibold transition ${
														isPastTime
															? "cursor-not-allowed bg-slate-200 text-slate-400 opacity-60 select-none"
															: sel
																? "border-2 border-[#1c837f] bg-white font-bold text-[#006965] shadow-sm"
																: "bg-slate-100 text-slate-800 hover:bg-[#1c837f] hover:text-white"
													}`}
												>
													{opt.label}
												</button>
											);
										})}
									</div>
									{!form.id_especialista && (
										<p className="mt-2 text-base text-slate-500">
											Selecciona médico y eco para marcar horarios ya ocupados en esta fecha.
										</p>
									)}
								</div>
								<div>
									<div className="mb-3 flex items-center gap-2 text-neutral-500">
										<Sunset className="h-4 w-4" />
										<span className="text-base font-bold uppercase tracking-widest">Horarios de tarde</span>
									</div>
									<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
										{afternoonSlots.filter(opt => horaDisponible(opt.value)).map((opt) => {
											const hoyStr = new Date().toLocaleDateString('en-CA');
											const isToday = form.fecha_cita === hoyStr;
											const isPastTime = isToday && (opt.value <= new Date().toTimeString().slice(0, 8));
											
											const sel = form.hora_cita === opt.value;
											return (
												<button
													key={opt.value}
													type="button"
													disabled={isPastTime}
													title={isPastTime ? "Horario ya transcurrido" : undefined}
													onClick={() =>
														setForm((p) => ({
															...p,
															hora_cita: opt.value,
														}))
													}
													className={`rounded-2xl py-3 text-base font-semibold transition ${
														isPastTime
															? "cursor-not-allowed bg-slate-200 text-slate-400 opacity-60 select-none"
															: sel
																? "border-2 border-[#1c837f] bg-white font-bold text-[#006965] shadow-sm"
																: "bg-slate-100 text-slate-800 hover:bg-[#1c837f] hover:text-white"
													}`}
												>
													{opt.label}
												</button>
											);
										})}
									</div>
								</div>
								{fieldErrors.hora_cita && <p className="text-base text-red-500">{fieldErrors.hora_cita}</p>}
								{fieldErrors.fecha_cita && <p className="text-base text-red-500">{fieldErrors.fecha_cita}</p>}
							</div>
						</div>
					</section>
					)}

					{error && (
						<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-base text-red-700">{error}</div>
					)}
				</form>
			</div>

			<div className="pointer-events-none fixed bottom-0 left-0 right-0 z-30 flex border-t border-slate-200/90 bg-white/95 px-4 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-md lg:left-56">
				<div className="pointer-events-auto mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
					<button
						type="button"
						onClick={handlePrev}
						disabled={paso === 1}
						className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
					>
						<ChevronLeft className="h-4 w-4" /> Anterior
					</button>
					<div className="flex min-w-0 items-start gap-2 text-base text-slate-600 max-sm:hidden">
						<Info className="mt-0.5 h-5 w-5 shrink-0 text-[#006965]" />
						<p className="min-w-0">
							<span className="font-semibold text-slate-500">Resumen:</span>{" "}
							<span className="font-bold text-slate-900">{resumenTexto.pac}</span> · {espNombre} + {resumenTexto.eco}{" "}
							· {resumenTexto.fecha} {resumenTexto.hora}
						</p>
					</div>
					{paso < 4 ? (
						<button
							type="button"
							onClick={() => void handleNext()}
							disabled={isCreatingPatient || (paso === 1 && !!citaActivaError)}
							className="flex items-center gap-2 rounded-2xl px-8 py-3 text-base font-bold text-white shadow-md transition disabled:opacity-60"
							style={{ backgroundColor: PRIMARY }}
						>
							{isCreatingPatient ? "Procesando…" : "Siguiente"} <ChevronRight className="h-4 w-4" />
						</button>
					) : (
						<button
							type="submit"
							form="form-cita-mostrador"
							disabled={isSaving || !!citaActivaError}
							className="shrink-0 rounded-2xl px-8 py-3 text-base font-bold text-white shadow-md disabled:opacity-60"
							style={{ backgroundColor: PRIMARY }}
						>
							{isSaving ? "Guardando…" : "Confirmar cita ✓"}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
