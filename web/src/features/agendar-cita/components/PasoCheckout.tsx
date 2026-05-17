import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from "react";
import {
	ArrowLeft,
	Upload,
	Calendar,
	Clock,
	ScanHeart,
	User,
	CheckCircle2,
	Copy,
	Loader2,
	BookUser,
	X,
	ToggleLeft,
	ToggleRight,
	Trash2,
} from "lucide-react";
import { useGetEcosQuery } from "../../ecos/ecosApi";
import { useGetDolarOficialQuery } from "../../dolar";
import { useAsignarCitaMutation, useUploadOrdenMedicaMutation } from "../../citas/citasApi";
import { useGetMetodosPagoDisponiblesQuery } from "../../metodos-pago/metodosPagoApi";
import { useAuth, getToken } from "../../../shared";
import { CedulaField } from "../../../shared/components/CedulaField";
import { TelefonoField, validarNumeroTelefono, MENSAJE_TELEFONO_7_DIGITOS } from "../../../shared/components/TelefonoField";
import { parseCedulaDisplay } from "../../../shared/utils/cedulaDisplay";
import { parseTelefonoDisplay } from "../../../shared/utils/telefonoDisplay";
import { validarRangoCedula, MENSAJE_RANGO_CEDULA } from "../../../shared/utils/validation";
import { useGetPagosGuardadosQuery, useDeletePagoGuardadoMutation, type PagoGuardado } from "../../citas/citasApi";
import { normalizeImageUrl } from "../../../shared/utils/imageUrl";

type PasoCheckoutProps = {
	idEco: string;
	ecoNombre: string;
	fecha: string;
	hora: string;
	idDisponibilidad: string;
	idEspecialista: string;
	especialistaNombre: string;
	idRepresentado?: string;
	onBack: () => void;
};

/* ─── Helpers ─── */

const MONTH_NAMES = [
	"Ene", "Feb", "Mar", "Abr", "May", "Jun",
	"Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const formatFecha = (fecha: string): string => {
	const [y, m, d] = fecha.split("-").map(Number);
	return `${d} ${MONTH_NAMES[(m ?? 1) - 1]} ${y}`;
};

const formatHora = (hora: string): string => {
	const parts = hora.split(":").map(Number);
	const h = parts[0] ?? 0;
	const mm = String(parts[1] ?? 0).padStart(2, "0");
	const ampm = h >= 12 ? "PM" : "AM";
	const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
	return `${String(h12).padStart(2, "0")}:${mm} ${ampm}`;
};

const copyToClipboard = (text: string) => {
	navigator.clipboard.writeText(text).catch(() => { /* ignore */ });
};

const labelTipoPago = (tipo: string): string => {
	const m: Record<string, string> = {
		PagoMovil: "Pago Móvil",
		Transferencia: "Transferencia",
		EfectivoBs: "Efectivo (Bs.)",
		EfectivoUSD: "Efectivo ($)",
		Zelle: "Zelle",
		Binance: "Binance",
		PayPal: "PayPal",
		Otro: "Otro",
		Efectivo: "Efectivo",
	};
	return m[tipo] ?? tipo;
};

const isCashTipo = (tipo: string) =>
	tipo === "EfectivoBs" || tipo === "EfectivoUSD" || tipo === "Efectivo";

const needsBanksTipo = (tipo: string) =>
	tipo === "Transferencia" || tipo === "PagoMovil";

const needsComprobanteTipo = (tipo: string) => !isCashTipo(tipo);

/** Monto en BS (eco USD × tasa) o monto en USD (precio eco) */
const montoParaMetodo = (
	tipoPago: string,
	moneda: string | undefined,
	precioUSD: number,
	precioBS: number,
): number => {
	if (tipoPago === "EfectivoBs" || moneda === "BS") {
		return precioBS;
	}
	return precioUSD;
};

const esVistaBs = (tipoPago: string, moneda: string | undefined) =>
	tipoPago === "EfectivoBs" || moneda === "BS";

/** Retorna la fecha de hoy en formato YYYY-MM-DD (local) */
const getTodayLocal = (): string => {
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, "0");
	const d = String(now.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
};

// PagoGuardado type is imported from pagosGuardadosApi

/* ─── Component ─── */

const PasoCheckout = ({
	idEco,
	ecoNombre,
	fecha,
	hora,
	idDisponibilidad,
	idEspecialista,
	especialistaNombre,
	idRepresentado,
	onBack,
}: PasoCheckoutProps) => {
	const { user } = useAuth();

	// Fetch eco price
	const { data: ecos = [] } = useGetEcosQuery();
	const eco = ecos.find((e) => e.id_eco === idEco);
	const precioUSD = Number(eco?.precio ?? 0);

	// Fetch BCV rate
	const { data: dolar } = useGetDolarOficialQuery();
	const tasaBCV = dolar?.promedio ?? 0;
	const precioBS = tasaBCV > 0 ? precioUSD * tasaBCV : 0;

	// Fetch dynamic payment methods
	const { data: metodosPago = [] } = useGetMetodosPagoDisponiblesQuery();

	// Fetch saved payment accounts
	const { data: pagosGuardados = [], refetch: refetchGuardados } = useGetPagosGuardadosQuery(
		user?.id_usuario ?? "",
		{ skip: !user?.id_usuario },
	);
	const [deletePagoGuardado] = useDeletePagoGuardadoMutation();

	// Mutations
	const [asignarCita, { isLoading: isSubmitting }] = useAsignarCitaMutation();
	const [uploadOrden] = useUploadOrdenMedicaMutation();

	// Selected payment method (by id)
	const [selectedMetodoId, setSelectedMetodoId] = useState<string>("");
	const selectedMetodo = metodosPago.find((m) => m.id_metodo_pago === selectedMetodoId) ?? null;

	// Auto-select first method when they load
	useEffect(() => {
		if (metodosPago.length > 0 && !selectedMetodoId) {
			setSelectedMetodoId(metodosPago[0].id_metodo_pago);
		}
	}, [metodosPago, selectedMetodoId]);

	useEffect(() => {
		const t = selectedMetodo?.tipo_pago ?? "";
		if (isCashTipo(t)) setComprobanteFile(null);
	}, [selectedMetodo?.tipo_pago]);

	// Form state
	const [bancoOrigen, setBancoOrigen] = useState("");
	const [referencia, setReferencia] = useState("");
	const [cedulaPagador, setCedulaPagador] = useState("");
	const [telefonoPagador, setTelefonoPagador] = useState("");

	// ← NUEVO: Fecha de pago (solo fecha, por defecto hoy, max=hoy)
	const [fechaPago, setFechaPago] = useState<string>(getTodayLocal());

	// ← NUEVO: Guardar cuenta toggle
	const [guardarCuenta, setGuardarCuenta] = useState(false);
	const [aliasCuenta, setAliasCuenta] = useState("");

	// ← NUEVO: Modal de cuentas guardadas
	const [showGuardadasModal, setShowGuardadasModal] = useState(false);

	// File upload
	const fileInputRef = useRef<HTMLInputElement>(null);
	const comprobanteInputRef = useRef<HTMLInputElement>(null);
	const [ordenFile, setOrdenFile] = useState<File | null>(null);
	const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
	const [dragActive, setDragActive] = useState(false);
	const [dragComprobanteActive, setDragComprobanteActive] = useState(false);

	// Result
	const [success, setSuccess] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	// Validation UI state
	const [attemptedSubmit, setAttemptedSubmit] = useState(false);
	const [touchedBanco, setTouchedBanco] = useState(false);
	const [touchedReferencia, setTouchedReferencia] = useState(false);
	const [touchedCedula, setTouchedCedula] = useState(false);
	const [touchedTelefono, setTouchedTelefono] = useState(false);

	/** Autocomplete form from a saved account */
	const handleSelectGuardada = (cuenta: PagoGuardado) => {
		setBancoOrigen(cuenta.banco_origen);
		setCedulaPagador(cuenta.cedula_pagador);
		setTelefonoPagador(cuenta.telefono_pagador);
		setShowGuardadasModal(false);
	};

	const handleDeleteGuardada = async (id: string) => {
		try {
			await deletePagoGuardado(id).unwrap();
			refetchGuardados();
		} catch {
			// silently fail
		}
	};

	const handleFileDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setDragActive(false);
		const file = e.dataTransfer.files[0];
		if (file && file.size <= 5 * 1024 * 1024) {
			setOrdenFile(file);
		}
	};

	const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file && file.size <= 5 * 1024 * 1024) {
			setOrdenFile(file);
		}
	};

	const handleComprobanteDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setDragComprobanteActive(false);
		const file = e.dataTransfer.files[0];
		if (file && file.size <= 5 * 1024 * 1024) {
			setComprobanteFile(file);
		}
	};

	const handleComprobanteSelect = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file && file.size <= 5 * 1024 * 1024) {
			setComprobanteFile(file);
		}
	};

	const tipoPagoSel = selectedMetodo?.tipo_pago ?? "";
	const monedaSel = selectedMetodo?.moneda ?? "";
	const showBanks = Boolean(selectedMetodo && needsBanksTipo(tipoPagoSel));
	const showReferencia = Boolean(selectedMetodo && !isCashTipo(tipoPagoSel));
	const showComprobante = Boolean(selectedMetodo && needsComprobanteTipo(tipoPagoSel));
	const vistaBs = selectedMetodo ? esVistaBs(tipoPagoSel, monedaSel) : true;
	const montoEnviar = selectedMetodo
		? montoParaMetodo(tipoPagoSel, monedaSel, precioUSD, precioBS)
		: 0;

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setErrorMsg(null);
		setAttemptedSubmit(true);

		if (!user?.id_usuario) {
			setErrorMsg("Sesión expirada. Vuelva a iniciar sesión.");
			return;
		}
		if (!selectedMetodo) {
			setErrorMsg("Seleccione un método de pago.");
			return;
		}
		const metodo = selectedMetodo.tipo_pago;
		const isCash = isCashTipo(metodo);
		let cedulaApi = "";
		let telefonoApi = "";

		if (!isCash) {
			const { numero: cedulaNum } = parseCedulaDisplay(cedulaPagador);
			if (!cedulaNum || !validarRangoCedula(cedulaNum)) {
				setErrorMsg(MENSAJE_RANGO_CEDULA);
				return;
			}
			cedulaApi = cedulaPagador.trim().toUpperCase();
			const telParsed = parseTelefonoDisplay(telefonoPagador);
			if (!validarNumeroTelefono(telParsed.number)) {
				setErrorMsg(MENSAJE_TELEFONO_7_DIGITOS);
				return;
			}
			telefonoApi = `${telParsed.prefix}${telParsed.number}`;
		}

		if (showReferencia && (!referencia.trim() || referencia.trim().length < 4)) {
			return;
		}
		if (showBanks && !bancoOrigen.trim()) {
			return;
		}
		if (showComprobante && !comprobanteFile) {
			return;
		}

		// Validar fecha de pago (no puede ser futura)
		if (fechaPago && fechaPago > getTodayLocal()) {
			setErrorMsg("La fecha de pago no puede ser en el futuro.");
			return;
		}

		const bancoDestino = `${selectedMetodo.banco_nombre} (${selectedMetodo.banco_codigo})`;
		const monto = montoParaMetodo(
			selectedMetodo.tipo_pago,
			selectedMetodo.moneda,
			precioUSD,
			precioBS,
		);

		try {
			let imagenUrl = "";
			if (showComprobante && comprobanteFile) {
				const token = getToken();
				if (!token) {
					setErrorMsg("Sesión expirada. Vuelva a iniciar sesión.");
					return;
				}
				const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
				const formData = new FormData();
				formData.append("comprobante", comprobanteFile);
				const response = await fetch(`${baseUrl}/pagos/upload-comprobante`, {
					method: "POST",
					headers: { Authorization: `Bearer ${token}` },
					body: formData,
				});
				if (!response.ok) {
					const err = await response.json().catch(() => ({}));
					setErrorMsg((err as { message?: string }).message || "No se pudo subir el comprobante.");
					return;
				}
				const data = await response.json();
				imagenUrl = data?.data?.url ?? "";
				if (!imagenUrl) {
					setErrorMsg("No se recibió la URL del comprobante.");
					return;
				}
			}

			let ordenUrl: string | undefined;
			if (ordenFile) {
				const formData = new FormData();
				formData.append("orden_medica", ordenFile);
				const uploadResult = await uploadOrden(formData).unwrap();
				ordenUrl = uploadResult.url;
			}

			await asignarCita({
				id_paciente: user.id_usuario,
				id_representado: idRepresentado,
				id_eco: idEco,
				id_especialista: idEspecialista,
				id_disponibilidad: idDisponibilidad,
				orden_medica: ordenUrl,
				metodo,
				imagen: imagenUrl || undefined,
				banco_origen: showBanks ? bancoOrigen : "",
				banco_destino: bancoDestino,
				monto,
				cedula_pagador: cedulaApi,
				telefono_pagador: telefonoApi,
				referencia: showReferencia ? referencia.trim() : "",
				// ← NUEVOS CAMPOS
				fecha_pago: fechaPago || undefined,
				guardar_cuenta: guardarCuenta && !isCash ? true : undefined,
				alias_cuenta: guardarCuenta && aliasCuenta.trim() ? aliasCuenta.trim() : undefined,
			} as Parameters<typeof asignarCita>[0]).unwrap();

			setSuccess(true);
		} catch (err: unknown) {
			const msg = (err as { data?: { message?: string } })?.data?.message
				|| "Error al procesar la cita. Intente de nuevo.";
			setErrorMsg(msg);
		}
	};

	/* ─── Derived display data from selected method ─── */
	const displayBanco = selectedMetodo
		? `${selectedMetodo.banco_nombre} (${selectedMetodo.banco_codigo})`
		: "—";
	const displayIdentificacion = selectedMetodo?.titular_identificacion || "—";
	const displayTelefono = selectedMetodo?.telefono || "—";
	const displayCuenta = selectedMetodo?.numero_cuenta || null;
	const displayQrUrl = normalizeImageUrl(selectedMetodo?.imagen_url) || null;

	/* ─── SUCCESS STATE ─── */
	if (success) {
		return (
			<div className="text-center py-20">
				<div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
					<CheckCircle2 className="h-10 w-10 text-emerald-600" />
				</div>
				<h2 className="font-headline text-3xl lg:text-4xl font-extrabold text-brand-900 mb-3">
					¡Cita Agendada Exitosamente!
				</h2>
				<p className="text-brand-600 text-base max-w-md mx-auto mb-2">
					Tu cita para <span className="font-bold">{ecoNombre}</span> ha sido registrada.
				</p>
				<p className="text-base text-slate-400 mb-8">
					{formatFecha(fecha)} — {formatHora(hora)} con Dr./Dra. {especialistaNombre}
				</p>
				<p className="text-sm text-brand-600 bg-brand-100 px-4 py-2 rounded-full inline-block mb-8">
					Tu pago será verificado por un administrador. Recibirás confirmación por notificación.
				</p>
				<a
					href="/dashboard"
					className="inline-flex items-center gap-2 bg-brand-800 text-white px-8 py-3 rounded-xl font-bold text-base hover:bg-brand-900 transition-colors"
				>
					Volver al inicio
				</a>
			</div>
		);
	}

	/* ─── MODAL: Cuentas Guardadas ─── */
	const GuardadasModal = () => (
		<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
			{/* Overlay */}
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={() => setShowGuardadasModal(false)}
			/>
			{/* Sheet */}
			<div className="relative w-full max-w-md mx-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
				{/* Header */}
				<div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center">
							<BookUser className="h-4 w-4 text-teal-700" />
						</div>
						<div>
							<h3 className="font-bold text-slate-900 text-base">Cuentas Guardadas</h3>
							<p className="text-sm text-slate-400">{pagosGuardados.length} cuenta{pagosGuardados.length !== 1 ? "s" : ""} guardada{pagosGuardados.length !== 1 ? "s" : ""}</p>
						</div>
					</div>
					<button
						type="button"
						onClick={() => setShowGuardadasModal(false)}
						className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
					>
						<X className="h-4 w-4 text-slate-500" />
					</button>
				</div>

				{/* Body */}
				<div className="px-6 py-4 max-h-80 overflow-y-auto space-y-3">
					{pagosGuardados.length === 0 ? (
						<div className="text-center py-10">
							<BookUser className="h-10 w-10 text-slate-200 mx-auto mb-3" />
							<p className="text-base font-medium text-slate-400">No tienes cuentas guardadas</p>
							<p className="text-sm text-slate-300 mt-1">Activa el toggle al pagar para guardar tus datos</p>
						</div>
					) : (
						pagosGuardados.map((cuenta) => (
							<div
								key={cuenta.id_guardado}
								className="group flex items-start gap-4 p-4 rounded-2xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all cursor-pointer"
								onClick={() => handleSelectGuardada(cuenta)}
							>
								<div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
									<BookUser className="h-5 w-5 text-teal-700" />
								</div>
								<div className="flex-1 min-w-0">
									{cuenta.alias && (
										<p className="font-bold text-base text-teal-800 truncate">{cuenta.alias}</p>
									)}
									<p className="text-sm font-semibold text-slate-700 mt-0.5 truncate">{cuenta.banco_origen}</p>
									<p className="text-sm text-slate-400 font-mono mt-0.5">CI: {cuenta.cedula_pagador}</p>
									<p className="text-sm text-slate-400 font-mono">Tel: {cuenta.telefono_pagador}</p>
								</div>
								<button
									type="button"
									onClick={(ev) => { ev.stopPropagation(); handleDeleteGuardada(cuenta.id_guardado); }}
									className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100 transition-all shrink-0 mt-1"
								>
									<Trash2 className="h-3.5 w-3.5 text-red-500" />
								</button>
							</div>
						))
					)}
				</div>

				{/* Footer */}
				<div className="px-6 pb-6 pt-2 border-t border-slate-50">
					<button
						type="button"
						onClick={() => setShowGuardadasModal(false)}
						className="w-full py-3 rounded-xl text-base font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
					>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	);

	/* ─── MAIN FORM ─── */
	return (
		<div>
			{/* Modal cuentas guardadas */}
			{showGuardadasModal && <GuardadasModal />}

			{/* Header */}
			<div className="mb-8 lg:mb-10 text-center lg:text-left">
				<h2 className="font-headline text-3xl lg:text-4xl font-extrabold text-brand-900 tracking-tight">
					Checkout y Pago
				</h2>
				<p className="text-brand-600 mt-2 text-base lg:text-base">
					Paso 4 de 4: Confirma los detalles y procesa tu pago
				</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

				{/* LADO IZQUIERDO: FLUJO PRINCIPAL (Paso A, B y C) */}
				<div className="order-2 lg:order-1 lg:col-span-7 flex flex-col gap-6">

					{/* PASO A: Selector de Método de Pago */}
					<div className="bg-paper rounded-3xl p-8 shadow-sm border border-brand-200/20">
						<h3 className="text-xl font-bold text-brand-900 mb-6 flex items-center gap-3 font-headline">
							<span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-800 text-white text-base">1</span>
							Elige tu forma de pago
						</h3>

						<div className="relative mt-4">
							<select
								value={selectedMetodoId}
								onChange={(e) => setSelectedMetodoId(e.target.value)}
								className="w-full bg-cloud border border-brand-200/40 rounded-xl py-4 pl-5 pr-12 text-base font-medium focus:ring-2 focus:ring-brand-800/20 appearance-none outline-none cursor-pointer shadow-sm text-brand-900 transition-shadow hover:shadow-md"
							>
								<option value="" disabled>Selecciona un método</option>
								{metodosPago.length === 0 && (
									<option value="">Cargando...</option>
								)}
								{metodosPago.map((m) => (
									<option key={m.id_metodo_pago} value={m.id_metodo_pago}>
										{m.nombre} — {labelTipoPago(m.tipo_pago)} ({m.moneda})
									</option>
								))}
							</select>
							<div className="absolute right-4 top-0 bottom-0 flex items-center pointer-events-none text-brand-600">
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6" /></svg>
							</div>
							<div className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-800 rounded-full my-3 ml-1.5" />
						</div>

						{vistaBs && selectedMetodoId && (
							<div className="hidden mt-4 p-4 rounded-xl bg-cloud border border-brand-200/20">
								<p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Tasa del día (BCV)</p>
								<p className="font-bold text-brand-800">{tasaBCV.toFixed(2)} Bs/USD</p>
							</div>
						)}
					</div>

					{/* PASO B: Revelar Datos Bancarios */}
					{selectedMetodo && (
						<div className="bg-paper rounded-3xl p-8 shadow-sm border border-brand-200/20 transition-all duration-500 ease-in-out opacity-100 animate-in fade-in slide-in-from-top-4">
							<h3 className="text-xl font-bold text-brand-900 mb-6 flex items-center gap-3 font-headline">
								<span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-800 text-white text-base">2</span>
								Realiza el pago a través de los siguientes datos
							</h3>

							<div className="flex flex-col gap-6 items-center">
								{/* QR Code */}
								{displayQrUrl && (
									<div className="w-full flex justify-center shrink-0">
										<img
											src={displayQrUrl}
											alt="Código QR de pago"
											className="w-48 h-48 rounded-3xl object-contain border-2 border-brand-200/30 bg-white p-3 shadow-sm"
										/>
									</div>
								)}

								<div className="w-full space-y-3 flex-1 mt-2">
									{/* Banco */}
									<div className="flex items-center justify-between p-4 bg-cloud rounded-2xl">
										<div className="min-w-0 flex-1">
											<p className="text-[10px] text-slate-400 font-bold uppercase">Banco Destino</p>
											<p className="font-bold text-brand-900 text-base truncate">{displayBanco}</p>
										</div>
									</div>

									{/* Identificación / RIF */}
									{displayIdentificacion !== "—" && (
										<div className="flex items-center justify-between p-4 bg-cloud rounded-2xl">
											<div className="min-w-0 flex-1">
												<p className="text-[10px] text-slate-400 font-bold uppercase">RIF / Cédula</p>
												<p className="font-bold text-brand-900 text-base">{displayIdentificacion}</p>
											</div>
											{selectedMetodo?.titular_identificacion && (
												<button
													type="button"
													onClick={() => copyToClipboard(selectedMetodo.titular_identificacion!)}
													className="p-2 hover:bg-brand-100 text-brand-800 rounded-lg transition-colors flex-shrink-0"
												>
													<Copy className="h-4 w-4" />
												</button>
											)}
										</div>
									)}

									{/* Teléfono */}
									{selectedMetodo?.tipo_pago === "PagoMovil" && displayTelefono !== "—" && (
										<div className="flex items-center justify-between p-4 bg-cloud rounded-2xl">
											<div className="min-w-0 flex-1">
												<p className="text-[10px] text-slate-400 font-bold uppercase">Teléfono</p>
												<p className="font-bold text-brand-900 text-base">{displayTelefono}</p>
											</div>
											<button
												type="button"
												onClick={() => copyToClipboard(displayTelefono)}
												className="p-2 hover:bg-brand-100 text-brand-800 rounded-lg transition-colors flex-shrink-0"
											>
												<Copy className="h-4 w-4" />
											</button>
										</div>
									)}

									{/* Cuenta */}
									{selectedMetodo?.tipo_pago === "Transferencia" && displayCuenta && (
										<div className="flex items-center justify-between p-4 bg-cloud rounded-2xl">
											<div className="min-w-0 flex-1">
												<p className="text-[10px] text-slate-400 font-bold uppercase">Nro. Cuenta</p>
												<p className="font-bold text-brand-900 text-base font-mono tracking-wide">{displayCuenta}</p>
											</div>
											<button
												type="button"
												onClick={() => copyToClipboard(displayCuenta)}
												className="p-2 hover:bg-brand-100 text-brand-800 rounded-lg transition-colors flex-shrink-0"
											>
												<Copy className="h-4 w-4" />
											</button>
										</div>
									)}

									{/* Total highlighting block */}
									<div className="flex items-center justify-between p-4 bg-brand-50 border border-brand-200/50 rounded-2xl mt-1">
										<div className="min-w-0 flex-1">
											<p className="text-[10px] text-brand-800 font-bold uppercase mb-1">Monto Exacto a Enviar</p>
											<p className="font-black text-brand-900 text-xl font-headline">
												{vistaBs
													? `${montoEnviar.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`
													: `$${montoEnviar.toFixed(2)}`}
											</p>
										</div>
									</div>

								</div>
							</div>
						</div>
					)}

					{/* PASO C: Formulario de Reporte */}
					{selectedMetodo && (
						<div className="bg-paper rounded-3xl p-8 lg:p-10 shadow-sm border border-brand-200/20 transition-all duration-500 ease-in-out opacity-100 animate-in fade-in slide-in-from-top-4">
							<h3 className="text-xl font-bold text-brand-900 mb-8 flex items-center gap-3 font-headline">
								<span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-800 text-white text-base">3</span>
								{isCashTipo(tipoPagoSel) ? "Confirmación y Orden Médica" : "Reporta tu pago"}
							</h3>

							<form onSubmit={handleSubmit} className="space-y-6">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-5">

									{/* ─── Botón de Cuentas Guardadas (solo para métodos con banco) ─── */}
									{!isCashTipo(tipoPagoSel) && (
										<div className="md:col-span-2 flex justify-end">
											<button
												type="button"
												onClick={() => setShowGuardadasModal(true)}
												className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-200 bg-brand-50 text-brand-800 text-sm font-bold hover:bg-brand-100 hover:border-brand-300 transition-all shadow-sm"
											>
												<BookUser className="h-3.5 w-3.5" />
												Cuentas guardadas
												{pagosGuardados.length > 0 && (
													<span className="ml-1 bg-brand-800 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-bold">
														{pagosGuardados.length}
													</span>
												)}
											</button>
										</div>
									)}

									{showBanks && (() => {
										const errorBanco = !bancoOrigen.trim() ? "Seleccione un banco origen." : null;
										const showError = (touchedBanco || attemptedSubmit) && errorBanco;
										return (
											<div className="space-y-1.5 relative md:col-span-2">
												<label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
													Banco Origen (Desde donde pagas)*
												</label>
												<select
													value={bancoOrigen}
													onChange={(e) => setBancoOrigen(e.target.value)}
													onBlur={() => setTouchedBanco(true)}
													className={`w-full bg-paper border border-transparent rounded-xl py-3 px-4 text-base focus:ring-2 focus:ring-brand-800/20 outline-none ${showError ? "border-red-500 bg-red-50" : ""}`}
												>
													<option value="">Seleccionar...</option>
													<option value="Banesco">Banesco</option>
													<option value="Banco de Venezuela">Banco de Venezuela</option>
													<option value="Mercantil">Mercantil</option>
													<option value="Provincial">Provincial</option>
													<option value="BNC">BNC</option>
													<option value="Venezuela">Venezuela</option>
													<option value="Banco del Tesoro">Banco del Tesoro</option>
													<option value="Bicentenario">Bicentenario</option>
													<option value="Otro">Otro</option>
												</select>
												{showError && <p className="text-sm text-red-500 font-medium ml-1">{errorBanco}</p>}
												<div className="absolute left-0 top-8 bottom-0 w-1 bg-brand-800 rounded-full h-8 my-auto pointer-events-none" />
											</div>
										);
									})()}

									{showReferencia && (() => {
										const soloDigitos = /^\d*$/;
										const errorReferencia = !referencia.trim()
											? "La referencia es obligatoria."
											: !soloDigitos.test(referencia)
												? "Solo se permiten números (sin letras ni espacios)."
												: referencia.trim().length < 4
													? "Mínimo 4 dígitos requeridos."
													: null;
										const showError = (touchedReferencia || attemptedSubmit) && errorReferencia;
										return (
											<div className="space-y-1.5 relative md:col-span-2">
												<label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
													Referencia
												</label>
												<input
													type="text"
													inputMode="numeric"
													pattern="[0-9]*"
													maxLength={16}
													value={referencia}
													onChange={(e) => setReferencia(e.target.value.replace(/\D/g, ""))}
													onBlur={() => setTouchedReferencia(true)}
													placeholder="Ej: 837462947163"
													className={`w-full bg-paper border border-transparent rounded-xl py-3 px-4 text-base focus:ring-2 focus:ring-brand-800/20 outline-none ${showError ? "border-red-500 bg-paper-50" : ""}`}
												/>
												{showError && <p className="text-sm text-red-500 font-medium ml-1">{errorReferencia}</p>}
												<div className="absolute left-0 top-8 bottom-0 w-1 bg-brand-800 rounded-full h-8 my-auto pointer-events-none" />
											</div>
										);
									})()}

									{!isCashTipo(tipoPagoSel) && (
										<>
											<div className="space-y-1.5 relative md:col-span-2">
												{(() => {
													let errorCedula: string | null = null;
													const { numero } = parseCedulaDisplay(cedulaPagador);
													if (!numero || !validarRangoCedula(numero)) errorCedula = MENSAJE_RANGO_CEDULA;
													const showError = (touchedCedula || attemptedSubmit) && errorCedula;
													return (
														<CedulaField
															label="Cédula del pagador*"
															value={cedulaPagador}
															onChange={(tipo, num) => setCedulaPagador(`${tipo}${num}`)}
															onBlur={() => setTouchedCedula(true)}
															error={showError ? (errorCedula || undefined) : undefined}
															required
															inputClassName={`bg-cloud border-transparent rounded-xl ${showError ? "border-red-500 bg-paper" : ""}`}
															selectClassName={`bg-cloud border-transparent rounded-xl ${showError ? "border-red-500 bg-paper" : ""}`}
														/>
													);
												})()}
												<div className="absolute left-0 top-6 bottom-0 w-1 bg-brand-800 rounded-full h-8 my-auto pointer-events-none" />
											</div>

											<div className="space-y-1.5 relative md:col-span-2">
												{(() => {
													let errorTelefono: string | null = null;
													const { number } = parseTelefonoDisplay(telefonoPagador);
													if (!validarNumeroTelefono(number)) errorTelefono = MENSAJE_TELEFONO_7_DIGITOS;
													const showError = (touchedTelefono || attemptedSubmit) && errorTelefono;
													return (
														<TelefonoField
															label="Teléfono del pagador*"
															value={telefonoPagador}
															onChange={(prefix, num) => setTelefonoPagador(`${prefix}${num}`)}
															onBlur={() => setTouchedTelefono(true)}
															error={showError ? (errorTelefono || undefined) : undefined}
															required
															inputClassName={`bg-cloud border-transparent rounded-xl ${showError ? "border-red-500 bg-red-50" : ""}`}
															selectClassName={`bg-cloud border-transparent rounded-xl ${showError ? "border-red-500 bg-red-50" : ""}`}
														/>
													);
												})()}
												<div className="absolute left-0 top-6 bottom-0 w-1 bg-brand-800 rounded-full h-8 my-auto pointer-events-none" />
											</div>
										</>
									)}

									{/* ─── CAMPO "Fecha de Pago" (NUEVA LÓGICA CRÍTICA) ─── */}
									{!isCashTipo(tipoPagoSel) && (
										<div className="space-y-1.5 relative md:col-span-2">
											<label className="text-[10px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1.5">
												<Calendar className="h-3 w-3" />
												Fecha en que realizaste la transferencia*
											</label>
											<input
												type="date"
												value={fechaPago}
												max={getTodayLocal()}
												onChange={(e) => setFechaPago(e.target.value)}
												className="w-full bg-paper border border-transparent rounded-xl py-3 px-4 text-base focus:ring-2 focus:ring-brand-800/20 outline-none text-brand-900 font-medium"
											/>
											<p className="text-[10px] text-slate-400 ml-1">
												Solo se permite hoy o fechas pasadas. El administrador verá esta fecha en el reporte.
											</p>
											<div className="absolute left-0 top-6 bottom-0 w-1 bg-brand-800 rounded-full h-8 my-auto pointer-events-none" />
										</div>
									)}
								</div>

								{/* Dropzones */}
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-brand-200/20 mt-6 min-h-[220px]">
									{showComprobante && (
										<div>
											<label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 block">
												Comprobante de pago *
											</label>
											<div
												onClick={() => comprobanteInputRef.current?.click()}
												onDragOver={(e) => { e.preventDefault(); setDragComprobanteActive(true); }}
												onDragLeave={() => setDragComprobanteActive(false)}
												onDrop={handleComprobanteDrop}
												className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer group h-full min-h-[200px] ${dragComprobanteActive
													? "border-brand-800 bg-brand-100/30"
													: comprobanteFile
														? "border-emerald-500/50 bg-emerald-50/50 text-emerald-800"
														: attemptedSubmit ? "border-red-500 bg-red-50/50 hover:bg-red-50" : "border-slate-200 bg-cloud hover:bg-brand-100/20 hover:border-brand-200"
													}`}
											>
												<input
													ref={comprobanteInputRef}
													type="file"
													accept=".jpg,.jpeg,.png"
													className="hidden"
													onChange={handleComprobanteSelect}
												/>
												<div className={`w-14 h-14 shrink-0 rounded-full flex items-center justify-center mb-4 transition-colors ${comprobanteFile ? "bg-emerald-100" : "bg-slate-100 group-hover:bg-brand-100"}`}>
													<Upload className={`h-6 w-6 ${comprobanteFile ? "text-emerald-700" : "text-slate-400 group-hover:text-brand-600"}`} />
												</div>
												{comprobanteFile ? (
													<>
														<p className="text-base font-bold text-center text-emerald-800 line-clamp-1 break-all px-2 max-w-[200px]">{comprobanteFile.name}</p>
														<p className="text-[10px] text-emerald-600/80 mt-1 font-medium select-none">
															{(comprobanteFile.size / 1024).toFixed(1)} KB — clic para cambiar
														</p>
													</>
												) : (
													<>
														<p className={`text-base font-bold text-center leading-snug select-none ${attemptedSubmit ? "text-red-600" : "text-brand-900"}`}>
															Adjunta la captura aquí
														</p>
														<p className={`text-[10px] mt-2 uppercase font-bold text-center tracking-wider select-none ${attemptedSubmit ? "text-red-500" : "text-slate-400"}`}>
															JPG o PNG (Max 5MB)
														</p>
													</>
												)}
											</div>
											{attemptedSubmit && !comprobanteFile && (
												<p className="text-sm text-red-500 font-medium text-center mt-2">Debe adjuntar el comprobante.</p>
											)}
										</div>
									)}

									<div>
										<label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 block">
											Orden Médica (Opcional)
										</label>
										<div
											onClick={() => fileInputRef.current?.click()}
											onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
											onDragLeave={() => setDragActive(false)}
											onDrop={handleFileDrop}
											className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer group h-full min-h-[200px] ${dragActive
												? "border-brand-800 bg-brand-100/30"
												: ordenFile
													? "border-brand-800/40 bg-brand-100/40 text-brand-800"
													: "border-slate-200 bg-cloud hover:bg-brand-100/20 hover:border-brand-200"
												}`}
										>
											<input
												ref={fileInputRef}
												type="file"
												accept=".pdf,.jpg,.jpeg,.png"
												className="hidden"
												onChange={handleFileSelect}
											/>
											<div className={`w-14 h-14 shrink-0 rounded-full flex items-center justify-center mb-4 transition-colors ${ordenFile ? "bg-brand-100" : "bg-slate-100 group-hover:bg-brand-100"}`}>
												<Upload className={`h-6 w-6 ${ordenFile ? "text-brand-800" : "text-slate-400 group-hover:text-brand-600"}`} />
											</div>
											{ordenFile ? (
												<>
													<p className="text-base font-bold text-center line-clamp-1 break-all px-2 max-w-[200px] text-brand-900">{ordenFile.name}</p>
													<p className="text-[10px] text-brand-600/80 mt-1 font-medium select-none">
														{(ordenFile.size / 1024).toFixed(1)} KB — clic para cambiar
													</p>
												</>
											) : (
												<>
													<p className="text-base font-bold text-brand-900 text-center leading-snug select-none">
														Adjunta tu archivo aquí
													</p>
													<p className="text-[10px] text-slate-400 mt-2 uppercase font-bold text-center tracking-wider select-none">
														PDF, JPG o PNG (Max 5MB)
													</p>
												</>
											)}
										</div>
									</div>
								</div>

								{/* ─── Toggle Guardar Cuenta ─── */}
								{!isCashTipo(tipoPagoSel) && (
									<div className="pt-4 border-t border-brand-200/20">
										<div
											className={`flex items-center gap-4 p-4 rounded-2xl transition-colors cursor-pointer ${guardarCuenta ? "bg-brand-100/20 border border-gray-100" : "bg-cloud border border-slate-100"}`}
											onClick={() => setGuardarCuenta(!guardarCuenta)}
										>
											<div className="shrink-0">
												{guardarCuenta
													? <ToggleRight className="h-7 w-7 text-teal-700" />
													: <ToggleLeft className="h-7 w-7 text-slate-400" />}
											</div>
											<div className="flex-1">
												<p className={`text-base font-bold ${guardarCuenta ? "text-teal-800" : "text-slate-600"}`}>
													Guardar datos de mi cuenta para futuros pagos
												</p>
												<p className="text-sm text-slate-400 mt-0.5">
													Banco, cédula y teléfono se guardarán de forma segura
												</p>
											</div>
										</div>

										{/* Alias opcional (solo si toggle activo) */}
										{guardarCuenta && (
											<div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
												<label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">
													Alias opcional (Ej: "Mi Pago Móvil principal")
												</label>
												<input
													type="text"
													maxLength={80}
													value={aliasCuenta}
													onChange={(e) => setAliasCuenta(e.target.value)}
													placeholder="Ej: Mi Pago Móvil principal"
													className="w-full bg-paper-500 border border-teal-800 rounded-xl py-2.5 px-4 text-base focus:ring-2 focus:ring-brand-100 outline-none text-teal-900 placeholder:text-black-300"
												/>
											</div>
										)}
									</div>
								)}

								{/* Error message */}
								{errorMsg && (
									<div className="pt-2 pb-1">
										<p className="text-base font-bold text-red-500 text-center">{errorMsg}</p>
									</div>
								)}

								{/* Submit button */}
								<div className="pt-6">
									<button
										type="submit"
										disabled={isSubmitting || (!selectedMetodo && !attemptedSubmit)}
										className="w-full bg-gradient-to-br from-brand-900 to-brand-800 text-white py-4 px-6 rounded-2xl font-extrabold text-lg shadow-xl shadow-brand-800/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:hover:scale-100 disabled:active:scale-100 disabled:cursor-not-allowed"
									>
										{isSubmitting ? (
											<>
												<Loader2 className="h-5 w-5 animate-spin" />
												Procesando...
											</>
										) : (
											<>
												<CheckCircle2 className="h-5 w-5" />
												Confirmar y Finalizar Cita
											</>
										)}
									</button>
									<p className="text-center text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-widest">
										El pago será verificado por un administrador antes de confirmar tu cita
									</p>
								</div>
							</form>
						</div>
					)}
				</div>

				{/* LADO DERECHO (Resumen de la cita) */}
				<div className="order-1 lg:order-2 lg:col-span-5 lg:sticky lg:top-8">
					<div className="bg-paper rounded-3xl p-8 shadow-[0_4px_24px_rgba(5,69,66,0.06)] border border-brand-200/20">
						<div className="flex justify-between items-center mb-6">
							<h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
								Resumen de la Cita
							</h3>
							<div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
								<ScanHeart className="h-5 w-5 text-brand-800" />
							</div>
						</div>
						<p className="text-xl font-bold text-brand-900 font-headline tracking-tight mb-3">
							{ecoNombre}
						</p>
						<div className="flex items-center gap-4 mb-6">
							<div className="flex items-center gap-1.5 text-brand-600">
								<Calendar className="h-4 w-4" />
								<span className="text-sm font-medium">{formatFecha(fecha)}</span>
							</div>
							<div className="flex items-center gap-1.5 text-brand-600">
								<Clock className="h-4 w-4" />
								<span className="text-sm font-medium">{formatHora(hora)}</span>
							</div>
						</div>
						<div className="flex items-center gap-2 mb-6">
							<User className="h-4 w-4 text-brand-600 shrink-0" />
							<span className="text-sm text-brand-600 truncate">
								Dr./Dra. {especialistaNombre}
							</span>
						</div>

						<div className="space-y-3 pt-6 border-t border-brand-200/30">
							<div className="hidden flex justify-between items-center">
								<span className="text-base text-slate-400">Precio Ecografía</span>
								<span className="text-base font-semibold text-brand-900">${precioUSD.toFixed(2)}</span>
							</div>
							{vistaBs && selectedMetodoId && (
								<div className="hidden flex justify-between items-center bg-slate-50 p-2 -mx-2 rounded-lg">
									<span className="text-base text-slate-400">Tasa BCV</span>
									<span className="text-base font-semibold text-brand-600">{tasaBCV.toFixed(2)} Bs/USD</span>
								</div>
							)}
							<div className="mt-4 p-5 rounded-2xl bg-cloud border border-brand-200/40 flex items-center justify-between">
								<div>
									<span className="text-[10px] font-bold text-brand-800 uppercase tracking-widest">
										Total a Pagar
									</span>
									<p className="text-[11px] font-medium text-slate-400 mt-0.5">
										{vistaBs ? "Pago en bolívares" : "Pago en dólares"}
									</p>
								</div>
								<span className="text-2xl font-black text-brand-900 font-headline">
									{vistaBs
										? `${montoEnviar.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`
										: `$${montoEnviar.toFixed(2)}`}
								</span>
							</div>
						</div>
					</div>

					{/* Back button under the summary block to ensure mobile doesn't skip it */}
					<div className="flex items-center justify-start mt-6 w-full opacity-70 hover:opacity-100 transition-opacity">
						<button
							type="button"
							onClick={onBack}
							className="flex w-full items-center justify-center gap-2 text-brand-700 font-bold hover:text-brand-900 transition-colors py-3 rounded-xl text-base border border-transparent hover:border-brand-200 hover:shadow-sm hover:bg-white"
						>
							<ArrowLeft className="h-4 w-4" />
							<span className="font-headline tracking-tight">Volver al paso anterior</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PasoCheckout;
