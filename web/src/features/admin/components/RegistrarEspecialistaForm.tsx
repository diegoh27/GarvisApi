import { useState, type FormEvent, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { PasswordField } from "../../../shared";
import { useCrearEspecialistaMutation } from "../adminApi";
import { useGetEspecialidadesQuery } from "../../especialidades/especialidadesApi";
import { useGetEcosQuery } from "../../ecos/ecosApi";
import { ChevronDown, Check } from "lucide-react";

const RegistrarEspecialistaForm = () => {
	const navigate = useNavigate();
	const { data: especialidades = [], isLoading: loadingEspecialidades } =
		useGetEspecialidadesQuery();
	const { data: ecos = [], isLoading: loadingEcos } = useGetEcosQuery();
	const [crearEspecialista, { isLoading }] = useCrearEspecialistaMutation();
	// Prefijos telefónicos venezolanos (móviles)
	const prefijosTelefonicos = [
		"0412",
		"0414",
		"0416",
		"0421",
		"0422",
		"0424",
		"0426",
	];

	const [form, setForm] = useState({
		nombre: "",
		apellido: "",
		correo: "",
		genero: "Masculino" as "Masculino" | "Femenino" | "Otro",
		fecha_nacimiento: "",
		cedula: "",
		telefono_prefijo: "0412",
		telefono_numero: "",
		contrasena: "",
		confirmar_contrasena: "",
		id_especialidad: "",
		porcentaje: "",
		id_ecos: [] as string[],
	});
	const [error, setError] = useState("");
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [isEcosDropdownOpen, setIsEcosDropdownOpen] = useState(false);
	const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">("bottom");
	const ecosDropdownRef = useRef<HTMLDivElement>(null);
	const ecosButtonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				ecosDropdownRef.current &&
				!ecosDropdownRef.current.contains(event.target as Node)
			) {
				setIsEcosDropdownOpen(false);
			}
		};

		if (isEcosDropdownOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isEcosDropdownOpen]);

	const toggleEco = (idEco: string) => {
		const isSelected = form.id_ecos.includes(idEco);
		if (isSelected) {
			updateField(
				"id_ecos",
				form.id_ecos.filter((id) => id !== idEco)
			);
		} else {
			updateField("id_ecos", [...form.id_ecos, idEco]);
		}
	};

	const handleToggleDropdown = () => {
		if (!isEcosDropdownOpen && ecosButtonRef.current) {
			const rect = ecosButtonRef.current.getBoundingClientRect();
			const spaceBelow = window.innerHeight - rect.bottom;
			const spaceAbove = rect.top;
			const dropdownHeight = 240;

			if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
				setDropdownPosition("top");
			} else {
				setDropdownPosition("bottom");
			}
		}
		setIsEcosDropdownOpen(!isEcosDropdownOpen);
	};

	const validateField = (field: keyof typeof form, value: string): string => {
		switch (field) {
			case "telefono_numero":
				if (!value.trim()) return "El número de teléfono es requerido";
				if (!/^\d{7}$/.test(value)) return "El número debe tener 7 dígitos";
				return "";
			case "correo":
				if (!value.trim()) return "El correo es requerido";
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(value)) return "Correo electrónico inválido";
				return "";
			case "contrasena":
				if (!value) return "La contraseña es requerida";
				if (value.length < 6) return "La contraseña debe tener al menos 6 caracteres";
				return "";
			case "confirmar_contrasena":
				if (!value) return "Confirma tu contraseña";
				if (value !== form.contrasena) return "Las contraseñas no coinciden";
				return "";
			case "porcentaje": {
				if (!value.trim()) return "El porcentaje es requerido";
				const parsed = Number(value);
				if (Number.isNaN(parsed)) return "Porcentaje inválido";
				if (parsed < 0 || parsed > 100) return "El porcentaje debe estar entre 0 y 100";
				return "";
			}
			case "id_ecos":
				if (!Array.isArray(value) || value.length === 0) {
					return "Debes seleccionar al menos un eco";
				}
				return "";
			default:
				return "";
		}
	};

	const updateField = (field: keyof typeof form, value: string | string[]) => {
		setForm((prev) => ({ ...prev, [field]: value }));
		setError("");

		// Validar el campo
		const fieldError = validateField(field, value as string);
		setFieldErrors((prev) => ({ ...prev, [field]: fieldError }));

		// Validar telefono_numero cuando cambia telefono_prefijo
		if (field === "telefono_prefijo" && form.telefono_numero) {
			const telefonoError = validateField("telefono_numero", form.telefono_numero);
			setFieldErrors((prev) => ({ ...prev, telefono_numero: telefonoError }));
		}

		// Si se cambia la contraseña, revalidar confirmar_contrasena
		if (field === "contrasena" && form.confirmar_contrasena) {
			const confirmError = validateField("confirmar_contrasena", form.confirmar_contrasena);
			setFieldErrors((prev) => ({ ...prev, confirmar_contrasena: confirmError }));
		}
	};

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");

		// Validar todos los campos
		const errors: Record<string, string> = {};
		Object.keys(form).forEach((field) => {
			if (field === "telefono_prefijo") return;

			const fieldValue = form[field as keyof typeof form];
			if (Array.isArray(fieldValue)) return;
			const fieldError = validateField(field as keyof typeof form, fieldValue as string);
			if (fieldError) {
				errors[field] = fieldError;
			}
		});

		// Validar campos requeridos
		const required = [
			"nombre",
			"apellido",
			"correo",
			"genero",
			"fecha_nacimiento",
			"cedula",
			"telefono_numero",
			"contrasena",
			"confirmar_contrasena",
			"id_especialidad",
			"porcentaje",
		];
		const missing = required.filter(
			(field) => !form[field as keyof typeof form]
		);

		if (missing.length) {
			setError("Completa todos los campos obligatorios.");
			return;
		}

		if (!form.id_ecos || form.id_ecos.length === 0) {
			setError("Debes seleccionar al menos un eco para el especialista.");
			return;
		}

		setFieldErrors(errors);
		if (Object.keys(errors).length > 0) {
			setError("Por favor, corrige los errores en el formulario.");
			return;
		}

		const porcentajeValue = Number(form.porcentaje);
		if (Number.isNaN(porcentajeValue)) {
			setError("Porcentaje inválido.");
			return;
		}

		try {
			await crearEspecialista({
				nombre: form.nombre,
				apellido: form.apellido,
				correo: form.correo,
				genero: form.genero,
				fecha_nacimiento: form.fecha_nacimiento,
				cedula: form.cedula,
				telefono: `${form.telefono_prefijo}${form.telefono_numero}`,
				contrasena: form.contrasena,
				id_especialidad: form.id_especialidad,
				porcentaje: porcentajeValue,
				id_ecos: form.id_ecos,
			}).unwrap();

			await Swal.fire({
				icon: "success",
				title: "Especialista registrado",
				text: "El especialista ha sido registrado exitosamente.",
				timer: 2000,
				showConfirmButton: false,
			});

			navigate("/usuarios");
		} catch (err: any) {
			const message =
				err?.data?.message || "No se pudo registrar el especialista";
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

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<label className="mb-1 block text-sm font-medium text-brand-700">
						Nombre <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						required
						className="h-11 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
						value={form.nombre}
						onChange={(e) => updateField("nombre", e.target.value)}
					/>
				</div>
				<div>
					<label className="mb-1 block text-sm font-medium text-brand-700">
						Apellido <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						required
						className="h-11 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
						value={form.apellido}
						onChange={(e) => updateField("apellido", e.target.value)}
					/>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<label className="mb-1 block text-sm font-medium text-brand-700">
						Correo electrónico <span className="text-red-500">*</span>
					</label>
					<input
						type="email"
						name="correo"
						autoComplete="email"
						required
						className={`h-11 w-full rounded-lg border bg-paper px-3 text-sm outline-none focus:border-brand-500 ${fieldErrors.correo ? "border-red-500" : "border-brand-300"
							}`}
						value={form.correo}
						onChange={(e) => updateField("correo", e.target.value)}
					/>
					{fieldErrors.correo && (
						<p className="mt-1 text-xs text-red-500">{fieldErrors.correo}</p>
					)}
				</div>
				<div>
					<label className="mb-1 block text-sm font-medium text-brand-700">
						Teléfono <span className="text-red-500">*</span>
					</label>
					<div className="flex gap-2">
						<select
							className="h-11 w-24 rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
							value={form.telefono_prefijo}
							onChange={(e) => updateField("telefono_prefijo", e.target.value)}
						>
							{prefijosTelefonicos.map((prefijo) => (
								<option key={prefijo} value={prefijo}>
									{prefijo}
								</option>
							))}
						</select>
						<div className="flex-1">
							<input
								type="tel"
								required
								placeholder="Número (7 dígitos)"
								className={`h-11 w-full rounded-lg border bg-paper px-3 text-sm outline-none focus:border-brand-500 ${fieldErrors.telefono_numero ? "border-red-500" : "border-brand-300"
									}`}
								value={form.telefono_numero}
								onChange={(e) => updateField("telefono_numero", e.target.value.replace(/\D/g, ""))}
								maxLength={7}
							/>
							{fieldErrors.telefono_numero && (
								<p className="mt-1 text-xs text-red-500">{fieldErrors.telefono_numero}</p>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<PasswordField
						label="Contraseña"
						required
						value={form.contrasena}
						onChange={(value) => updateField("contrasena", value)}
						className={`h-11 w-full rounded-lg border bg-paper px-3 pr-10 text-sm outline-none focus:border-brand-500 ${fieldErrors.contrasena ? "border-red-500" : "border-brand-300"
							}`}
					/>
					{fieldErrors.contrasena && (
						<p className="mt-1 text-xs text-red-500">{fieldErrors.contrasena}</p>
					)}
				</div>
				<div>
					<PasswordField
						label="Confirmar contraseña"
						required
						value={form.confirmar_contrasena}
						onChange={(value) => updateField("confirmar_contrasena", value)}
						className={`h-11 w-full rounded-lg border bg-paper px-3 pr-10 text-sm outline-none focus:border-brand-500 ${fieldErrors.confirmar_contrasena ? "border-red-500" : "border-brand-300"
							}`}
					/>
					{fieldErrors.confirmar_contrasena && (
						<p className="mt-1 text-xs text-red-500">{fieldErrors.confirmar_contrasena}</p>
					)}
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<label className="mb-1 block text-sm font-medium text-brand-700">
						Cédula <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						required
						className="h-11 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
						value={form.cedula}
						onChange={(e) => updateField("cedula", e.target.value)}
					/>
				</div>
				<div>
					<label className="mb-1 block text-sm font-medium text-brand-700">
						Género <span className="text-red-500">*</span>
					</label>
					<select
						required
						className="h-11 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
						value={form.genero}
						onChange={(e) =>
							updateField("genero", e.target.value as typeof form.genero)
						}
					>
						<option value="Masculino">Masculino</option>
						<option value="Femenino">Femenino</option>
						<option value="Otro">Otro</option>
					</select>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<label className="mb-1 block text-sm font-medium text-brand-700">
						Fecha de nacimiento <span className="text-red-500">*</span>
					</label>
					<input
						type="date"
						required
						className="h-11 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500"
						value={form.fecha_nacimiento}
						onChange={(e) => updateField("fecha_nacimiento", e.target.value)}
					/>
				</div>
				<div>
					<label className="mb-1 block text-sm font-medium text-brand-700">
						Especialidad <span className="text-red-500">*</span>
					</label>
					<select
						required
						disabled={loadingEspecialidades}
						className="h-11 w-full rounded-lg border border-brand-300 bg-paper px-3 text-sm outline-none focus:border-brand-500 disabled:opacity-50"
						value={form.id_especialidad}
						onChange={(e) => updateField("id_especialidad", e.target.value)}
					>
						<option value="">
							{loadingEspecialidades
								? "Cargando..."
								: "Selecciona una especialidad"}
						</option>
						{especialidades.map((esp) => (
							<option key={esp.id_especialidad} value={esp.id_especialidad}>
								{esp.nombre}
							</option>
						))}
					</select>
				</div>
			</div>

			<div>
				<label className="mb-1 block text-sm font-medium text-brand-700">
					Porcentaje para especialista <span className="text-red-500">*</span>
				</label>
				<input
					type="number"
					required
					min={0}
					max={100}
					step="0.01"
					className={`h-11 w-full rounded-lg border bg-paper px-3 text-sm outline-none focus:border-brand-500 ${fieldErrors.porcentaje ? "border-red-500" : "border-brand-300"
						}`}
					value={form.porcentaje}
					onChange={(e) => updateField("porcentaje", e.target.value)}
					placeholder="Ej: 35"
				/>
				{fieldErrors.porcentaje && (
					<p className="mt-1 text-xs text-red-500">{fieldErrors.porcentaje}</p>
				)}
			</div>

			<div>
				<label className="mb-1 block text-sm font-medium text-brand-700">
					Ecos <span className="text-red-500">*</span>
				</label>
				<div className="relative" ref={ecosDropdownRef}>
					<button
						type="button"
						ref={ecosButtonRef}
						onClick={handleToggleDropdown}
						disabled={loadingEcos}
						className={`h-11 w-full rounded-lg border bg-paper px-3 text-left text-sm outline-none focus:border-brand-500 disabled:opacity-50 flex items-center justify-between ${fieldErrors.id_ecos ? "border-red-500" : "border-brand-300"
							}`}
					>
						<span className="truncate">
							{loadingEcos
								? "Cargando ecos..."
								: form.id_ecos.length === 0
									? "Selecciona los ecos"
									: form.id_ecos.length === 1
										? "1 eco seleccionado"
										: `${form.id_ecos.length} ecos seleccionados`}
						</span>
						<ChevronDown
							className={`h-4 w-4 text-brand-600 transition-transform ${isEcosDropdownOpen ? "rotate-180" : ""
								}`}
						/>
					</button>
					{isEcosDropdownOpen && (
						<div
							className={`absolute z-50 w-full rounded-lg border border-brand-300 bg-paper shadow-lg max-h-60 overflow-auto ${dropdownPosition === "top" ? "bottom-full mb-1" : "top-full mt-1"
								}`}
						>
							{loadingEcos ? (
								<div className="p-3 text-sm text-brand-600">Cargando ecos...</div>
							) : ecos.filter((eco) => eco.activo === 1).length === 0 ? (
								<div className="p-3 text-sm text-brand-600">No hay ecos disponibles</div>
							) : (
								<div className="p-1">
									{ecos
										.filter((eco) => eco.activo === 1)
										.map((eco) => {
											const isSelected = form.id_ecos.includes(eco.id_eco);
											return (
												<button
													key={eco.id_eco}
													type="button"
													onClick={() => toggleEco(eco.id_eco)}
													className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-brand-50 transition-colors ${isSelected ? "bg-brand-50" : ""
														}`}
												>
													<div
														className={`flex h-4 w-4 items-center justify-center rounded border ${isSelected
																? "border-brand-700 bg-brand-700"
																: "border-brand-300 bg-paper"
															}`}
													>
														{isSelected && <Check className="h-3 w-3 text-paper" />}
													</div>
													<span className="flex-1 text-left">{eco.nombre}</span>
												</button>
											);
										})}
								</div>
							)}
						</div>
					)}
				</div>
				{fieldErrors.id_ecos && (
					<p className="mt-1 text-xs text-red-500">{fieldErrors.id_ecos}</p>
				)}
			</div>

			<div className="flex gap-3 pt-4">
				<button
					type="button"
					onClick={() => navigate("/especialistas")}
					className="flex-1 rounded-lg border border-brand-300 bg-paper px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
				>
					Cancelar
				</button>
				<button
					type="submit"
					disabled={isLoading}
					className="flex-1 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-brand-800 disabled:opacity-50"
				>
					{isLoading ? "Registrando..." : "Registrar especialista"}
				</button>
			</div>
		</form>
	);
};

export default RegistrarEspecialistaForm;
