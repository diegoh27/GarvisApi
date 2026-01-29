import { useState, useRef, useEffect, useMemo } from "react";
import { AlertTriangle, X, Image as ImageIcon, Search, ChevronDown } from "lucide-react";
import { useGetDolarOficialQuery } from "../../features/dolar/dolarApi";
import imageCompression from "browser-image-compression";
import Swal from "sweetalert2";
import { getToken } from "../utils/token";
import {
	BANCOS_VENEZUELA,
	CEDULA_PREFIXES,
	TELEFONO_PREFIXES,
} from "../../data/bancosVenezuela";

export type PagoFormData = {
	metodo: "Transferencia" | "PagoMovil";
	imagen: string; // URL de la imagen subida
	orden_medica: string; // URL de la orden médica subida
	banco_origen: string;
	banco_destino: string;
	monto: string;
	cedula_pagador: string;
	telefono_pagador: string;
	referencia: string;
};

type FormularioPagoProps = {
	precioEcoUSD: number | null; // Precio del eco en USD
	onChange: (data: PagoFormData) => void;
	initialData?: Partial<PagoFormData>;
	isLoading?: boolean;
	disabled?: boolean;
	autoUpload?: boolean; // Si es true, sube automáticamente. Si es false, espera a que se llame uploadImageManual
	onImageReady?: (file: File) => void; // Callback cuando la imagen está comprimida y lista para subir
	onOrdenMedicaReady?: (file: File) => void; // Callback cuando la orden médica está comprimida y lista para subir
};

const FormularioPago = ({
	precioEcoUSD,
	onChange,
	initialData,
	isLoading = false,
	disabled = false,
	autoUpload = true, // Por defecto sube automáticamente
	onImageReady,
	onOrdenMedicaReady,
}: FormularioPagoProps) => {
	const [formData, setFormData] = useState<PagoFormData>({
		metodo: initialData?.metodo || "Transferencia",
		imagen: initialData?.imagen || "",
		orden_medica: initialData?.orden_medica || "",
		banco_origen: initialData?.banco_origen || "",
		banco_destino: initialData?.banco_destino || "",
		monto: initialData?.monto || "",
		cedula_pagador: initialData?.cedula_pagador || "",
		telefono_pagador: initialData?.telefono_pagador || "",
		referencia: initialData?.referencia || "",
	});

	const [montoWarning, setMontoWarning] = useState(false);
	const [uploadingImage, setUploadingImage] = useState(false);
	const [uploadingOrdenMedica, setUploadingOrdenMedica] = useState(false);
	const [selectedImage, setSelectedImage] = useState<File | null>(null);
	const [selectedOrdenMedica, setSelectedOrdenMedica] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [ordenMedicaPreview, setOrdenMedicaPreview] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const ordenMedicaInputRef = useRef<HTMLInputElement>(null);
	const bancoOrigenRef = useRef<HTMLDivElement>(null);
	const bancoDestinoRef = useRef<HTMLDivElement>(null);

	const { data: dolarOficial, isLoading: loadingDolar } = useGetDolarOficialQuery();

	// Bancos filtrados por método: TRF = Transferencia, P2P = Pago móvil
	const bancosPorMetodo = useMemo(() => {
		if (formData.metodo === "Transferencia") {
			return BANCOS_VENEZUELA.filter((b) => b.Services.includes("TRF"));
		}
		return BANCOS_VENEZUELA.filter((b) => b.Services.includes("P2P"));
	}, [formData.metodo]);

	// Búsqueda en bancos (origen y destino)
	const [bancoOrigenSearch, setBancoOrigenSearch] = useState("");
	const [bancoDestinoSearch, setBancoDestinoSearch] = useState("");
	const [bancoOrigenOpen, setBancoOrigenOpen] = useState(false);
	const [bancoDestinoOpen, setBancoDestinoOpen] = useState(false);

	const bancosOrigenFiltrados = useMemo(() => {
		const q = bancoOrigenSearch.trim().toLowerCase();
		if (!q) return bancosPorMetodo;
		return bancosPorMetodo.filter(
			(b) =>
				b.Code.toLowerCase().includes(q) ||
				b.Name.toLowerCase().includes(q)
		);
	}, [bancosPorMetodo, bancoOrigenSearch]);

	const bancosDestinoFiltrados = useMemo(() => {
		const q = bancoDestinoSearch.trim().toLowerCase();
		if (!q) return bancosPorMetodo;
		return bancosPorMetodo.filter(
			(b) =>
				b.Code.toLowerCase().includes(q) ||
				b.Name.toLowerCase().includes(q)
		);
	}, [bancosPorMetodo, bancoDestinoSearch]);

	const bancoLabel = (code: string, name: string) => `${code} - ${name}`;

	// Parsear cédula "V-12345678" -> { prefix: "V", number: "12345678" }
	const parseCedula = (s: string): { prefix: string; number: string } => {
		const m = s.match(/^([VJEPG])-?(\d*)$/i);
		if (m) return { prefix: m[1].toUpperCase(), number: m[2] };
		return { prefix: "V", number: s.replace(/^[VJEPG]-?/i, "").replace(/\D/g, "").slice(0, 8) };
	};

	// Parsear teléfono "04121234567" -> { prefix: "0412", number: "1234567" }
	const parseTelefono = (s: string): { prefix: string; number: string } => {
		for (const p of TELEFONO_PREFIXES) {
			if (s.startsWith(p)) return { prefix: p, number: s.slice(p.length).replace(/\D/g, "").slice(0, 7) };
		}
		const digits = s.replace(/\D/g, "").slice(0, 11);
		const pref = TELEFONO_PREFIXES.find((p) => digits.startsWith(p)) || "0412";
		return { prefix: pref, number: digits.slice(pref.length).slice(0, 7) };
	};

	// Cerrar dropdowns de banco al hacer clic fuera
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (bancoOrigenRef.current && !bancoOrigenRef.current.contains(e.target as Node)) setBancoOrigenOpen(false);
			if (bancoDestinoRef.current && !bancoDestinoRef.current.contains(e.target as Node)) setBancoDestinoOpen(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Al cambiar método de pago, limpiar bancos si el valor actual no aplica
	useEffect(() => {
		const opts = bancosPorMetodo.map((b) => bancoLabel(b.Code, b.Name));
		setFormData((prev) => {
			let next = { ...prev };
			if (prev.banco_origen && !opts.includes(prev.banco_origen)) {
				next = { ...next, banco_origen: "" };
			}
			if (prev.banco_destino && !opts.includes(prev.banco_destino)) {
				next = { ...next, banco_destino: "" };
			}
			return next;
		});
	}, [formData.metodo]);

	// Calcular monto en Bs basado en precio del eco en USD y tasa del BCV
	const montoCalculado = precioEcoUSD && dolarOficial
		? Math.round((precioEcoUSD * dolarOficial.promedio) * 100) / 100
		: null;

	// Autocompletar monto cuando cambia el precio del eco o la tasa del BCV
	useEffect(() => {
		if (precioEcoUSD && dolarOficial && !montoWarning && montoCalculado !== null) {
			setFormData((prev) => ({
				...prev,
				monto: montoCalculado.toString(),
			}));
		}
	}, [precioEcoUSD, dolarOficial, montoCalculado, montoWarning]);

	// Detectar si el monto fue modificado manualmente
	useEffect(() => {
		if (precioEcoUSD && montoCalculado !== null) {
			const montoActual = parseFloat(formData.monto) || 0;
			const diferencia = Math.abs(montoActual - montoCalculado);
			if (diferencia > 0.01) {
				setMontoWarning(true);
			} else {
				setMontoWarning(false);
			}
		} else {
			setMontoWarning(false);
		}
	}, [formData.monto, precioEcoUSD, montoCalculado]);

	// Notificar cambios al componente padre
	useEffect(() => {
		onChange(formData);
	}, [formData, onChange]);

	// Manejar selección de archivo
	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validar tipo de archivo
		if (!file.type.startsWith("image/")) {
			Swal.fire({
				icon: "error",
				title: "Tipo de archivo no válido",
				text: "Solo se permiten imágenes (JPEG, PNG, WEBP).",
			});
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
			return;
		}

		// Validar tamaño original (máximo 2MB antes de comprimir)
		const maxSizeOriginal = 2 * 1024 * 1024; // 2MB
		if (file.size > maxSizeOriginal) {
			Swal.fire({
				icon: "error",
				title: "Archivo muy grande",
				text: `El tamaño máximo es 2MB. Tamaño actual: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
			});
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
			return;
		}

		// Comprimir imagen antes de subir
		try {
			setUploadingImage(true);

			const options = {
				maxSizeMB: 0.15, // Objetivo: máximo 150KB (entre 100-200KB)
				maxWidthOrHeight: 1920, // Redimensionar si es muy grande
				useWebWorker: true, // Usar Web Workers para no bloquear la UI
				fileType: "image/jpeg", // Convertir a JPEG (más pequeño que PNG)
				quality: 0.75, // Calidad 75% (mantiene legibilidad del texto)
			};

			const compressedFile = await imageCompression(file, options);

			// Mostrar información de compresión
			const originalSize = (file.size / 1024).toFixed(0);
			const compressedSize = (compressedFile.size / 1024).toFixed(0);
			const reduction = ((1 - compressedFile.size / file.size) * 100).toFixed(0);

			console.log(`Imagen comprimida: ${originalSize}KB → ${compressedSize}KB (${reduction}% reducción)`);

			setSelectedImage(compressedFile);
			setImagePreview(URL.createObjectURL(compressedFile));

			// Notificar al padre que la imagen está lista
			if (onImageReady) {
				onImageReady(compressedFile);
			}

			// Subir imagen comprimida solo si autoUpload está activado
			if (autoUpload) {
				await uploadImage(compressedFile);
			}
		} catch (error: any) {
			console.error("Error al comprimir imagen:", error);
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error.message || "No se pudo comprimir la imagen",
			});
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		} finally {
			setUploadingImage(false);
		}
	};

	// Manejar selección de orden médica
	const handleOrdenMedicaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validar tipo de archivo
		if (!file.type.startsWith("image/")) {
			Swal.fire({
				icon: "error",
				title: "Tipo de archivo no válido",
				text: "Solo se permiten imágenes (JPEG, PNG, WEBP).",
			});
			if (ordenMedicaInputRef.current) {
				ordenMedicaInputRef.current.value = "";
			}
			return;
		}

		// Validar tamaño original (máximo 2MB antes de comprimir)
		const maxSizeOriginal = 2 * 1024 * 1024; // 2MB
		if (file.size > maxSizeOriginal) {
			Swal.fire({
				icon: "error",
				title: "Archivo muy grande",
				text: `El tamaño máximo es 2MB. Tamaño actual: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
			});
			if (ordenMedicaInputRef.current) {
				ordenMedicaInputRef.current.value = "";
			}
			return;
		}

		// Comprimir imagen antes de subir
		try {
			setUploadingOrdenMedica(true);

			const options = {
				maxSizeMB: 0.15, // Objetivo: máximo 150KB (entre 100-200KB)
				maxWidthOrHeight: 1920, // Redimensionar si es muy grande
				useWebWorker: true, // Usar Web Workers para no bloquear la UI
				fileType: "image/jpeg", // Convertir a JPEG (más pequeño que PNG)
				quality: 0.75, // Calidad 75% (mantiene legibilidad del texto)
			};

			const compressedFile = await imageCompression(file, options);

			// Mostrar información de compresión
			const originalSize = (file.size / 1024).toFixed(0);
			const compressedSize = (compressedFile.size / 1024).toFixed(0);
			const reduction = ((1 - compressedFile.size / file.size) * 100).toFixed(0);

			console.log(`Orden médica comprimida: ${originalSize}KB → ${compressedSize}KB (${reduction}% reducción)`);

			setSelectedOrdenMedica(compressedFile);
			setOrdenMedicaPreview(URL.createObjectURL(compressedFile));

			// Notificar al padre que la orden médica está lista
			if (onOrdenMedicaReady) {
				onOrdenMedicaReady(compressedFile);
			}

			// Subir orden médica comprimida solo si autoUpload está activado
			if (autoUpload) {
				await uploadOrdenMedica(compressedFile);
			}
		} catch (error: any) {
			console.error("Error al comprimir orden médica:", error);
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error.message || "No se pudo comprimir la orden médica",
			});
			if (ordenMedicaInputRef.current) {
				ordenMedicaInputRef.current.value = "";
			}
		} finally {
			setUploadingOrdenMedica(false);
		}
	};

	// Subir imagen a Cloudinary
	const uploadImage = async (file: File) => {
		try {
			const token = getToken();
			const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

			const formData = new FormData();
			formData.append("comprobante", file);

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
			setFormData((prev) => ({
				...prev,
				imagen: data.data.url,
			}));

			Swal.fire({
				icon: "success",
				title: "Comprobante subido",
				text: "El comprobante se ha subido correctamente",
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (error: any) {
			console.error("Error al subir imagen:", error);
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error.message || "No se pudo subir el comprobante",
			});
		}
	};

	// Subir orden médica a Cloudinary
	const uploadOrdenMedica = async (file: File) => {
		try {
			const token = getToken();
			const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

			const formData = new FormData();
			formData.append("orden_medica", file);

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
			setFormData((prev) => ({
				...prev,
				orden_medica: data.data.url,
			}));

			Swal.fire({
				icon: "success",
				title: "Orden médica subida",
				text: "La orden médica se ha subido correctamente",
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (error: any) {
			console.error("Error al subir orden médica:", error);
			Swal.fire({
				icon: "error",
				title: "Error",
				text: error.message || "No se pudo subir la orden médica",
			});
			setSelectedOrdenMedica(null);
			setOrdenMedicaPreview(null);
			if (ordenMedicaInputRef.current) {
				ordenMedicaInputRef.current.value = "";
			}
		}
	};

	// Eliminar orden médica seleccionada
	const removeOrdenMedica = () => {
		if (ordenMedicaPreview) {
			URL.revokeObjectURL(ordenMedicaPreview);
		}
		setSelectedOrdenMedica(null);
		setOrdenMedicaPreview(null);
		setFormData((prev) => ({
			...prev,
			orden_medica: "",
		}));
		if (ordenMedicaInputRef.current) {
			ordenMedicaInputRef.current.value = "";
		}
	};

	// Limpiar preview de orden médica cuando se desmonte
	useEffect(() => {
		return () => {
			if (ordenMedicaPreview) {
				URL.revokeObjectURL(ordenMedicaPreview);
			}
		};
	}, [ordenMedicaPreview]);

	// Eliminar imagen seleccionada
	const removeImage = () => {
		if (imagePreview) {
			URL.revokeObjectURL(imagePreview);
		}
		setSelectedImage(null);
		setImagePreview(null);
		setFormData((prev) => ({
			...prev,
			imagen: "",
		}));
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	// Limpiar preview cuando se desmonte
	useEffect(() => {
		return () => {
			if (imagePreview) {
				URL.revokeObjectURL(imagePreview);
			}
		};
	}, [imagePreview]);

	const formatFileSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	};

	return (
		<div className="space-y-4">
			{/* Warning si el monto fue modificado */}
			{montoWarning && (
				<div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 flex items-start gap-2">
					<AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
					<p className="text-sm text-yellow-800">
						<strong>Advertencia:</strong> El monto en Bs ha sido modificado manualmente. Por favor verifique que el monto de la cita sea correcto según el precio del eco en USD y la tasa del BCV actual.
					</p>
				</div>
			)}

			{/* Método de pago */}
			<div>
				<label className="block text-sm font-medium text-brand-900 mb-1">
					Método de pago *
				</label>
				<select
					value={formData.metodo}
					onChange={(e) =>
						setFormData((prev) => ({
							...prev,
							metodo: e.target.value as "Transferencia" | "PagoMovil",
						}))
					}
					className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-sm text-brand-900 focus:border-brand-500 focus:outline-none"
					disabled={isLoading || disabled}
				>
					<option value="Transferencia">Transferencia</option>
					<option value="PagoMovil">Pago Móvil</option>
				</select>
			</div>

			{/* Tasa del día (solo lectura; se guarda en la tabla pago) */}
			<div>
				<label className="block text-sm font-medium text-brand-900 mb-1">
					Tasa del día (BCV)
				</label>
				<input
					type="text"
					readOnly
					value={
						loadingDolar
							? "Cargando..."
							: dolarOficial
								? `${dolarOficial.promedio.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs/$`
								: "No disponible"
					}
					className="w-full rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2 text-sm text-brand-700 cursor-not-allowed"
					aria-readonly
				/>
			</div>

			{/* Banco origen */}
			<div ref={bancoOrigenRef} className="relative">
				<label className="block text-sm font-medium text-brand-900 mb-1">
					Banco origen *
				</label>
				<button
					type="button"
					onClick={() => !disabled && !isLoading && setBancoOrigenOpen((o) => !o)}
					className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-sm text-brand-900 focus:border-brand-500 focus:outline-none text-left flex items-center justify-between gap-2"
					disabled={isLoading || disabled}
				>
					<span className={formData.banco_origen ? "" : "text-brand-500"}>
						{formData.banco_origen || "Buscar por código o nombre..."}
					</span>
					<ChevronDown className="h-4 w-4 flex-shrink-0" />
				</button>
				{bancoOrigenOpen && (
					<div className="absolute z-20 mt-1 w-full min-w-[200px] rounded-lg border border-brand-300 bg-paper shadow-lg max-h-60 overflow-hidden flex flex-col">
						<div className="p-2 border-b border-brand-200 flex items-center gap-1">
							<Search className="h-4 w-4 text-brand-500 flex-shrink-0" />
							<input
								type="text"
								value={bancoOrigenSearch}
								onChange={(e) => setBancoOrigenSearch(e.target.value)}
								placeholder="Buscar por código o nombre..."
								className="flex-1 rounded border border-brand-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
							/>
						</div>
						<ul className="overflow-y-auto max-h-48 py-1">
							{bancosOrigenFiltrados.length === 0 ? (
								<li className="px-3 py-2 text-sm text-brand-500">Sin resultados</li>
							) : (
								bancosOrigenFiltrados.map((b) => (
									<li key={b.Code}>
										<button
											type="button"
											onClick={() => {
												setFormData((prev) => ({ ...prev, banco_origen: bancoLabel(b.Code, b.Name) }));
												setBancoOrigenOpen(false);
												setBancoOrigenSearch("");
											}}
											className="w-full text-left px-3 py-2 text-sm hover:bg-brand-100 focus:bg-brand-100 focus:outline-none"
										>
											{bancoLabel(b.Code, b.Name)}
										</button>
									</li>
								))
							)}
						</ul>
					</div>
				)}
			</div>

			{/* Banco destino */}
			<div ref={bancoDestinoRef} className="relative">
				<label className="block text-sm font-medium text-brand-900 mb-1">
					Banco destino *
				</label>
				<button
					type="button"
					onClick={() => !disabled && !isLoading && setBancoDestinoOpen((o) => !o)}
					className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-sm text-brand-900 focus:border-brand-500 focus:outline-none text-left flex items-center justify-between gap-2"
					disabled={isLoading || disabled}
				>
					<span className={formData.banco_destino ? "" : "text-brand-500"}>
						{formData.banco_destino || "Buscar por código o nombre..."}
					</span>
					<ChevronDown className="h-4 w-4 flex-shrink-0" />
				</button>
				{bancoDestinoOpen && (
					<div className="absolute z-20 mt-1 w-full min-w-[200px] rounded-lg border border-brand-300 bg-paper shadow-lg max-h-60 overflow-hidden flex flex-col">
						<div className="p-2 border-b border-brand-200 flex items-center gap-1">
							<Search className="h-4 w-4 text-brand-500 flex-shrink-0" />
							<input
								type="text"
								value={bancoDestinoSearch}
								onChange={(e) => setBancoDestinoSearch(e.target.value)}
								placeholder="Buscar por código o nombre..."
								className="flex-1 rounded border border-brand-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
							/>
						</div>
						<ul className="overflow-y-auto max-h-48 py-1">
							{bancosDestinoFiltrados.length === 0 ? (
								<li className="px-3 py-2 text-sm text-brand-500">Sin resultados</li>
							) : (
								bancosDestinoFiltrados.map((b) => (
									<li key={b.Code}>
										<button
											type="button"
											onClick={() => {
												setFormData((prev) => ({ ...prev, banco_destino: bancoLabel(b.Code, b.Name) }));
												setBancoDestinoOpen(false);
												setBancoDestinoSearch("");
											}}
											className="w-full text-left px-3 py-2 text-sm hover:bg-brand-100 focus:bg-brand-100 focus:outline-none"
										>
											{bancoLabel(b.Code, b.Name)}
										</button>
									</li>
								))
							)}
						</ul>
					</div>
				)}
			</div>

			{/* Monto */}
			<div>
				<label className="block text-sm font-medium text-brand-900 mb-1">
					Monto (Bs) *
				</label>
				<input
					type="number"
					step="0.01"
					value={formData.monto}
					onChange={(e) =>
						setFormData((prev) => ({ ...prev, monto: e.target.value }))
					}
					className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-sm text-brand-900 focus:border-brand-500 focus:outline-none"
					placeholder="0.00"
					disabled={isLoading || disabled || loadingDolar}
				/>
				{precioEcoUSD && (
					<div className="mt-2 space-y-1">
						<p className="text-xs text-brand-600">
							Precio del eco: <strong>${precioEcoUSD} USD</strong>
						</p>
						{loadingDolar ? (
							<p className="text-xs text-brand-500">Calculando monto en Bs...</p>
						) : dolarOficial && montoCalculado !== null ? (
							<p className="text-xs text-brand-600">
								Total en Bs: <strong>{montoCalculado.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</strong>
								<span className="text-brand-500 ml-1">
									(Tasa BCV: {dolarOficial.promedio.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs/$)
								</span>
							</p>
						) : (
							<p className="text-xs text-yellow-600">
								No se pudo obtener la tasa del BCV. Por favor ingrese el monto manualmente.
							</p>
						)}
					</div>
				)}
			</div>

			{/* Cédula pagador: prefijo (V, J, E, P, G) + número */}
			<div>
				<label className="block text-sm font-medium text-brand-900 mb-1">
					Cédula del pagador *
				</label>
				<div className="flex gap-2">
					<select
						value={parseCedula(formData.cedula_pagador).prefix}
						onChange={(e) => {
							const { number } = parseCedula(formData.cedula_pagador);
							setFormData((prev) => ({ ...prev, cedula_pagador: `${e.target.value}-${number}` }));
						}}
						className="w-20 rounded-lg border border-brand-300 bg-paper px-3 py-2 text-sm text-brand-900 focus:border-brand-500 focus:outline-none"
						disabled={isLoading || disabled}
					>
						{CEDULA_PREFIXES.map((p) => (
							<option key={p} value={p}>{p}</option>
						))}
					</select>
					<input
						type="text"
						inputMode="numeric"
						value={parseCedula(formData.cedula_pagador).number}
						onChange={(e) => {
							const v = e.target.value.replace(/\D/g, "").slice(0, 8);
							const { prefix } = parseCedula(formData.cedula_pagador);
							setFormData((prev) => ({ ...prev, cedula_pagador: v ? `${prefix}-${v}` : "" }));
						}}
						className="flex-1 rounded-lg border border-brand-300 bg-paper px-3 py-2 text-sm text-brand-900 focus:border-brand-500 focus:outline-none"
						placeholder="12345678"
						disabled={isLoading || disabled}
					/>
				</div>
			</div>

			{/* Teléfono pagador: prefijo móvil Venezuela + 7 dígitos */}
			<div>
				<label className="block text-sm font-medium text-brand-900 mb-1">
					Teléfono del pagador *
				</label>
				<div className="flex gap-2">
					<select
						value={parseTelefono(formData.telefono_pagador).prefix}
						onChange={(e) => {
							const { number } = parseTelefono(formData.telefono_pagador);
							setFormData((prev) => ({ ...prev, telefono_pagador: e.target.value + number }));
						}}
						className="w-24 rounded-lg border border-brand-300 bg-paper px-3 py-2 text-sm text-brand-900 focus:border-brand-500 focus:outline-none"
						disabled={isLoading || disabled}
					>
						{TELEFONO_PREFIXES.map((p) => (
							<option key={p} value={p}>{p}</option>
						))}
					</select>
					<input
						type="text"
						inputMode="numeric"
						value={parseTelefono(formData.telefono_pagador).number}
						onChange={(e) => {
							const v = e.target.value.replace(/\D/g, "").slice(0, 7);
							const { prefix } = parseTelefono(formData.telefono_pagador);
							setFormData((prev) => ({ ...prev, telefono_pagador: prefix + v }));
						}}
						className="flex-1 rounded-lg border border-brand-300 bg-paper px-3 py-2 text-sm text-brand-900 focus:border-brand-500 focus:outline-none"
						placeholder="1234567"
						disabled={isLoading || disabled}
					/>
				</div>
			</div>

			{/* Referencia */}
			<div>
				<label className="block text-sm font-medium text-brand-900 mb-1">
					Referencia *
				</label>
				<input
					type="text"
					value={formData.referencia}
					onChange={(e) =>
						setFormData((prev) => ({ ...prev, referencia: e.target.value }))
					}
					className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-sm text-brand-900 focus:border-brand-500 focus:outline-none"
					placeholder="Número de referencia del pago"
					disabled={isLoading || disabled}
				/>
			</div>

			{/* Orden médica */}
			<div>
				<label className="block text-sm font-medium text-brand-900 mb-1">
					Orden médica *
				</label>
				{!formData.orden_medica && !ordenMedicaPreview ? (
					<div>
						<input
							ref={ordenMedicaInputRef}
							type="file"
							accept="image/jpeg,image/jpg,image/png,image/webp"
							onChange={handleOrdenMedicaSelect}
							disabled={isLoading || disabled || uploadingOrdenMedica}
							className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-sm text-brand-900 focus:border-brand-500 focus:outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-paper file:hover:bg-brand-800 disabled:opacity-50"
						/>
						<p className="text-xs text-brand-600 mt-1">
							Formatos permitidos: JPEG, PNG, WEBP. Máximo 2MB (se comprimirá automáticamente a 100-200KB).
						</p>
						{uploadingOrdenMedica && (
							<p className="text-xs text-brand-500 mt-1">Comprimiendo orden médica...</p>
						)}
					</div>
				) : (
					<div className="space-y-2">
						{(ordenMedicaPreview || formData.orden_medica) && (
							<div className="relative rounded-lg border border-brand-200 overflow-hidden">
								<img
									src={ordenMedicaPreview || formData.orden_medica}
									alt="Orden médica"
									className="w-full h-auto max-h-48 object-contain bg-cloud"
								/>
								<button
									type="button"
									onClick={removeOrdenMedica}
									disabled={isLoading || disabled || uploadingOrdenMedica}
									className="absolute top-2 right-2 rounded-full bg-red-600 p-1.5 text-white hover:bg-red-700 disabled:opacity-50"
									aria-label="Eliminar orden médica"
								>
									<X className="h-4 w-4" />
								</button>
							</div>
						)}
						{selectedOrdenMedica && (
							<div className="flex items-center gap-2 text-xs text-brand-600">
								<ImageIcon className="h-4 w-4" />
								<span>{selectedOrdenMedica.name}</span>
								<span>({formatFileSize(selectedOrdenMedica.size)})</span>
							</div>
						)}
						{formData.orden_medica && !ordenMedicaPreview && (
							<p className="text-xs text-green-600">✓ Orden médica subida exitosamente</p>
						)}
					</div>
				)}
			</div>

			{/* Imagen del comprobante */}
			<div>
				<label className="block text-sm font-medium text-brand-900 mb-1">
					Imagen del comprobante *
				</label>
				{!formData.imagen && !imagePreview ? (
					<div>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/jpeg,image/jpg,image/png,image/webp"
							onChange={handleFileSelect}
							disabled={isLoading || disabled || uploadingImage}
							className="w-full rounded-lg border border-brand-300 bg-paper px-3 py-2 text-sm text-brand-900 focus:border-brand-500 focus:outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-paper file:hover:bg-brand-800 disabled:opacity-50"
						/>
						<p className="text-xs text-brand-600 mt-1">
							Formatos permitidos: JPEG, PNG, WEBP. Máximo 2MB (se comprimirá automáticamente a 100-200KB).
						</p>
						{uploadingImage && (
							<p className="text-xs text-brand-500 mt-1">Subiendo imagen...</p>
						)}
					</div>
				) : (
					<div className="space-y-2">
						{(imagePreview || formData.imagen) && (
							<div className="relative rounded-lg border border-brand-200 overflow-hidden">
								<img
									src={imagePreview || formData.imagen}
									alt="Comprobante de pago"
									className="w-full h-auto max-h-48 object-contain bg-cloud"
								/>
								<button
									type="button"
									onClick={removeImage}
									disabled={isLoading || disabled || uploadingImage}
									className="absolute top-2 right-2 rounded-full bg-red-600 p-1.5 text-white hover:bg-red-700 disabled:opacity-50"
									aria-label="Eliminar imagen"
								>
									<X className="h-4 w-4" />
								</button>
							</div>
						)}
						{selectedImage && (
							<div className="flex items-center gap-2 text-xs text-brand-600">
								<ImageIcon className="h-4 w-4" />
								<span>{selectedImage.name}</span>
								<span>({formatFileSize(selectedImage.size)})</span>
							</div>
						)}
						{formData.imagen && !imagePreview && (
							<p className="text-xs text-green-600">✓ Imagen subida exitosamente</p>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default FormularioPago;
