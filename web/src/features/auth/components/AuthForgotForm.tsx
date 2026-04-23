import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../../shared";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidEmail = (email: string) =>
	email.trim().length >= 5 && EMAIL_REGEX.test(email.trim());

const AuthForgotForm = () => {
	const { forgotPassword } = useAuth();
	const [correo, setCorreo] = useState("");
	const [message, setMessage] = useState("");
	const [isError, setIsError] = useState(false);
	const [cooldownRemaining, setCooldownRemaining] = useState(0);

	useEffect(() => {
		if (cooldownRemaining <= 0) return;
		const timer = setInterval(() => {
			setCooldownRemaining((prev) => Math.max(0, prev - 1));
		}, 1000);
		return () => clearInterval(timer);
	}, [cooldownRemaining]);

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setMessage("");
		setIsError(false);

		if (!correo.trim()) {
			setMessage("Ingresa tu correo electrónico.");
			setIsError(true);
			return;
		}
		if (!isValidEmail(correo)) {
			setMessage("Ingresa un correo electrónico válido.");
			setIsError(true);
			return;
		}

		const result = await forgotPassword(correo.trim());
		setMessage(result.message);
		setIsError(!result.ok);
		if (result.ok) {
			setCooldownRemaining(60);
		}
	};

	return (
		<div className="pt-8">
			<h1 className="text-2xl font-semibold text-emerald-700">
				Recuperar contraseña
			</h1>
			<p className="mt-2 text-base text-slate-500">
				Escribe tu correo electrónico y revisa tu bandeja para recuperar tu
				contraseña.
			</p>
			<form className="mt-6 space-y-4" onSubmit={onSubmit}>
				<input
					type="email"
					placeholder="Correo electrónico"
					className="h-11 w-full rounded-full border border-emerald-200 px-4 text-base outline-none focus:border-emerald-500"
					value={correo}
					onChange={(event) => setCorreo(event.target.value)}
					disabled={cooldownRemaining > 0}
				/>
				{message ? (
					<p
						className={`text-base ${isError ? "text-rose-500" : "text-emerald-600"}`}
					>
						{message}
					</p>
				) : null}
				<button
					type="submit"
					className="h-11 w-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 text-base font-semibold text-white shadow-md transition hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed"
					disabled={cooldownRemaining > 0}
				>
					{cooldownRemaining > 0
						? `Espera ${cooldownRemaining}s para volver a solicitar`
						: "Enviar correo"}
				</button>
			</form>
		</div>
	);
};

export default AuthForgotForm;
