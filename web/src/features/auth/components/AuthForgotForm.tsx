import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../../shared";

const AuthForgotForm = () => {
	const { forgotPassword } = useAuth();
	const [correo, setCorreo] = useState("");
	const [message, setMessage] = useState("");
	const [isError, setIsError] = useState(false);

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setMessage("");
		setIsError(false);

		if (!correo) {
			setMessage("Ingresa tu correo electrónico.");
			setIsError(true);
			return;
		}

		const result = await forgotPassword(correo);
		setMessage(result.message);
		setIsError(!result.ok);
	};

	return (
		<div className="pt-8">
			<h1 className="text-2xl font-semibold text-emerald-700">
				Recuperar contraseña
			</h1>
			<p className="mt-2 text-sm text-slate-500">
				Escribe tu correo electrónico y revisa tu bandeja para recuperar tu
				contraseña.
			</p>
			<form className="mt-6 space-y-4" onSubmit={onSubmit}>
				<input
					type="email"
					placeholder="Correo electrónico"
					className="h-11 w-full rounded-full border border-emerald-200 px-4 text-sm outline-none focus:border-emerald-500"
					value={correo}
					onChange={(event) => setCorreo(event.target.value)}
				/>
				{message ? (
					<p className={`text-sm ${isError ? "text-rose-500" : "text-emerald-600"}`}>
						{message}
					</p>
				) : null}
				<button className="h-11 w-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 text-sm font-semibold text-white shadow-md transition hover:from-emerald-500 hover:to-emerald-600">
					Enviar correo
				</button>
			</form>
		</div>
	);
};

export default AuthForgotForm;
