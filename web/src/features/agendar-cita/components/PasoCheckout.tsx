import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from "react";
import {
	ArrowLeft,
	ArrowRight,
	Upload,
	Calendar,
	Clock,
	ScanHeart,
	User,
	CheckCircle2,
	Copy,
	Loader2,
	CreditCard,
} from "lucide-react";
import { useGetEcosQuery } from "../../ecos/ecosApi";
import { useGetDolarOficialQuery } from "../../dolar";
import { useAsignarCitaMutation, useUploadOrdenMedicaMutation } from "../../citas/citasApi";
import { useGetMetodosPagoDisponiblesQuery } from "../../metodos-pago/metodosPagoApi";
import { useAuth } from "../../../shared";

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

	// Form state
	const [bancoOrigen, setBancoOrigen] = useState("");
	const [referencia, setReferencia] = useState("");
	const [cedulaPagador, setCedulaPagador] = useState("");
	const [telefonoPagador, setTelefonoPagador] = useState("");

	// File upload
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [ordenFile, setOrdenFile] = useState<File | null>(null);
	const [dragActive, setDragActive] = useState(false);

	// Result
	const [success, setSuccess] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setErrorMsg(null);

		if (!user?.id_usuario) {
			setErrorMsg("Sesión expirada. Vuelva a iniciar sesión.");
			return;
		}
		if (!selectedMetodo) {
			setErrorMsg("Seleccione un método de pago.");
			return;
		}
		if (!referencia.trim()) {
			setErrorMsg("La referencia de pago es obligatoria.");
			return;
		}
		if (!cedulaPagador.trim()) {
			setErrorMsg("La cédula del pagador es obligatoria.");
			return;
		}
		if (!telefonoPagador.trim()) {
			setErrorMsg("El teléfono del pagador es obligatorio.");
			return;
		}
		if (!bancoOrigen.trim()) {
			setErrorMsg("Seleccione el banco origen.");
			return;
		}

		// Resolve banco_destino & metodo from the selected payment method
		const bancoDestino = `${selectedMetodo.banco_nombre} (${selectedMetodo.banco_codigo})`;
		const metodo = selectedMetodo.tipo_pago as "PagoMovil" | "Transferencia";

		try {
			// 1. Upload medical order if provided
			let ordenUrl: string | undefined;
			if (ordenFile) {
				const formData = new FormData();
				formData.append("orden", ordenFile);
				const uploadResult = await uploadOrden(formData).unwrap();
				ordenUrl = uploadResult.url;
			}

			// 2. Create cita with payment (estado_pago = 0 on backend)
			await asignarCita({
				id_paciente: user.id_usuario,
				id_representado: idRepresentado,
				id_eco: idEco,
				id_especialista: idEspecialista,
				id_disponibilidad: idDisponibilidad,
				orden_medica: ordenUrl,
				metodo,
				banco_origen: bancoOrigen,
				banco_destino: bancoDestino,
				monto: precioBS,
				cedula_pagador: cedulaPagador,
				telefono_pagador: telefonoPagador,
				referencia: referencia.trim(),
			}).unwrap();

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
	const displayQrUrl = selectedMetodo?.imagen_url || null;
	const displayTipo = selectedMetodo?.tipo_pago === "PagoMovil" ? "Pago Móvil" : "Transferencia";

	/* ─── SUCCESS STATE ─── */
	if (success) {
		return (
			<div className="text-center py-20">
				<div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
					<CheckCircle2 className="h-10 w-10 text-emerald-600" />
				</div>
				<h2 className="font-headline text-3xl font-extrabold text-brand-900 mb-3">
					¡Cita Agendada Exitosamente!
				</h2>
				<p className="text-brand-600 text-base max-w-md mx-auto mb-2">
					Tu cita para <span className="font-bold">{ecoNombre}</span> ha sido registrada.
				</p>
				<p className="text-sm text-slate-400 mb-8">
					{formatFecha(fecha)} — {formatHora(hora)} con Dr./Dra. {especialistaNombre}
				</p>
				<p className="text-xs text-brand-600 bg-brand-100 px-4 py-2 rounded-full inline-block mb-8">
					Tu pago será verificado por un administrador. Recibirás confirmación por notificación.
				</p>
				<a
					href="/agendar-cita"
					className="inline-flex items-center gap-2 bg-brand-800 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-brand-900 transition-colors"
				>
					Volver al inicio
				</a>
			</div>
		);
	}

	/* ─── MAIN FORM ─── */
	return (
		<div>
			{/* Header */}
			<div className="mb-8 lg:mb-10 text-center lg:text-left">
				<h2 className="font-headline text-3xl lg:text-4xl font-extrabold text-brand-900 tracking-tight">
					Checkout y Pago
				</h2>
				<p className="text-brand-600 mt-2 text-sm lg:text-base">
					Paso 4 de 4: Confirma los detalles y procesa tu pago
				</p>
			</div>

			{/* Grid: Summary (left) + Form (right) */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
				{/* LEFT: Dynamic Payment Info + Summary */}
				<div className="lg:col-span-5 space-y-6">
					{/* Dynamic Payment Method Card */}
					<div className="bg-paper rounded-3xl p-8 shadow-sm border border-brand-200/20 flex flex-col items-center">
						<h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
							{selectedMetodo ? `Datos para ${displayTipo}` : "Datos de Pago"}
						</h3>

						{/* QR Code / Image */}
						<div className="w-full flex justify-center mb-6">
							{displayQrUrl ? (
								<img
									src={displayQrUrl}
									alt="Código QR de pago"
									className="w-40 h-40 rounded-2xl object-contain border border-brand-200/20 bg-white p-2"
								/>
							) : (
								<div className="w-40 h-40 rounded-2xl bg-cloud border-2 border-dashed border-brand-200/30 flex flex-col items-center justify-center">
									<CreditCard className="h-10 w-10 text-brand-300 mb-2" />
									<span className="text-[10px] text-slate-400 font-bold uppercase">Sin QR</span>
								</div>
							)}
						</div>

						<div className="w-full space-y-3">
							{/* Banco */}
							<div className="flex items-center justify-between p-4 bg-cloud rounded-2xl">
								<div className="min-w-0 flex-1">
									<p className="text-[10px] text-slate-400 font-bold uppercase">Banco Destino</p>
									<p className="font-bold text-brand-900 text-sm truncate">{displayBanco}</p>
								</div>
							</div>

							{/* Identificación / RIF */}
							<div className="flex items-center justify-between p-4 bg-cloud rounded-2xl">
								<div className="min-w-0 flex-1">
									<p className="text-[10px] text-slate-400 font-bold uppercase">RIF / Cédula</p>
									<p className="font-bold text-brand-900 text-sm">{displayIdentificacion}</p>
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

							{/* Teléfono (for PagoMovil) */}
							{displayTelefono !== "—" && (
								<div className="flex items-center justify-between p-4 bg-cloud rounded-2xl">
									<div className="min-w-0 flex-1">
										<p className="text-[10px] text-slate-400 font-bold uppercase">Teléfono</p>
										<p className="font-bold text-brand-900 text-sm">{displayTelefono}</p>
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

							{/* Cuenta (for Transferencia) */}
							{displayCuenta && (
								<div className="flex items-center justify-between p-4 bg-cloud rounded-2xl">
									<div className="min-w-0 flex-1">
										<p className="text-[10px] text-slate-400 font-bold uppercase">Nro. Cuenta</p>
										<p className="font-bold text-brand-900 text-sm font-mono tracking-wide">{displayCuenta}</p>
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
						</div>
					</div>

					{/* Appointment Summary */}
					<div className="bg-paper rounded-3xl p-8 shadow-sm border border-brand-200/20">
						<div className="flex justify-between items-center mb-6">
							<h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
								Resumen de la Cita
							</h3>
							<div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
								<ScanHeart className="h-5 w-5 text-brand-800" />
							</div>
						</div>
						<p className="text-xl font-bold text-brand-900 font-headline tracking-tight mb-3">
							{ecoNombre}
						</p>
						<div className="flex items-center gap-4 mb-6">
							<div className="flex items-center gap-1.5 text-brand-600">
								<Calendar className="h-4 w-4" />
								<span className="text-xs font-medium">{formatFecha(fecha)}</span>
							</div>
							<div className="flex items-center gap-1.5 text-brand-600">
								<Clock className="h-4 w-4" />
								<span className="text-xs font-medium">{formatHora(hora)}</span>
							</div>
						</div>
						<div className="flex items-center gap-2 mb-6">
							<User className="h-4 w-4 text-brand-600" />
							<span className="text-xs text-brand-600">
								Dr./Dra. {especialistaNombre}
							</span>
						</div>

						{/* Price breakdown */}
						<div className="space-y-3 pt-6 border-t border-brand-200/20">
							<div className="flex justify-between items-center">
								<span className="text-sm text-slate-400">Precio Ecografía</span>
								<span className="text-sm font-semibold text-brand-900">${precioUSD.toFixed(2)}</span>
							</div>
							<div className="flex justify-between items-center">
								<span className="text-sm text-slate-400">Tasa BCV</span>
								<span className="text-sm font-semibold text-brand-600">{tasaBCV.toFixed(2)} Bs/USD</span>
							</div>
							<div className="mt-4 p-5 rounded-2xl bg-cloud border border-brand-200/20 flex items-center justify-between">
								<div>
									<span className="text-[10px] font-bold text-brand-800 uppercase tracking-widest">
										Total a Pagar
									</span>
									<p className="text-xs text-slate-400">Pago en bolívares</p>
								</div>
								<span className="text-2xl font-black text-brand-900 font-headline">
									{precioBS.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* RIGHT: Payment Form */}
				<div className="lg:col-span-7">
					<div className="bg-paper rounded-3xl p-8 lg:p-10 shadow-sm border border-brand-200/20">
						<h3 className="text-xl font-bold text-brand-900 mb-8 flex items-center gap-3 font-headline">
							<ArrowRight className="h-5 w-5 text-brand-800" />
							Información de Pago
						</h3>

						<form onSubmit={handleSubmit} className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
								{/* Método de pago (DYNAMIC from DB) */}
								<div className="space-y-1.5 relative">
									<label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
										Método de pago
									</label>
									<select
										value={selectedMetodoId}
										onChange={(e) => setSelectedMetodoId(e.target.value)}
										className="w-full bg-cloud border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-brand-800/20 appearance-none"
									>
										{metodosPago.length === 0 && (
											<option value="">Cargando...</option>
										)}
										{metodosPago.map((m) => (
											<option key={m.id_metodo_pago} value={m.id_metodo_pago}>
												{m.nombre} — {m.tipo_pago === "PagoMovil" ? "Pago Móvil" : "Transferencia"}
											</option>
										))}
									</select>
									<div className="absolute left-0 top-6 bottom-0 w-1 bg-brand-800 rounded-full h-8 my-auto" />
								</div>

								{/* Tasa */}
								<div className="space-y-1.5">
									<label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
										Tasa del día (BCV)
									</label>
									<input
										type="text"
										readOnly
										value={`${tasaBCV.toFixed(2)} Bs/USD`}
										className="w-full bg-cloud border-none rounded-xl py-3 px-4 text-sm font-bold text-brand-800"
									/>
								</div>

								{/* Banco Origen */}
								<div className="space-y-1.5 relative">
									<label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
										Banco Origen
									</label>
									<select
										value={bancoOrigen}
										onChange={(e) => setBancoOrigen(e.target.value)}
										className="w-full bg-cloud border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-brand-800/20"
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
									<div className="absolute left-0 top-6 bottom-0 w-1 bg-brand-800 rounded-full h-8 my-auto" />
								</div>

								{/* Banco Destino (read-only, from selected method) */}
								<div className="space-y-1.5">
									<label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
										Banco Destino
									</label>
									<input
										type="text"
										readOnly
										value={displayBanco}
										className="w-full bg-cloud border-none rounded-xl py-3 px-4 text-sm font-bold text-brand-800"
									/>
								</div>

								{/* Monto BS (auto-calculated, read-only) */}
								<div className="space-y-1.5 relative">
									<label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
										Monto en Bs
									</label>
									<input
										type="text"
										readOnly
										value={precioBS.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
										className="w-full bg-cloud border-none rounded-xl py-3 px-4 text-sm font-bold text-brand-900"
									/>
								</div>

								{/* Referencia */}
								<div className="space-y-1.5 relative">
									<label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
										Referencia (Últimos 16 dígitos)
									</label>
									<input
										type="text"
										maxLength={16}
										value={referencia}
										onChange={(e) => setReferencia(e.target.value)}
										placeholder="Ej: 837462947163"
										className="w-full bg-cloud border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-brand-800/20"
									/>
									<div className="absolute left-0 top-6 bottom-0 w-1 bg-brand-800 rounded-full h-8 my-auto" />
								</div>

								{/* Cédula */}
								<div className="space-y-1.5 relative">
									<label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
										Cédula del pagador
									</label>
									<input
										type="text"
										value={cedulaPagador}
										onChange={(e) => setCedulaPagador(e.target.value)}
										placeholder="V-00.000.000"
										className="w-full bg-cloud border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-brand-800/20"
									/>
									<div className="absolute left-0 top-6 bottom-0 w-1 bg-brand-800 rounded-full h-8 my-auto" />
								</div>

								{/* Teléfono */}
								<div className="space-y-1.5 relative">
									<label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
										Teléfono del pagador
									</label>
									<input
										type="text"
										value={telefonoPagador}
										onChange={(e) => setTelefonoPagador(e.target.value)}
										placeholder="0412-0000000"
										className="w-full bg-cloud border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-brand-800/20"
									/>
									<div className="absolute left-0 top-6 bottom-0 w-1 bg-brand-800 rounded-full h-8 my-auto" />
								</div>
							</div>

							{/* File Dropzone */}
							<div className="pt-4">
								<label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 block">
									Orden Médica (Opcional)
								</label>
								<div
									onClick={() => fileInputRef.current?.click()}
									onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
									onDragLeave={() => setDragActive(false)}
									onDrop={handleFileDrop}
									className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer group ${dragActive
										? "border-brand-800 bg-brand-100/30"
										: ordenFile
											? "border-brand-800/30 bg-brand-100/20"
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
									<div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors ${ordenFile ? "bg-brand-100" : "bg-slate-100 group-hover:bg-brand-100"}`}>
										<Upload className={`h-6 w-6 ${ordenFile ? "text-brand-800" : "text-slate-400 group-hover:text-brand-600"}`} />
									</div>
									{ordenFile ? (
										<>
											<p className="text-sm font-bold text-brand-900">{ordenFile.name}</p>
											<p className="text-[10px] text-brand-600 mt-1">
												{(ordenFile.size / 1024).toFixed(1)} KB — clic para cambiar
											</p>
										</>
									) : (
										<>
											<p className="text-sm font-bold text-brand-900">
												Haz clic o arrastra tu archivo aquí
											</p>
											<p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">
												PDF, JPG o PNG (Max 5MB)
											</p>
										</>
									)}
								</div>
							</div>

							{/* Error message */}
							{errorMsg && (
								<div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
									{errorMsg}
								</div>
							)}

							{/* Submit button */}
							<div className="pt-6">
								<button
									type="submit"
									disabled={isSubmitting || metodosPago.length === 0}
									className="w-full bg-gradient-to-br from-brand-900 to-brand-800 text-white py-4 px-6 rounded-2xl font-extrabold text-lg shadow-xl shadow-brand-800/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:hover:scale-100"
								>
									{isSubmitting ? (
										<>
											<Loader2 className="h-5 w-5 animate-spin" />
											Procesando...
										</>
									) : (
										<>
											<CheckCircle2 className="h-5 w-5" />
											Confirmar y Finalizar
										</>
									)}
								</button>
								<p className="text-center text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-widest">
									El pago será verificado por un administrador antes de confirmar tu cita
								</p>
							</div>
						</form>
					</div>
				</div>
			</div>

			{/* Back button */}
			<div className="flex items-center justify-start mt-8 pb-6">
				<button
					type="button"
					onClick={onBack}
					className="flex items-center gap-2 text-slate-400 font-bold hover:text-brand-900 transition-colors px-6 py-3 rounded-xl text-sm"
				>
					<ArrowLeft className="h-4 w-4" />
					<span className="font-headline tracking-tight">Volver</span>
				</button>
			</div>
		</div>
	);
};

export default PasoCheckout;
