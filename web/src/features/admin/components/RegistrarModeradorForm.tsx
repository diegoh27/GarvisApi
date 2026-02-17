import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { PasswordField, formatNombreApellido, TelefonoField, parseTelefonoDisplay, validarNumeroTelefono, MENSAJE_TELEFONO_REQUERIDO, MENSAJE_TELEFONO_7_DIGITOS } from "../../../shared";
import { useCrearModeradorMutation } from "../adminApi";

const RegistrarModeradorForm = () => {
	const navigate = useNavigate();
	const [crearModerador, { isLoading }] = useCrearModeradorMutation();

	const [form, setForm] = useState({
		nombre: "",
		apellido: "",
		correo: "",
		telefono: "",
		contrasena: "",
		confirmar_contrasena: "",
	});

	const [error, setError] = useState("");
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	const updateField = (field: keyof typeof form, value: string) => {
		setForm((prev) => ({ ...prev, [field]: value }));
		if (fieldErrors[field]) {
			setFieldErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors[field];
				return newErrors;
			});
		}
		if (error) setError("");
	};

	const validateField = (field: keyof typeof form, value: string): string => {
		switch (field) {
			case "nombre":
				if (!value.trim()) return "El nombre es requerido";
				if (value.trim().length < 2) return "El nombre debe tener al menos 2 caracteres";
				break;
			case "apellido":
				if (!value.trim()) return "El apellido es requerido";
				if (value.trim().length < 2) return "El apellido debe tener al menos 2 caracteres";
				break;
			case "correo":
				if (!value.trim()) return "El correo es requerido";
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(value)) return "El correo no es válido";
				break;
			case "telefono":
				if (!value.trim()) return MENSAJE_TELEFONO_REQUERIDO;
				if (!validarNumeroTelefono(parseTelefonoDisplay(value).numero)) return MENSAJE_TELEFONO_7_DIGITOS;
				break;
			case "contrasena":
				if (!value) return "La contraseña es requerida";
				if (value.length < 6) return "La contraseña debe tener al menos 6 caracteres";
				break;
			case "confirmar_contrasena":
				if (!value) return "Debes confirmar la contraseña";
				if (value !== form.contrasena) return "Las contraseñas no coinciden";
				break;
		}
		return "";
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError("");

		// Validar todos los campos
		const errors: Record<string, string> = {};
		Object.keys(form).forEach((key) => {
			const field = key as keyof typeof form;
			const error = validateField(field, form[field]);
			if (error) errors[field] = error;
		});

		if (Object.keys(errors).length > 0) {
			setFieldErrors(errors);
			return;
		}

		try {
			// El backend requiere más campos, así que enviamos valores por defecto
			await crearModerador({
				nombre: formatNombreApellido(form.nombre),
				apellido: formatNombreApellido(form.apellido),
				correo: form.correo.trim(),
				telefono: form.telefono.trim(),
				contrasena: form.contrasena,
				genero: "Masculino", // Valor por defecto
				cedula: `MOD-${Date.now()}`, // Generar cédula temporal única
				fecha_nacimiento: "1990-01-01", // Valor por defecto
			}).unwrap();

			await Swal.fire({
				icon: "success",
				title: "Moderador creado",
				text: "El moderador ha sido registrado exitosamente.",
				timer: 2000,
				showConfirmButton: false,
			});

			navigate("/usuarios");
		} catch (err: any) {
			const errorMessage =
				err?.data?.message || err?.message || "Error al crear el moderador";
			setError(errorMessage);
			Swal.fire({
				icon: "error",
				title: "Error",
				text: errorMessage,
			});
		}
	};

	return (
		<div className="mx-auto max-w-2xl">
			<div className="rounded-2xl border border-brand-200 bg-paper p-6 shadow-sm">
				<h2 className="mb-6 text-2xl font-semibold text-brand-900">
					Registrar Moderador
				</h2>

				{error && (
					<div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<label className="mb-1 block text-sm font-medium text-brand-700">
								Nombre <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								required
								value={form.nombre}
								onChange={(e) => updateField("nombre", e.target.value)}
								onBlur={(e) => {
									const error = validateField("nombre", e.target.value);
									if (error) {
										setFieldErrors((prev) => ({ ...prev, nombre: error }));
									}
								}}
								className={`h-10 w-full rounded-lg border bg-paper px-3 text-sm outline-none focus:border-brand-500 ${fieldErrors.nombre ? "border-red-500" : "border-brand-300"
									}`}
								placeholder="Ingresa el nombre"
							/>
							{fieldErrors.nombre && (
								<p className="mt-1 text-xs text-red-500">{fieldErrors.nombre}</p>
							)}
						</div>

						<div>
							<label className="mb-1 block text-sm font-medium text-brand-700">
								Apellido <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								required
								value={form.apellido}
								onChange={(e) => updateField("apellido", e.target.value)}
								onBlur={(e) => {
									const error = validateField("apellido", e.target.value);
									if (error) {
										setFieldErrors((prev) => ({ ...prev, apellido: error }));
									}
								}}
								className={`h-10 w-full rounded-lg border bg-paper px-3 text-sm outline-none focus:border-brand-500 ${fieldErrors.apellido ? "border-red-500" : "border-brand-300"
									}`}
								placeholder="Ingresa el apellido"
							/>
							{fieldErrors.apellido && (
								<p className="mt-1 text-xs text-red-500">{fieldErrors.apellido}</p>
							)}
						</div>
					</div>

					<div>
						<TelefonoField
							label={
								<>
									Teléfono <span className="text-red-500">*</span>
								</>
							}
							value={form.telefono}
							onChange={(prefijo, numero) => {
								const full = prefijo + numero;
								setForm((prev) => ({ ...prev, telefono: full }));
								if (fieldErrors.telefono) {
									setFieldErrors((prev) => ({ ...prev, telefono: "" }));
								}
							}}
							error={fieldErrors.telefono}
							required
							inputClassName="h-10 rounded-lg bg-paper text-sm"
							selectClassName="h-10 rounded-lg bg-paper text-sm"
						/>
					</div>

					<div>
						<label className="mb-1 block text-sm font-medium text-brand-700">
							Correo electrónico <span className="text-red-500">*</span>
						</label>
						<input
							type="email"
							required
							value={form.correo}
							onChange={(e) => updateField("correo", e.target.value)}
							onBlur={(e) => {
								const error = validateField("correo", e.target.value);
								if (error) {
									setFieldErrors((prev) => ({ ...prev, correo: error }));
								}
							}}
							className={`h-10 w-full rounded-lg border bg-paper px-3 text-sm outline-none focus:border-brand-500 ${fieldErrors.correo ? "border-red-500" : "border-brand-300"
								}`}
							placeholder="correo@ejemplo.com"
						/>
						{fieldErrors.correo && (
							<p className="mt-1 text-xs text-red-500">{fieldErrors.correo}</p>
						)}
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<label className="mb-1 block text-sm font-medium text-brand-700">
								Contraseña <span className="text-red-500">*</span>
							</label>
							<PasswordField
								value={form.contrasena}
								onChange={(value) => updateField("contrasena", value)}
								onBlur={() => {
									const error = validateField("contrasena", form.contrasena);
									if (error) {
										setFieldErrors((prev) => ({ ...prev, contrasena: error }));
									}
								}}
								className={`h-10 w-full rounded-lg border bg-paper px-3 text-sm outline-none focus:border-brand-500 ${fieldErrors.contrasena ? "border-red-500" : "border-brand-300"
									}`}
								placeholder="Mínimo 6 caracteres"
							/>
							{fieldErrors.contrasena && (
								<p className="mt-1 text-xs text-red-500">{fieldErrors.contrasena}</p>
							)}
						</div>

						<div>
							<label className="mb-1 block text-sm font-medium text-brand-700">
								Confirmar contraseña <span className="text-red-500">*</span>
							</label>
							<PasswordField
								value={form.confirmar_contrasena}
								onChange={(value) => updateField("confirmar_contrasena", value)}
								onBlur={() => {
									const error = validateField("confirmar_contrasena", form.confirmar_contrasena);
									if (error) {
										setFieldErrors((prev) => ({ ...prev, confirmar_contrasena: error }));
									}
								}}
								className={`h-10 w-full rounded-lg border bg-paper px-3 text-sm outline-none focus:border-brand-500 ${fieldErrors.confirmar_contrasena ? "border-red-500" : "border-brand-300"
									}`}
								placeholder="Repite la contraseña"
							/>
							{fieldErrors.confirmar_contrasena && (
								<p className="mt-1 text-xs text-red-500">{fieldErrors.confirmar_contrasena}</p>
							)}
						</div>
					</div>

					<div className="flex gap-3 pt-4">
						<button
							type="button"
							onClick={() => navigate("/usuarios")}
							className="flex-1 rounded-lg border border-brand-300 bg-paper px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={isLoading}
							className="flex-1 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-brand-800 disabled:opacity-50"
						>
							{isLoading ? "Creando..." : "Crear moderador"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default RegistrarModeradorForm;
