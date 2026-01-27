import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getHomeByRole, PasswordField, useAuth } from "../../../shared";

const AuthLoginForm = () => {
	const navigate = useNavigate();
	const { login, status, error, resetError, token, user } = useAuth();
	const [correo, setCorreo] = useState("");
	const [contrasena, setContrasena] = useState("");
	const [localError, setLocalError] = useState("");
	const isLoading = status === "loading";

	useEffect(() => {
		if (token && user?.rol) {
			navigate(getHomeByRole(user.rol), { replace: true });
		}
	}, [navigate, token, user]);

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setLocalError("");
		resetError();

		if (!correo || !contrasena) {
			setLocalError("Completa correo y contraseña.");
			return;
		}

		try {
			const result = await login({ correo, contrasena });
			navigate(getHomeByRole(result.user?.rol), { replace: true });
		} catch {
			// el error ya se guarda en el store
		}
	};

	return (
		<div className="pt-8">
			<h1 className="text-2xl font-semibold text-emerald-700">
				Iniciar sesión
			</h1>
			{/* Botón de Google comentado temporalmente
			<button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
				<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
					G
				</span>
				Iniciar sesión con Google
			</button>
			*/}
			<p className="mt-4 text-sm text-slate-500">
				Si no posees una cuenta regístrate{" "}
				<Link to="/auth/register" className="font-semibold text-emerald-700">
					aquí
				</Link>
				.
			</p>
			<form className="mt-6 space-y-4" onSubmit={onSubmit}>
				<input
					type="email"
					placeholder="Correo electrónico"
					className="h-11 w-full rounded-full border border-emerald-200 px-4 text-sm outline-none focus:border-emerald-500"
					value={correo}
					onChange={(event) => setCorreo(event.target.value)}
				/>
				<PasswordField
					value={contrasena}
					onChange={setContrasena}
					placeholder="Contraseña"
					className="h-11 w-full rounded-full border border-emerald-200 px-4 pr-10 text-sm outline-none focus:border-emerald-500"
				/>
				{localError ? (
					<p className="text-sm text-rose-500">{localError}</p>
				) : null}
				{error ? <p className="text-sm text-rose-500">{error}</p> : null}
				<button
					className="h-11 w-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 text-sm font-semibold text-white shadow-md transition hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-70"
					disabled={isLoading}
				>
					{isLoading ? "Ingresando..." : "Iniciar sesión"}
				</button>
				<Link to="/auth/forgot" className="text-sm font-semibold text-emerald-700">
					Olvidé mi contraseña
				</Link>
			</form>
		</div>
	);
};

export default AuthLoginForm;
