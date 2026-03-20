import { useState, type FormEvent, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { PasswordField, formatNombreApellido, validarRangoCedula, MENSAJE_RANGO_CEDULA, CedulaField, TelefonoField, validarNumeroTelefono, MENSAJE_TELEFONO_7_DIGITOS } from "../../../shared";
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

	const [form, setForm] = useState({
		nombre: "",
		apellido: "",
		correo: "",
		genero: "Masculino" as "Masculino" | "Femenino",
		fecha_nacimiento: "",
		tipo_cedula: "V" as const,
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
			case "nombre":
				if (!value.trim()) return "El nombre es requerido";
				if (value.length > 30) return "El nombre no puede exceder 30 caracteres";
				if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) return "El nombre solo puede contener letras";
				return "";
			case "apellido":
				if (!value.trim()) return "El apellido es requerido";
				if (value.length > 30) return "El apellido no puede exceder 30 caracteres";
				if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) return "El apellido solo puede contener letras";
				return "";
			case "cedula":
				if (!value.trim()) return "La cédula es requerida";
				if (!/^\d+$/.test(value)) return "La cédula solo puede contener números";
				if (!validarRangoCedula(value)) return MENSAJE_RANGO_CEDULA;
				return "";
			case "fecha_nacimiento": {
				if (!value.trim()) return "La fecha de nacimiento es requerida";
				const birth = new Date(value);
				const today = new Date();
				today.setHours(23, 59, 59, 999);
				if (birth.getTime() > today.getTime()) return "La fecha de nacimiento no puede ser futura";
				
				const hace100Anos = new Date();
				hace100Anos.setFullYear(today.getFullYear() - 100);
				if (birth.getTime() < hace100Anos.getTime()) return "La fecha de nacimiento no puede ser mayor a 100 años";
				
				let age = today.getFullYear() - birth.getFullYear();
				const m = today.getMonth() - birth.getMonth();
				if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
				if (age < 18) return "El especialista debe ser mayor de edad (18 años o más)";
				return "";
			}
			case "telefono_numero":
				if (!value.trim()) return "El número de teléfono es requerido";
				if (!validarNumeroTelefono(value)) return MENSAJE_TELEFONO_7_DIGITOS;
				return "";
			case "correo":
				if (!value.trim()) return "El correo es requerido";
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(value)) return "Correo electrónico inválido";
				return "";
			case "contrasena":
				if (!value) return "La contraseña es requerida";
				if (value.length < 6) return "La contraseña debe tener al menos 6 caracteres";
				if (value.length > 20) return "La contraseña no puede exceder 20 caracteres";
				if (!/[A-Z]/.test(value)) return "La contraseña debe contener al menos una mayúscula";
				if (!/[0-9]/.test(value)) return "La contraseña debe contener al menos un número";
				if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return "La contraseña debe contener al menos un carácter especial";
				return "";
			case "confirmar_contrasena":
				if (!value) return "Confirma tu contraseña";
				if (value !== form.contrasena) return "Las contraseñas no coinciden";
				return "";
			case "porcentaje": {
				if (!value.trim()) return "El porcentaje es requerido";
				const parsed = Number(value);
				if (Number.isNaN(parsed)) return "Porcentaje inválido";
				if (parsed < 1 || parsed > 100) return "El porcentaje debe estar entre 1 y 100";
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

		// Marcar errores de campos requeridos vacíos
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
		required.forEach((field) => {
			const val = form[field as keyof typeof form];
			if (!val || (typeof val === "string" && !val.trim())) {
				errors[field] = errors[field] || "Campo requerido";
			}
		});

		if (!form.id_ecos || form.id_ecos.length === 0) {
			errors.id_ecos = "Debes seleccionar al menos un eco";
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
				nombre: formatNombreApellido(form.nombre),
				apellido: formatNombreApellido(form.apellido),
				correo: form.correo.trim(),
				genero: form.genero,
				fecha_nacimiento: form.fecha_nacimiento.trim(),
				cedula: `${form.tipo_cedula}${form.cedula}`.trim(),
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
		<form className="mx-auto max-w-4xl space-y-6 pb-12" onSubmit={onSubmit}>
			{error && (
				<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 shadow-sm">
					{error}
				</div>
			)}

			{/* 1. Datos Personales */}
			<div className="rounded-2xl border border-brand-100 bg-paper p-6 shadow-sm transition-shadow hover:shadow-md">
				<h3 className="mb-5 border-b border-brand-50 pb-3 text-lg font-semibold text-brand-900">
					Datos Personales
				</h3>
				<div className="grid gap-5 sm:grid-cols-2">
					<div>
						<label className="mb-1.5 block text-sm font-medium text-brand-700">
							Nombre <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							required
							maxLength={36}
							className={`h-11 w-full rounded-xl border bg-paper px-4 text-sm outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 hover:border-brand-300 ${fieldErrors.nombre ? "border-red-500 bg-red-50/30" : "border-brand-200"}`}
							value={form.nombre}
							onChange={(e) => updateField("nombre", e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""))}
							onBlur={() => form.nombre && updateField("nombre", formatNombreApellido(form.nombre))}
							placeholder="Ej. Juan Carlos"
						/>
						{fieldErrors.nombre && (
							<p className="mt-1.5 text-xs font-medium text-red-500">{fieldErrors.nombre}</p>
						)}
					</div>
					<div>
						<label className="mb-1.5 block text-sm font-medium text-brand-700">
							Apellido <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							required
							maxLength={36}
							className={`h-11 w-full rounded-xl border bg-paper px-4 text-sm outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 hover:border-brand-300 ${fieldErrors.apellido ? "border-red-500 bg-red-50/30" : "border-brand-200"}`}
							value={form.apellido}
							onChange={(e) => updateField("apellido", e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""))}
							onBlur={() => form.apellido && updateField("apellido", formatNombreApellido(form.apellido))}
							placeholder="Ej. Salas"
						/>
						{fieldErrors.apellido && (
							<p className="mt-1.5 text-xs font-medium text-red-500">{fieldErrors.apellido}</p>
						)}
					</div>

					<div>
						<CedulaField
							label={
								<>
									Cédula <span className="text-red-500">*</span>
								</>
							}
							value={`${form.tipo_cedula}${form.cedula}`}
							onChange={(tipo, numero) => {
								setForm((f: any) => ({ ...f, tipo_cedula: tipo, cedula: numero }));
								setFieldErrors((prev) => (prev.cedula ? { ...prev, cedula: "" } : prev));
							}}
							error={fieldErrors.cedula}
							required
							inputClassName="h-11 rounded-xl bg-paper text-sm transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 hover:border-brand-300 border-brand-200"
							selectClassName="h-11 rounded-xl bg-paper text-sm border-brand-200"
						/>
					</div>

					<div>
						<label className="mb-1.5 block text-sm font-medium text-brand-700">
							Género <span className="text-red-500">*</span>
						</label>
						<select
							required
							className="h-11 w-full rounded-xl border border-brand-200 bg-paper px-4 text-sm outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 hover:border-brand-300"
							value={form.genero}
							onChange={(e) => updateField("genero", e.target.value as typeof form.genero)}
						>
							<option value="Masculino">Masculino</option>
							<option value="Femenino">Femenino</option>
						</select>
					</div>

					<div className="sm:col-span-2 md:col-span-1">
						<label className="mb-1.5 block text-sm font-medium text-brand-700">
							Fecha de nacimiento <span className="text-red-500">*</span>
						</label>
						<input
							type="date"
							required
							className={`h-11 w-full rounded-xl border bg-paper px-4 text-sm outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 hover:border-brand-300 ${fieldErrors.fecha_nacimiento ? "border-red-500" : "border-brand-200"}`}
							value={form.fecha_nacimiento}
							onChange={(e) => updateField("fecha_nacimiento", e.target.value)}
						/>
						{fieldErrors.fecha_nacimiento && (
							<p className="mt-1.5 text-xs font-medium text-red-500">{fieldErrors.fecha_nacimiento}</p>
						)}
					</div>
				</div>
			</div>

			{/* 2. Datos de Contacto */}
			<div className="rounded-2xl border border-brand-100 bg-paper p-6 shadow-sm transition-shadow hover:shadow-md">
				<h3 className="mb-5 border-b border-brand-50 pb-3 text-lg font-semibold text-brand-900">
					Datos de Contacto
				</h3>
				<div className="grid gap-5 sm:grid-cols-2">
					<div>
						<label className="mb-1.5 block text-sm font-medium text-brand-700">
							Correo electrónico <span className="text-red-500">*</span>
						</label>
						<input
							type="email"
							name="correo"
							autoComplete="email"
							required
							className={`h-11 w-full rounded-xl border bg-paper px-4 text-sm outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 hover:border-brand-300 ${fieldErrors.correo ? "border-red-500" : "border-brand-200"}`}
							value={form.correo}
							onChange={(e) => updateField("correo", e.target.value)}
							placeholder="correo@ejemplo.com"
						/>
						{fieldErrors.correo && (
							<p className="mt-1.5 text-xs font-medium text-red-500">{fieldErrors.correo}</p>
						)}
					</div>
					<div>
						<TelefonoField
							label={
								<>
									Teléfono <span className="text-red-500">*</span>
								</>
							}
							value={`${form.telefono_prefijo}${form.telefono_numero}`}
							onChange={(prefijo, numero) => {
								setForm((f) => ({ ...f, telefono_prefijo: prefijo, telefono_numero: numero }));
								setFieldErrors((prev) => (prev.telefono_numero ? { ...prev, telefono_numero: "" } : prev));
							}}
							error={fieldErrors.telefono_numero}
							required
							inputClassName="h-11 rounded-xl bg-paper text-sm transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 hover:border-brand-300 border-brand-200"
							selectClassName="h-11 rounded-xl bg-paper text-sm border-brand-200"
						/>
					</div>
				</div>
			</div>

			{/* 3. Seguridad */}
			<div className="rounded-2xl border border-brand-100 bg-paper p-6 shadow-sm transition-shadow hover:shadow-md">
				<h3 className="mb-5 border-b border-brand-50 pb-3 text-lg font-semibold text-brand-900">
					Seguridad y Acceso
				</h3>
				<div className="grid gap-5 sm:grid-cols-2">
					<div>
						<label className="mb-1.5 block text-sm font-medium text-brand-700">
							Contraseña <span className="text-red-500">*</span>
						</label>
						<PasswordField
							required
							value={form.contrasena}
							onChange={(value) => updateField("contrasena", value)}
							className={`h-11 w-full rounded-xl border bg-paper px-4 pr-10 text-sm outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 hover:border-brand-300 ${fieldErrors.contrasena ? "border-red-500" : "border-brand-200"}`}
							placeholder="Crea una contraseña segura"
						/>
						{fieldErrors.contrasena && (
							<p className="mt-1.5 text-xs font-medium text-red-500">{fieldErrors.contrasena}</p>
						)}
					</div>
					<div>
						<label className="mb-1.5 block text-sm font-medium text-brand-700">
							Confirmar contraseña <span className="text-red-500">*</span>
						</label>
						<PasswordField
							required
							value={form.confirmar_contrasena}
							onChange={(value) => updateField("confirmar_contrasena", value)}
							className={`h-11 w-full rounded-xl border bg-paper px-4 pr-10 text-sm outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 hover:border-brand-300 ${fieldErrors.confirmar_contrasena ? "border-red-500" : "border-brand-200"}`}
							placeholder="Repite la contraseña"
						/>
						{fieldErrors.confirmar_contrasena && (
							<p className="mt-1.5 text-xs font-medium text-red-500">{fieldErrors.confirmar_contrasena}</p>
						)}
					</div>
				</div>
			</div>

			{/* 4. Perfil Profesional */}
			<div className="rounded-2xl border border-brand-100 bg-paper p-6 shadow-sm transition-shadow hover:shadow-md">
				<h3 className="mb-5 border-b border-brand-50 pb-3 text-lg font-semibold text-brand-900">
					Perfil Profesional
				</h3>
				<div className="grid gap-5 sm:grid-cols-2">
					<div>
						<label className="mb-1.5 block text-sm font-medium text-brand-700">
							Especialidad <span className="text-red-500">*</span>
						</label>
						<select
							required
							disabled={loadingEspecialidades}
							className="h-11 w-full rounded-xl border border-brand-200 bg-paper px-4 text-sm outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 hover:border-brand-300 disabled:opacity-50"
							value={form.id_especialidad}
							onChange={(e) => updateField("id_especialidad", e.target.value)}
						>
							<option value="">
								{loadingEspecialidades ? "Cargando..." : "Selecciona una especialidad"}
							</option>
							{especialidades.map((esp) => (
								<option key={esp.id_especialidad} value={esp.id_especialidad}>
									{esp.nombre}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="mb-1.5 block text-sm font-medium text-brand-700">
							Porcentaje para especialista <span className="text-red-500">*</span>
						</label>
						<div className="relative">
							<input
								type="number"
								required
								min={1}
								max={100}
								step="0.01"
								className={`h-11 w-full rounded-xl border bg-paper px-4 pr-8 text-sm outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 hover:border-brand-300 ${fieldErrors.porcentaje ? "border-red-500" : "border-brand-200"}`}
								value={form.porcentaje}
								onChange={(e) => updateField("porcentaje", e.target.value)}
								placeholder="Ej: 35"
							/>
							<span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-brand-500">%</span>
						</div>
						{fieldErrors.porcentaje && (
							<p className="mt-1.5 text-xs font-medium text-red-500">{fieldErrors.porcentaje}</p>
						)}
					</div>

					<div className="sm:col-span-2">
						<label className="mb-1.5 block text-sm font-medium text-brand-700">
							Estudios (Ecos) Asignados <span className="text-red-500">*</span>
						</label>
						<div className="relative" ref={ecosDropdownRef}>
							<button
								type="button"
								ref={ecosButtonRef}
								onClick={handleToggleDropdown}
								disabled={loadingEcos}
								className={`flex h-11 w-full items-center justify-between rounded-xl border bg-paper px-4 text-left text-sm outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 hover:border-brand-300 disabled:opacity-50 ${fieldErrors.id_ecos ? "border-red-500" : "border-brand-200"}`}
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
								<ChevronDown className={`h-4 w-4 text-brand-500 transition-transform ${isEcosDropdownOpen ? "rotate-180" : ""}`} />
							</button>

							{/* Dropdown Menu */}
							{isEcosDropdownOpen && (
								<div
									className={`absolute z-50 w-full rounded-xl border border-brand-200 bg-paper shadow-xl max-h-60 overflow-auto ${dropdownPosition === "top" ? "bottom-full mb-1" : "top-full mt-1"}`}
								>
									{loadingEcos ? (
										<div className="p-4 text-sm text-brand-600 font-medium">Cargando ecos...</div>
									) : ecos.filter((eco) => eco.activo === 1).length === 0 ? (
										<div className="p-4 text-sm text-brand-600 font-medium">No hay ecos disponibles</div>
									) : (
										<div className="p-2 space-y-1">
											{ecos
												.filter((eco) => eco.activo === 1)
												.map((eco) => {
													const isSelected = form.id_ecos.includes(eco.id_eco);
													return (
														<button
															key={eco.id_eco}
															type="button"
															onClick={() => toggleEco(eco.id_eco)}
															className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all hover:bg-brand-50 ${isSelected ? "bg-brand-50/50" : ""}`}
														>
															<div
																className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${isSelected
																	? "border-brand-600 bg-brand-600 shadow-sm"
																	: "border-brand-300 bg-paper"
																	}`}
															>
																{isSelected && <Check className="h-3.5 w-3.5 text-white" />}
															</div>
															<span className={`flex-1 text-left ${isSelected ? "font-medium text-brand-900" : "text-brand-700"}`}>{eco.nombre}</span>
														</button>
													);
												})}
										</div>
									)}
								</div>
							)}
						</div>
						{fieldErrors.id_ecos && (
							<p className="mt-1.5 text-xs font-medium text-red-500">{fieldErrors.id_ecos}</p>
						)}
					</div>
				</div>
			</div>

			{/* Actions - Sticky if needed or just bottom */}
			<div className="flex gap-4 pt-4 pb-8">
				<button
					type="button"
					onClick={() => navigate("/especialistas")}
					className="flex-1 rounded-xl border-2 border-brand-200 bg-transparent px-6 py-3.5 text-sm font-semibold text-brand-700 shadow-sm transition-all hover:border-brand-300 hover:bg-brand-50 focus:outline-none focus:ring-4 focus:ring-brand-500/10 active:scale-[0.98]"
				>
					Cancelar
				</button>
				<button
					type="submit"
					disabled={isLoading}
					className="flex-1 rounded-xl bg-brand-700 px-6 py-3.5 text-sm font-semibold text-paper shadow-md transition-all hover:bg-brand-800 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-brand-500/20 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
				>
					{isLoading ? "Creando registro..." : "Registrar Especialista"}
				</button>
			</div>
		</form>
	);
};

export default RegistrarEspecialistaForm;
