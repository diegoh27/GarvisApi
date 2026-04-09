import { useState, type FormEvent, useEffect, useMemo, useRef } from "react";
import Swal from "sweetalert2";
import { useCreateEcoMutation, useUpdateEcoMutation, useGetEcosQuery, useUploadIconoEcoMutation } from "../ecosApi";
import type { Eco } from "../ecosApi";
import { MONTO_MIN, MONTO_MAX, sanitizeMonto, validarMonto } from "../../inventario/utils/validation";
import { Activity, Heart, Eye, Baby, Stethoscope, Plus, Pencil, X } from "lucide-react";

const DURACION_CREAR = 20;

export const PREDEFINED_ICONS = [
	{ name: "Activity", icon: Activity },
	{ name: "Heart", icon: Heart },
	{ name: "Eye", icon: Eye },
	{ name: "Baby", icon: Baby },
	{ name: "Stethoscope", icon: Stethoscope },
];

type EcoFormProps = {
	eco?: Eco | null;
	onSuccess: () => void;
	onCancel: () => void;
};

const EcoForm = ({ eco, onSuccess, onCancel }: EcoFormProps) => {
	const [createEco, { isLoading: isCreating }] = useCreateEcoMutation();
	const [updateEco, { isLoading: isUpdating }] = useUpdateEcoMutation();
	const [uploadIcono, { isLoading: isUploading }] = useUploadIconoEcoMutation();
	const { data: ecos = [], refetch: refetchEcos } = useGetEcosQuery();
	const submittedRef = useRef(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	/** Nombre que acabamos de crear; evita mostrar "ya existe" tras el refetch */
	const justCreatedNombreRef = useRef<string | null>(null);
	const [form, setForm] = useState({
		nombre: eco?.nombre || "",
		precio: eco?.precio ? String(eco.precio) : "",
		duracion_min: eco?.duracion_min ? String(eco.duracion_min) : String(DURACION_CREAR),
		activo: eco?.activo !== undefined ? eco.activo : 1,
		descripcion: eco?.descripcion || "",
		etiqueta: eco?.etiqueta || "",
		icono: eco?.icono || "Activity",
	});
	const [customIconFile, setCustomIconFile] = useState<File | null>(null);
	const [customIconPreview, setCustomIconPreview] = useState<string | null>(
		eco?.icono?.startsWith("http") || eco?.icono?.startsWith("/uploads") ? eco.icono : null
	);
	const [error, setError] = useState("");
	const [nombreError, setNombreError] = useState("");

	const [isEditingIcons, setIsEditingIcons] = useState(false);
	const [hiddenIcons, setHiddenIcons] = useState<string[]>(() => {
		try {
			return JSON.parse(localStorage.getItem("garvis_hidden_icons") || "[]");
		} catch {
			return [];
		}
	});

	const toggleHideIcon = (url: string) => {
		const newHidden = [...hiddenIcons, url];
		setHiddenIcons(newHidden);
		localStorage.setItem("garvis_hidden_icons", JSON.stringify(newHidden));
		if (form.icono === url) {
			updateField("icono", "Activity");
		}
	};

	useEffect(() => {
		if (eco) {
			setForm({
				nombre: eco.nombre,
				precio: String(eco.precio),
				duracion_min: String(eco.duracion_min),
				activo: eco.activo,
				descripcion: eco.descripcion || "",
				etiqueta: eco.etiqueta || "",
				icono: eco.icono || "Activity",
			});
			if (eco.icono?.startsWith("http") || eco.icono?.startsWith("/uploads")) {
				setCustomIconPreview(eco.icono);
				setCustomIconFile(null);
			} else {
				setCustomIconPreview(null);
			}
		} else {
			setForm((prev) => ({
				...prev,
				duracion_min: String(DURACION_CREAR),
			}));
		}
	}, [eco]);

	const isLoading = isCreating || isUpdating || isUploading;
	const isEditing = !!eco;

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setCustomIconFile(file);
			setCustomIconPreview(URL.createObjectURL(file));
			updateField("icono", "custom");
		}
	};

	// Validar si el nombre ya existe (case-insensitive). No contar el que acabamos de crear.
	const nombreExists = useMemo(() => {
		if (!form.nombre.trim()) return false;
		const nombreNormalized = form.nombre.trim().toLowerCase();
		if (!isEditing && justCreatedNombreRef.current === nombreNormalized) return false;
		return ecos.some(
			(e) =>
				e.nombre.toLowerCase() === nombreNormalized &&
				(!isEditing || e.id_eco !== eco?.id_eco)
		);
	}, [form.nombre, ecos, isEditing, eco?.id_eco]);

	// Extraer etiquetas únicas para el datalist
	const etiquetasUnicas = useMemo(() => {
		const tags = new Set<string>();
		ecos.forEach((e) => {
			if (e.etiqueta && e.etiqueta.trim() !== "") {
				tags.add(e.etiqueta.trim());
			}
		});
		return Array.from(tags).sort();
	}, [ecos]);

	// Extraer íconos personalizados usados previamente
	const prevCustomIcons = useMemo(() => {
		const set = new Set<string>();
		ecos.forEach((e) => {
			if (e.icono && (e.icono.startsWith("http") || e.icono.startsWith("/uploads"))) {
				set.add(e.icono);
			}
		});
		return Array.from(set).filter((url) => !hiddenIcons.includes(url));
	}, [ecos, hiddenIcons]);

	const updateField = (field: keyof typeof form, value: string | number) => {
		setForm((prev) => ({ ...prev, [field]: value }));
		setError("");
		if (field === "nombre") {
			setNombreError("");
		}
	};

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (submittedRef.current) return;
		setError("");
		setNombreError("");

		if (!form.nombre.trim()) {
			setError("El nombre es requerido.");
			return;
		}

		if (nombreExists) {
			setNombreError("Ya existe un eco con ese nombre.");
			setError("Ya existe un eco con ese nombre.");
			return;
		}

		const errPrecio = validarMonto(form.precio);
		if (errPrecio) {
			setError(errPrecio);
			return;
		}

		submittedRef.current = true;
		try {
			let finalIcono = form.icono;
			
			// Subir imagen personalizada si el usuario seleccionó un archivo
			if (customIconFile && form.icono === "custom") {
				const formData = new FormData();
				formData.append("icono", customIconFile);
				const uploadRes = await uploadIcono(formData).unwrap();
				finalIcono = uploadRes.data.url;
			}

			if (isEditing) {
				await updateEco({
					id_eco: eco!.id_eco,
					nombre: form.nombre.trim(),
					precio: Number(form.precio),
					duracion_min: form.duracion_min ? Number(form.duracion_min) : 0,
					activo: Number(form.activo),
					descripcion: form.descripcion.trim(),
					etiqueta: form.etiqueta.trim(),
					icono: finalIcono,
				}).unwrap();
				await Swal.fire({
					icon: "success",
					title: "Eco actualizado",
					text: "El eco ha sido actualizado exitosamente.",
					timer: 2000,
					showConfirmButton: false,
				});
			} else {
				await createEco({
					nombre: form.nombre.trim(),
					precio: Number(form.precio),
					duracion_min: DURACION_CREAR,
					descripcion: form.descripcion.trim(),
					etiqueta: form.etiqueta.trim(),
					icono: finalIcono,
				}).unwrap();
				justCreatedNombreRef.current = form.nombre.trim().toLowerCase();
				await Swal.fire({
					icon: "success",
					title: "Eco creado",
					text: "El eco ha sido creado exitosamente.",
					timer: 2000,
					showConfirmButton: false,
				});
			}
			onSuccess();
		} catch (err: any) {
			submittedRef.current = false;
			const message = err?.data?.message || "No se pudo guardar el eco";
			const status = err?.status;
			// Si el backend devuelve 409 "ya existe" al crear, puede ser race: el eco ya se creó. Comprobamos.
			if (!isEditing && status === 409 && message.toLowerCase().includes("ya existe")) {
				const { data: listAfter } = await refetchEcos();
				const nombreNorm = form.nombre.trim().toLowerCase();
				const exists = (listAfter ?? []).some((e) => e.nombre.toLowerCase() === nombreNorm);
				if (exists) {
					justCreatedNombreRef.current = nombreNorm;
					await Swal.fire({
						icon: "success",
						title: "Eco creado",
						text: "El eco ha sido creado exitosamente.",
						timer: 2000,
						showConfirmButton: false,
					});
					onSuccess();
					return;
				}
			}
			setError(message);
			Swal.fire({
				icon: "error",
				title: "Error",
				text: message,
			});
		}
	};

	return (
		<form className="space-y-4" onSubmit={onSubmit}>
			{error && (
				<div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
					{error}
				</div>
			)}

			<div>
				<label className="mb-1 block text-sm font-medium text-brand-700">
					Nombre <span className="text-red-500">*</span>
				</label>
				<input
					type="text"
					required
					className={`h-11 w-full rounded-lg border bg-paper px-3 text-sm outline-none focus:border-brand-500 ${nombreError || nombreExists
						? "border-red-500 focus:border-red-500"
						: "border-brand-300"
						}`}
					value={form.nombre}
					onChange={(e) => updateField("nombre", e.target.value)}
					onBlur={() => {
						if (nombreExists) {
							setNombreError("Ya existe un eco con ese nombre.");
						}
					}}
					placeholder="Ej: Eco abdominal, Eco cardíaco..."
				/>
				{(nombreError || nombreExists) && (
					<p className="mt-1 text-xs text-red-600">{nombreError || "Ya existe un eco con ese nombre."}</p>
				)}
			</div>

			<div>
				<label className="mb-1 block text-sm font-medium text-brand-700">
					Descripción
				</label>
				<textarea
					className="w-full rounded-lg border border-brand-300 bg-paper p-3 text-sm outline-none focus:border-brand-500 min-h-[80px]"
					value={form.descripcion}
					onChange={(e) => updateField("descripcion", e.target.value)}
					placeholder="Breve explicación del estudio para el paciente..."
				/>
			</div>

			<div>
				<label className="mb-1 block text-sm font-medium text-brand-700">
					Etiqueta (Categoría)
				</label>
				<input
					type="text"
					list="etiquetas-list"
					className="h-11 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
					value={form.etiqueta}
					onChange={(e) => updateField("etiqueta", e.target.value)}
					placeholder="Ej: Abdominal, Pélvico, Doppler..."
				/>
				<datalist id="etiquetas-list">
					{etiquetasUnicas.map((etiqueta) => (
						<option key={etiqueta} value={etiqueta} />
					))}
				</datalist>
			</div>

			{isEditing ? (
				<div className="grid gap-4 sm:grid-cols-2">
					<div>
						<label className="mb-1 block text-sm font-medium text-brand-700">
							Precio ($) <span className="text-red-500">*</span> (mín. 0,01)
						</label>
						<input
							type="number"
							required
							min={MONTO_MIN}
							max={MONTO_MAX}
							step="0.01"
							className="h-11 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
							value={form.precio}
							onChange={(e) => updateField("precio", sanitizeMonto(e.target.value))}
							placeholder="0.01"
						/>
					</div>
					<div>
						<label className="mb-1 block text-sm font-medium text-brand-700">
							Duración (minutos)
						</label>
						<input
							type="number"
							min="0"
							className="h-11 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
							value={form.duracion_min}
							onChange={(e) => updateField("duracion_min", e.target.value)}
							placeholder="0"
						/>
					</div>
				</div>
			) : (
				<div>
					<label className="mb-1 block text-sm font-medium text-brand-700">
						Precio ($) <span className="text-red-500">*</span> (mín. 0,01)
					</label>
					<input
						type="number"
						required
						min={MONTO_MIN}
						max={MONTO_MAX}
						step="0.01"
						className="h-11 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
						value={form.precio}
						onChange={(e) => updateField("precio", sanitizeMonto(e.target.value))}
						placeholder="0.01"
					/>
				</div>
			)}

			{isEditing && (
				<div>
					<label className="mb-1 block text-sm font-medium text-brand-700">
						Estado
					</label>
					<select
						className="h-11 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
						value={form.activo}
						onChange={(e) => updateField("activo", Number(e.target.value))}
					>
						<option value={1}>Activo</option>
						<option value={0}>Inactivo</option>
					</select>
				</div>
			)}

			<div className="pt-2 border-t border-brand-100">
				<div className="flex items-center justify-between mb-2">
					<label className="block text-sm font-bold text-brand-700">
						Selecciona un Ícono
					</label>
					{prevCustomIcons.length > 0 && (
						<button
							type="button"
							onClick={() => setIsEditingIcons(!isEditingIcons)}
							className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
								isEditingIcons
									? "bg-brand-100 text-brand-800"
									: "text-brand-900/40 hover:bg-brand-50 hover:text-brand-700"
							}`}
						>
							<Pencil className="h-3.5 w-3.5" />
							{isEditingIcons ? "Listo" : "Editar"}
						</button>
					)}
				</div>
				<div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
					{PREDEFINED_ICONS.map(({ name, icon: Icon }) => (
						<button
							key={name}
							type="button"
							disabled={isEditingIcons}
							onClick={() => {
								setCustomIconFile(null);
								setCustomIconPreview(null);
								updateField("icono", name);
							}}
							className={`flex h-14 w-full items-center justify-center rounded-xl border transition-all ${
								form.icono === name && !customIconFile
									? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20"
									: "border-brand-200 bg-paper text-brand-500 hover:border-brand-300 hover:bg-brand-50/50"
							} ${isEditingIcons ? "opacity-50 cursor-not-allowed" : ""}`}
						>
							<Icon className="h-6 w-6" />
						</button>
					))}

					{/* Custom Icons History */}
					{prevCustomIcons.map((url) => (
						<div key={url} className="relative">
							<button
								type="button"
								disabled={isEditingIcons}
								onClick={() => {
									setCustomIconFile(null);
									setCustomIconPreview(null);
									updateField("icono", url);
								}}
								className={`flex h-14 w-full items-center justify-center rounded-xl border transition-all overflow-hidden bg-paper ${
									form.icono === url && !customIconFile
										? "border-brand-500 ring-2 ring-brand-500/20"
										: "border-brand-200 hover:border-brand-300 hover:bg-brand-50/50"
								} ${isEditingIcons ? "opacity-50 cursor-not-allowed" : ""}`}
							>
								<img src={url} alt="Ícono guardado" className="h-full w-full object-cover" />
							</button>
							{isEditingIcons && (
								<button
									type="button"
									onClick={() => toggleHideIcon(url)}
									className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 z-20"
									title="Ocultar ícono de la lista"
								>
									<X className="h-3 w-3" strokeWidth={3} />
								</button>
							)}
						</div>
					))}
					
					{/* Custom icon button */}
					<button
						type="button"
						disabled={isEditingIcons}
						onClick={() => fileInputRef.current?.click()}
						className={`flex h-14 w-full items-center justify-center rounded-xl border border-dashed transition-all overflow-hidden relative ${
							form.icono === "custom" || customIconPreview
								? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20"
								: "border-brand-300 bg-paper text-brand-400 hover:border-brand-400 hover:bg-brand-50/50"
						} ${isEditingIcons ? "opacity-50 cursor-not-allowed" : ""}`}
						title="Subir ícono personalizado"
					>
						{customIconPreview ? (
							<img src={customIconPreview} alt="Ícono" className="h-10 w-10 object-contain z-10" />
						) : (
							<Plus className="h-6 w-6" />
						)}
					</button>
					<input
						type="file"
						ref={fileInputRef}
						accept="image/*"
						className="hidden"
						onChange={handleFileSelect}
					/>
				</div>
			</div>

			<div className="flex gap-3 pt-4">
				<button
					type="button"
					onClick={onCancel}
					className="flex-1 rounded-lg border border-brand-300 bg-paper px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
				>
					Cancelar
				</button>
				<button
					type="submit"
					disabled={isLoading}
					className="flex-1 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-brand-800 disabled:opacity-50"
				>
					{isLoading
						? isEditing
							? "Actualizando..."
							: "Creando..."
						: isEditing
							? "Actualizar eco"
							: "Crear eco"}
				</button>
			</div>
		</form>
	);
};

export default EcoForm;
