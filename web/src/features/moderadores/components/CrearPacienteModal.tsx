import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import Swal from "sweetalert2";
import {
	CedulaField,
	PasswordField,
	TelefonoField,
	formatNombreApellido,
	parseCedulaDisplay,
	parseTelefonoDisplay,
	validarNumeroTelefono,
	validarRangoCedula,
	MENSAJE_RANGO_CEDULA,
	MENSAJE_TELEFONO_REQUERIDO,
	MENSAJE_TELEFONO_7_DIGITOS,
	type TelefonoPrefix,
} from "../../../shared";
import { useCreatePacienteMutation } from "../moderadoresApi";

const TIPOS_SANGRE = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

type CrearPacienteModalProps = {
	isOpen: boolean;
	onClose: () => void;
	onSuccess?: () => void | Promise<void>;
};

type FormState = {
	nombre: string;
	apellido: string;
	correo: string;
	telefono: string;
	cedula: string;
	genero: "Masculino" | "Femenino" | "Otro";
	fecha_nacimiento: string;
	contrasena: string;
	confirmar_contrasena: string;
	tipo_sangre: string;
	descripcion: string;
	direccion: string;
	contacto_emergencia_nombre: string;
	contacto_emergencia_telefono: string;
};

const emptyForm = (): FormState => ({
	nombre: "",
	apellido: "",
	correo: "",
	telefono: "",
	cedula: "",
	genero: "Masculino",
	fecha_nacimiento: "",
	contrasena: "",
	confirmar_contrasena: "",
	tipo_sangre: "",
	descripcion: "",
	direccion: "",
	contacto_emergencia_nombre: "",
	contacto_emergencia_telefono: "",
});

const CrearPacienteModal = ({ isOpen, onClose, onSuccess }: CrearPacienteModalProps) => {
	const [crearPaciente, { isLoading }] = useCreatePacienteMutation();
	const [form, setForm] = useState<FormState>(emptyForm);
	const [error, setError] = useState("");
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
		setForm((prev) => ({ ...prev, [field]: value }));
		if (fieldErrors[field as string]) {
			setFieldErrors((prev) => {
				const next = { ...prev };
				delete next[field as string];
				return next;
			});
		}
		if (error) setError("");
	};

	const validateField = (field: keyof FormState, value: string, current: FormState): string => {
		switch (field) {
			case "nombre":
				if (!value.trim()) return "El nombre es requerido";
				if (value.trim().length < 2) return "El nombre debe tener al menos 2 caracteres";
				if (value.length > 30) return "El nombre no puede exceder 30 caracteres";
				if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) return "El nombre solo puede contener letras";
				return "";
			case "apellido":
				if (!value.trim()) return "El apellido es requerido";
				if (value.trim().length < 2) return "El apellido debe tener al menos 2 caracteres";
				if (value.length > 30) return "El apellido no puede exceder 30 caracteres";
				if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) return "El apellido solo puede contener letras";
				return "";
			case "correo": {
				if (!value.trim()) return "El correo es requerido";
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(value)) return "El correo no es válido";
				return "";
			}
			case "telefono":
				if (!value.trim()) return MENSAJE_TELEFONO_REQUERIDO;
				if (!validarNumeroTelefono(parseTelefonoDisplay(value).number)) return MENSAJE_TELEFONO_7_DIGITOS;
				return "";
			case "contrasena":
				if (!value) return "La contraseña es requerida";
				if (value.length < 6) return "La contraseña debe tener al menos 6 caracteres";
				if (value.length > 20) return "La contraseña no puede exceder 20 caracteres";
				if (!/[A-Z]/.test(value)) return "La contraseña debe contener al menos una mayúscula";
				if (!/[0-9]/.test(value)) return "La contraseña debe contener al menos un número";
				if (!/[!@#$%^&*(),.?":{}|<>]/.test(value))
					return "La contraseña debe contener al menos un carácter especial";
				return "";
			case "confirmar_contrasena":
				if (!value) return "Debes confirmar la contraseña";
				if (value !== current.contrasena) return "Las contraseñas no coinciden";
				return "";
			case "cedula": {
				const { numero } = parseCedulaDisplay(value);
				if (!numero) return "La cédula es requerida";
				if (!validarRangoCedula(numero)) return MENSAJE_RANGO_CEDULA;
				return "";
			}
			case "fecha_nacimiento": {
				if (!value.trim()) return "La fecha de nacimiento es requerida";
				const fechaNac = new Date(value);
				const hoy = new Date();
				hoy.setHours(23, 59, 59, 999);
				if (fechaNac.getTime() > hoy.getTime()) return "La fecha de nacimiento no puede ser futura";
				const hace100Anos = new Date();
				hace100Anos.setFullYear(hoy.getFullYear() - 100);
				if (fechaNac.getTime() < hace100Anos.getTime())
					return "La fecha de nacimiento no puede ser mayor a 100 años";
				const edad = hoy.getFullYear() - fechaNac.getFullYear();
				const mesDiff = hoy.getMonth() - fechaNac.getMonth();
				const diaDiff = hoy.getDate() - fechaNac.getDate();
				const yaCumplioEsteAnio = mesDiff > 0 || (mesDiff === 0 && diaDiff >= 0);
				const edadReal = yaCumplioEsteAnio ? edad : edad - 1;
				if (edadReal < 18) return "El paciente debe ser mayor de edad (18 años o más)";
				return "";
			}
			case "tipo_sangre":
				if (!value) return "El tipo de sangre es requerido";
				return "";
			case "descripcion":
				if (!value.trim()) return "La descripción / motivo de consulta es requerida";
				if (value.length > 500) return "La descripción no puede exceder 500 caracteres";
				return "";
			case "contacto_emergencia_telefono": {
				const t = value.trim();
				if (!t) return "";
				if (!validarNumeroTelefono(parseTelefonoDisplay(t).number)) return MENSAJE_TELEFONO_7_DIGITOS;
				return "";
			}
			default:
				return "";
		}
	};

	const handleClose = () => {
		if (!isLoading) {
			setForm(emptyForm());
			setError("");
			setFieldErrors({});
			onClose();
		}
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError("");

		const fields: (keyof FormState)[] = [
			"nombre",
			"apellido",
			"cedula",
			"correo",
			"telefono",
			"fecha_nacimiento",
			"contrasena",
			"confirmar_contrasena",
			"tipo_sangre",
			"descripcion",
			"contacto_emergencia_telefono",
		];
		const errors: Record<string, string> = {};
		for (const key of fields) {
			const err = validateField(key, String(form[key]), form);
			if (err) errors[key] = err;
		}
		if (Object.keys(errors).length > 0) {
			setFieldErrors(errors);
			return;
		}

		try {
			await crearPaciente({
				nombre: formatNombreApellido(form.nombre),
				apellido: formatNombreApellido(form.apellido),
				genero: form.genero,
				cedula: form.cedula.trim(),
				correo: form.correo.trim(),
				telefono: form.telefono.trim(),
				contrasena: form.contrasena,
				fecha_nacimiento: form.fecha_nacimiento,
				tipo_sangre: form.tipo_sangre,
				descripcion: form.descripcion.trim(),
				direccion: form.direccion.trim() || undefined,
				contacto_emergencia_nombre: form.contacto_emergencia_nombre.trim() || undefined,
				contacto_emergencia_telefono: form.contacto_emergencia_telefono.trim() || undefined,
			}).unwrap();

			await Swal.fire({
				icon: "success",
				title: "Paciente creado",
				text: "El paciente fue registrado correctamente.",
				timer: 2200,
				showConfirmButton: false,
			});
			await onSuccess?.();
			handleClose();
		} catch (err: unknown) {
			const message =
				err && typeof err === "object" && "data" in err && err.data && typeof err.data === "object"
					? String((err.data as { message?: string }).message ?? "")
					: "";
			const text = message || "No se pudo crear el paciente.";
			setError(text);
			await Swal.fire({ icon: "error", title: "Error", text });
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="crear-paciente-titulo"
		>
			<div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
				<div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
					<h2 id="crear-paciente-titulo" className="font-headline text-lg font-bold text-brand-900">
						Nuevo paciente
					</h2>
					<button
						type="button"
						onClick={handleClose}
						disabled={isLoading}
						className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-900 disabled:opacity-50"
						aria-label="Cerrar"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
					{error && (
						<div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-base text-red-700">
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
								value={form.nombre}
								onChange={(e) => updateField("nombre", e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""))}
								className={`h-10 w-full rounded-lg border bg-white px-3 text-base outline-none focus:border-[#006965] ${fieldErrors.nombre ? "border-red-500" : "border-slate-200"}`}
							/>
							{fieldErrors.nombre && <p className="mt-1 text-sm text-red-500">{fieldErrors.nombre}</p>}
						</div>
						<div>
							<label className="mb-1 block text-base font-medium text-brand-700">
								Apellido <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								required
								value={form.apellido}
								onChange={(e) => updateField("apellido", e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""))}
								className={`h-10 w-full rounded-lg border bg-white px-3 text-base outline-none focus:border-[#006965] ${fieldErrors.apellido ? "border-red-500" : "border-slate-200"}`}
							/>
							{fieldErrors.apellido && <p className="mt-1 text-sm text-red-500">{fieldErrors.apellido}</p>}
						</div>
					</div>

					<CedulaField
						label={
							<>
								Cédula <span className="text-red-500">*</span>
							</>
						}
						value={form.cedula}
						onChange={(tipo, numero) => updateField("cedula", tipo + numero)}
						error={fieldErrors.cedula}
						required
						inputClassName="h-10 rounded-lg bg-white text-base"
						selectClassName="h-10 rounded-lg bg-white text-base"
					/>

					<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<label className="mb-1 block text-base font-medium text-brand-700">
								Género <span className="text-red-500">*</span>
							</label>
							<select
								value={form.genero}
								onChange={(e) =>
									updateField("genero", e.target.value as FormState["genero"])
								}
								className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#006965]"
							>
								<option value="Masculino">Masculino</option>
								<option value="Femenino">Femenino</option>
								<option value="Otro">Otro</option>
							</select>
						</div>
						<div>
							<label className="mb-1 block text-base font-medium text-brand-700">
								Fecha de nacimiento <span className="text-red-500">*</span>
							</label>
							<input
								type="date"
								value={form.fecha_nacimiento}
								onChange={(e) => updateField("fecha_nacimiento", e.target.value)}
								className={`h-10 w-full rounded-lg border bg-white px-3 text-base outline-none focus:border-[#006965] ${fieldErrors.fecha_nacimiento ? "border-red-500" : "border-slate-200"}`}
							/>
							{fieldErrors.fecha_nacimiento && (
								<p className="mt-1 text-sm text-red-500">{fieldErrors.fecha_nacimiento}</p>
							)}
						</div>
					</div>

					<div>
						<label className="mb-1 block text-base font-medium text-brand-700">
							Correo electrónico <span className="text-red-500">*</span>
						</label>
						<input
							type="email"
							required
							value={form.correo}
							onChange={(e) => updateField("correo", e.target.value)}
							className={`h-10 w-full rounded-lg border bg-white px-3 text-base outline-none focus:border-[#006965] ${fieldErrors.correo ? "border-red-500" : "border-slate-200"}`}
							placeholder="correo@ejemplo.com"
						/>
						{fieldErrors.correo && <p className="mt-1 text-sm text-red-500">{fieldErrors.correo}</p>}
					</div>

					<TelefonoField
						label={
							<>
								Teléfono <span className="text-red-500">*</span>
							</>
						}
						value={form.telefono}
						onChange={(prefijo: TelefonoPrefix, numero: string) => {
							updateField("telefono", prefijo + numero);
						}}
						error={fieldErrors.telefono}
						required
						inputClassName="h-10 rounded-lg bg-white text-base"
						selectClassName="h-10 rounded-lg bg-white text-base"
					/>

					<div>
						<label className="mb-1 block text-base font-medium text-brand-700">
							Tipo de sangre <span className="text-red-500">*</span>
						</label>
						<select
							value={form.tipo_sangre}
							onChange={(e) => updateField("tipo_sangre", e.target.value)}
							className={`h-10 w-full rounded-lg border bg-white px-3 text-base outline-none focus:border-[#006965] ${fieldErrors.tipo_sangre ? "border-red-500" : "border-slate-200"}`}
						>
							<option value="">Seleccione…</option>
							{TIPOS_SANGRE.map((t) => (
								<option key={t} value={t}>
									{t}
								</option>
							))}
						</select>
						{fieldErrors.tipo_sangre && (
							<p className="mt-1 text-sm text-red-500">{fieldErrors.tipo_sangre}</p>
						)}
					</div>

					<div>
						<label className="mb-1 block text-base font-medium text-brand-700">
							Descripción / motivo de consulta <span className="text-red-500">*</span>
						</label>
						<textarea
							value={form.descripcion}
							onChange={(e) => updateField("descripcion", e.target.value)}
							rows={3}
							className={`w-full rounded-lg border bg-white px-3 py-2 text-base outline-none focus:border-[#006965] ${fieldErrors.descripcion ? "border-red-500" : "border-slate-200"}`}
							placeholder="Breve descripción clínica o motivo de registro"
						/>
						{fieldErrors.descripcion && (
							<p className="mt-1 text-sm text-red-500">{fieldErrors.descripcion}</p>
						)}
					</div>

					<div>
						<label className="mb-1 block text-base font-medium text-brand-700">Dirección</label>
						<input
							type="text"
							value={form.direccion}
							onChange={(e) => updateField("direccion", e.target.value)}
							className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#006965]"
							placeholder="Opcional"
						/>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<label className="mb-1 block text-base font-medium text-brand-700">
								Contacto de emergencia (nombre)
							</label>
							<input
								type="text"
								value={form.contacto_emergencia_nombre}
								onChange={(e) => updateField("contacto_emergencia_nombre", e.target.value)}
								className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#006965]"
								placeholder="Opcional"
							/>
						</div>
						<div>
							<label className="mb-1 block text-base font-medium text-brand-700">
								Contacto de emergencia (teléfono)
							</label>
							<input
								type="text"
								value={form.contacto_emergencia_telefono}
								onChange={(e) => updateField("contacto_emergencia_telefono", e.target.value)}
								className={`h-10 w-full rounded-lg border bg-white px-3 text-base outline-none focus:border-[#006965] ${fieldErrors.contacto_emergencia_telefono ? "border-red-500" : "border-slate-200"}`}
								placeholder="Opcional (0412…)"
							/>
							{fieldErrors.contacto_emergencia_telefono && (
								<p className="mt-1 text-sm text-red-500">{fieldErrors.contacto_emergencia_telefono}</p>
							)}
						</div>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<label className="mb-1 block text-base font-medium text-brand-700">
								Contraseña de acceso <span className="text-red-500">*</span>
							</label>
							<PasswordField
								value={form.contrasena}
								onChange={(v) => updateField("contrasena", v)}
								className={`h-10 w-full rounded-lg border bg-white px-3 text-base outline-none focus:border-[#006965] ${fieldErrors.contrasena ? "border-red-500" : "border-slate-200"}`}
								placeholder="Mín. 6 caracteres, mayúscula, número y especial"
							/>
							{fieldErrors.contrasena && (
								<p className="mt-1 text-sm text-red-500">{fieldErrors.contrasena}</p>
							)}
						</div>
						<div>
							<label className="mb-1 block text-base font-medium text-brand-700">
								Confirmar contraseña <span className="text-red-500">*</span>
							</label>
							<PasswordField
								value={form.confirmar_contrasena}
								onChange={(v) => updateField("confirmar_contrasena", v)}
								className={`h-10 w-full rounded-lg border bg-white px-3 text-base outline-none focus:border-[#006965] ${fieldErrors.confirmar_contrasena ? "border-red-500" : "border-slate-200"}`}
								placeholder="Repite la contraseña"
							/>
							{fieldErrors.confirmar_contrasena && (
								<p className="mt-1 text-sm text-red-500">{fieldErrors.confirmar_contrasena}</p>
							)}
						</div>
					</div>

					<div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
						<button
							type="button"
							onClick={handleClose}
							disabled={isLoading}
							className="rounded-xl border border-slate-200 px-5 py-2.5 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={isLoading}
							className="rounded-xl bg-[#006965] px-5 py-2.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-[#005752] disabled:opacity-50"
						>
							{isLoading ? "Guardando…" : "Crear paciente"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default CrearPacienteModal;
