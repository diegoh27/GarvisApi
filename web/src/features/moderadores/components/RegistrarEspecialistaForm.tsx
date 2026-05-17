import { useState, type FormEvent, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { PasswordField, formatNombreApellido, validarRangoCedula, MENSAJE_RANGO_CEDULA, CedulaField, TelefonoField, validarNumeroTelefono, MENSAJE_TELEFONO_7_DIGITOS } from "../../../shared";
import { useCrearEspecialistaMutation } from "../../admin/adminApi";
import { useGetEspecialidadesQuery } from "../../especialidades/especialidadesApi";
import { useGetEcosQuery } from "../../ecos/ecosApi";
import { ChevronDown, Check } from "lucide-react";

const RegistrarEspecialistaForm = () => {
	const navigate = useNavigate();
	const { data: especialidades = [], isLoading: loadingEspecialidades } =
		useGetEspecialidadesQuery();
	const { data: ecos = [], isLoading: loadingEcos } = useGetEcosQuery();
	const [crearEspecialista, { isLoading }] = useCrearEspecialistaMutation();

	const maxDate = new Date();
	maxDate.setFullYear(maxDate.getFullYear() - 18);
	const maxDateString = maxDate.toISOString().split("T")[0];

	const [form, setForm] = useState({
		nombre: "",
		apellido: "",
		correo: "",
		genero: "Masculino" as "Masculino" | "Femenino",
		fecha_nacimiento: "",
		tipo_cedula: "V" as "V" | "E" | "J" | "P" | "G",
		cedula: "",
		telefono_prefijo: "0412",
		telefono_numero: "",
		contrasena: "",
		confirmar_contrasena: "",
		id_especialidad: "",
		id_ecos: [] as string[], // Array de IDs de ecos seleccionados
	});
	const [error, setError] = useState("");
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [isEcosDropdownOpen, setIsEcosDropdownOpen] = useState(false);
	const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">("bottom");
	const ecosDropdownRef = useRef<HTMLDivElement>(null);
	const ecosButtonRef = useRef<HTMLButtonElement>(null);

	// Cerrar dropdown al hacer click fuera
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
			// Calcular si hay espacio abajo
			const rect = ecosButtonRef.current.getBoundingClientRect();
			const spaceBelow = window.innerHeight - rect.bottom;
			const spaceAbove = rect.top;
			const dropdownHeight = 240; // max-h-60 = 240px aproximadamente

			// Si no hay suficiente espacio abajo pero sí arriba, abrir hacia arriba
			if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
				setDropdownPosition("top");
			} else {
				setDropdownPosition("bottom");
			}
		}
		setIsEcosDropdownOpen(!isEcosDropdownOpen);
	};

	const validateField = (field: keyof typeof form, value: string | string[]): string => {
		switch (field) {
			case "nombre": {
				const val = value as string;
				if (!val.trim()) return "El nombre es requerido";
				if (val.length > 36) return "El nombre no puede superar 36 caracteres";
				return "";
			}
			case "apellido": {
				const val = value as string;
				if (!val.trim()) return "El apellido es requerido";
				if (val.length > 36) return "El apellido no puede superar 36 caracteres";
				return "";
			}
			case "cedula": {
				const val = value as string;
				if (!val.trim()) return "La cédula es requerida";
				if (!/^\d+$/.test(val)) return "La cédula solo puede contener números";
				if (!validarRangoCedula(val)) return MENSAJE_RANGO_CEDULA;
				return "";
			}
			case "fecha_nacimiento": {
				const val = value as string;
				if (!val.trim()) return "La fecha de nacimiento es requerida";
				const birth = new Date(val);
				const today = new Date();
				if (birth.getTime() > today.getTime()) return "La fecha de nacimiento no puede ser futura";
				let age = today.getFullYear() - birth.getFullYear();
				const m = today.getMonth() - birth.getMonth();
				if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
				if (age < 18) return "El especialista debe ser mayor de edad (18 años o más)";
				return "";
			}
			case "telefono_numero": {
				const val = value as string;
				if (!val.trim()) return "El número de teléfono es requerido";
				if (!validarNumeroTelefono(val)) return MENSAJE_TELEFONO_7_DIGITOS;
				return "";
			}
			case "correo": {
				const val = value as string;
				if (!val.trim()) return "El correo es requerido";
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(val)) return "Correo electrónico inválido";
				return "";
			}
			case "contrasena": {
				const val = value as string;
				if (!val) return "La contraseña es requerida";
				if (val.length < 6) return "La contraseña debe tener al menos 6 caracteres";
				return "";
			}
			case "confirmar_contrasena": {
				const val = value as string;
				if (!val) return "Confirma tu contraseña";
				if (val !== form.contrasena) return "Las contraseñas no coinciden";
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
			// Saltar campos que no se validan directamente
			if (field === "telefono_prefijo") return;

			const fieldValue = form[field as keyof typeof form];
			const fieldError = validateField(field as keyof typeof form, fieldValue);
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
		];
		const missing = required.filter(
			(field) => !form[field as keyof typeof form]
		);

		if (missing.length) {
			setError("Completa todos los campos obligatorios.");
			return;
		}

		// Validar que se haya seleccionado al menos un eco
		if (!form.id_ecos || form.id_ecos.length === 0) {
			setError("Debes seleccionar al menos un eco para el especialista.");
			return;
		}

		setFieldErrors(errors);
		if (Object.keys(errors).length > 0) {
			setError("Por favor, corrige los errores en el formulario.");
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
				porcentaje: 0,
				id_ecos: form.id_ecos,
			}).unwrap();

			await Swal.fire({
				icon: "success",
				title: "Especialista registrado",
				text: "El especialista ha sido registrado exitosamente.",
				timer: 2000,
				showConfirmButton: false,
			});

			navigate("/especialistas");
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
				<div className="rounded-lg bg-red-50 border border-red-200 p-3 text-base text-red-700">
					{error}
				</div>
			)}

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<label className="mb-1 block text-base font-medium text-brand-700">
						Nombre <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						required
						maxLength={36}
						className={`h-11 w-full rounded-lg border bg-paper px-3 text-base outline-none focus:border-brand-500 ${fieldErrors.nombre ? "border-red-500" : "border-brand-300"}`}
						value={form.nombre}
						onChange={(e) => updateField("nombre", e.target.value)}
					/>
					{fieldErrors.nombre && (
						<p className="mt-1 text-sm text-red-500">{fieldErrors.nombre}</p>
					)}
				</div>
				<div>
					<label className="mb-1 block text-base font-medium text-brand-700">
						Apellido <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						required
						maxLength={36}
						className={`h-11 w-full rounded-lg border bg-paper px-3 text-base outline-none focus:border-brand-500 ${fieldErrors.apellido ? "border-red-500" : "border-brand-300"}`}
						value={form.apellido}
						onChange={(e) => updateField("apellido", e.target.value)}
					/>
					{fieldErrors.apellido && (
						<p className="mt-1 text-sm text-red-500">{fieldErrors.apellido}</p>
					)}
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<label className="mb-1 block text-base font-medium text-brand-700">
						Correo electrónico <span className="text-red-500">*</span>
					</label>
					<input
						type="email"
						name="correo"
						autoComplete="email"
						required
						className={`h-11 w-full rounded-lg border bg-paper px-3 text-base outline-none focus:border-brand-500 ${fieldErrors.correo ? "border-red-500" : "border-brand-300"
							}`}
						value={form.correo}
						onChange={(e) => updateField("correo", e.target.value)}
					/>
					{fieldErrors.correo && (
						<p className="mt-1 text-sm text-red-500">{fieldErrors.correo}</p>
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
							const error = validateField("telefono_numero", numero);
							setFieldErrors((prev) => ({ ...prev, telefono_numero: error }));
						}}
						error={fieldErrors.telefono_numero}
						required
						inputClassName="h-11 rounded-lg bg-paper text-base"
						selectClassName="h-11 rounded-lg bg-paper text-base"
					/>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<PasswordField
						label="Contraseña"
						required
						value={form.contrasena}
						onChange={(value) => updateField("contrasena", value)}
						className={`h-11 w-full rounded-lg border bg-paper px-3 pr-10 text-base outline-none focus:border-brand-500 ${fieldErrors.contrasena ? "border-red-500" : "border-brand-300"
							}`}
					/>
					{fieldErrors.contrasena && (
						<p className="mt-1 text-sm text-red-500">{fieldErrors.contrasena}</p>
					)}
				</div>
				<div>
					<PasswordField
						label="Confirmar contraseña"
						required
						value={form.confirmar_contrasena}
						onChange={(value) => updateField("confirmar_contrasena", value)}
						className={`h-11 w-full rounded-lg border bg-paper px-3 pr-10 text-base outline-none focus:border-brand-500 ${fieldErrors.confirmar_contrasena ? "border-red-500" : "border-brand-300"
							}`}
					/>
					{fieldErrors.confirmar_contrasena && (
						<p className="mt-1 text-sm text-red-500">{fieldErrors.confirmar_contrasena}</p>
					)}
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<CedulaField
						label={
							<>
								Cédula <span className="text-red-500">*</span>
							</>
						}
						value={`${form.tipo_cedula}${form.cedula}`}
						onChange={(tipo, numero) => {
							setForm((f) => ({ ...f, tipo_cedula: tipo, cedula: numero }));
							const error = validateField("cedula", numero);
							setFieldErrors((prev) => ({ ...prev, cedula: error }));
						}}
						error={fieldErrors.cedula}
						required
						inputClassName="h-11 rounded-lg bg-paper text-base"
						selectClassName="h-11 rounded-lg bg-paper text-base"
					/>
				</div>
				<div>
					<label className="mb-1 block text-base font-medium text-brand-700">
						Género <span className="text-red-500">*</span>
					</label>
					<select
						required
						className="h-11 w-full rounded-lg border border-brand-300 bg-paper px-3 text-base outline-none focus:border-brand-500"
						value={form.genero}
						onChange={(e) =>
							updateField("genero", e.target.value as typeof form.genero)
						}
					>
						<option value="Masculino">Masculino</option>
						<option value="Femenino">Femenino</option>
					</select>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<label className="mb-1 block text-base font-medium text-brand-700">
						Fecha de nacimiento <span className="text-red-500">*</span>
					</label>
					<input
						type="date"
						required
						max={maxDateString}
						className={`h-11 w-full rounded-lg border bg-paper px-3 text-base outline-none focus:border-brand-500 ${fieldErrors.fecha_nacimiento ? "border-red-500" : "border-brand-300"}`}
						value={form.fecha_nacimiento}
						onChange={(e) => updateField("fecha_nacimiento", e.target.value)}
					/>
					{fieldErrors.fecha_nacimiento && (
						<p className="mt-1 text-sm text-red-500">{fieldErrors.fecha_nacimiento}</p>
					)}
				</div>
				<div>
					<label className="mb-1 block text-base font-medium text-brand-700">
						Especialidad <span className="text-red-500">*</span>
					</label>
					<select
						required
						disabled={loadingEspecialidades}
						className="h-11 w-full rounded-lg border border-brand-300 bg-paper px-3 text-base outline-none focus:border-brand-500 disabled:opacity-50"
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
				<label className="mb-1 block text-base font-medium text-brand-700">
					Ecos <span className="text-red-500">*</span>
				</label>
				<div className="relative" ref={ecosDropdownRef}>
					<button
						type="button"
						ref={ecosButtonRef}
						onClick={handleToggleDropdown}
						disabled={loadingEcos}
						className={`h-11 w-full rounded-lg border bg-paper px-3 text-left text-base outline-none focus:border-brand-500 disabled:opacity-50 flex items-center justify-between ${fieldErrors.id_ecos ? "border-red-500" : "border-brand-300"
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
								<div className="p-3 text-base text-brand-600">Cargando ecos...</div>
							) : ecos.filter((eco) => eco.activo === 1).length === 0 ? (
								<div className="p-3 text-base text-brand-600">No hay ecos disponibles</div>
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
													className={`w-full flex items-center gap-2 px-3 py-2 text-base rounded-md hover:bg-brand-50 transition-colors ${isSelected ? "bg-brand-50" : ""
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
					<p className="mt-1 text-sm text-red-500">{fieldErrors.id_ecos}</p>
				)}
			</div>

			<div className="flex gap-3 pt-4">
				<button
					type="button"
					onClick={() => navigate("/especialistas")}
					className="flex-1 rounded-lg border border-brand-300 bg-paper px-4 py-2 text-base font-medium text-brand-700 transition-colors hover:bg-brand-50"
				>
					Cancelar
				</button>
				<button
					type="submit"
					disabled={isLoading}
					className="flex-1 rounded-lg bg-brand-700 px-4 py-2 text-base font-medium text-paper transition-colors hover:bg-brand-800 disabled:opacity-50"
				>
					{isLoading ? "Registrando..." : "Registrar especialista"}
				</button>
			</div>
		</form>
	);
};

export default RegistrarEspecialistaForm;
