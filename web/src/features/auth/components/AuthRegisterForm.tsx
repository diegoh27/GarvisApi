import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PasswordField, useAuth, calculateRIF } from "../../../shared";

const AuthRegisterForm = () => {
	const navigate = useNavigate();
	const { register, login, status, error, resetError } = useAuth();
	const [form, setForm] = useState({
		nombre: "",
		apellido: "",
		correo: "",
		genero: "",
		fecha_nacimiento: "",
		cedula: "",
		telefono_prefijo: "0412",
		telefono_numero: "",
		direccion: "",
		tipo_sangre: "",
		descripcion: "",
		contrasena: "",
		confirmar_contrasena: "",
		rif: "",
		tipo_rif: "V", // Tipo de RIF: V (persona natural), E, J, P, G
	});
	const [localError, setLocalError] = useState("");
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [rifManuallyEdited, setRifManuallyEdited] = useState(false);
	const isLoading = status === "loading";

	// Tipos de sangre disponibles
	const tiposSangre = [
		"A+",
		"A-",
		"B+",
		"B-",
		"AB+",
		"AB-",
		"O+",
		"O-",
	];

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

	// Calcular RIF automáticamente cuando cambia la cédula o el tipo de RIF
	useEffect(() => {
		if (!rifManuallyEdited && form.cedula && form.cedula.length >= 6) {
			const calculatedRIF = calculateRIF(form.tipo_rif, form.cedula);
			if (calculatedRIF) {
				setForm((prev) => ({ ...prev, rif: calculatedRIF }));
			} else {
				// Si no se puede calcular (cédula inválida), limpiar el RIF
				setForm((prev) => ({ ...prev, rif: "" }));
			}
		} else if (!form.cedula || form.cedula.length < 6) {
			// Si la cédula es muy corta, limpiar el RIF
			setForm((prev) => ({ ...prev, rif: "" }));
		}
	}, [form.cedula, form.tipo_rif, rifManuallyEdited]);

	// Validaciones
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
			case "correo":
				if (!value.trim()) return "El correo es requerido";
				// Regex más robusto para validar correos electrónicos
				const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
				if (!emailRegex.test(value.trim())) return "Correo electrónico inválido";
				return "";
			case "fecha_nacimiento":
				if (!value) return "La fecha de nacimiento es requerida";
				const fechaNac = new Date(value);
				const hoy = new Date();
				const edad = hoy.getFullYear() - fechaNac.getFullYear();
				const mesDiff = hoy.getMonth() - fechaNac.getMonth();
				const diaDiff = hoy.getDate() - fechaNac.getDate();
				// Ya cumplió años este año si el mes es mayor, o mismo mes y día >= día de nacimiento
				const yaCumplioEsteAnio = mesDiff > 0 || (mesDiff === 0 && diaDiff >= 0);
				const edadReal = yaCumplioEsteAnio ? edad : edad - 1;
				if (edadReal < 18) return "Debes tener 18 años o más para registrarte";
				return "";
			case "genero":
				if (!value || value === "") return "El género es requerido";
				return "";
			case "cedula":
				if (!value.trim()) return "Debe colocar una cédula válida";
				if (!/^\d+$/.test(value)) return "Debe colocar una cédula válida";
				const cedulaNum = parseInt(value, 10);
				if (cedulaNum < 1000000 || cedulaNum > 40000000) return "Debe colocar una cédula válida";
				return "";
			case "telefono_numero":
				if (!value.trim()) return "El número de teléfono es requerido";
				if (!/^\d{7}$/.test(value)) return "El número debe tener 7 dígitos";
				return "";
			case "rif":
				// Si el usuario no coloca RIF, es válido: en el backend se usará la cédula como fallback.
				if (!value.trim()) return "";
				// Si coloca un RIF manualmente o el sistema lo calcula, aceptamos:
				// - Letra + 8 dígitos (V12345678)
				// - Letra + 9 dígitos (V123456789) cuando incluye dígito verificador
				if (!/^[VEJPG]\d{8,9}$/.test(value)) {
					return "El RIF debe tener formato V12345678 o V123456789";
				}
				return "";
			case "tipo_sangre":
				if (!value) return "El tipo de sangre es requerido";
				return "";
			case "direccion":
				if (value && value.length > 200) return "La dirección no puede exceder 200 caracteres";
				if (value && !/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s,.#-]+$/.test(value)) {
					return "La dirección contiene caracteres inválidos";
				}
				return "";
			case "descripcion":
				if (!value.trim()) return "La descripción es requerida";
				if (value.length > 500) return "La descripción no puede exceder 500 caracteres";
				return "";
			case "contrasena":
				if (!value) return "La contraseña es requerida";
				if (value.length < 6) return "La contraseña debe tener al menos 6 caracteres";
				if (value.length > 20) return "La contraseña no puede exceder 20 caracteres";
				if (!/[A-Z]/.test(value)) return "La contraseña debe contener al menos una mayúscula";
				if (!/[0-9]/.test(value)) return "La contraseña debe contener al menos un número";
				if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
					return "La contraseña debe contener al menos un carácter especial";
				}
				return "";
			case "confirmar_contrasena":
				if (!value) return "Confirma tu contraseña";
				if (value !== form.contrasena) return "Las contraseñas no coinciden";
				return "";
			default:
				return "";
		}
	};

	const updateField = (field: keyof typeof form, value: string) => {
		setForm((prev) => ({ ...prev, [field]: value }));

		// Validar el campo
		const error = validateField(field, value);
		setFieldErrors((prev) => ({ ...prev, [field]: error }));

		// Si se edita el RIF manualmente, marcar como editado
		if (field === "rif") {
			setRifManuallyEdited(true);
		}

		// Si se cambia la cédula o el tipo de RIF, permitir recalcular
		if (field === "cedula" || field === "tipo_rif") {
			setRifManuallyEdited(false);
		}

		// Si se cambia la contraseña, revalidar confirmar_contrasena
		if (field === "contrasena") {
			if (form.confirmar_contrasena) {
				const confirmError = validateField("confirmar_contrasena", form.confirmar_contrasena);
				setFieldErrors((prev) => ({ ...prev, confirmar_contrasena: confirmError }));
			}
		}

		// Validar telefono_numero cuando cambia telefono_prefijo
		if (field === "telefono_prefijo" && form.telefono_numero) {
			const telefonoError = validateField("telefono_numero", form.telefono_numero);
			setFieldErrors((prev) => ({ ...prev, telefono_numero: telefonoError }));
		}
	};

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setLocalError("");
		resetError();

		// Validar todos los campos
		const errors: Record<string, string> = {};
		Object.keys(form).forEach((field) => {
			// Saltar campos que no se validan directamente
			if (field === "telefono_prefijo") return;

			const error = validateField(field as keyof typeof form, form[field as keyof typeof form]);
			if (error) {
				errors[field] = error;
			}
		});

		setFieldErrors(errors);

		if (Object.keys(errors).length > 0) {
			setLocalError("Por favor, corrige los errores en el formulario.");
			return;
		}

		try {
			// Asegurar que siempre se envía un RIF:
			// - Preferimos el RIF calculado / ingresado
			// - Si por alguna razón viene vacío, usamos tipo_rif + cédula rellenada a 8 dígitos
			let rifToSend = form.rif.trim();
			if (!rifToSend && form.cedula) {
				const cedulaPadded = form.cedula.padStart(8, "0");
				rifToSend = `${form.tipo_rif}${cedulaPadded}`;
			}

			// Registrar paciente (el registro público solo crea pacientes)
			await register({
				nombre: form.nombre.trim(),
				apellido: form.apellido.trim(),
				correo: form.correo.trim(),
				genero: form.genero as "Masculino" | "Femenino",
				fecha_nacimiento: form.fecha_nacimiento,
				cedula: form.cedula,
				telefono: `${form.telefono_prefijo}${form.telefono_numero}`,
				tipo_sangre: form.tipo_sangre,
				descripcion: form.descripcion.trim(),
				contrasena: form.contrasena,
				direccion: form.direccion.trim() || undefined,
				rif: rifToSend,
			});

			// Iniciar sesión automáticamente después del registro
			// (siempre será paciente, así que redirigimos a /disponibilidad)
			await login({
				correo: form.correo.trim(),
				contrasena: form.contrasena,
			});

			// Redirigir al home de pacientes
			navigate("/disponibilidad", { replace: true });
		} catch {
			// error ya guardado en store
		}
	};

	return (
		<div className="pt-8">
			<h1 className="text-2xl font-semibold text-emerald-700">Registrarse</h1>
			<form className="mt-6 space-y-5" onSubmit={onSubmit}>
				<div>
					<label className="mb-1.5 block text-xs font-medium text-slate-500">
						Nombre
					</label>
					<input
						type="text"
						placeholder="Nombre"
						className={`h-11 w-full rounded-full border px-4 text-sm outline-none focus:border-emerald-500 ${fieldErrors.nombre ? "border-red-500" : "border-emerald-200"
							}`}
						value={form.nombre}
						onChange={(event) => updateField("nombre", event.target.value)}
						maxLength={30}
					/>
					{fieldErrors.nombre && (
						<p className="mt-1 text-xs text-red-500">{fieldErrors.nombre}</p>
					)}
				</div>
				<div>
					<label className="mb-1.5 block text-xs font-medium text-slate-500">
						Apellido
					</label>
					<input
						type="text"
						placeholder="Apellido"
						className={`h-11 w-full rounded-full border px-4 text-sm outline-none focus:border-emerald-500 ${fieldErrors.apellido ? "border-red-500" : "border-emerald-200"
							}`}
						value={form.apellido}
						onChange={(event) => updateField("apellido", event.target.value)}
						maxLength={30}
					/>
					{fieldErrors.apellido && (
						<p className="mt-1 text-xs text-red-500">{fieldErrors.apellido}</p>
					)}
				</div>
				<div>
					<label className="mb-1.5 block text-xs font-medium text-slate-500">
						Correo electrónico
					</label>
					<input
						type="email"
						placeholder="Correo"
						className={`h-11 w-full rounded-full border px-4 text-sm outline-none focus:border-emerald-500 ${fieldErrors.correo ? "border-red-500" : "border-emerald-200"
							}`}
						value={form.correo}
						onChange={(event) => updateField("correo", event.target.value)}
					/>
					{fieldErrors.correo && (
						<p className="mt-1 text-xs text-red-500">{fieldErrors.correo}</p>
					)}
				</div>
				<div className="grid gap-5 sm:grid-cols-2">
					<div>
						<label className="mb-1.5 block text-xs font-medium text-slate-500">
							Fecha de nacimiento
						</label>
						<input
							type="date"
							placeholder="Fecha de nacimiento"
							className={`h-11 w-full rounded-full border px-4 text-sm outline-none focus:border-emerald-500 ${fieldErrors.fecha_nacimiento ? "border-red-500" : "border-emerald-200"
								}`}
							value={form.fecha_nacimiento}
							max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
							onChange={(event) =>
								updateField("fecha_nacimiento", event.target.value)
							}
						/>
						{fieldErrors.fecha_nacimiento && (
							<p className="mt-1 text-xs text-red-500">{fieldErrors.fecha_nacimiento}</p>
						)}
					</div>
					<div>
						<label className="mb-1.5 block text-xs font-medium text-slate-500">
							Género
						</label>
						<select
							className={`h-11 w-full rounded-full border px-4 text-sm text-slate-500 outline-none focus:border-emerald-500 ${fieldErrors.genero ? "border-red-500" : "border-emerald-200"
								}`}
							value={form.genero}
							onChange={(event) => updateField("genero", event.target.value)}
						>
							<option value="">Selecciona género</option>
							<option>Femenino</option>
							<option>Masculino</option>
						</select>
						{fieldErrors.genero && (
							<p className="mt-1 text-xs text-red-500">{fieldErrors.genero}</p>
						)}
					</div>
				</div>
				<div>
					<label className="mb-1.5 block text-xs font-medium text-slate-500">
						Cédula de identidad
					</label>
					<div className="flex gap-2">
						<select
							className="h-11 w-20 rounded-full border border-emerald-200 px-3 text-sm outline-none focus:border-emerald-500"
							value={form.tipo_rif}
							onChange={(event) => updateField("tipo_rif", event.target.value)}
						>
							<option value="V">V</option>
							<option value="E">E</option>
							<option value="J">J</option>
							<option value="P">P</option>
							<option value="G">G</option>
						</select>
						<div className="flex-1">
							<input
								type="text"
								placeholder="Cédula de identidad"
								className={`h-11 w-full rounded-full border px-4 text-sm outline-none focus:border-emerald-500 ${fieldErrors.cedula ? "border-red-500" : "border-emerald-200"
									}`}
								value={form.cedula}
								onChange={(event) => updateField("cedula", event.target.value.replace(/\D/g, ""))}
								maxLength={8}
							/>
							{fieldErrors.cedula && (
								<p className="mt-1 text-xs text-red-500">{fieldErrors.cedula}</p>
							)}
						</div>
					</div>
				</div>
				<div>
					<label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-500">
						RIF
						<span
							className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-amber-400 bg-amber-50 text-[9px] font-bold text-amber-600"
							title="Si no tienes RIF, se usará tu cédula en su lugar."
						>
							!
						</span>
						<span className="text-slate-400 font-normal">(se calcula automáticamente)</span>
					</label>
					<p className="mb-1 text-[10px] text-amber-600">
						Si no tienes RIF, se usará tu cédula en su lugar.
					</p>
					<input
						type="text"
						placeholder="Ej: V12345678"
						className={`h-11 w-full rounded-full border px-4 text-sm outline-none focus:border-emerald-500 ${fieldErrors.rif ? "border-red-500" : "border-emerald-200"
							}`}
						value={form.rif}
						onChange={(event) => updateField("rif", event.target.value.toUpperCase())}
					/>
					{fieldErrors.rif && (
						<p className="mt-1 text-xs text-red-500">{fieldErrors.rif}</p>
					)}
					{form.rif && !fieldErrors.rif && (
						<div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2">
							<svg
								className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fillRule="evenodd"
									d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
									clipRule="evenodd"
								/>
							</svg>
							<p className="text-xs text-amber-800">
								Por favor, verifica que tus datos sean correctos antes de continuar.
							</p>
						</div>
					)}
				</div>
				<div>
					<label className="mb-1.5 block text-xs font-medium text-slate-500">
						Teléfono
					</label>
					<div className="flex gap-2">
						<select
							className="h-11 w-24 rounded-full border border-emerald-200 px-3 text-sm outline-none focus:border-emerald-500"
							value={form.telefono_prefijo}
							onChange={(event) => updateField("telefono_prefijo", event.target.value)}
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
								placeholder="Número (7 dígitos)"
								className={`h-11 w-full rounded-full border px-4 text-sm outline-none focus:border-emerald-500 ${fieldErrors.telefono_numero ? "border-red-500" : "border-emerald-200"
									}`}
								value={form.telefono_numero}
								onChange={(event) =>
									updateField("telefono_numero", event.target.value.replace(/\D/g, ""))
								}
								maxLength={7}
							/>
							{fieldErrors.telefono_numero && (
								<p className="mt-1 text-xs text-red-500">{fieldErrors.telefono_numero}</p>
							)}
						</div>
					</div>
				</div>
				<div>
					<label className="mb-1.5 block text-xs font-medium text-slate-500">
						Dirección <span className="text-slate-400 font-normal">(opcional)</span>
					</label>
					<input
						type="text"
						placeholder="Dirección"
						className={`h-11 w-full rounded-full border px-4 text-sm outline-none focus:border-emerald-500 ${fieldErrors.direccion ? "border-red-500" : "border-emerald-200"
							}`}
						value={form.direccion}
						onChange={(event) => updateField("direccion", event.target.value)}
						maxLength={200}
					/>
					{fieldErrors.direccion && (
						<p className="mt-1 text-xs text-red-500">{fieldErrors.direccion}</p>
					)}
				</div>
				<div>
					<label className="mb-1.5 block text-xs font-medium text-slate-500">
						Tipo de sangre
					</label>
					<select
						className={`h-11 w-full rounded-full border px-4 text-sm text-slate-500 outline-none focus:border-emerald-500 ${fieldErrors.tipo_sangre ? "border-red-500" : "border-emerald-200"
							}`}
						value={form.tipo_sangre}
						onChange={(event) => updateField("tipo_sangre", event.target.value)}
					>
						<option value="">Selecciona tipo de sangre</option>
						{tiposSangre.map((tipo) => (
							<option key={tipo} value={tipo}>
								{tipo}
							</option>
						))}
					</select>
					{fieldErrors.tipo_sangre && (
						<p className="mt-1 text-xs text-red-500">{fieldErrors.tipo_sangre}</p>
					)}
				</div>
				<div>
					<textarea
						placeholder="Descripción (padecimientos o notas)"
						className={`min-h-[90px] w-full rounded-[24px] border px-4 py-3 text-sm outline-none focus:border-emerald-500 ${fieldErrors.descripcion ? "border-red-500" : "border-emerald-200"
							}`}
						value={form.descripcion}
						onChange={(event) => updateField("descripcion", event.target.value)}
						maxLength={500}
					/>
					{fieldErrors.descripcion && (
						<p className="mt-1 text-xs text-red-500">{fieldErrors.descripcion}</p>
					)}
				</div>
				<div>
					<label className="mb-1.5 block text-xs font-medium text-slate-500">
						Contraseña
					</label>
					<PasswordField
						value={form.contrasena}
						onChange={(value) => updateField("contrasena", value)}
						placeholder="Contraseña"
						className={`h-11 w-full rounded-full border px-4 pr-10 text-sm outline-none focus:border-emerald-500 ${fieldErrors.contrasena ? "border-red-500" : "border-emerald-200"
							}`}
					/>
					{fieldErrors.contrasena && (
						<p className="mt-1 text-xs text-red-500">{fieldErrors.contrasena}</p>
					)}
				</div>
				<div>
					<label className="mb-1.5 block text-xs font-medium text-slate-500">
						Confirmar contraseña
					</label>
					<PasswordField
						value={form.confirmar_contrasena}
						onChange={(value) => updateField("confirmar_contrasena", value)}
						placeholder="Confirmar contraseña"
						className={`h-11 w-full rounded-full border px-4 pr-10 text-sm outline-none focus:border-emerald-500 ${fieldErrors.confirmar_contrasena ? "border-red-500" : "border-emerald-200"
							}`}
					/>
					{fieldErrors.confirmar_contrasena && (
						<p className="mt-1 text-xs text-red-500">{fieldErrors.confirmar_contrasena}</p>
					)}
				</div>
				{localError ? <p className="text-sm text-rose-500">{localError}</p> : null}
				{error ? <p className="text-sm text-rose-500">{error}</p> : null}
				<button
					className="h-11 w-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 text-sm font-semibold text-white shadow-md transition hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-70"
					disabled={isLoading}
				>
					{isLoading ? "Registrando..." : "Regístrate"}
				</button>
				<p className="text-sm text-slate-500">
					¿Ya tienes una cuenta?{" "}
					<Link to="/auth/login" className="font-semibold text-emerald-700">
						Inicia sesión aquí
					</Link>
					.
				</p>
			</form>
		</div>
	);
};

export default AuthRegisterForm;
