import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PasswordField } from "../../../shared";
import { useResetPasswordMutation } from "../authApi";

const validatePassword = (value: string): string => {
	if (!value) return "La contraseña es requerida";
	if (value.length < 6) return "La contraseña debe tener al menos 6 caracteres";
	if (value.length > 20) return "La contraseña no puede exceder 20 caracteres";
	if (!/[A-Z]/.test(value)) return "La contraseña debe contener al menos una mayúscula";
	if (!/[0-9]/.test(value)) return "La contraseña debe contener al menos un número";
	if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
		return "La contraseña debe contener al menos un carácter especial (!@#$%^&*(),.?\":{}|<>)";
	}
	return "";
};

const AuthResetForm = () => {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token") || "";
	const [resetPassword] = useResetPasswordMutation();

	const [contrasena, setContrasena] = useState("");
	const [confirmarContrasena, setConfirmarContrasena] = useState("");
	const [error, setError] = useState("");
	const [fieldErrors, setFieldErrors] = useState<{
		contrasena?: string;
		confirmar?: string;
	}>({});
	const [isLoading, setIsLoading] = useState(false);

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setFieldErrors({});

		const pwdErr = validatePassword(contrasena);
		if (pwdErr) {
			setFieldErrors((prev) => ({ ...prev, contrasena: pwdErr }));
			return;
		}
		if (!confirmarContrasena) {
			setFieldErrors((prev) => ({
				...prev,
				confirmar: "Confirma tu contraseña",
			}));
			return;
		}
		if (contrasena !== confirmarContrasena) {
			setFieldErrors((prev) => ({
				...prev,
				confirmar: "Las contraseñas no coinciden",
			}));
			return;
		}

		if (!token) {
			setError("Enlace inválido o expirado. Solicita uno nuevo desde Olvidé mi contraseña.");
			return;
		}

		setIsLoading(true);
		try {
			await resetPassword({ token, contrasena }).unwrap();
			navigate("/auth/login?passwordReset=1", { replace: true });
		} catch (err: unknown) {
			const msg =
				err && typeof err === "object" && "data" in err
					? (err.data as { message?: string })?.message
					: "Error al actualizar la contraseña. El enlace pudo haber expirado.";
			setError(msg || "Error al actualizar la contraseña.");
		} finally {
			setIsLoading(false);
		}
	};

	if (!token) {
		return (
			<div className="pt-8">
				<h1 className="text-2xl font-semibold text-emerald-700">
					Restablecer contraseña
				</h1>
				<p className="mt-4 text-base text-rose-600">
					Enlace inválido o faltante. Por favor, solicita un nuevo correo de
					recuperación.
				</p>
				<Link
					to="/auth/forgot"
					className="mt-4 inline-block text-base font-semibold text-emerald-700 hover:underline"
				>
					Solicitar correo de recuperación
				</Link>
			</div>
		);
	}

	return (
		<div className="pt-8">
			<h1 className="text-2xl font-semibold text-emerald-700">
				Restablecer contraseña
			</h1>
			<p className="mt-2 text-base text-slate-500">
				Ingresa tu nueva contraseña. Debe tener al menos 6 caracteres, una
				mayúscula, un número y un carácter especial.
			</p>
			<form className="mt-6 space-y-4" onSubmit={onSubmit}>
				<PasswordField
					value={contrasena}
					onChange={setContrasena}
					placeholder="Nueva contraseña"
					className="h-11 w-full rounded-full border border-emerald-200 px-4 pr-10 text-base outline-none focus:border-emerald-500"
				/>
				{fieldErrors.contrasena && (
					<p className="text-base text-rose-500">{fieldErrors.contrasena}</p>
				)}
				<PasswordField
					value={confirmarContrasena}
					onChange={setConfirmarContrasena}
					placeholder="Confirmar contraseña"
					className="h-11 w-full rounded-full border border-emerald-200 px-4 pr-10 text-base outline-none focus:border-emerald-500"
				/>
				{fieldErrors.confirmar && (
					<p className="text-base text-rose-500">{fieldErrors.confirmar}</p>
				)}
				{error && <p className="text-base text-rose-500">{error}</p>}
				<button
					type="submit"
					disabled={isLoading}
					className="h-11 w-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 text-base font-semibold text-white shadow-md transition hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-70"
				>
					{isLoading ? "Actualizando..." : "Actualizar contraseña"}
				</button>
			</form>
			<Link
				to="/auth/login"
				className="mt-6 inline-block text-base font-semibold text-emerald-700 hover:underline"
			>
				← Volver al inicio de sesión
			</Link>
		</div>
	);
};

export default AuthResetForm;
